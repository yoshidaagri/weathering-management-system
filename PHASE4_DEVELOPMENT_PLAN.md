# Phase 4: システム統合テスト・監視設定・本番運用準備 - 詳細作業指示書

## 🎯 Phase 4概要: 本番運用開始準備

### 前提条件
**Phase 3完了状況**: ✅ 100%実装完了
- プロジェクト管理API実装完了
- 測定データAPI実装完了  
- レポート生成API実装完了
- フロントエンド統合完了
- 21エンドポイントAPI仕様完成

### Phase 4目標
1. **統合テスト完全実施**: 全システム連携動作確認
2. **監視・ログ基盤構築**: CloudWatch運用監視設定
3. **パフォーマンス最適化**: レスポンス時間・スループット改善
4. **本番運用準備**: セキュリティ・バックアップ・災害復旧対策
5. **ドキュメント整備**: 運用手順書・トラブルシューティングガイド

---

## 🔧 4.1 統合テスト実施（高優先度）

### 4.1.1 CDKデプロイ・Lambda統合確認
**担当**: Cursor + CloudFormation
**期間**: 1日

#### 実施内容
**1. CDKデプロイ実行**
```bash
cd /mnt/c/optimize/weathering-management-system/infrastructure
npm install
npx cdk diff
npx cdk deploy --all
```

**2. デプロイ成功確認項目**
- [ ] 4つのLambda関数デプロイ完了
  - `customer-api`
  - `project-api` 
  - `measurement-api`
  - `report-generator`
- [ ] API Gateway 21エンドポイント作成確認
- [ ] DynamoDB GSI作成確認
- [ ] S3バケット・権限設定確認
- [ ] CloudWatch Logs グループ作成確認

**3. 環境変数・権限確認**
```bash
# Lambda環境変数確認
aws lambda get-function-configuration --function-name customer-api
aws lambda get-function-configuration --function-name project-api
aws lambda get-function-configuration --function-name measurement-api  
aws lambda get-function-configuration --function-name report-generator

# IAM権限確認
aws iam list-attached-role-policies --role-name customer-api-role
```

**成功基準**: 
- CDKデプロイ100%成功
- 全Lambda関数正常起動
- API Gateway疎通確認

---

### 4.1.2 API統合テスト実施
**担当**: Cursor + Postman/curl
**期間**: 2日

#### テストシナリオ設計

**シナリオ1: 認証フロー**
```bash
# 1. Cognito認証トークン取得
curl -X POST https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "TestPass123!"}'

# 2. 認証ヘッダー確認
export AUTH_TOKEN="Bearer eyJhbGciOiJSUzI1NiI..."
```

**シナリオ2: 顧客管理CRUD**
```bash
# 顧客作成
curl -X POST https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/customers \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "テスト会社",
    "contactInfo": {
      "email": "test@example.com",
      "phone": "090-1234-5678",
      "address": "東京都港区"
    },
    "industry": "manufacturing",
    "status": "active"
  }'

# 顧客一覧取得
curl -X GET https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/customers \
  -H "Authorization: $AUTH_TOKEN"

# 顧客詳細取得
curl -X GET https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/customers/{customerId} \
  -H "Authorization: $AUTH_TOKEN"
```

**シナリオ3: プロジェクト管理フロー**
```bash
# プロジェクト作成
curl -X POST https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/projects \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "風化促進テストプロジェクト",
    "description": "統合テスト用プロジェクト",
    "customerId": "customer-123",
    "siteLocation": {
      "latitude": 35.6762,
      "longitude": 139.6503,
      "address": "東京都港区"
    },
    "budget": 5000000,
    "co2Target": 500,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z"
  }'

# プロジェクトステータス更新
curl -X PUT https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/projects/{projectId} \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

**シナリオ4: 測定データ処理**
```bash
# 測定データ作成
curl -X POST https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/projects/{projectId}/measurements \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-07-11T12:00:00Z",
    "type": "water_quality",
    "values": {
      "ph": 7.2,
      "temperature": 25.5,
      "co2Concentration": 400,
      "flowRate": 100.5,
      "iron": 0.1,
      "copper": 0.05,
      "zinc": 0.2
    },
    "location": {
      "latitude": 35.6762,
      "longitude": 139.6503
    }
  }'

# バッチデータ登録テスト
curl -X POST https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/projects/{projectId}/measurements/batch \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "measurements": [
      {"timestamp": "2025-07-11T13:00:00Z", "type": "water_quality", "values": {"ph": 7.1}},
      {"timestamp": "2025-07-11T14:00:00Z", "type": "water_quality", "values": {"ph": 7.3}}
    ]
  }'
```

**シナリオ5: レポート生成**
```bash
# レポート生成開始
curl -X POST https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/projects/{projectId}/reports \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "mrv",
    "format": "pdf",
    "parameters": {
      "startDate": "2025-01-01",
      "endDate": "2025-07-11"
    }
  }'

