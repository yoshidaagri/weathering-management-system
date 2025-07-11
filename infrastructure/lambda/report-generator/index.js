const { ReportRepository } = require('../shared/repositories/report-repository');
const { ProjectRepository } = require('../shared/repositories/project-repository');
const { MeasurementRepository } = require('../shared/repositories/measurement-repository');
const { CustomerRepository } = require('../shared/repositories/customer-repository');
const { validateAuth } = require('../shared/jwt-validator');

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3();
const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

const reportRepository = new ReportRepository(TABLE_NAME);
const projectRepository = new ProjectRepository(TABLE_NAME);
const measurementRepository = new MeasurementRepository(TABLE_NAME);
const customerRepository = new CustomerRepository(TABLE_NAME);

/**
 * Report Generator Lambda関数
 * 風化促進CO2除去プロジェクトのレポート生成API
 * MRV（測定・報告・検証）報告書の生成とS3保存
 * AWS Cognito認証付きCRUD操作
 */
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  // CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // JWT認証チェック（Cognito検証付き）
    const authResult = await validateAuth(event);
    if (!authResult.isValid) {
      console.log('Authentication failed:', authResult.message);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Unauthorized',
          message: authResult.message 
        })
      };
    }

    // 認証成功 - ユーザー情報をログに記録
    console.log('Authenticated user:', authResult.user?.username || 'mock-user');

    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const projectId = pathParameters.projectId;
    const reportId = pathParameters.reportId;

    // プロジェクトIDは必須
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Project ID is required' })
      };
    }

    switch (method) {
      case 'GET':
        if (reportId) {
          const requestPath = event.path || '';
          if (requestPath.includes('/download')) {
            return await downloadReport(projectId, reportId, headers);
          } else {
            return await getReport(projectId, reportId, headers);
          }
        } else {
          return await getReports(projectId, event.queryStringParameters, headers);
        }
      case 'POST':
        return await generateReport(projectId, JSON.parse(event.body || '{}'), headers);
      case 'DELETE':
        if (!reportId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Report ID required for delete' })
          };
        }
        return await deleteReport(projectId, reportId, headers);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// validateAuth function is now imported from jwt-validator module

/**
 * レポート一覧取得
 */
const getReports = async (projectId, queryParams, headers) => {
  try {
    if (!validateProjectId(projectId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid project ID format' })
      };
    }

    // プロジェクトの存在確認
    const project = await projectRepository.findById(projectId);
    if (!project) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      };
    }

    const query = {
      limit: parseInt(queryParams?.limit) || 20,
      nextToken: queryParams?.nextToken,
      type: queryParams?.type,
      status: queryParams?.status
    };

    const result = await reportRepository.findByProject(projectId, query);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Get reports error:', error);
    if (error.message === 'Invalid nextToken format') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
    throw error;
  }
};

/**
 * レポート詳細取得
 */
const getReport = async (projectId, reportId, headers) => {
  try {
    if (!validateProjectId(projectId) || !validateReportId(reportId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid project ID or report ID format' })
      };
    }

    const report = await reportRepository.findById(projectId, reportId);

    if (!report) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Report not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ report })
    };
  } catch (error) {
    console.error('Get report error:', error);
    throw error;
  }
};

/**
 * レポートダウンロード
 */
const downloadReport = async (projectId, reportId, headers) => {
  try {
    if (!validateProjectId(projectId) || !validateReportId(reportId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid project ID or report ID format' })
      };
    }

    const report = await reportRepository.findById(projectId, reportId);

    if (!report) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Report not found' })
      };
    }

    if (report.status !== 'completed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Report is not ready for download' })
      };
    }

    if (!report.fileUrl) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Report file not found' })
      };
    }

    // S3からPresigned URLを生成
    const params = {
      Bucket: BUCKET_NAME,
      Key: report.s3Key,
      Expires: 3600, // 1時間有効
      ResponseContentDisposition: `attachment; filename="${report.filename}"`
    };

    const downloadUrl = s3.getSignedUrl('getObject', params);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        downloadUrl,
        filename: report.filename,
        fileSize: report.fileSize,
        expiresIn: 3600
      })
    };
  } catch (error) {
    console.error('Download report error:', error);
    throw error;
  }
};

/**
 * レポート生成
 */
