const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * ML Prediction API - CO2固定量予測・異常検出・最適化推奨
 */
exports.handler = async (event) => {
  console.log('ML Prediction API Event:', JSON.stringify(event, null, 2));

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const { httpMethod, path, pathParameters, queryStringParameters } = event;
    
    // ルーティング
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'OK' }),
      };
    }

    if (path.includes('/predictions/co2-fixation')) {
      return await handleCO2Prediction(pathParameters, queryStringParameters);
    } else if (path.includes('/anomalies')) {
      return await handleAnomalyDetection(pathParameters, queryStringParameters);
    } else if (path.includes('/recommendations')) {
      return await handleOptimizationRecommendations(pathParameters, queryStringParameters);
    } else if (path.includes('/models/train')) {
      return await handleModelTraining(event.body);
    } else if (path.includes('/models/') && path.includes('/performance')) {
      return await handleModelPerformance(pathParameters);
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Endpoint not found' }),
    };

  } catch (error) {
    console.error('ML Prediction API Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      }),
    };
  }
};

/**
 * CO2固定量予測
 */
async function handleCO2Prediction(pathParameters, queryParams) {
  const { projectId } = pathParameters;
  const timeframe = queryParams?.timeframe || '30days';
  
  try {
    // プロジェクトの過去データを取得
    const measurementData = await getMeasurementHistory(projectId, timeframe);
    const projectData = await getProjectData(projectId);
    
    // 簡易予測モデル（実際にはSageMakerを使用）
    const prediction = calculateCO2Prediction(measurementData, projectData, timeframe);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        projectId,
        timeframe,
        prediction: {
          estimatedCO2Fixation: prediction.co2Amount,
          confidence: prediction.confidence,
          factors: prediction.factors,
          recommendations: prediction.recommendations,
        },
        modelVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    throw new Error(`CO2 prediction failed: ${error.message}`);
  }
}

/**
 * 異常検出
 */
async function handleAnomalyDetection(pathParameters, queryParams) {
  const { projectId } = pathParameters;
  const period = queryParams?.period || '7days';
  
  try {
    const recentData = await getMeasurementHistory(projectId, period);
    const anomalies = detectAnomalies(recentData);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        projectId,
        period,
        anomalies: anomalies.map(anomaly => ({
          timestamp: anomaly.timestamp,
          type: anomaly.type,
          severity: anomaly.severity,
          parameter: anomaly.parameter,
          actualValue: anomaly.actualValue,
          expectedRange: anomaly.expectedRange,
          description: anomaly.description,
        })),
        summary: {
          totalAnomalies: anomalies.length,
          highSeverity: anomalies.filter(a => a.severity === 'high').length,
          mediumSeverity: anomalies.filter(a => a.severity === 'medium').length,
          lowSeverity: anomalies.filter(a => a.severity === 'low').length,
        },
        generatedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    throw new Error(`Anomaly detection failed: ${error.message}`);
  }
}

/**
 * 最適化推奨
 */
async function handleOptimizationRecommendations(pathParameters, queryParams) {
  const { projectId } = pathParameters;
  
  try {
    const projectData = await getProjectData(projectId);
    const measurementData = await getMeasurementHistory(projectId, '30days');
    const recommendations = generateOptimizationRecommendations(projectData, measurementData);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        projectId,
        recommendations: recommendations.map(rec => ({
          id: rec.id,
          category: rec.category,
          title: rec.title,
          description: rec.description,
          impact: rec.impact,
          effort: rec.effort,
          priority: rec.priority,
          expectedImprovement: rec.expectedImprovement,
        })),
        summary: {
          totalRecommendations: recommendations.length,
          highPriority: recommendations.filter(r => r.priority === 'high').length,
          estimatedCO2Improvement: recommendations.reduce((sum, r) => sum + r.expectedImprovement.co2Increase, 0),
          estimatedCostSaving: recommendations.reduce((sum, r) => sum + r.expectedImprovement.costReduction, 0),
        },
        generatedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    throw new Error(`Optimization recommendations failed: ${error.message}`);
  }
}