# レポートステータス確認
curl -X GET https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/projects/{projectId}/reports/{reportId} \
  -H "Authorization: $AUTH_TOKEN"

# レポートダウンロード
curl -X GET https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/projects/{projectId}/reports/{reportId}/download \
  -H "Authorization: $AUTH_TOKEN"
```

#### エラーケーステスト

**認証エラー**
```bash
# 無効なトークンテスト
curl -X GET https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/customers \
  -H "Authorization: Bearer invalid-token"
# 期待結果: 401 Unauthorized

# トークンなしテスト  
curl -X GET https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/customers
# 期待結果: 401 Unauthorized
```

**バリデーションエラー**
```bash
# 無効なメールアドレス
curl -X POST https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/customers \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"companyName": "テスト会社", "contactInfo": {"email": "invalid-email"}}'
# 期待結果: 400 Bad Request

# 必須項目不足
curl -X POST https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/projects \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "プロジェクト"}'
# 期待結果: 400 Bad Request
```

**ビジネスルールエラー**
```bash
# プロジェクト数制限テスト（顧客あたり5件まで）
# 6つ目のプロジェクト作成試行
# 期待結果: 400 Bad Request "Project limit exceeded"

# 無効なステータス遷移テスト
curl -X PUT https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/api/projects/{projectId} \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}' # planningから直接completedへ
# 期待結果: 400 Bad Request "Invalid status transition"
```

**成功基準**:
- 全正常系テスト: 100%成功
- 全エラーケーステスト: 適切なエラーレスポンス
- レスポンス時間: 平均 < 2秒

---

### 4.1.3 フロントエンド統合テスト
**担当**: Cursor + PlaywrightMCP
**期間**: 2日

#### E2Eテストシナリオ

**テストファイル**: `test/e2e/full-system-integration.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('風化促進管理システム - 統合テスト', () => {
  test('完全フロー: ログイン → 顧客作成 → プロジェクト作成 → 測定データ → レポート', async ({ page }) => {
    // 1. ログイン
    await page.goto('/auth/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 2. 顧客作成
    await page.goto('/customers');
    await page.click('button:has-text("新規顧客")');
    await page.fill('input[name="companyName"]', 'テスト会社統合');
    await page.fill('input[name="email"]', 'integration@test.com');
    await page.fill('input[name="phone"]', '090-1234-5678');
    await page.fill('input[name="address"]', '東京都港区');
    await page.selectOption('select[name="industry"]', 'manufacturing');
    await page.click('button:has-text("作成")');
    
    // 顧客作成成功確認
    await expect(page.locator('text=テスト会社統合')).toBeVisible();

    // 3. プロジェクト作成
    await page.goto('/projects');
    await page.click('button:has-text("新規プロジェクト")');
    await page.fill('input[name="name"]', '統合テストプロジェクト');
    await page.fill('textarea[name="description"]', '統合テスト用のプロジェクト');
    await page.selectOption('select[name="customerId"]', { label: 'テスト会社統合' });
    await page.fill('input[name="budget"]', '1000000');
    await page.fill('input[name="co2Target"]', '100');
    await page.click('button:has-text("作成")');
    
    // プロジェクト作成成功確認
    await expect(page.locator('text=統合テストプロジェクト')).toBeVisible();

    // 4. 測定データ追加
    await page.click('text=統合テストプロジェクト');
    await page.click('text=測定データ');
    await page.click('button:has-text("新規測定")');
    await page.selectOption('select[name="type"]', 'water_quality');
    await page.fill('input[name="ph"]', '7.2');
    await page.fill('input[name="temperature"]', '25.5');
    await page.fill('input[name="co2Concentration"]', '400');
    await page.click('button:has-text("保存")');
    
    // 測定データ作成成功確認
    await expect(page.locator('text=pH: 7.2')).toBeVisible();

    // 5. レポート生成
    await page.click('text=レポート');
    await page.click('button:has-text("新規レポート")');
    await page.selectOption('select[name="type"]', 'mrv');
    await page.selectOption('select[name="format"]', 'pdf');
    await page.click('button:has-text("生成開始")');
    
    // レポート生成開始確認
    await expect(page.locator('text=レポート生成中')).toBeVisible();

    // 6. レポート完了確認（非同期処理のため待機）
    await page.waitForTimeout(5000);
    await page.reload();
    await expect(page.locator('text=completed')).toBeVisible();
    
    // 7. レポートダウンロード確認
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("ダウンロード")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('エラーハンドリング: 無効なデータ入力', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 無効なメールアドレスでの顧客作成
    await page.goto('/customers');
    await page.click('button:has-text("新規顧客")');
    await page.fill('input[name="companyName"]', 'エラーテスト会社');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button:has-text("作成")');
    
    // エラーメッセージ確認
    await expect(page.locator('text=有効なメールアドレスを入力してください')).toBeVisible();
  });

  test('レスポンシブデザイン: モバイル表示確認', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/auth/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // モバイルメニュー確認
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // サイドバー表示確認
    await page.click('[data-testid="mobile-menu"]');
    await expect(page.locator('text=顧客管理')).toBeVisible();
  });
});
```

**パフォーマンステスト**
```typescript
test('パフォーマンス: ページ読み込み時間', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/customers');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(3000); // 3秒以内
});

