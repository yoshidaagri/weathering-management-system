const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Lambda関数直接テストクラス
 */
class LambdaDirectTest {
  constructor() {
    this.testResults = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      details: [],
    };
  }

  /**
   * Lambda関数を直接呼び出し
   */
     async invokeLambdaFunction(functionName, payload) {
     try {
       const payloadString = JSON.stringify(payload);
       const base64Payload = Buffer.from(payloadString).toString('base64');
       
       // AWS CLI で Lambda 関数を呼び出し (base64エンコードされたペイロード)
       const command = `aws lambda invoke --function-name ${functionName} --payload ${base64Payload} response.json`;
       
       console.log(`Invoking Lambda: ${functionName}`);
       const result = execSync(command, { encoding: 'utf8' });
       
       // レスポンスファイルを読み取り
       const responseFile = path.join(__dirname, 'response.json');
       let response = {};
       if (fs.existsSync(responseFile)) {
         response = JSON.parse(fs.readFileSync(responseFile, 'utf8'));
         fs.unlinkSync(responseFile); // クリーンアップ
       }
       
       return {
         success: true,
         statusCode: response.statusCode || 200,
         body: response.body || response,
         executionResult: result,
       };
       
     } catch (error) {
       return {
         success: false,
         error: error.message,
         statusCode: 500,
       };
     }
   }

  /**
   * 顧客APIテスト
   */
  async testCustomerAPI() {
    console.log('🧪 顧客API Lambda関数テスト');
    
         const functionName = 'WeatheringProjectStack-CustomerApiFunctionBCE3D4F0-1WyjSMj5GKPb';
     const testCases = [
       {
         name: '顧客一覧取得',
         payload: {
           httpMethod: 'GET',
           path: '/customers',
           queryStringParameters: null,
           headers: { 'Content-Type': 'application/json' },
         },
       },
       {
         name: '顧客作成',
         payload: {
           httpMethod: 'POST',
           path: '/customers',
           body: JSON.stringify({
             name: 'テスト顧客',
             email: 'test@example.com',
             phone: '03-1234-5678',
           }),
           headers: { 'Content-Type': 'application/json' },
         },
       },
     ];

    for (const testCase of testCases) {
      await this.runSingleTest(functionName, testCase);
    }
  }

  /**
   * プロジェクトAPIテスト
   */
  async testProjectAPI() {
    console.log('\n🧪 プロジェクトAPI Lambda関数テスト');
    
         const functionName = 'WeatheringProjectStack-ProjectApiFunction931A0493-RS5XbBlbKxgS';
     const testCases = [
       {
         name: 'プロジェクト一覧取得',
         payload: {
           httpMethod: 'GET',
           path: '/projects',
           queryStringParameters: null,
           headers: { 'Content-Type': 'application/json' },
         },
       },
       {
         name: 'プロジェクト作成',
         payload: {
           httpMethod: 'POST',
           path: '/projects',
           body: JSON.stringify({
             name: 'テストプロジェクト',
             description: 'Lambda直接テスト用',
             location: '北海道',
             targetCO2: 1000,
           }),
           headers: { 'Content-Type': 'application/json' },
         },
       },
     ];

    for (const testCase of testCases) {
      await this.runSingleTest(functionName, testCase);
    }
  }

  /**
   * 測定データAPIテスト
   */
  async testMeasurementAPI() {
    console.log('\n🧪 測定データAPI Lambda関数テスト');
    
         const functionName = 'WeatheringProjectStack-MeasurementApiFunction87069-SDaRP0fzM5ow';
     const testCases = [
       {
         name: '測定データ一覧取得',
         payload: {
           httpMethod: 'GET',
           path: '/projects/test-project-id/measurements',
           pathParameters: { projectId: 'test-project-id' },
           queryStringParameters: null,
           headers: { 'Content-Type': 'application/json' },
         },
       },
       {
         name: '測定データ作成',
         payload: {
           httpMethod: 'POST',
           path: '/projects/test-project-id/measurements',
           pathParameters: { projectId: 'test-project-id' },
           body: JSON.stringify({
             pH: 7.2,
             temperature: 15.5,
             flow: 100.0,
             co2Concentration: 400,
             measuredAt: new Date().toISOString(),
           }),
           headers: { 'Content-Type': 'application/json' },
         },
       },
     ];

    for (const testCase of testCases) {
      await this.runSingleTest(functionName, testCase);
    }
  }

  /**
   * ML予測APIテスト
   */
  async testMLPredictionAPI() {
    console.log('\n🧪 ML予測API Lambda関数テスト');
    
         const functionName = 'WeatheringProjectStack-MLPredictionFunction172496D-nPzGBWvVf4uM';
     const testCases = [
       {
         name: 'CO2固定量予測',
         payload: {
           httpMethod: 'GET',
           path: '/ml/predictions/co2-fixation/test-project-id',
           pathParameters: { projectId: 'test-project-id' },
           queryStringParameters: { timeframe: '30days' },
           headers: { 'Content-Type': 'application/json' },
         },
       },
       {
         name: '異常検出',
         payload: {
           httpMethod: 'GET',
           path: '/ml/anomalies/test-project-id',
           pathParameters: { projectId: 'test-project-id' },
           queryStringParameters: { period: '7days' },
           headers: { 'Content-Type': 'application/json' },
         },
       },
       {
         name: '最適化推奨',
         payload: {
           httpMethod: 'GET',
           path: '/ml/recommendations/test-project-id',
           pathParameters: { projectId: 'test-project-id' },
           queryStringParameters: null,
           headers: { 'Content-Type': 'application/json' },
         },
       },
       {
         name: 'モデル訓練',
         payload: {
           httpMethod: 'POST',
           path: '/ml/models/train',
           body: JSON.stringify({
             projectId: 'test-project-id',
             modelType: 'co2-prediction',
             trainingData: {
               startDate: '2024-01-01',
               endDate: '2024-12-31',
             },
           }),
           headers: { 'Content-Type': 'application/json' },
         },
       },
     ];

    for (const testCase of testCases) {
      await this.runSingleTest(functionName, testCase);
    }
  }

  /**
   * レポートAPIテスト
   */
  async testReportAPI() {
    console.log('\n🧪 レポートAPI Lambda関数テスト');
    
         const functionName = 'WeatheringProjectStack-ReportGeneratorFunction9B20-90lWr7dbMqNC';
     const testCases = [
       {
         name: 'レポート一覧取得',
         payload: {
           httpMethod: 'GET',
           path: '/projects/test-project-id/reports',
           pathParameters: { projectId: 'test-project-id' },
           queryStringParameters: null,
           headers: { 'Content-Type': 'application/json' },
         },
       },
       {
         name: 'レポート生成',
         payload: {
           httpMethod: 'POST',
           path: '/projects/test-project-id/reports',
           pathParameters: { projectId: 'test-project-id' },
           body: JSON.stringify({
             type: 'monthly',
             title: 'テストレポート',
             period: {
               start: '2024-01-01',
               end: '2024-01-31',
             },
           }),
           headers: { 'Content-Type': 'application/json' },
         },
       },
     ];

    for (const testCase of testCases) {
      await this.runSingleTest(functionName, testCase);
    }
  }

  /**
   * 単一テストケース実行
   */
  async runSingleTest(functionName, testCase) {
    this.testResults.totalTests++;
    const startTime = Date.now();
    
    try {
      const result = await this.invokeLambdaFunction(functionName, testCase.payload);
      const duration = Date.now() - startTime;
      
      const testResult = {
        name: testCase.name,
        functionName: functionName,
        success: result.success,
        statusCode: result.statusCode,
        duration: duration,
        response: result.body ? JSON.stringify(result.body).substring(0, 200) : '',
        error: result.error,
      };
      
      if (result.success && result.statusCode < 400) {
        this.testResults.passed++;
        console.log(`✅ ${testCase.name} - Status: ${result.statusCode} - Duration: ${duration}ms`);
      } else {
        this.testResults.failed++;
        console.log(`❌ ${testCase.name} - Status: ${result.statusCode} - Duration: ${duration}ms`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
      
      this.testResults.details.push(testResult);
      
    } catch (error) {
      this.testResults.failed++;
      console.log(`❌ ${testCase.name} - Error: ${error.message}`);
      
      this.testResults.details.push({
        name: testCase.name,
        functionName: functionName,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * すべてのテストを実行
   */
  async runAllTests() {
    console.log('🚀 Lambda関数直接テスト開始');
    console.log('=' * 60);
    
    const startTime = Date.now();
    
    try {
             // 各API関数をテスト
       await this.testCustomerAPI();
       await this.testProjectAPI();
       await this.testMeasurementAPI();
       await this.testMLPredictionAPI(); // ML予測API関数が確認できたので有効化
       await this.testReportAPI();
      
    } catch (error) {
      console.error('テスト実行中にエラーが発生:', error.message);
    }
    
    const totalDuration = Date.now() - startTime;
    
    // 結果サマリー
    console.log('\n' + '=' * 60);
    console.log('📊 Lambda関数直接テスト結果');
    console.log(`✅ 成功: ${this.testResults.passed}/${this.testResults.totalTests}`);
    console.log(`❌ 失敗: ${this.testResults.failed}/${this.testResults.totalTests}`);
    console.log(`⏱️  総実行時間: ${totalDuration}ms`);
    console.log(`📈 成功率: ${((this.testResults.passed / this.testResults.totalTests) * 100).toFixed(1)}%`);
    
    // 詳細結果をファイルに保存
    const reportFile = `lambda-test-result-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(this.testResults, null, 2));
    console.log(`📄 詳細結果: ${reportFile}`);
    
    // 失敗したテストの詳細
    const failedTests = this.testResults.details.filter(test => !test.success);
    if (failedTests.length > 0) {
      console.log('\n❌ 失敗したテスト:');
      failedTests.forEach(test => {
        console.log(`  - ${test.name} (${test.functionName})`);
        console.log(`    Error: ${test.error || 'Unknown error'}`);
      });
    }
    
    console.log('\n🎯 Lambda関数直接テスト完了');
    
    return this.testResults.passed === this.testResults.totalTests;
  }
}

/**
 * メイン実行
 */
async function main() {
  const tester = new LambdaDirectTest();
  const success = await tester.runAllTests();
  
  process.exit(success ? 0 : 1);
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { LambdaDirectTest }; 