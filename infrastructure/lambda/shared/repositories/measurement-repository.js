const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * Measurement Repository - DynamoDB Single Table Design
 * 
 * Primary Table Keys:
 * PK: PROJECT#{projectId}
 * SK: MEASUREMENT#{timestamp}#{measurementId}
 * 
 * GSI1 (Type + Timestamp):
 * GSI1PK: MEASUREMENT_TYPE#{type}
 * GSI1SK: TIMESTAMP#{timestamp}
 * 
 * GSI2 (Project + Type + Timestamp):
 * GSI2PK: PROJECT#{projectId}#TYPE#{type}
 * GSI2SK: TIMESTAMP#{timestamp}
 */
class MeasurementRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * プロジェクトの測定データ一覧取得（時系列データ、ページネーション対応）
   */
  async findByProject(projectId, query = {}) {
    try {
      const {
        limit = 50,
        nextToken,
        startDate,
        endDate,
        type,
        alertsOnly = false
      } = query;

      let params;

      if (type) {
        // 特定タイプでフィルタ
        params = {
          TableName: this.tableName,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :gsi2pk',
          ExpressionAttributeValues: {
            ':gsi2pk': `PROJECT#${projectId}#TYPE#${type}`
          },
          Limit: limit,
          ScanIndexForward: false // 新しい順
        };

        // 期間フィルタ
        if (startDate || endDate) {
          if (startDate && endDate) {
            params.KeyConditionExpression += ' AND GSI2SK BETWEEN :startDate AND :endDate';
            params.ExpressionAttributeValues[':startDate'] = `TIMESTAMP#${startDate}`;
            params.ExpressionAttributeValues[':endDate'] = `TIMESTAMP#${endDate}`;
          } else if (startDate) {
            params.KeyConditionExpression += ' AND GSI2SK >= :startDate';
            params.ExpressionAttributeValues[':startDate'] = `TIMESTAMP#${startDate}`;
          } else if (endDate) {
            params.KeyConditionExpression += ' AND GSI2SK <= :endDate';
            params.ExpressionAttributeValues[':endDate'] = `TIMESTAMP#${endDate}`;
          }
        }
      } else {
        // 全タイプ（プロジェクトIDでクエリ）
        params = {
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': `PROJECT#${projectId}`,
            ':sk': 'MEASUREMENT#'
          },
          Limit: limit,
          ScanIndexForward: false // 新しい順
        };

        // 期間フィルタ（SK: MEASUREMENT#{timestamp}#{measurementId}）
        if (startDate || endDate) {
          const filterExpressions = [];
          
          if (startDate) {
            filterExpressions.push('#timestamp >= :startDate');
            params.ExpressionAttributeValues[':startDate'] = startDate;
          }
          
          if (endDate) {
            filterExpressions.push('#timestamp <= :endDate');
            params.ExpressionAttributeValues[':endDate'] = endDate;
          }

          if (filterExpressions.length > 0) {
            params.FilterExpression = filterExpressions.join(' AND ');
            params.ExpressionAttributeNames = {
              '#timestamp': 'timestamp'
            };
          }
        }
      }

      // アラートのみフィルタ
      if (alertsOnly) {
        const alertFilter = 'alertLevel = :alertLevel';
        if (params.FilterExpression) {
          params.FilterExpression += ` AND ${alertFilter}`;
        } else {
          params.FilterExpression = alertFilter;
        }
        params.ExpressionAttributeValues = {
          ...params.ExpressionAttributeValues,
          ':alertLevel': 'high'
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

      const result = type 
        ? await dynamodb.query(params).promise()
        : await dynamodb.query(params).promise();

      return {
        measurements: result.Items?.map(this.entityToMeasurement) || [],
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
      console.error('MeasurementRepository.findByProject error:', error);
      throw error;
    }
  }

  /**
   * 測定データ詳細取得
   */
  async findById(projectId, measurementId) {
    try {
      // SK を構築するため、まず該当する測定データを検索
      const params = {
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: 'measurementId = :measurementId',
        ExpressionAttributeValues: {
          ':pk': `PROJECT#${projectId}`,
          ':sk': 'MEASUREMENT#',
          ':measurementId': measurementId
        }
      };

      const result = await dynamodb.query(params).promise();
      
      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return this.entityToMeasurement(result.Items[0]);
    } catch (error) {
      console.error('MeasurementRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * タイプ別測定データ取得
   */
  async findByType(type, limit = 50) {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': `MEASUREMENT_TYPE#${type}`
        },
        Limit: limit,
        ScanIndexForward: false // 新しい順
      };

      const result = await dynamodb.query(params).promise();
      
      return result.Items?.map(this.entityToMeasurement) || [];
    } catch (error) {
      console.error('MeasurementRepository.findByType error:', error);
      throw error;
    }
  }

  /**
   * 測定データ作成
   */
  async create(projectId, measurementData) {
    try {
      const measurementId = uuidv4();
      const now = new Date().toISOString();
      const timestamp = measurementData.timestamp || now;

      // アラートレベル計算
      const alertLevel = this.calculateAlertLevel(measurementData.type, measurementData.values);

      const entity = {
        PK: `PROJECT#${projectId}`,
        SK: `MEASUREMENT#${timestamp}#${measurementId}`,
        GSI1PK: `MEASUREMENT_TYPE#${measurementData.type}`,
        GSI1SK: `TIMESTAMP#${timestamp}`,
        GSI2PK: `PROJECT#${projectId}#TYPE#${measurementData.type}`,
        GSI2SK: `TIMESTAMP#${timestamp}`,
        measurementId,
        projectId,
        timestamp,
        type: measurementData.type,
        values: measurementData.values,
        location: measurementData.location || null,
        notes: measurementData.notes || '',
        alertLevel,
        isAnomaly: this.detectAnomaly(measurementData.type, measurementData.values),
        createdAt: now,
        updatedAt: now
      };

      const params = {
        TableName: this.tableName,
        Item: entity
      };

      await dynamodb.put(params).promise();

      return this.entityToMeasurement(entity);
    } catch (error) {
      console.error('MeasurementRepository.create error:', error);
      throw error;
    }
  }

  /**
   * 測定データ更新
   */
  async update(projectId, measurementId, updateData) {
    try {
      // 既存レコードの確認
      const existing = await this.findById(projectId, measurementId);
      if (!existing) {
        return null;
      }

      const now = new Date().toISOString();
      const updateExpression = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      // 動的な更新式を構築
      if (updateData.values !== undefined) {
        updateExpression.push('#values = :values');
        expressionAttributeNames['#values'] = 'values';
        expressionAttributeValues[':values'] = updateData.values;

        // アラートレベル再計算
        const alertLevel = this.calculateAlertLevel(existing.type, updateData.values);
        updateExpression.push('alertLevel = :alertLevel');
        expressionAttributeValues[':alertLevel'] = alertLevel;

        // 異常検出再実行
        const isAnomaly = this.detectAnomaly(existing.type, updateData.values);
        updateExpression.push('isAnomaly = :isAnomaly');
        expressionAttributeValues[':isAnomaly'] = isAnomaly;
      }

      if (updateData.location !== undefined) {
        updateExpression.push('#location = :location');
        expressionAttributeNames['#location'] = 'location';
        expressionAttributeValues[':location'] = updateData.location;
      }

      if (updateData.notes !== undefined) {
        updateExpression.push('notes = :notes');
        expressionAttributeValues[':notes'] = updateData.notes;
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
      
      return this.entityToMeasurement(result.Attributes);
    } catch (error) {
      console.error('MeasurementRepository.update error:', error);
      throw error;
    }
  }

  /**
   * 測定データ削除
   */
  async delete(projectId, measurementId) {
    try {
      // 既存レコードの確認
      const existing = await this.findById(projectId, measurementId);
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
      console.error('MeasurementRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * 測定データバッチ作成
   */
  async createBatch(projectId, measurementsData) {
    try {
      const results = {
        successful: [],
        failed: []
      };

      // バッチ処理（25件ずつ）
      const batchSize = 25;
      for (let i = 0; i < measurementsData.length; i += batchSize) {
        const batch = measurementsData.slice(i, i + batchSize);
        
        const writeRequests = batch.map(measurementData => {
          try {
            const measurementId = uuidv4();
            const now = new Date().toISOString();
            const timestamp = measurementData.timestamp || now;
            const alertLevel = this.calculateAlertLevel(measurementData.type, measurementData.values);

            const entity = {
              PK: `PROJECT#${projectId}`,
              SK: `MEASUREMENT#${timestamp}#${measurementId}`,
              GSI1PK: `MEASUREMENT_TYPE#${measurementData.type}`,
              GSI1SK: `TIMESTAMP#${timestamp}`,
              GSI2PK: `PROJECT#${projectId}#TYPE#${measurementData.type}`,
              GSI2SK: `TIMESTAMP#${timestamp}`,
              measurementId,
              projectId,
              timestamp,
              type: measurementData.type,
              values: measurementData.values,
              location: measurementData.location || null,
              notes: measurementData.notes || '',
              alertLevel,
              isAnomaly: this.detectAnomaly(measurementData.type, measurementData.values),
              createdAt: now,
              updatedAt: now
            };

            return {
              PutRequest: {
                Item: entity
              }
            };
          } catch (error) {
            results.failed.push({
              data: measurementData,
              error: error.message
            });
            return null;
          }
        }).filter(request => request !== null);

        if (writeRequests.length > 0) {
          const params = {
            RequestItems: {
              [this.tableName]: writeRequests
            }
          };

          const result = await dynamodb.batchWrite(params).promise();
          
          // 成功した件数を記録
          const successCount = writeRequests.length - (result.UnprocessedItems[this.tableName]?.length || 0);
          results.successful.push(...Array(successCount).fill().map(() => ({})));

          // 未処理アイテムの処理
          if (result.UnprocessedItems[this.tableName]) {
            results.failed.push(...result.UnprocessedItems[this.tableName].map(item => ({
              data: item.PutRequest.Item,
              error: 'Unprocessed item'
            })));
          }
        }
      }

      return results;
    } catch (error) {
      console.error('MeasurementRepository.createBatch error:', error);
      throw error;
    }
  }

  /**
   * アラートレベル計算
   */
  calculateAlertLevel(type, values) {
    const thresholds = {
      water_quality: {
        ph: { low: 6.5, high: 8.5 },
        iron: { high: 0.3 },
        copper: { high: 1.0 },
        zinc: { high: 5.0 }
      },
      atmospheric: {
        co2Concentration: { high: 1000 },
        temperature: { low: 0, high: 40 }
      },
      soil: {
        ph: { low: 6.0, high: 8.0 },
        temperature: { low: 5, high: 35 }
      }
    };

    const typeThresholds = thresholds[type];
    if (!typeThresholds) return 'normal';

    for (const [key, value] of Object.entries(values)) {
      const threshold = typeThresholds[key];
      if (!threshold) continue;

      if (threshold.high && value > threshold.high) return 'high';
      if (threshold.low && value < threshold.low) return 'high';
    }

    return 'normal';
  }

  /**
   * 異常検出
   */
  detectAnomaly(type, values) {
    // 簡単な異常検出ロジック
    const anomalyThresholds = {
      water_quality: {
        ph: { min: 4.0, max: 10.0 },
        temperature: { min: -10, max: 60 }
      },
      atmospheric: {
        co2Concentration: { max: 5000 },
        temperature: { min: -20, max: 60 }
      },
      soil: {
        ph: { min: 4.0, max: 10.0 },
        temperature: { min: -10, max: 50 }
      }
    };

    const typeThresholds = anomalyThresholds[type];
    if (!typeThresholds) return false;

    for (const [key, value] of Object.entries(values)) {
      const threshold = typeThresholds[key];
      if (!threshold) continue;

      if (threshold.max && value > threshold.max) return true;
      if (threshold.min && value < threshold.min) return true;
    }

    return false;
  }

  /**
   * 測定データサマリー計算
   */
  calculateSummary(measurements) {
    if (!measurements || measurements.length === 0) {
      return {
        totalCount: 0,
        alertCount: 0,
        anomalyCount: 0,
        typeBreakdown: {}
      };
    }

    const summary = {
      totalCount: measurements.length,
      alertCount: 0,
      anomalyCount: 0,
      typeBreakdown: {}
    };

    measurements.forEach(measurement => {
      // アラート数カウント
      if (measurement.alertLevel === 'high') {
        summary.alertCount++;
      }

      // 異常数カウント
      if (measurement.isAnomaly) {
        summary.anomalyCount++;
      }

      // タイプ別カウント
      const type = measurement.type;
      if (!summary.typeBreakdown[type]) {
        summary.typeBreakdown[type] = 0;
      }
      summary.typeBreakdown[type]++;
    });

    return summary;
  }

  /**
   * エンティティから測定データオブジェクトへの変換
   */
  entityToMeasurement(entity) {
    return {
      measurementId: entity.measurementId,
      projectId: entity.projectId,
      timestamp: entity.timestamp,
      type: entity.type,
      values: entity.values,
      location: entity.location,
      notes: entity.notes,
      alertLevel: entity.alertLevel,
      isAnomaly: entity.isAnomaly,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      // Internal fields for DynamoDB operations
      PK: entity.PK,
      SK: entity.SK
    };
  }
}

module.exports = { MeasurementRepository };

// TODO: Cursor - 受入テスト実施