/**
 * モデル訓練
 */
async function handleModelTraining(body) {
  const params = JSON.parse(body || '{}');
  
  // 実際にはSageMaker Training Jobを起動
  const trainingJobId = `training-${Date.now()}`;
  
  return {
    statusCode: 202,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      trainingJobId,
      status: 'started',
      estimatedDuration: '30-60 minutes',
      parameters: params,
      startedAt: new Date().toISOString(),
    }),
  };
}

/**
 * モデル性能
 */
async function handleModelPerformance(pathParameters) {
  const { modelId } = pathParameters;
  
  // モックデータ - 実際にはSageMakerから取得
  const performance = {
    accuracy: 0.87,
    precision: 0.89,
    recall: 0.85,
    f1Score: 0.87,
    mae: 0.12, // Mean Absolute Error
    rmse: 0.18, // Root Mean Square Error
  };
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      modelId,
      performance,
      lastEvaluated: new Date().toISOString(),
    }),
  };
}

/**
 * 測定データ履歴取得
 */
async function getMeasurementHistory(projectId, timeframe) {
  const endDate = new Date();
  const startDate = new Date();
  
  // timeframeに基づいて開始日を設定
  switch (timeframe) {
    case '7days':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30days':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90days':
      startDate.setDate(endDate.getDate() - 90);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }
  
  const command = new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startSK AND :endSK',
    ExpressionAttributeValues: {
      ':pk': `PROJECT#${projectId}`,
      ':startSK': `MEASUREMENT#${startDate.toISOString()}`,
      ':endSK': `MEASUREMENT#${endDate.toISOString()}`,
    },
  });
  
  const result = await docClient.send(command);
  return result.Items || [];
}

/**
 * プロジェクトデータ取得
 */
async function getProjectData(projectId) {
  const command = new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `PROJECT#${projectId}`,
      ':sk': 'METADATA',
    },
  });
  
  const result = await docClient.send(command);
  return result.Items?.[0] || null;
}

/**
 * CO2固定量予測計算
 */
function calculateCO2Prediction(measurementData, projectData, timeframe) {
  if (!measurementData.length || !projectData) {
    return {
      co2Amount: 0,
      confidence: 0,
      factors: [],
      recommendations: [],
    };
  }
  
  // 簡易予測モデル（実際には機械学習モデルを使用）
  const avgPH = measurementData.reduce((sum, m) => sum + (m.values?.ph || 7), 0) / measurementData.length;
  const avgTemp = measurementData.reduce((sum, m) => sum + (m.values?.temperature || 20), 0) / measurementData.length;
  const avgFlow = measurementData.reduce((sum, m) => sum + (m.values?.flowRate || 100), 0) / measurementData.length;
  
  // CO2固定量予測（簡易計算）
  const baseCO2Rate = 0.5; // kg CO2/day 基準値
  const phFactor = Math.max(0.5, Math.min(1.5, (avgPH - 6) / 2)); // pH影響
  const tempFactor = Math.max(0.7, Math.min(1.3, avgTemp / 25)); // 温度影響
  const flowFactor = Math.max(0.6, Math.min(1.4, avgFlow / 100)); // 流量影響
  
  const days = timeframe === '7days' ? 7 : timeframe === '30days' ? 30 : 90;
  const predictedCO2 = baseCO2Rate * phFactor * tempFactor * flowFactor * days;
  
  return {
    co2Amount: Math.round(predictedCO2 * 100) / 100,
    confidence: 0.75 + Math.random() * 0.2, // 0.75-0.95の範囲
    factors: [
      { name: 'pH Level', impact: phFactor, value: avgPH },
      { name: 'Temperature', impact: tempFactor, value: avgTemp },
      { name: 'Flow Rate', impact: flowFactor, value: avgFlow },
    ],
    recommendations: [
      'pH値を7.5-8.0の範囲に維持することで効率が向上します',
      '温度管理により季節変動を補正できます',
      '流量調整でより安定した処理が期待できます',
    ],
  };
}

