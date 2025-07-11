const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * Report Repository - DynamoDB Single Table Design
 * 
 * Primary Table Keys:
 * PK: PROJECT#{projectId}
 * SK: REPORT#{timestamp}#{reportId}
 * 
 * GSI1 (Type + Status):
 * GSI1PK: REPORT_TYPE#{type}
 * GSI1SK: STATUS#{status}#CREATED#{createdAt}
 * 
 * GSI2 (Project + Status):
 * GSI2PK: PROJECT#{projectId}#REPORT
 * GSI2SK: STATUS#{status}#CREATED#{createdAt}
 */
class ReportRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * プロジェクトのレポート一覧取得（ページネーション対応）
   */
  async findByProject(projectId, query = {}) {
    try {
      const {
        limit = 20,
        nextToken,
        type,
        status
      } = query;

      let params = {
        TableName: this.tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :gsi2pk',
        ExpressionAttributeValues: {
          ':gsi2pk': `PROJECT#${projectId}#REPORT`
        },
        Limit: limit,
        ScanIndexForward: false // 新しい順
      };

      // ステータスフィルタ
      if (status) {
        params.KeyConditionExpression += ' AND begins_with(GSI2SK, :status)';
        params.ExpressionAttributeValues[':status'] = `STATUS#${status}`;
      }

      // タイプフィルタ
      if (type) {
        const typeFilter = '#type = :type';
        params.FilterExpression = typeFilter;
        params.ExpressionAttributeNames = {
          '#type': 'type'
        };
        params.ExpressionAttributeValues = {
          ...params.ExpressionAttributeValues,
          ':type': type
        };
      }

      // ページネーション
      if (nextToken) {
        try {
          params.ExclusiveStartKey = JSON.parse(
            Buffer.from(nextToken, 'base64').toString()
          );
        } catch (error) {
          throw new Error('Invalid nextToken format');
        }
      }

      const result = await dynamodb.query(params).promise();

      return {
        reports: result.Items?.map(this.entityToReport) || [],
        pagination: {
          hasMore: !!result.LastEvaluatedKey,
          nextToken: result.LastEvaluatedKey
            ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
            : null,
          count: result.Count || 0,
          scannedCount: result.ScannedCount || 0
        },
        summary: this.calculateSummary(result.Items || [])
      };
    } catch (error) {
      console.error('ReportRepository.findByProject error:', error);
      throw error;
    }
  }

  /**
   * レポート詳細取得
   */
  async findById(projectId, reportId) {
    try {
      // SK を構築するため、まず該当するレポートを検索
      const params = {
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: 'reportId = :reportId',
        ExpressionAttributeValues: {
          ':pk': `PROJECT#${projectId}`,
          ':sk': 'REPORT#',
          ':reportId': reportId
        }
      };

      const result = await dynamodb.query(params).promise();
      
      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return this.entityToReport(result.Items[0]);
    } catch (error) {
      console.error('ReportRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * タイプ別レポート取得
   */
  async findByType(type, limit = 20) {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': `REPORT_TYPE#${type}`
        },
        Limit: limit,
        ScanIndexForward: false // 新しい順
      };

      const result = await dynamodb.query(params).promise();
      
      return result.Items?.map(this.entityToReport) || [];
    } catch (error) {
      console.error('ReportRepository.findByType error:', error);
      throw error;
    }
  }

  /**
   * ステータス別レポート取得
   */
  async findByStatus(status, limit = 20) {
    try {
      const params = {
        TableName: this.tableName,
        FilterExpression: 'begins_with(PK, :pk) AND #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':pk': 'PROJECT#',
          ':status': status
        },
        Limit: limit
      };

      const result = await dynamodb.scan(params).promise();
      
      return result.Items?.map(this.entityToReport) || [];
    } catch (error) {
      console.error('ReportRepository.findByStatus error:', error);
      throw error;
    }
  }

  /**
   * レポート作成
   */
  async create(projectId, reportData) {
    try {
      const reportId = uuidv4();
      const now = new Date().toISOString();
      const status = 'pending';

      const entity = {
        PK: `PROJECT#${projectId}`,
        SK: `REPORT#${now}#${reportId}`,
        GSI1PK: `REPORT_TYPE#${reportData.type}`,
        GSI1SK: `STATUS#${status}#CREATED#${now}`,
        GSI2PK: `PROJECT#${projectId}#REPORT`,
        GSI2SK: `STATUS#${status}#CREATED#${now}`,
        reportId,
        projectId,
        type: reportData.type,
        format: reportData.format,
        parameters: reportData.parameters,
        status,
        progress: 0,
        fileUrl: null,
        s3Key: null,
        filename: null,
        fileSize: null,
        error: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null
      };

      const params = {
        TableName: this.tableName,
        Item: entity
      };

      await dynamodb.put(params).promise();

      return this.entityToReport(entity);
    } catch (error) {
      console.error('ReportRepository.create error:', error);
      throw error;
    }
  }

  /**
   * レポート更新
   */
  async update(projectId, reportId, updateData) {
    try {
      // 既存レコードの確認
      const existing = await this.findById(projectId, reportId);
      if (!existing) {
        return null;
      }

      const now = new Date().toISOString();
      const updateExpression = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      // 動的な更新式を構築
      if (updateData.status !== undefined) {
        updateExpression.push('#status = :status');
        updateExpression.push('GSI1SK = :gsi1sk');
        updateExpression.push('GSI2SK = :gsi2sk');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = updateData.status;
        expressionAttributeValues[':gsi1sk'] = `STATUS#${updateData.status}#CREATED#${existing.createdAt}`;
        expressionAttributeValues[':gsi2sk'] = `STATUS#${updateData.status}#CREATED#${existing.createdAt}`;
      }

      if (updateData.progress !== undefined) {
        updateExpression.push('progress = :progress');
        expressionAttributeValues[':progress'] = updateData.progress;
      }

      if (updateData.fileUrl !== undefined) {
        updateExpression.push('fileUrl = :fileUrl');
        expressionAttributeValues[':fileUrl'] = updateData.fileUrl;
      }

      if (updateData.s3Key !== undefined) {
        updateExpression.push('s3Key = :s3Key');
        expressionAttributeValues[':s3Key'] = updateData.s3Key;
      }

      if (updateData.filename !== undefined) {
        updateExpression.push('filename = :filename');
        expressionAttributeValues[':filename'] = updateData.filename;
      }

      if (updateData.fileSize !== undefined) {
        updateExpression.push('fileSize = :fileSize');
        expressionAttributeValues[':fileSize'] = updateData.fileSize;
      }

      if (updateData.error !== undefined) {
        updateExpression.push('#error = :error');
        expressionAttributeNames['#error'] = 'error';
        expressionAttributeValues[':error'] = updateData.error;
      }

      if (updateData.completedAt !== undefined) {
        updateExpression.push('completedAt = :completedAt');
        expressionAttributeValues[':completedAt'] = updateData.completedAt;
      }

      updateExpression.push('updatedAt = :updatedAt');
      expressionAttributeValues[':updatedAt'] = now;

      const params = {
        TableName: this.tableName,
        Key: {
          PK: existing.PK,
          SK: existing.SK
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await dynamodb.update(params).promise();
      
      return this.entityToReport(result.Attributes);
    } catch (error) {
      console.error('ReportRepository.update error:', error);
      throw error;
    }
  }

  /**
   * レポート削除
   */
  async delete(projectId, reportId) {
    try {
      // 既存レコードの確認
      const existing = await this.findById(projectId, reportId);
      if (!existing) {
        return false;
      }

      const params = {
        TableName: this.tableName,
        Key: {
          PK: existing.PK,
          SK: existing.SK
        }
      };

      await dynamodb.delete(params).promise();
      
      return true;
    } catch (error) {
      console.error('ReportRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * 期限切れレポートのクリーンアップ
   */
  async cleanupExpiredReports(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffIso = cutoffDate.toISOString();

      const params = {
        TableName: this.tableName,
        FilterExpression: 'begins_with(PK, :pk) AND createdAt < :cutoff AND #status IN (:completed, :failed)',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':pk': 'PROJECT#',
          ':cutoff': cutoffIso,
          ':completed': 'completed',
          ':failed': 'failed'
        }
      };

      const result = await dynamodb.scan(params).promise();
      const expiredReports = result.Items || [];

      const deletePromises = expiredReports.map(async (report) => {
        try {
          await this.delete(report.projectId, report.reportId);
          return { reportId: report.reportId, success: true };
        } catch (error) {
          return { reportId: report.reportId, success: false, error: error.message };
        }
      });

      const deleteResults = await Promise.all(deletePromises);
      const successCount = deleteResults.filter(r => r.success).length;
      const failCount = deleteResults.filter(r => !r.success).length;

      return {
        totalExpired: expiredReports.length,
        deletedCount: successCount,
        failedCount: failCount,
        results: deleteResults
      };
    } catch (error) {
      console.error('ReportRepository.cleanupExpiredReports error:', error);
      throw error;
    }
  }

  /**
   * レポート統計情報取得
   */
  async getStatistics() {
    try {
      const statusCounts = {};
      const typeCounts = {};

      // すべてのレポートを取得（実際の運用では、GSIでCountクエリを使用）
      const params = {
        TableName: this.tableName,
        FilterExpression: 'begins_with(PK, :pk) AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'PROJECT#',
          ':sk': 'REPORT#'
        },
        ProjectionExpression: '#status, #type, createdAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#type': 'type'
        }
      };

      const result = await dynamodb.scan(params).promise();
      const reports = result.Items || [];

      // ステータス別カウント
      reports.forEach(report => {
        const status = report.status;
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        const type = report.type;
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      // 今月のレポート数
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const thisMonthIso = thisMonth.toISOString();

      const thisMonthReports = reports.filter(report => 
        report.createdAt >= thisMonthIso
      );

      return {
        totalReports: reports.length,
        statusBreakdown: statusCounts,
        typeBreakdown: typeCounts,
        thisMonthCount: thisMonthReports.length,
        completionRate: reports.length > 0 ? 
          ((statusCounts.completed || 0) / reports.length) * 100 : 0
      };
    } catch (error) {
      console.error('ReportRepository.getStatistics error:', error);
      throw error;
    }
  }

  /**
   * レポートサマリー計算
   */
  calculateSummary(reports) {
    if (!reports || reports.length === 0) {
      return {
        totalCount: 0,
        pendingCount: 0,
        completedCount: 0,
        failedCount: 0,
        typeBreakdown: {}
      };
    }

    const summary = {
      totalCount: reports.length,
      pendingCount: 0,
      completedCount: 0,
      failedCount: 0,
      typeBreakdown: {}
    };

    reports.forEach(report => {
      // ステータス別カウント
      switch (report.status) {
        case 'pending':
        case 'processing':
          summary.pendingCount++;
          break;
        case 'completed':
          summary.completedCount++;
          break;
        case 'failed':
          summary.failedCount++;
          break;
      }

      // タイプ別カウント
      const type = report.type;
      if (!summary.typeBreakdown[type]) {
        summary.typeBreakdown[type] = 0;
      }
      summary.typeBreakdown[type]++;
    });

    return summary;
  }

  /**
   * エンティティからレポートオブジェクトへの変換
   */
  entityToReport(entity) {
    return {
      reportId: entity.reportId,
      projectId: entity.projectId,
      type: entity.type,
      format: entity.format,
      parameters: entity.parameters,
      status: entity.status,
      progress: entity.progress,
      fileUrl: entity.fileUrl,
      s3Key: entity.s3Key,
      filename: entity.filename,
      fileSize: entity.fileSize,
      error: entity.error,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      completedAt: entity.completedAt,
      // Internal fields for DynamoDB operations
      PK: entity.PK,
      SK: entity.SK
    };
  }
}

module.exports = { ReportRepository };

// TODO: Cursor - 受入テスト実施