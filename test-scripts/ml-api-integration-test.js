const https = require('https');
const fs = require('fs');

// API Gateway エンドポイント
const API_BASE_URL = 'https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod';

// テスト対象エンドポイント
const API_ENDPOINTS = [
  // 既存API (21個)
  { method: 'GET', path: '/customers', name: '顧客一覧取得' },
  { method: 'POST', path: '/customers', name: '顧客作成' },
  { method: 'GET', path: '/customers/test-customer-id', name: '顧客詳細取得' },
  { method: 'PUT', path: '/customers/test-customer-id', name: '顧客更新' },
  { method: 'DELETE', path: '/customers/test-customer-id', name: '顧客削除' },
  
  { method: 'GET', path: '/projects', name: 'プロジェクト一覧取得' },
  { method: 'POST', path: '/projects', name: 'プロジェクト作成' },
  { method: 'GET', path: '/projects/test-project-id', name: 'プロジェクト詳細取得' },
  { method: 'PUT', path: '/projects/test-project-id', name: 'プロジェクト更新' },
  { method: 'DELETE', path: '/projects/test-project-id', name: 'プロジェクト削除' },
  
  { method: 'GET', path: '/measurements', name: '測定データ一覧取得' },
  { method: 'POST', path: '/measurements', name: '測定データ作成' },
  { method: 'GET', path: '/measurements/test-measurement-id', name: '測定データ詳細取得' },
  { method: 'PUT', path: '/measurements/test-measurement-id', name: '測定データ更新' },
  { method: 'DELETE', path: '/measurements/test-measurement-id', name: '測定データ削除' },
  
  { method: 'GET', path: '/reports', name: 'レポート一覧取得' },
  { method: 'POST', path: '/reports', name: 'レポート作成' },
  { method: 'GET', path: '/reports/test-report-id', name: 'レポート詳細取得' },
  { method: 'PUT', path: '/reports/test-report-id', name: 'レポート更新' },
  { method: 'DELETE', path: '/reports/test-report-id', name: 'レポート削除' },
  
  { method: 'GET', path: '/health', name: 'ヘルスチェック' },
  
  // 新規ML予測API (5個)
  { method: 'GET', path: '/ml/predictions/co2-fixation/test-project-id', name: 'CO2固定量予測' },
  { method: 'GET', path: '/ml/anomalies/test-project-id', name: '異常検出' },
  { method: 'GET', path: '/ml/recommendations/test-project-id', name: '最適化推奨' },
  { method: 'POST', path: '/ml/models/train', name: 'モデル訓練' },
  { method: 'GET', path: '/ml/models/test-model-id/performance', name: 'モデル性能評価' },
];

// テスト結果
const testResults = {
  totalTests: API_ENDPOINTS.length,
  passed: 0,
  failed: 0,
  details: [],
};

// HTTPリクエスト関数
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ML-API-Integration-Test/1.0',
      },
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseBody,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(30000); // 30秒タイムアウト

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 個別エンドポイントテスト
async function testEndpoint(endpoint) {
  const startTime = Date.now();
  
  try {
    console.log(`Testing: ${endpoint.method} ${endpoint.path} (${endpoint.name})`);
    
    let testData = null;
    if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
      testData = generateTestData(endpoint.path);
    }
    
    const response = await makeRequest(endpoint.method, endpoint.path, testData);
    const duration = Date.now() - startTime;
    
    const isSuccess = response.statusCode < 400;
    const result = {
      endpoint: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
      statusCode: response.statusCode,
      duration: duration,
      success: isSuccess,
      response: response.body.substring(0, 200), // 最初の200文字のみ
    };
    
    if (isSuccess) {
      testResults.passed++;
      console.log(`✅ ${endpoint.name} - Status: ${response.statusCode} - Duration: ${duration}ms`);
    } else {
      testResults.failed++;
      console.log(`❌ ${endpoint.name} - Status: ${response.statusCode} - Duration: ${duration}ms`);
    }
    
    testResults.details.push(result);
    
  } catch (error) {
    testResults.failed++;
    const result = {
      endpoint: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
    
    testResults.details.push(result);
    console.log(`❌ ${endpoint.name} - Error: ${error.message}`);
  }
}

// テストデータ生成
function generateTestData(path) {
  if (path.includes('/customers')) {
    return {
      name: 'テスト顧客',
      email: 'test@example.com',
      phone: '03-1234-5678',
      address: '東京都渋谷区',
    };
  } else if (path.includes('/projects')) {
    return {
      name: 'テストプロジェクト',
      description: '統合テスト用プロジェクト',
      location: '北海道',
      startDate: '2024-01-01',
      targetCO2: 1000,
    };
  } else if (path.includes('/measurements')) {
    return {
      projectId: 'test-project-id',
      pH: 7.2,
      temperature: 15.5,
      flow: 100.0,
      co2Concentration: 400,
      measuredAt: new Date().toISOString(),
    };
  } else if (path.includes('/reports')) {
    return {
      projectId: 'test-project-id',
      type: 'monthly',
      title: 'テストレポート',
      data: { summary: 'テスト用データ' },
    };
  } else if (path.includes('/ml/models/train')) {
    return {
      projectId: 'test-project-id',
      modelType: 'co2-prediction',
      trainingData: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      },
    };
  }
  
  return {};
}

// メイン実行関数
async function runIntegrationTest() {
  console.log('🚀 ML予測API統合テスト開始');
  console.log(`📊 テスト対象エンドポイント: ${API_ENDPOINTS.length}個`);
  console.log(`🔗 API Base URL: ${API_BASE_URL}`);
  console.log('=' * 80);
  
  const startTime = Date.now();
  
  // 各エンドポイントを順次テスト
  for (const endpoint of API_ENDPOINTS) {
    await testEndpoint(endpoint);
    // レート制限対策で少し待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const totalDuration = Date.now() - startTime;
  
  // 結果まとめ
  console.log('\n' + '=' * 80);
  console.log('📋 テスト結果サマリー');
  console.log(`✅ 成功: ${testResults.passed}/${testResults.totalTests}`);
  console.log(`❌ 失敗: ${testResults.failed}/${testResults.totalTests}`);
  console.log(`⏱️  総実行時間: ${totalDuration}ms`);
  console.log(`📈 成功率: ${((testResults.passed / testResults.totalTests) * 100).toFixed(1)}%`);
  
  // 詳細結果をファイルに出力
  const reportFileName = `ml-api-test-result-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportFileName, JSON.stringify(testResults, null, 2));
  console.log(`📄 詳細結果をファイルに出力: ${reportFileName}`);
  
  // 失敗したエンドポイントの詳細
  const failedTests = testResults.details.filter(result => !result.success);
  if (failedTests.length > 0) {
    console.log('\n❌ 失敗したエンドポイント:');
    failedTests.forEach(test => {
      console.log(`  - ${test.endpoint} (${test.method} ${test.path})`);
      console.log(`    Status: ${test.statusCode || 'N/A'}, Error: ${test.error || 'N/A'}`);
    });
  }
  
  console.log('\n🎯 ML予測API統合テスト完了');
  
  // 終了コード
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 実行
if (require.main === module) {
  runIntegrationTest().catch(console.error);
}

module.exports = { runIntegrationTest, testResults }; 