const generateReport = async (projectId, reportData, headers) => {
  try {
    if (!validateProjectId(projectId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid project ID format' })
      };
    }

    // プロジェクトの存在確認
    const project = await projectRepository.findById(projectId);
    if (!project) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      };
    }

    // バリデーション
    const validation = validateReportData(reportData);
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Validation failed',
          details: validation.errors 
        })
      };
    }

    // レポート生成処理開始
    const report = await reportRepository.create(projectId, reportData);

    // 非同期でレポートファイル生成（実際の処理）
    processReportGeneration(report, project);

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({ 
        report,
        message: 'Report generation started. Check status for completion.'
      })
    };
  } catch (error) {
    console.error('Generate report error:', error);
    throw error;
  }
};

/**
 * レポート削除
 */
const deleteReport = async (projectId, reportId, headers) => {
  try {
    if (!validateProjectId(projectId) || !validateReportId(reportId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid project ID or report ID format' })
      };
    }

    const report = await reportRepository.findById(projectId, reportId);
    if (!report) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Report not found' })
      };
    }

    // S3からファイル削除
    if (report.s3Key) {
      try {
        await s3.deleteObject({
          Bucket: BUCKET_NAME,
          Key: report.s3Key
        }).promise();
      } catch (s3Error) {
        console.error('S3 delete error:', s3Error);
        // S3削除エラーでも続行
      }
    }

    const deleted = await reportRepository.delete(projectId, reportId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Report deleted successfully',
        reportId 
      })
    };
  } catch (error) {
    console.error('Delete report error:', error);
    throw error;
  }
};

/**
 * レポート生成処理（非同期）
 */