test('パフォーマンス: API レスポンス時間', async ({ page }) => {
  await page.goto('/auth/login');
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="password"]', 'TestPass123!');
  await page.click('button[type="submit"]');

  const startTime = Date.now();
  await page.goto('/customers');
  await page.waitForSelector('text=顧客一覧');
  const responseTime = Date.now() - startTime;
  
  expect(responseTime).toBeLessThan(2000); // 2秒以内
});
```

**成功基準**:
- 全E2Eテスト: 100%成功
- ページ読み込み時間: < 3秒
- API レスポンス時間: < 2秒
- モバイル表示: 完全対応

---

## 📊 4.2 監視・ログ基盤構築（中優先度）

### 4.2.1 CloudWatch監視設定
**担当**: Cursor + AWS CloudWatch
**期間**: 1日

#### Lambda関数監視

**CDK更新**: `infrastructure/lib/monitoring-stack.ts`
```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';

export class MonitoringStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // SNS Alert Topic
    const alertTopic = new sns.Topic(this, 'SystemAlerts', {
      displayName: '風化促進管理システムアラート'
    });

    // Lambda Error Rate Alarm
    const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        statistic: 'Sum',
        period: Duration.minutes(5)
      }),
      threshold: 3,
      evaluationPeriods: 2,
      alarmDescription: 'Lambda関数エラー率が高すぎます'
    });
    
    lambdaErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // Lambda Duration Alarm
    const lambdaDurationAlarm = new cloudwatch.Alarm(this, 'LambdaDurationAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Duration',
        statistic: 'Average',
        period: Duration.minutes(5)
      }),
      threshold: 10000, // 10秒
      evaluationPeriods: 3,
      alarmDescription: 'Lambda関数実行時間が長すぎます'
    });

    // DynamoDB Throttle Alarm
    const dynamoThrottleAlarm = new cloudwatch.Alarm(this, 'DynamoThrottleAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ThrottledRequests',
        statistic: 'Sum',
        period: Duration.minutes(5)
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'DynamoDB リクエストがスロットルされています'
    });

    // API Gateway 5XX Error Alarm
    const apiGateway5xxAlarm = new cloudwatch.Alarm(this, 'ApiGateway5xxAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        statistic: 'Sum',
        period: Duration.minutes(5)
      }),
      threshold: 5,
      evaluationPeriods: 2,
      alarmDescription: 'API Gateway 5XXエラーが多発しています'
    });
  }
}
```

#### カスタムメトリクス設定

**Lambda関数内でのメトリクス送信**:
```javascript
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

// カスタムメトリクス送信関数
async function putCustomMetric(metricName, value, unit = 'Count') {
  const params = {
    Namespace: 'WeatheringManagement',
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: new Date()
    }]
  };
  
  try {
    await cloudwatch.putMetricData(params).promise();
  } catch (error) {
    console.error('メトリクス送信エラー:', error);
  }
}

// 使用例: customer-api内
exports.handler = async (event) => {
  try {
    // ビジネスロジック実行
    const result = await customerRepository.create(customerData);
    
    // 成功メトリクス送信
    await putCustomMetric('CustomerCreated', 1);
    await putCustomMetric('ApiResponseTime', processingTime, 'Milliseconds');
    
    return {
      statusCode: 201,
      body: JSON.stringify(result)
    };
  } catch (error) {
    // エラーメトリクス送信
    await putCustomMetric('CustomerCreationError', 1);
    throw error;
  }
};
```

**ダッシュボード作成**:
```typescript
// CloudWatch Dashboard
const dashboard = new cloudwatch.Dashboard(this, 'SystemDashboard', {
  dashboardName: '風化促進管理システム-監視ダッシュボード',
  widgets: [
    [
      new cloudwatch.GraphWidget({
        title: 'Lambda Invocations',
        left: [lambdaInvocationsMetric],
        width: 12,
        height: 6
      })
    ],
    [
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests',
        left: [apiGatewayRequestsMetric],
        width: 12,
        height: 6
      })
    ],
    [
      new cloudwatch.SingleValueWidget({
        title: 'Total Customers',
        metrics: [customersCountMetric],
        width: 6,
        height: 3
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Active Projects',
        metrics: [activeProjectsMetric],
        width: 6,
        height: 3
      })
    ]
  ]
});
```

---

### 4.2.2 ログ集約・分析設定
**担当**: Cursor + CloudWatch Insights
**期間**: 0.5日

#### 構造化ログ実装

**Lambda関数ログ標準化**:
```javascript
// 共通ログユーティリティ: infrastructure/lambda/shared/utils/logger.js
class Logger {
  constructor(service) {
    this.service = service;
  }
  
