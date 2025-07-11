const { MeasurementRepository } = require('../shared/repositories/measurement-repository');
const { ProjectRepository } = require('../shared/repositories/project-repository');
const { validateAuth } = require('../shared/jwt-validator');

const TABLE_NAME = process.env.TABLE_NAME;
const measurementRepository = new MeasurementRepository(TABLE_NAME);
const projectRepository = new ProjectRepository(TABLE_NAME);

/**
 * Measurement API Lambda関数
 * 風化促進CO2除去プロジェクトの測定データ管理API
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
    const measurementId = pathParameters.measurementId;

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
        if (measurementId) {
          return await getMeasurement(projectId, measurementId, headers);
        } else {
          return await getMeasurements(projectId, event.queryStringParameters, headers);
        }
      case 'POST':
        const requestPath = event.path || '';
        if (requestPath.includes('/batch')) {
          return await createMeasurementsBatch(projectId, JSON.parse(event.body || '{}'), headers);
        } else {
          return await createMeasurement(projectId, JSON.parse(event.body || '{}'), headers);
        }
      case 'PUT':
        if (!measurementId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Measurement ID required for update' })
          };
        }
        return await updateMeasurement(projectId, measurementId, JSON.parse(event.body || '{}'), headers);
      case 'DELETE':
        if (!measurementId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Measurement ID required for delete' })
          };
        }
        return await deleteMeasurement(projectId, measurementId, headers);
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
 * 測定データ一覧取得（時系列データ、ページネーション対応）
 */
const getMeasurements = async (projectId, queryParams, headers) => {
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
      limit: parseInt(queryParams?.limit) || 50,
      nextToken: queryParams?.nextToken,
      startDate: queryParams?.startDate,
      endDate: queryParams?.endDate,
      type: queryParams?.type,
      alertsOnly: queryParams?.alertsOnly === 'true'
    };

    const result = await measurementRepository.findByProject(projectId, query);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Get measurements error:', error);
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
 * 測定データ詳細取得
 */
const getMeasurement = async (projectId, measurementId, headers) => {
  try {
    if (!validateProjectId(projectId) || !validateMeasurementId(measurementId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid project ID or measurement ID format' })
      };
    }

    const measurement = await measurementRepository.findById(projectId, measurementId);

    if (!measurement) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Measurement not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ measurement })
    };
  } catch (error) {
    console.error('Get measurement error:', error);
    throw error;
  }
};

/**
 * 測定データ作成
 */
const createMeasurement = async (projectId, measurementData, headers) => {
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
    const validation = validateMeasurementData(measurementData);
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

    const measurement = await measurementRepository.create(projectId, measurementData);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        measurement,
        message: 'Measurement created successfully'
      })
    };
  } catch (error) {
    console.error('Create measurement error:', error);
    throw error;
  }
};

/**
 * 測定データ更新
 */
const updateMeasurement = async (projectId, measurementId, measurementData, headers) => {
  try {
    if (!validateProjectId(projectId) || !validateMeasurementId(measurementId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid project ID or measurement ID format' })
      };
    }

    // バリデーション
    const validation = validateMeasurementData(measurementData, true);
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

    const measurement = await measurementRepository.update(projectId, measurementId, measurementData);

    if (!measurement) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Measurement not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        measurement,
        message: 'Measurement updated successfully'
      })
    };
  } catch (error) {
    console.error('Update measurement error:', error);
    throw error;
  }
};

/**
 * 測定データ削除
 */
const deleteMeasurement = async (projectId, measurementId, headers) => {
  try {
    if (!validateProjectId(projectId) || !validateMeasurementId(measurementId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid project ID or measurement ID format' })
      };
    }

    const deleted = await measurementRepository.delete(projectId, measurementId);

    if (!deleted) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Measurement not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Measurement deleted successfully',
        measurementId 
      })
    };
  } catch (error) {
    console.error('Delete measurement error:', error);
    throw error;
  }
};

/**
 * 測定データバッチ作成
 */
const createMeasurementsBatch = async (projectId, measurementsData, headers) => {
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

    // バッチデータの検証
    if (!Array.isArray(measurementsData.measurements)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Measurements array is required' })
      };
    }

    if (measurementsData.measurements.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one measurement is required' })
      };
    }

    if (measurementsData.measurements.length > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Maximum 100 measurements per batch' })
      };
    }

    // 各測定データのバリデーション
    const validationResults = measurementsData.measurements.map((measurement, index) => {
      const validation = validateMeasurementData(measurement);
      return {
        index,
        isValid: validation.isValid,
        errors: validation.errors
      };
    });

    const invalidMeasurements = validationResults.filter(result => !result.isValid);
    if (invalidMeasurements.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Validation failed for some measurements',
          details: invalidMeasurements
        })
      };
    }

    const results = await measurementRepository.createBatch(projectId, measurementsData.measurements);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        results,
        message: `${results.successful.length} measurements created successfully`
      })
    };
  } catch (error) {
    console.error('Create measurements batch error:', error);
    throw error;
  }
};

/**
 * 測定データバリデーション
 */
const validateMeasurementData = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate || data.timestamp !== undefined) {
    if (!data.timestamp || typeof data.timestamp !== 'string' || 
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data.timestamp)) {
      errors.push('Valid timestamp is required (ISO format)');
    }
  }

  if (!isUpdate || data.type !== undefined) {
    if (!data.type || !['water_quality', 'atmospheric', 'soil'].includes(data.type)) {
      errors.push('Type must be one of: water_quality, atmospheric, soil');
    }
  }

  if (!isUpdate || data.values !== undefined) {
    if (!data.values || typeof data.values !== 'object') {
      errors.push('Values object is required');
    } else {
      // 測定値の検証
      if (data.values.ph !== undefined) {
        if (typeof data.values.ph !== 'number' || data.values.ph < 0 || data.values.ph > 14) {
          errors.push('pH must be a number between 0 and 14');
        }
      }

      if (data.values.temperature !== undefined) {
        if (typeof data.values.temperature !== 'number' || data.values.temperature < -50 || data.values.temperature > 100) {
          errors.push('Temperature must be a number between -50 and 100');
        }
      }

      if (data.values.co2Concentration !== undefined) {
        if (typeof data.values.co2Concentration !== 'number' || data.values.co2Concentration < 0) {
          errors.push('CO2 concentration must be a positive number');
        }
      }

      if (data.values.flowRate !== undefined) {
        if (typeof data.values.flowRate !== 'number' || data.values.flowRate < 0) {
          errors.push('Flow rate must be a positive number');
        }
      }

      // 重金属濃度検証
      const heavyMetals = ['iron', 'copper', 'zinc', 'lead', 'cadmium'];
      heavyMetals.forEach(metal => {
        if (data.values[metal] !== undefined) {
          if (typeof data.values[metal] !== 'number' || data.values[metal] < 0) {
            errors.push(`${metal} concentration must be a positive number`);
          }
        }
      });
    }
  }

  if (data.location !== undefined) {
    if (data.location && typeof data.location === 'object') {
      const { latitude, longitude } = data.location;
      
      if (latitude !== undefined && (typeof latitude !== 'number' || latitude < -90 || latitude > 90)) {
        errors.push('Valid latitude is required (-90 to 90)');
      }
      
      if (longitude !== undefined && (typeof longitude !== 'number' || longitude < -180 || longitude > 180)) {
        errors.push('Valid longitude is required (-180 to 180)');
      }
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
 * 測定データID形式バリデーション
 */
const validateMeasurementId = (measurementId) => {
  return measurementId && typeof measurementId === 'string' && 
         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(measurementId);
};

// TODO: Cursor - 受入テスト実施