const processReportGeneration = async (report, project) => {
  try {
    // データ収集
    const customer = await customerRepository.findById(project.customerId);
    const measurements = await measurementRepository.findByProject(project.projectId, {
      startDate: report.parameters.startDate,
      endDate: report.parameters.endDate,
      limit: 1000
    });

    // レポート内容生成
    const reportContent = await generateReportContent(report, project, customer, measurements);

    // ファイル名生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${report.type}_${project.name}_${timestamp}.${report.format}`;
    const s3Key = `reports/${project.projectId}/${report.reportId}/${filename}`;

    // ファイル生成
    let fileBuffer;
    if (report.format === 'pdf') {
      fileBuffer = await generatePDFReport(reportContent);
    } else {
      fileBuffer = Buffer.from(JSON.stringify(reportContent, null, 2), 'utf-8');
    }

    // S3にアップロード
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: report.format === 'pdf' ? 'application/pdf' : 'application/json',
      ServerSideEncryption: 'AES256'
    };

    const uploadResult = await s3.upload(uploadParams).promise();

    // レポート完了更新
    await reportRepository.update(project.projectId, report.reportId, {
      status: 'completed',
      fileUrl: uploadResult.Location,
      s3Key: s3Key,
      filename: filename,
      fileSize: fileBuffer.length,
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Report generation process error:', error);
    
    // エラー状態に更新
    await reportRepository.update(project.projectId, report.reportId, {
      status: 'failed',
      error: error.message,
      completedAt: new Date().toISOString()
    });
  }
};

/**
 * レポート内容生成
 */
const generateReportContent = async (report, project, customer, measurements) => {
  const content = {
    reportInfo: {
      reportId: report.reportId,
      type: report.type,
      generatedAt: new Date().toISOString(),
      period: {
        startDate: report.parameters.startDate,
        endDate: report.parameters.endDate
      }
    },
    projectInfo: {
      projectId: project.projectId,
      name: project.name,
      description: project.description,
      siteLocation: project.siteLocation,
      budget: project.budget,
      co2Target: project.co2Target,
      co2Actual: project.co2Actual,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate
    },
    customerInfo: {
      customerId: customer.customerId,
      companyName: customer.companyName,
      industry: customer.industry
    },
    measurements: {
      summary: measurements.summary,
      data: measurements.measurements
    },
    analysis: generateAnalysis(project, measurements.measurements),
    mrv: generateMRVSection(project, measurements.measurements)
  };

  return content;
};

/**
 * 分析セクション生成
 */
const generateAnalysis = (project, measurements) => {
  const co2Measurements = measurements.filter(m => m.values.co2Concentration);
  const totalCO2Reduction = co2Measurements.reduce((sum, m) => sum + (m.values.co2Concentration || 0), 0);
  
  return {
    co2Reduction: {
      total: totalCO2Reduction,
      target: project.co2Target,
      achievement: project.co2Target > 0 ? (totalCO2Reduction / project.co2Target) * 100 : 0
    },
    efficiency: {
      budgetEfficiency: project.budget > 0 ? totalCO2Reduction / project.budget : 0,
      timeEfficiency: measurements.length > 0 ? totalCO2Reduction / measurements.length : 0
    },
    trends: {
      measurementCount: measurements.length,
      alertCount: measurements.filter(m => m.alertLevel === 'high').length,
      anomalyCount: measurements.filter(m => m.isAnomaly).length
    }
  };
};

/**
 * MRV（測定・報告・検証）セクション生成
 */
const generateMRVSection = (project, measurements) => {
  return {
    measurement: {
      methodology: "Continuous monitoring of water quality parameters and CO2 concentration",
      frequency: "Real-time data collection with hourly aggregation",
      equipment: "pH meters, CO2 sensors, temperature probes, flow meters",
      quality: {
        totalMeasurements: measurements.length,
        validMeasurements: measurements.filter(m => !m.isAnomaly).length,
        dataQuality: measurements.length > 0 ? 
          (measurements.filter(m => !m.isAnomaly).length / measurements.length) * 100 : 0
      }
    },
    reporting: {
      standard: "ISO 14064-2:2019 for greenhouse gas quantification",
      verification: "Third-party verification pending",
      transparency: "All measurement data and methodologies documented"
    },
    verification: {
      status: "Pending external verification",
      requirements: [
        "Third-party validation of measurement equipment",
        "Review of calculation methodologies",
        "Audit of data collection procedures"
      ]
    }
  };
};

/**
 * PDFレポート生成（簡略版）
 */
const generatePDFReport = async (content) => {
  // 本来はPDFライブラリ（puppeteer、jsPDF等）を使用
  // ここではプレーンテキストで代用
  const pdfContent = `
WEATHERING CO2 REMOVAL PROJECT REPORT
=====================================

Report ID: ${content.reportInfo.reportId}
Generated: ${content.reportInfo.generatedAt}

PROJECT INFORMATION
==================
Project: ${content.projectInfo.name}
Status: ${content.projectInfo.status}
CO2 Target: ${content.projectInfo.co2Target} tons
CO2 Actual: ${content.projectInfo.co2Actual} tons

CUSTOMER INFORMATION
===================
Company: ${content.customerInfo.companyName}
Industry: ${content.customerInfo.industry}

ANALYSIS
========
Total CO2 Reduction: ${content.analysis.co2Reduction.total} tons
Target Achievement: ${content.analysis.co2Reduction.achievement.toFixed(2)}%
Measurement Count: ${content.analysis.trends.measurementCount}

MRV VERIFICATION
===============
Data Quality: ${content.mrv.measurement.quality.dataQuality.toFixed(2)}%
Valid Measurements: ${content.mrv.measurement.quality.validMeasurements}
Verification Status: ${content.mrv.verification.status}
`;

  return Buffer.from(pdfContent, 'utf-8');
};

/**
 * レポートデータバリデーション
 */
const validateReportData = (data) => {
  const errors = [];

  if (!data.type || !['mrv', 'environmental', 'performance', 'compliance'].includes(data.type)) {
    errors.push('Report type must be one of: mrv, environmental, performance, compliance');
  }

  if (!data.format || !['pdf', 'json'].includes(data.format)) {
    errors.push('Report format must be pdf or json');
  }

  if (!data.parameters || typeof data.parameters !== 'object') {
    errors.push('Parameters object is required');
  } else {
    if (!data.parameters.startDate || !/^\d{4}-\d{2}-\d{2}/.test(data.parameters.startDate)) {
      errors.push('Valid start date is required (YYYY-MM-DD format)');
    }

    if (!data.parameters.endDate || !/^\d{4}-\d{2}-\d{2}/.test(data.parameters.endDate)) {
      errors.push('Valid end date is required (YYYY-MM-DD format)');
    }

    if (data.parameters.startDate && data.parameters.endDate && 
        new Date(data.parameters.startDate) >= new Date(data.parameters.endDate)) {
      errors.push('End date must be after start date');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * プロジェクトID形式バリデーション
 */
const validateProjectId = (projectId) => {
  return projectId && typeof projectId === 'string' && 
         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);
};

/**
 * レポートID形式バリデーション
 */
const validateReportId = (reportId) => {
  return reportId && typeof reportId === 'string' && 
         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId);
};

// TODO: Cursor - 受入テスト実施