  info(message, data = {}) {
    console.log(JSON.stringify({
      level: 'INFO',
      service: this.service,
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  }
  
  error(message, error, data = {}) {
    console.error(JSON.stringify({
      level: 'ERROR',
      service: this.service,
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString(),
      ...data
    }));
  }
  
  warn(message, data = {}) {
    console.warn(JSON.stringify({
      level: 'WARN',
      service: this.service,
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  }
}

module.exports = Logger;
```

**使用例**:
```javascript
const Logger = require('./shared/utils/logger');
const logger = new Logger('customer-api');

exports.handler = async (event) => {
  logger.info('Customer API request started', {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: event.requestContext.requestId
  });
  
  try {
    const result = await processRequest(event);
    
    logger.info('Customer API request completed', {
      requestId: event.requestContext.requestId,
      statusCode: 200,
      responseTime: Date.now() - startTime
    });
    
    return result;
  } catch (error) {
    logger.error('Customer API request failed', error, {
      requestId: event.requestContext.requestId,
      httpMethod: event.httpMethod,
      path: event.path
    });
    
    throw error;
  }
};
```

#### CloudWatch Insights クエリ設定

**事前設定クエリ**:
```sql
-- エラー分析クエリ
fields @timestamp, level, service, message, error.message
| filter level = "ERROR"
| sort @timestamp desc
| limit 100

-- API レスポンス時間分析
fields @timestamp, service, responseTime
| filter ispresent(responseTime)
| stats avg(responseTime), max(responseTime), min(responseTime) by service
| sort avg(responseTime) desc

-- 顧客作成トレンド分析
fields @timestamp, message
| filter message like /Customer created/
| stats count() by bin(5m)
| sort @timestamp

-- エラー頻度分析
fields @timestamp, service, error.message
| filter level = "ERROR"
| stats count() by service, error.message
| sort count desc
```

---

## ⚡ 4.3 パフォーマンス最適化（中優先度）

### 4.3.1 Lambda Cold Start最適化
**担当**: Claude Code
**期間**: 1日

#### 実装する最適化

**1. Connection Pool実装**:
```javascript
// infrastructure/lambda/shared/utils/dynamodb-pool.js
const AWS = require('aws-sdk');

class DynamoDBConnectionPool {
  constructor() {
    this.client = null;
    this.docClient = null;
  }
  
  getClient() {
    if (!this.client) {
      this.client = new AWS.DynamoDB({
        region: process.env.AWS_REGION,
        maxRetries: 3,
        retryDelayOptions: {
          customBackoff: function(retryCount) {
            return Math.pow(2, retryCount) * 100;
          }
        }
      });
    }
    return this.client;
  }
  
  getDocumentClient() {
    if (!this.docClient) {
      this.docClient = new AWS.DynamoDB.DocumentClient({
        service: this.getClient(),
        convertEmptyValues: true
      });
    }
    return this.docClient;
  }
}

// シングルトンインスタンス
const pool = new DynamoDBConnectionPool();
module.exports = pool;
```

**2. 共通ライブラリの最適化**:
```javascript
// infrastructure/lambda/shared/utils/response.js
// レスポンス生成の標準化とキャッシュ
const ResponseCache = new Map();

function createResponse(statusCode, body, headers = {}) {
  const cacheKey = `${statusCode}-${JSON.stringify(headers)}`;
  
  let baseResponse = ResponseCache.get(cacheKey);
  if (!baseResponse) {
    baseResponse = {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        ...headers
      }
    };
    ResponseCache.set(cacheKey, baseResponse);
  }
  
  return {
    ...baseResponse,
    body: JSON.stringify(body)
  };
}

module.exports = { createResponse };
```

**3. バンドルサイズ最適化**:
```json
// package.json optimization
{
  "dependencies": {
    "aws-sdk": "^2.1" // Lambda runtime included
  },
  "devDependencies": {
    "webpack": "^5.0.0",
    "webpack-cli": "^4.0.0"
  }
}
```

**webpack.config.js**:
```javascript
module.exports = {
  target: 'node',
  mode: 'production',
  entry: './index.js',
  externals: {
    'aws-sdk': 'aws-sdk'
  },
  optimization: {
    minimize: true
  }
};
```

**4. Provisioned Concurrency設定**:
```typescript
// CDK設定
const customerApiFunction = new lambda.Function(this, 'CustomerApi', {
  // 既存設定...
  reservedConcurrentExecutions: 10
});

// 本番環境でのProvisioned Concurrency
if (stage === 'prod') {
  new lambda.Version(this, 'CustomerApiVersion', {
    lambda: customerApiFunction,
    provisionedConcurrencyConfig: {
      provisionedConcurrentExecutions: 5
    }
  });
}
```

**成功基準**:
- Cold Start時間: < 1秒
- Warm Start時間: < 200ms
- バンドルサイズ: < 10MB

---

### 4.3.2 DynamoDB最適化
**担当**: Claude Code  
**期間**: 1日

#### クエリ最適化

**1. バッチ処理最適化**:
```javascript
// infrastructure/lambda/shared/repositories/optimized-batch.js
class OptimizedBatchProcessor {
  constructor(docClient, tableName) {
    this.docClient = docClient;
    this.tableName = tableName;
    this.batchSize = 25; // DynamoDB制限
  }
  
  async batchWrite(items) {
    const chunks = this.chunk(items, this.batchSize);
    const results = [];
    
    for (const chunk of chunks) {
      const params = {
        RequestItems: {
          [this.tableName]: chunk.map(item => ({
            PutRequest: { Item: item }
          }))
        }
      };
      
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const result = await this.docClient.batchWrite(params).promise();
          
          // Unprocessed items handling
          if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
            params.RequestItems = result.UnprocessedItems;
            retryCount++;
            await this.sleep(Math.pow(2, retryCount) * 100);
            continue;
          }
          
          results.push(result);
          break;
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) throw error;
          await this.sleep(Math.pow(2, retryCount) * 100);
        }
      }
    }
    
    return results;
  }
  
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**2. Read/Write Capacity最適化**:
```typescript
// DynamoDB Auto Scaling設定
const table = new dynamodb.Table(this, 'WeatheringProjectData', {
  // 既存設定...
  billingMode: dynamodb.BillingMode.PROVISIONED,
  readCapacity: 5,
  writeCapacity: 5
});

// Auto Scaling設定
table.autoScaleReadCapacity({
  minCapacity: 5,
  maxCapacity: 100,
  targetUtilizationPercent: 70
});

table.autoScaleWriteCapacity({
  minCapacity: 5,
  maxCapacity: 100,
  targetUtilizationPercent: 70
});

// GSI Auto Scaling
table.autoScaleGlobalSecondaryIndexReadCapacity('GSI1', {
  minCapacity: 5,
  maxCapacity: 100,
  targetUtilizationPercent: 70
});
```

**3. 効率的クエリパターン**:
```javascript
// Single Table Design最適化クエリ
class OptimizedQueries {
  constructor(docClient, tableName) {
    this.docClient = docClient;
    this.tableName = tableName;
  }
  
  // 関連データ一括取得
  async getProjectWithMeasurements(projectId, limit = 50) {
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `PROJECT#${projectId}`
      },
      Limit: limit,
      ScanIndexForward: false // 最新データから取得
    };
    
    return await this.docClient.query(params).promise();
  }
  
  // 条件付きバッチ取得
  async getMultipleProjects(projectIds) {
    const keys = projectIds.map(id => ({
      PK: `PROJECT#${id}`,
      SK: 'METADATA'
    }));
    
    const params = {
      RequestItems: {
        [this.tableName]: {
          Keys: keys
        }
      }
    };
    
    return await this.docClient.batchGet(params).promise();
  }
  
  // 効率的な検索（GSI使用）
  async searchProjectsByStatus(status, nextToken = null, limit = 20) {
    const params = {
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :status',
      ExpressionAttributeValues: {
        ':status': `PROJECT_STATUS#${status}`
      },
      Limit: limit,
      ScanIndexForward: false
    };
    
    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(
        Buffer.from(nextToken, 'base64').toString()
      );
    }
    
    return await this.docClient.query(params).promise();
  }
}
```

**成功基準**:
- クエリレスポンス時間: < 100ms
- バッチ処理効率: > 95%
- Throttling発生率: < 1%

---

## 🔒 4.4 本番運用準備（高優先度）

### 4.4.1 セキュリティ強化
**担当**: Cursor + AWS Security
**期間**: 1日

#### セキュリティ設定チェックリスト

**1. IAM権限最小化**:
```typescript
// 最小権限IAMポリシー
const customerApiRole = new iam.Role(this, 'CustomerApiRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  inlinePolicies: {
    DynamoDBAccess: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
            'dynamodb:Query',
            'dynamodb:BatchGetItem',
            'dynamodb:BatchWriteItem'
          ],
          resources: [
            table.tableArn,
            `${table.tableArn}/index/*`
          ],
          conditions: {
            ForAllValues:StringEquals: {
              'dynamodb:LeadingKeys': ['CUSTOMER#*']
            }
          }
        })
      ]
    })
  }
});
```

**2. API Gateway セキュリティ設定**:
```typescript
// API Gateway Request Validation
const requestValidator = new apigateway.RequestValidator(this, 'RequestValidator', {
  restApi: api,
  validateRequestBody: true,
  validateRequestParameters: true
});

