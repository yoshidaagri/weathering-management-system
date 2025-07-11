const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * Project Repository - DynamoDB Single Table Design
 * 
 * Primary Table Keys:
 * PK: PROJECT#{projectId}
 * SK: METADATA
 * 
 * GSI1 (Customer + Status):
 * GSI1PK: CUSTOMER#{customerId}
 * GSI1SK: STATUS#{status}#NAME#{name}
 * 
 * GSI2 (Status + Start Date):
 * GSI2PK: PROJECT_STATUS#{status}
 * GSI2SK: START_DATE#{startDate}
 */
class ProjectRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * プロジェクト一覧取得（ページネーション、検索、フィルタ対応）
   */
  async findAll(query = {}) {
    try {
      const {
        limit = 20,
        nextToken,
        customerId,
        status,
        search
      } = query;

      let params;

      if (customerId) {
        // 顧客IDでフィルタ
        params = {
          TableName: this.tableName,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :gsi1pk',
          ExpressionAttributeValues: {
            ':gsi1pk': `CUSTOMER#${customerId}`
          },
          Limit: limit
        };

        // ステータスフィルタ
        if (status) {
          params.KeyConditionExpression += ' AND begins_with(GSI1SK, :status)';
          params.ExpressionAttributeValues[':status'] = `STATUS#${status}`;
        }
      } else if (status) {
        // ステータスでフィルタ
        params = {
          TableName: this.tableName,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :gsi2pk',
          ExpressionAttributeValues: {
            ':gsi2pk': `PROJECT_STATUS#${status}`
          },
          Limit: limit,
          ScanIndexForward: false // 新しい順
        };
      } else {
        // 全プロジェクト（scan）
        params = {
          TableName: this.tableName,
          FilterExpression: 'begins_with(PK, :pk)',
          ExpressionAttributeValues: {
            ':pk': 'PROJECT#'
          },
          Limit: limit
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

      // 検索フィルタ（プロジェクト名）
      if (search) {
        const searchFilter = 'contains(#name, :search)';
        if (params.FilterExpression) {
          params.FilterExpression += ` AND ${searchFilter}`;
        } else {
          params.FilterExpression = searchFilter;
        }
        params.ExpressionAttributeNames = {
          ...params.ExpressionAttributeNames,
          '#name': 'name'
        };
        params.ExpressionAttributeValues = {
          ...params.ExpressionAttributeValues,
          ':search': search
        };
      }

      const result = customerId || status 
        ? await dynamodb.query(params).promise()
        : await dynamodb.scan(params).promise();

      return {
        projects: result.Items?.map(this.entityToProject) || [],
        pagination: {
          hasMore: !!result.LastEvaluatedKey,
          nextToken: result.LastEvaluatedKey
            ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
            : null,
          count: result.Count || 0,
          scannedCount: result.ScannedCount || 0
        }
      };
    } catch (error) {
      console.error('ProjectRepository.findAll error:', error);
      throw error;
    }
  }

  /**
   * プロジェクト詳細取得
   */
  async findById(projectId) {
    try {
      const params = {
        TableName: this.tableName,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: 'METADATA'
        }
      };

      const result = await dynamodb.get(params).promise();
      
      if (!result.Item) {
        return null;
      }

      return this.entityToProject(result.Item);
    } catch (error) {
      console.error('ProjectRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * 顧客のプロジェクト一覧取得
   */
  async findByCustomer(customerId, limit = 20) {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': `CUSTOMER#${customerId}`
        },
        Limit: limit
      };

      const result = await dynamodb.query(params).promise();
      
      return result.Items?.map(this.entityToProject) || [];
    } catch (error) {
      console.error('ProjectRepository.findByCustomer error:', error);
      throw error;
    }
  }

  /**
   * ステータス別プロジェクト取得
   */
  async findByStatus(status, limit = 20) {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :gsi2pk',
        ExpressionAttributeValues: {
          ':gsi2pk': `PROJECT_STATUS#${status}`
        },
        Limit: limit,
        ScanIndexForward: false // 新しい順
      };

      const result = await dynamodb.query(params).promise();
      
      return result.Items?.map(this.entityToProject) || [];
    } catch (error) {
      console.error('ProjectRepository.findByStatus error:', error);
      throw error;
    }
  }

  /**
   * プロジェクト作成
   */
  async create(projectData) {
    try {
      const projectId = uuidv4();
      const now = new Date().toISOString();
      const status = projectData.status || 'planning';

      const entity = {
        PK: `PROJECT#${projectId}`,
        SK: 'METADATA',
        GSI1PK: `CUSTOMER#${projectData.customerId}`,
        GSI1SK: `STATUS#${status}#NAME#${projectData.name}`,
        GSI2PK: `PROJECT_STATUS#${status}`,
        GSI2SK: `START_DATE#${projectData.startDate}`,
        projectId,
        name: projectData.name,
        description: projectData.description,
        customerId: projectData.customerId,
        siteLocation: projectData.siteLocation,
        budget: projectData.budget,
        co2Target: projectData.co2Target,
        co2Actual: 0,
        startDate: projectData.startDate,
        endDate: projectData.endDate,
        status,
        progress: 0,
        budgetUsed: 0,
        createdAt: now,
        updatedAt: now
      };

      const params = {
        TableName: this.tableName,
        Item: entity,
        ConditionExpression: 'attribute_not_exists(PK)'
      };

      await dynamodb.put(params).promise();

      return this.entityToProject(entity);
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        throw new Error('Project already exists');
      }
      console.error('ProjectRepository.create error:', error);
      throw error;
    }
  }

  /**
   * プロジェクト更新
   */
  async update(projectId, updateData) {
    try {
      // 既存レコードの確認
      const existing = await this.findById(projectId);
      if (!existing) {
        return null;
      }

      const now = new Date().toISOString();
      const updateExpression = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      // 動的な更新式を構築
      if (updateData.name !== undefined) {
        updateExpression.push('#name = :name');
        updateExpression.push('GSI1SK = :gsi1sk');
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':name'] = updateData.name;
        expressionAttributeValues[':gsi1sk'] = `STATUS#${updateData.status || existing.status}#NAME#${updateData.name}`;
      }

      if (updateData.description !== undefined) {
        updateExpression.push('description = :description');
        expressionAttributeValues[':description'] = updateData.description;
      }

      if (updateData.siteLocation !== undefined) {
        updateExpression.push('siteLocation = :siteLocation');
        expressionAttributeValues[':siteLocation'] = updateData.siteLocation;
      }

      if (updateData.budget !== undefined) {
        updateExpression.push('budget = :budget');
        expressionAttributeValues[':budget'] = updateData.budget;
      }

      if (updateData.co2Target !== undefined) {
        updateExpression.push('co2Target = :co2Target');
        expressionAttributeValues[':co2Target'] = updateData.co2Target;
      }

      if (updateData.co2Actual !== undefined) {
        updateExpression.push('co2Actual = :co2Actual');
        expressionAttributeValues[':co2Actual'] = updateData.co2Actual;
      }

      if (updateData.startDate !== undefined) {
        updateExpression.push('startDate = :startDate');
        updateExpression.push('GSI2SK = :gsi2sk');
        expressionAttributeValues[':startDate'] = updateData.startDate;
        expressionAttributeValues[':gsi2sk'] = `START_DATE#${updateData.startDate}`;
      }

      if (updateData.endDate !== undefined) {
        updateExpression.push('endDate = :endDate');
        expressionAttributeValues[':endDate'] = updateData.endDate;
      }

      if (updateData.status !== undefined) {
        updateExpression.push('#status = :status');
        updateExpression.push('GSI1SK = :gsi1sk2');
        updateExpression.push('GSI2PK = :gsi2pk');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = updateData.status;
        expressionAttributeValues[':gsi1sk2'] = `STATUS#${updateData.status}#NAME#${updateData.name || existing.name}`;
        expressionAttributeValues[':gsi2pk'] = `PROJECT_STATUS#${updateData.status}`;
      }

      if (updateData.progress !== undefined) {
        updateExpression.push('progress = :progress');
        expressionAttributeValues[':progress'] = updateData.progress;
      }

      if (updateData.budgetUsed !== undefined) {
        updateExpression.push('budgetUsed = :budgetUsed');
        expressionAttributeValues[':budgetUsed'] = updateData.budgetUsed;
      }

      updateExpression.push('updatedAt = :updatedAt');
      expressionAttributeValues[':updatedAt'] = now;

      const params = {
        TableName: this.tableName,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: 'METADATA'
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await dynamodb.update(params).promise();
      
      return this.entityToProject(result.Attributes);
    } catch (error) {
      console.error('ProjectRepository.update error:', error);
      throw error;
    }
  }

  /**
   * プロジェクト削除
   */
  async delete(projectId) {
    try {
      // 既存レコードの確認
      const existing = await this.findById(projectId);
      if (!existing) {
        return false;
      }

      const params = {
        TableName: this.tableName,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: 'METADATA'
        }
      };

      await dynamodb.delete(params).promise();
      
      return true;
    } catch (error) {
      console.error('ProjectRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * プロジェクト統計情報取得
   */
  async getStatistics() {
    try {
      const statusCounts = {};
      const statuses = ['planning', 'active', 'completed', 'cancelled'];

      // 各ステータスの件数を並列取得
      const countPromises = statuses.map(async (status) => {
        const params = {
          TableName: this.tableName,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :gsi2pk',
          ExpressionAttributeValues: {
            ':gsi2pk': `PROJECT_STATUS#${status}`
          },
          Select: 'COUNT'
        };

        const result = await dynamodb.query(params).promise();
        return { status, count: result.Count || 0 };
      });

      const results = await Promise.all(countPromises);
      
      results.forEach(({ status, count }) => {
        statusCounts[status] = count;
      });

      // 合計値計算
      const totalProjects = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
      const activeProjects = statusCounts.active || 0;
      const completedProjects = statusCounts.completed || 0;

      return {
        totalProjects,
        activeProjects,
        completedProjects,
        statusBreakdown: statusCounts,
        completionRate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0
      };
    } catch (error) {
      console.error('ProjectRepository.getStatistics error:', error);
      throw error;
    }
  }

  /**
   * 進捗更新（CO2実績、予算使用額）
   */
  async updateProgress(projectId, co2Actual, budgetUsed) {
    try {
      const params = {
        TableName: this.tableName,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: 'METADATA'
        },
        UpdateExpression: 'SET co2Actual = :co2Actual, budgetUsed = :budgetUsed, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':co2Actual': co2Actual,
          ':budgetUsed': budgetUsed,
          ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      };

      const result = await dynamodb.update(params).promise();
      
      return this.entityToProject(result.Attributes);
    } catch (error) {
      console.error('ProjectRepository.updateProgress error:', error);
      throw error;
    }
  }

  /**
   * エンティティからプロジェクトオブジェクトへの変換
   */
  entityToProject(entity) {
    return {
      projectId: entity.projectId,
      name: entity.name,
      description: entity.description,
      customerId: entity.customerId,
      siteLocation: entity.siteLocation,
      budget: entity.budget,
      co2Target: entity.co2Target,
      co2Actual: entity.co2Actual || 0,
      startDate: entity.startDate,
      endDate: entity.endDate,
      status: entity.status,
      progress: entity.progress || 0,
      budgetUsed: entity.budgetUsed || 0,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
}

module.exports = { ProjectRepository };

// TODO: Cursor - 受入テスト実施