/**
 * 異常検出
 */
function detectAnomalies(measurementData) {
  const anomalies = [];
  
  for (const measurement of measurementData) {
    const values = measurement.values || {};
    
    // pH異常
    if (values.ph && (values.ph < 6.0 || values.ph > 9.0)) {
      anomalies.push({
        timestamp: measurement.timestamp,
        type: 'parameter_out_of_range',
        severity: values.ph < 5.0 || values.ph > 10.0 ? 'high' : 'medium',
        parameter: 'ph',
        actualValue: values.ph,
        expectedRange: [6.0, 9.0],
        description: `pH値が正常範囲外: ${values.ph}`,
      });
    }
    
    // 温度異常
    if (values.temperature && (values.temperature < 5 || values.temperature > 40)) {
      anomalies.push({
        timestamp: measurement.timestamp,
        type: 'parameter_out_of_range',
        severity: values.temperature < 0 || values.temperature > 50 ? 'high' : 'medium',
        parameter: 'temperature',
        actualValue: values.temperature,
        expectedRange: [5, 40],
        description: `温度が正常範囲外: ${values.temperature}°C`,
      });
    }
    
    // 流量異常
    if (values.flowRate && (values.flowRate < 10 || values.flowRate > 500)) {
      anomalies.push({
        timestamp: measurement.timestamp,
        type: 'parameter_out_of_range',
        severity: values.flowRate < 5 || values.flowRate > 1000 ? 'high' : 'low',
        parameter: 'flowRate',
        actualValue: values.flowRate,
        expectedRange: [10, 500],
        description: `流量が正常範囲外: ${values.flowRate} L/min`,
      });
    }
  }
  
  return anomalies;
}

/**
 * 最適化推奨生成
 */
function generateOptimizationRecommendations(projectData, measurementData) {
  const recommendations = [];
  
  if (!measurementData.length) {
    return recommendations;
  }
  
  const recentMeasurements = measurementData.slice(-10); // 最新10件
  const avgPH = recentMeasurements.reduce((sum, m) => sum + (m.values?.ph || 7), 0) / recentMeasurements.length;
  const avgTemp = recentMeasurements.reduce((sum, m) => sum + (m.values?.temperature || 20), 0) / recentMeasurements.length;
  
  // pH最適化推奨
  if (avgPH < 7.5) {
    recommendations.push({
      id: 'ph-optimization-1',
      category: 'chemical',
      title: 'pH値の最適化',
      description: 'アルカリ剤の添加量を調整してpH値を7.5-8.0の範囲に維持することを推奨します',
      impact: 'high',
      effort: 'medium',
      priority: 'high',
      expectedImprovement: {
        co2Increase: 15, // %
        costReduction: 5000, // JPY/month
      },
    });
  }
  
  // 温度最適化推奨
  if (avgTemp < 15 || avgTemp > 30) {
    recommendations.push({
      id: 'temp-optimization-1',
      category: 'thermal',
      title: '温度管理の改善',
      description: '温度制御システムの導入により安定した反応環境を維持することを推奨します',
      impact: 'medium',
      effort: 'high',
      priority: 'medium',
      expectedImprovement: {
        co2Increase: 10,
        costReduction: 3000,
      },
    });
  }
  
  // 測定頻度推奨
  if (measurementData.length < 20) {
    recommendations.push({
      id: 'monitoring-optimization-1',
      category: 'monitoring',
      title: '測定頻度の向上',
      description: 'より頻繁な測定により早期の問題検出と最適化が可能になります',
      impact: 'medium',
      effort: 'low',
      priority: 'medium',
      expectedImprovement: {
        co2Increase: 5,
        costReduction: 2000,
      },
    });
  }
  
  return recommendations;
}