// Usage Plan & API Key
const usagePlan = new apigateway.UsagePlan(this, 'UsagePlan', {
  name: 'WeatheringManagementPlan',
  throttle: {
    burstLimit: 100,
    rateLimit: 50
  },
  quota: {
    limit: 10000,
    period: apigateway.Period.DAY
  }
});

// WAF Integration
const webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
  scope: 'REGIONAL',
  defaultAction: { allow: {} },
  rules: [
    {
      name: 'RateLimitRule',
      priority: 1,
      statement: {
        rateBasedStatement: {
          limit: 2000,
          aggregateKeyType: 'IP'
        }
      },
      action: { block: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimitRule'
      }
    },
    {
      name: 'AWSManagedRulesCommonRuleSet',
      priority: 2,
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet'
        }
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'CommonRuleSetMetric'
      }
    }
  ]
});
```

**3. データ暗号化確認**:
```typescript
// DynamoDB暗号化
const table = new dynamodb.Table(this, 'WeatheringProjectData', {
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true
});

// S3暗号化
const bucket = new s3.Bucket(this, 'ReportBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED,
  versioned: true,
  publicReadAccess: false,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
});
```

**4. 入力検証強化**:
```javascript
// 共通バリデーションライブラリ
class SecurityValidator {
  static sanitizeInput(input) {
    if (typeof input === 'string') {
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    return input;
  }
  
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  static validatePhoneNumber(phone) {
    const phoneRegex = /^[0-9\-\+\(\)\s]+$/;
    return phoneRegex.test(phone);
  }
  
  static checkSQLInjection(input) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /([\'\";])/,
      /(\-\-)/,
      /(\/\*.*?\*\/)/
    ];
    
    return !sqlPatterns.some(pattern => pattern.test(input));
  }
}
```

**成功基準**:
- WAF設定完了
- 最小権限IAM設定
- 入力検証100%実装
- 暗号化100%適用

---

### 4.4.2 バックアップ・災害復旧設定
**担当**: Cursor + AWS Backup
**期間**: 0.5日

#### 自動バックアップ設定

**1. DynamDB Point-in-Time Recovery**:
```typescript
const table = new dynamodb.Table(this, 'WeatheringProjectData', {
  // 既存設定...
  pointInTimeRecovery: true
});

// 定期バックアップ設定
const backupVault = new backup.BackupVault(this, 'BackupVault', {
  encryptionKey: kms.Key.fromLookup(this, 'DefaultKey', {
    aliasName: 'alias/aws/backup'
  })
});

const backupPlan = new backup.BackupPlan(this, 'BackupPlan', {
  backupVault,
  backupPlanRules: [
    new backup.BackupPlanRule({
      ruleName: 'DailyBackup',
      scheduleExpression: events.Schedule.cron({
        hour: '2',
        minute: '0'
      }),
      deleteAfter: Duration.days(30),
      copyActions: [
        {
          destinationBackupVault: backupVault,
          deleteAfter: Duration.days(120)
        }
      ]
    })
  ]
});

// DynamoDBテーブルをバックアッププランに追加
backupPlan.addSelection('DynamoDBSelection', {
  resources: [backup.BackupResource.fromDynamoDbTable(table)]
});
```

**2. S3バージョニング・レプリケーション**:
```typescript
const primaryBucket = new s3.Bucket(this, 'ReportBucket', {
  versioned: true,
  lifecycleRules: [
    {
      id: 'DeleteOldVersions',
      noncurrentVersionExpiration: Duration.days(90)
    },
    {
      id: 'TransitionToIA',
      transitions: [
        {
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: Duration.days(30)
        },
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: Duration.days(90)
        }
      ]
    }
  ]
});

// Cross-Region Replication
const replicationBucket = new s3.Bucket(this, 'ReplicationBucket', {
  bucketName: 'weathering-reports-backup-us-west-2',
  region: 'us-west-2'
});

primaryBucket.addCrossRegionReplication({
  destination: replicationBucket,
  prefix: 'reports/'
});
```

**3. Lambda関数コードバックアップ**:
```bash
#!/bin/bash
# 定期実行スクリプト: backup-lambda-code.sh

# Lambda関数のコードをS3にバックアップ
aws lambda get-function --function-name customer-api --query 'Code.Location' --output text | xargs curl -o customer-api-$(date +%Y%m%d).zip

aws s3 cp customer-api-$(date +%Y%m%d).zip s3://weathering-lambda-backup/

# CloudFormationテンプレートをバックアップ
aws cloudformation get-template --stack-name WeatheringManagementStack --output json > template-$(date +%Y%m%d).json

aws s3 cp template-$(date +%Y%m%d).json s3://weathering-template-backup/
```

**災害復旧手順書**: `DISASTER_RECOVERY.md`
```markdown
# 災害復旧手順書

## 1. 緊急時連絡先
- システム管理者: [連絡先]
- AWS サポート: [ケース番号]

## 2. DynamoDB復旧手順
1. Point-in-Time Recoveryからの復元
   aws dynamodb restore-table-to-point-in-time --source-table-name WeatheringProjectData --target-table-name WeatheringProjectData-Recovered --restore-date-time 2025-07-11T00:00:00Z

2. バックアップからの復元
   aws backup start-restore-job --recovery-point-arn [ARN] --resource-type DynamoDB

## 3. S3データ復旧手順
1. バージョニングからの復元
   aws s3api list-object-versions --bucket weathering-reports
   aws s3api get-object --bucket weathering-reports --key report.pdf --version-id [VERSION]

2. Cross-Region Replicationからの復元
   aws s3 sync s3://weathering-reports-backup-us-west-2/ s3://weathering-reports/

## 4. Lambda関数復旧手順
1. コードバックアップからの復元
   aws s3 cp s3://weathering-lambda-backup/customer-api-20250711.zip ./
   aws lambda update-function-code --function-name customer-api --zip-file fileb://customer-api-20250711.zip

## 5. 復旧確認チェックリスト
- [ ] DynamoDBテーブル復旧確認
- [ ] Lambda関数動作確認
- [ ] API Gateway疎通確認
- [ ] フロントエンド動作確認
- [ ] データ整合性確認
```

**成功基準**:
- 自動バックアップ設定完了
- 災害復旧手順書作成
- 復旧テスト実施
- RTO/RPO要件達成（RTO: 2時間、RPO: 1時間）

---

## 📚 4.5 ドキュメント整備（中優先度）

### 4.5.1 運用手順書作成
**担当**: Claude Code
**期間**: 1日

#### API運用手順書

**ファイル**: `OPERATIONS_MANUAL.md`
```markdown
# 風化促進CO2除去管理システム 運用手順書

## 1. 日常運用

### 1.1 健全性チェック（毎朝実施）
1. CloudWatch ダッシュボード確認
   - Lambda関数エラー率 < 1%
   - API Gateway レスポンス時間 < 2秒
   - DynamoDB スロットリング発生なし

2. アプリケーション動作確認
   - ログイン機能テスト
   - 顧客作成テスト
   - API レスポンス確認

### 1.2 パフォーマンス監視
1. メトリクス確認項目
   - Lambda 実行時間
   - DynamoDB 読み取り/書き込み消費量
   - S3 リクエスト数

2. アラート対応
   - エラー率上昇時の調査手順
   - レスポンス時間悪化時の対処法

## 2. 週次運用

### 2.1 バックアップ確認
1. DynamoDB Point-in-Time Recovery状況確認
2. S3バケット容量・バージョニング確認
3. Lambda関数コードバックアップ確認

### 2.2 セキュリティ確認
1. WAF ブロック状況確認
2. API Gateway アクセスログ分析
3. 異常なアクセスパターン検出

## 3. 月次運用

### 3.1 コスト分析
1. AWS請求額詳細確認
2. 使用量トレンド分析
3. コスト最適化推奨事項確認

### 3.2 パフォーマンス最適化
1. Lambda Cold Start分析
2. DynamoDB容量分析
3. 不要データクリーンアップ

## 4. インシデント対応

### 4.1 緊急度分類
- レベル1（緊急）: サービス完全停止
- レベル2（高）: 機能一部制限
- レベル3（中）: パフォーマンス悪化
- レベル4（低）: 軽微な問題

### 4.2 対応手順
1. 問題の切り分け
2. 影響範囲の特定
3. 暫定対処の実施
4. 根本原因の調査
5. 恒久対策の実施
6. インシデント報告書作成
```

#### トラブルシューティングガイド

**ファイル**: `TROUBLESHOOTING.md`
```markdown
# トラブルシューティングガイド

## よくある問題と解決方法

### 1. 認証エラー

#### 症状
- ログイン失敗
- API呼び出し時の401エラー

#### 確認事項
1. Cognito User Pool設定確認
   aws cognito-idp describe-user-pool --user-pool-id ap-northeast-1_BEnyexqxY

2. JWTトークン有効性確認
   - トークンの有効期限
   - トークンの形式

#### 解決方法
1. トークン再取得
2. Cognito設定再確認
3. API Gateway Authorizer設定確認

### 2. Lambda関数エラー

#### 症状
- 500 Internal Server Error
- Lambda timeout

#### 確認事項
1. CloudWatch Logs確認
   aws logs filter-log-events --log-group-name /aws/lambda/customer-api --start-time 1625760000000

2. 環境変数確認
3. メモリ・タイムアウト設定確認

#### 解決方法
1. エラーログ詳細分析
2. 設定値調整
3. コード修正・再デプロイ

### 3. DynamoDB接続エラー

#### 症状
- データ取得失敗
- ThrottlingException

#### 確認事項
1. Read/Write Capacity確認
2. GSI設定確認
3. IAM権限確認

#### 解決方法
1. Capacity調整
2. クエリ最適化
3. Exponential Backoff実装

### 4. API Gateway エラー

#### 症状
- 403 Forbidden
- CORS エラー

#### 確認事項
1. API Gateway設定確認
2. CORS設定確認
3. Lambda統合設定確認

#### 解決方法
1. 設定修正
2. オプションメソッド追加
3. Lambda プロキシ統合確認

## 緊急時コマンド集

### ログ取得
# 特定時間範囲のログ取得
aws logs filter-log-events --log-group-name /aws/lambda/customer-api --start-time $(date -d '1 hour ago' +%s)000 --end-time $(date +%s)000

# エラーログのみ抽出
aws logs filter-log-events --log-group-name /aws/lambda/customer-api --filter-pattern "ERROR"

### メトリクス確認
# Lambda エラー率
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Errors --dimensions Name=FunctionName,Value=customer-api --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) --end-time $(date -u +%Y-%m-%dT%H:%M:%S) --period 300 --statistics Sum

# DynamoDB スロットリング
aws cloudwatch get-metric-statistics --namespace AWS/DynamoDB --metric-name ThrottledRequests --dimensions Name=TableName,Value=WeatheringProjectData --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) --end-time $(date -u +%Y-%m-%dT%H:%M:%S) --period 300 --statistics Sum

### 緊急停止
# Lambda関数無効化
aws lambda put-function-concurrency --function-name customer-api --reserved-concurrent-executions 0

# API Gateway ステージ無効化
aws apigateway update-stage --rest-api-id 3jng8xwirl --stage-name prod --patch-ops op=replace,path=/throttle/rateLimit,value=0
```

**成功基準**:
- 運用手順書完成
- トラブルシューティングガイド完成
- インシデント対応フロー確立
- 運用チーム教育実施

---

## 🎯 Phase 4 完了基準

### 必須要件（Phase 4完了条件）
- [ ] **統合テスト完全実施**: 全API動作確認100%完了
- [ ] **CDKデプロイ成功**: 本番環境への全コンポーネントデプロイ完了
- [ ] **監視基盤構築**: CloudWatch監視・アラート設定完了
- [ ] **セキュリティ設定**: WAF・IAM・暗号化設定完了
- [ ] **バックアップ設定**: 自動バックアップ・災害復旧準備完了

### 品質基準
- [ ] **パフォーマンス**: API レスポンス時間 < 2秒
- [ ] **可用性**: システム稼働率 > 99.9%
- [ ] **セキュリティ**: WAF・入力検証・認証100%実装
- [ ] **監視**: 全重要メトリクスの監視・アラート設定
- [ ] **運用**: 運用手順書・トラブルシューティングガイド完備

### 成果物
- [ ] **稼働システム**: https://dikwcz6haxnrb.cloudfront.net/
- [ ] **API環境**: https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/
- [ ] **監視ダッシュボード**: CloudWatch Dashboard
- [ ] **運用ドキュメント**: 運用手順書・トラブルシューティング
- [ ] **バックアップ**: 自動バックアップ・災害復旧計画

## 📊 進捗管理

### Phase 4 タスク一覧（5日間予定）

#### Day 1: 統合テスト（Cursor担当）
- [ ] CDKデプロイ実行・確認 (4時間)
- [ ] API統合テスト実施 (4時間)

#### Day 2: E2Eテスト（Cursor + PlaywrightMCP）
- [ ] フロントエンド統合テスト (6時間)
- [ ] エラーケーステスト (2時間)

#### Day 3: 監視・ログ設定（Cursor）
- [ ] CloudWatch監視設定 (4時間)
- [ ] ログ集約・分析設定 (2時間)
- [ ] カスタムメトリクス実装 (2時間)

#### Day 4: 最適化・セキュリティ（Claude Code + Cursor）
- [ ] Lambda最適化 (4時間)
- [ ] DynamoDB最適化 (2時間)
- [ ] セキュリティ強化 (2時間)

#### Day 5: 運用準備（Claude Code + Cursor）
- [ ] バックアップ・災害復旧設定 (3時間)
- [ ] ドキュメント整備 (3時間)
- [ ] 運用テスト (2時間)

## 🚀 Phase 4完了後の状況

### システム稼働状況
- **完全稼働**: 本番環境での全機能稼働
- **監視体制**: 24/7監視・アラート体制
- **運用体制**: 運用手順・インシデント対応準備完了
- **セキュリティ**: 本番レベルセキュリティ実装完了
- **バックアップ**: 自動バックアップ・災害復旧準備完了

### 次フェーズ準備
**Phase 5: 運用最適化・機能拡張**
- ユーザーフィードバック収集・分析
- パフォーマンス継続改善
- 新機能開発・追加
- 運用効率化・自動化推進

---

**Phase 4: システム統合テスト・監視設定・本番運用準備 - 完全実装計画**
**実装期間**: 5日間
**担当**: Cursor（統合テスト・運用設定）+ Claude Code（最適化・ドキュメント）

// TODO: Cursor - Phase 4統合テスト・監視設定・本番運用準備実施