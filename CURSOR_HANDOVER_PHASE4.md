# Cursor引き継ぎ: Phase 4統合テスト・監視設定・本番運用準備

## 🎯 引き継ぎ概要

### 現在の状況
**Phase 3: 100%完了** ✅
- プロジェクト管理API: 完全実装
- 測定データAPI: 完全実装  
- レポート生成API: 完全実装
- フロントエンド統合: 完全実装
- 21エンドポイント: API仕様完成

### Cursorの担当作業
**Phase 4: システム統合テスト・監視設定・本番運用準備**
- 統合テスト実施（CDK・Lambda・E2E）
- 監視・ログ基盤構築
- 本番運用環境整備
- セキュリティ・バックアップ設定

---

## 🔧 1. 緊急優先タスク（即時実施）

### 1.1 CDKデプロイ実行
**所要時間**: 2-3時間
**優先度**: 🔴 最高

#### 実施手順
```bash
# 1. プロジェクトルートへ移動
cd /mnt/c/optimize/weathering-management-system/infrastructure

# 2. 依存関係インストール
npm install

# 3. CDK差分確認
npx cdk diff

# 4. デプロイ実行
npx cdk deploy --all --require-approval never

# 5. デプロイ結果確認
npx cdk list
```

#### 確認事項
**Lambda関数デプロイ確認**:
```bash
# 4つのLambda関数作成確認
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `customer-api`) || starts_with(FunctionName, `project-api`) || starts_with(FunctionName, `measurement-api`) || starts_with(FunctionName, `report-generator`)].FunctionName'

# 各関数の設定確認
aws lambda get-function-configuration --function-name customer-api
aws lambda get-function-configuration --function-name project-api
aws lambda get-function-configuration --function-name measurement-api
aws lambda get-function-configuration --function-name report-generator
```

**API Gateway エンドポイント確認**:
```bash
# API Gateway設定確認
aws apigateway get-rest-apis --query 'items[?name==`WeatheringManagementApi`]'

# リソース一覧確認（21エンドポイント）
aws apigateway get-resources --rest-api-id 3jng8xwirl --query 'items[].{Path:path,Methods:resourceMethods}'
```

**DynamoDB設定確認**:
```bash
# テーブル設定確認
aws dynamodb describe-table --table-name WeatheringProjectData

# GSI確認
aws dynamodb describe-table --table-name WeatheringProjectData --query 'Table.GlobalSecondaryIndexes[].{IndexName:IndexName,Status:IndexStatus}'
```

**期待結果**:
- CDKデプロイ: 100%成功
- Lambda関数: 4個すべてデプロイ完了
- API Gateway: 21エンドポイント作成完了
- DynamoDB: GSI含む設定完了

---

### 1.2 API統合テスト実施
**所要時間**: 4-6時間
**優先度**: 🔴 最高

#### 認証トークン取得
```bash
# 環境変数設定
export API_BASE_URL="https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod"
export USER_POOL_ID="ap-northeast-1_BEnyexqxY"
export CLIENT_ID="2gqqmrdorakjgq7ahuvlq5f9e2"

# テストユーザーでのトークン取得
# （実際のCognito認証エンドポイント使用）
export AUTH_TOKEN="Bearer [JWT_TOKEN]"
```

#### 1. 顧客管理API テスト
```bash
# 顧客作成テスト
curl -X POST $API_BASE_URL/api/customers \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "テスト会社Phase4",
    "contactInfo": {
      "email": "phase4@test.com",
      "phone": "090-1111-2222",
      "address": "東京都港区赤坂1-1-1"
    },
    "industry": "manufacturing",
    "status": "active"
  }'
# 期待結果: 201 Created + customerId返却

# 顧客一覧取得テスト
curl -X GET $API_BASE_URL/api/customers \
  -H "Authorization: $AUTH_TOKEN"
# 期待結果: 200 OK + 顧客リスト返却

# 顧客詳細取得テスト
export CUSTOMER_ID="[作成された顧客ID]"
curl -X GET $API_BASE_URL/api/customers/$CUSTOMER_ID \
  -H "Authorization: $AUTH_TOKEN"
# 期待結果: 200 OK + 顧客詳細返却

# 顧客更新テスト
curl -X PUT $API_BASE_URL/api/customers/$CUSTOMER_ID \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "テスト会社Phase4-更新版",
    "industry": "technology"
  }'
# 期待結果: 200 OK + 更新完了
```

#### 2. プロジェクト管理API テスト
```bash
# プロジェクト作成テスト
curl -X POST $API_BASE_URL/api/projects \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Phase4統合テストプロジェクト",
    "description": "API統合テスト用のプロジェクト",
    "customerId": "'$CUSTOMER_ID'",
    "siteLocation": {
      "latitude": 35.6762,
      "longitude": 139.6503,
      "address": "東京都港区"
    },
    "budget": 10000000,
    "co2Target": 1000,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "status": "planning"
  }'
# 期待結果: 201 Created + projectId返却

# プロジェクト一覧取得テスト
curl -X GET $API_BASE_URL/api/projects \
  -H "Authorization: $AUTH_TOKEN"
# 期待結果: 200 OK + プロジェクトリスト返却

# プロジェクトステータス更新テスト
export PROJECT_ID="[作成されたプロジェクトID]"
curl -X PUT $API_BASE_URL/api/projects/$PROJECT_ID \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
# 期待結果: 200 OK + ステータス更新完了
```

#### 3. 測定データAPI テスト
```bash
# 測定データ作成テスト
curl -X POST $API_BASE_URL/api/projects/$PROJECT_ID/measurements \
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
# 期待結果: 201 Created + measurementId返却

# バッチ測定データ作成テスト
curl -X POST $API_BASE_URL/api/projects/$PROJECT_ID/measurements/batch \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "measurements": [
      {
        "timestamp": "2025-07-11T13:00:00Z",
        "type": "water_quality",
        "values": {"ph": 7.1, "temperature": 24.8}
      },
      {
        "timestamp": "2025-07-11T14:00:00Z",
        "type": "atmospheric",
        "values": {"co2Concentration": 420, "temperature": 26.2}
      }
    ]
  }'
# 期待結果: 201 Created + 作成件数返却

# 測定データ一覧取得テスト
curl -X GET $API_BASE_URL/api/projects/$PROJECT_ID/measurements \
  -H "Authorization: $AUTH_TOKEN"
# 期待結果: 200 OK + 測定データリスト返却
```

#### 4. レポート生成API テスト
```bash
# レポート生成開始テスト
curl -X POST $API_BASE_URL/api/projects/$PROJECT_ID/reports \
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
# 期待結果: 201 Created + reportId返却

# レポート生成状況確認テスト
export REPORT_ID="[作成されたレポートID]"
curl -X GET $API_BASE_URL/api/projects/$PROJECT_ID/reports/$REPORT_ID \
  -H "Authorization: $AUTH_TOKEN"
# 期待結果: 200 OK + レポート詳細（status: processing/completed）

# レポート一覧取得テスト
curl -X GET $API_BASE_URL/api/projects/$PROJECT_ID/reports \
  -H "Authorization: $AUTH_TOKEN"
# 期待結果: 200 OK + レポートリスト返却

# レポートダウンロードテスト（完了後）
curl -X GET $API_BASE_URL/api/projects/$PROJECT_ID/reports/$REPORT_ID/download \
  -H "Authorization: $AUTH_TOKEN"
# 期待結果: 200 OK + Presigned URL返却
```

#### エラーケーステスト
```bash
# 1. 認証エラーテスト
curl -X GET $API_BASE_URL/api/customers
# 期待結果: 401 Unauthorized

curl -X GET $API_BASE_URL/api/customers \
  -H "Authorization: Bearer invalid-token"
# 期待結果: 401 Unauthorized

# 2. バリデーションエラーテスト
curl -X POST $API_BASE_URL/api/customers \
  -H "Authorization: $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "",
    "contactInfo": {
      "email": "invalid-email"
    }
  }'
# 期待結果: 400 Bad Request + バリデーションエラー詳細

# 3. リソース未存在テスト
curl -X GET $API_BASE_URL/api/customers/non-existent-id \
  -H "Authorization: $AUTH_TOKEN"
# 期待結果: 404 Not Found

# 4. ビジネスルール違反テスト
# プロジェクト数制限テスト（6個目のプロジェクト作成）
for i in {1..6}; do
  curl -X POST $API_BASE_URL/api/projects \
    -H "Authorization: $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "制限テストプロジェクト'$i'",
      "customerId": "'$CUSTOMER_ID'",
      "budget": 1000000,
      "co2Target": 100,
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-12-31T23:59:59Z"
    }'
done
# 期待結果: 6個目で400 Bad Request "Project limit exceeded"
```

**成功基準**:
- 全正常系API: 100%成功
- 全エラーケース: 適切なエラーレスポンス
- レスポンス時間: 平均 < 2秒
- エラーログ: 適切なログ出力

---

## 🧪 2. E2Eテスト実施（PlaywrightMCP使用）

### 2.1 フロントエンド統合テスト
**所要時間**: 6-8時間
**優先度**: 🟡 高

#### テスト環境準備
```bash
# フロントエンドプロジェクトへ移動
cd /mnt/c/optimize/weathering-management-system/test

# 依存関係確認・ビルド
npm install
npm run build

# 開発サーバー起動（別端末で）
npm run dev
```

#### E2Eテストファイル作成
**ファイル**: `test/e2e/phase4-integration.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Phase 4 統合テスト', () => {
  test.beforeEach(async ({ page }) => {
    // 認証済みユーザーでテスト開始
    await page.goto('/auth/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('完全フロー: 顧客→プロジェクト→測定データ→レポート', async ({ page }) => {
    // 1. 顧客作成
    await page.goto('/customers');
    await page.click('[data-testid="create-customer-button"]');
    
    await page.fill('input[name="companyName"]', 'Phase4統合テスト会社');
    await page.fill('input[name="email"]', 'phase4-integration@test.com');
    await page.fill('input[name="phone"]', '090-1234-5678');
    await page.fill('input[name="address"]', '東京都港区赤坂1-1-1');
    await page.selectOption('select[name="industry"]', 'manufacturing');
    await page.selectOption('select[name="status"]', 'active');
    
    await page.click('button[type="submit"]');
    
    // 顧客作成成功確認
    await expect(page.locator('text=Phase4統合テスト会社')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="success-message"]')).toContainText('顧客が作成されました');

    // 2. プロジェクト作成
    await page.goto('/projects');
    await page.click('[data-testid="create-project-button"]');
    
    await page.fill('input[name="name"]', 'Phase4統合テストプロジェクト');
    await page.fill('textarea[name="description"]', 'API統合テスト用のプロジェクト');
    await page.selectOption('select[name="customerId"]', { label: 'Phase4統合テスト会社' });
    await page.fill('input[name="budget"]', '5000000');
    await page.fill('input[name="co2Target"]', '500');
    await page.fill('input[name="startDate"]', '2025-01-01');
    await page.fill('input[name="endDate"]', '2025-12-31');
    
    await page.click('button[type="submit"]');
    
    // プロジェクト作成成功確認
    await expect(page.locator('text=Phase4統合テストプロジェクト')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="project-status"]')).toContainText('planning');

    // 3. プロジェクト詳細画面へ移動
    await page.click('text=Phase4統合テストプロジェクト');
    await expect(page).toHaveURL(/\/projects\/[^\/]+$/);

    // 4. 測定データ追加
    await page.click('[data-testid="measurements-tab"]');
    await page.click('[data-testid="add-measurement-button"]');
    
    await page.selectOption('select[name="type"]', 'water_quality');
    await page.fill('input[name="ph"]', '7.2');
    await page.fill('input[name="temperature"]', '25.5');
    await page.fill('input[name="co2Concentration"]', '400');
    await page.fill('input[name="flowRate"]', '100.5');
    
    await page.click('button[type="submit"]');
    
    // 測定データ作成成功確認
    await expect(page.locator('[data-testid="measurement-item"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=pH: 7.2')).toBeVisible();

    // 5. レポート生成
    await page.click('[data-testid="reports-tab"]');
    await page.click('[data-testid="generate-report-button"]');
    
    await page.selectOption('select[name="type"]', 'mrv');
    await page.selectOption('select[name="format"]', 'pdf');
    await page.fill('input[name="startDate"]', '2025-01-01');
    await page.fill('input[name="endDate"]', '2025-07-11');
    
    await page.click('button[type="submit"]');
    
    // レポート生成開始確認
    await expect(page.locator('[data-testid="report-status"]')).toContainText('生成中');
    
    // レポート完了待機（最大30秒）
    await expect(page.locator('[data-testid="report-status"]')).toContainText('完了', { timeout: 30000 });
    
    // 6. レポートダウンロード
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-report-button"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/.*\.pdf$/);
    
    // 7. データ削除テスト
    await page.click('[data-testid="delete-report-button"]');
    await page.click('[data-testid="confirm-delete-button"]');
    await expect(page.locator('[data-testid="report-item"]')).not.toBeVisible();
  });

  test('エラーハンドリング: バリデーションエラー表示確認', async ({ page }) => {
    // 無効なデータでの顧客作成
    await page.goto('/customers');
    await page.click('[data-testid="create-customer-button"]');
    
    // 無効なメールアドレス
    await page.fill('input[name="companyName"]', 'エラーテスト会社');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    // エラーメッセージ確認
    await expect(page.locator('[data-testid="error-message"]')).toContainText('有効なメールアドレスを入力してください');
    
    // 必須項目不足
    await page.fill('input[name="email"]', 'valid@test.com');
    await page.fill('input[name="companyName"]', '');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('会社名は必須です');
  });

  test('API接続エラー処理確認', async ({ page }) => {
    // ネットワークエラーシミュレーション
    await page.route('/api/**', route => route.abort());
    
    await page.goto('/customers');
    
    // エラー表示確認
    await expect(page.locator('[data-testid="error-banner"]')).toContainText('接続エラーが発生しました');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('レスポンシブデザイン: モバイル表示確認', async ({ page }) => {
    // モバイルビューポート設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/customers');
    
    // モバイルメニュー確認
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // サイドバー表示確認
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('text=顧客管理')).toBeVisible();
    
    // データテーブルの横スクロール確認
    await expect(page.locator('[data-testid="customers-table"]')).toBeVisible();
    
    // カード表示の確認
    await expect(page.locator('[data-testid="customer-card"]')).toBeVisible();
  });
});

test.describe('パフォーマンステスト', () => {
  test('ページ読み込み時間測定', async ({ page }) => {
    const performanceEntries: PerformanceEntry[] = [];
    
    page.on('response', response => {
      performanceEntries.push({
        name: response.url(),
        startTime: Date.now(),
        duration: 0
      } as PerformanceEntry);
    });
    
    const startTime = Date.now();
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // 3秒以内
  });

  test('API レスポンス時間測定', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    const startTime = Date.now();
    await page.goto('/customers');
    await page.waitForSelector('[data-testid="customers-list"]');
    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(2000); // 2秒以内
  });
});
```

#### テスト実行
```bash
# Playwright実行
npx playwright test test/e2e/phase4-integration.spec.ts --headed

# レポート生成
npx playwright show-report
```

**成功基準**:
- 全E2Eテスト: 100%成功
- ページ読み込み: < 3秒
- API レスポンス: < 2秒
- エラーハンドリング: 適切な表示
- モバイル対応: 完全動作

---

## 📊 3. 監視・ログ設定

### 3.1 CloudWatch監視設定
**所要時間**: 4時間
**優先度**: 🟡 高

#### CDK監視スタック作成
**ファイル**: `infrastructure/lib/monitoring-stack.ts`

```typescript
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // SNS Alert Topic
    const alertTopic = new sns.Topic(this, 'SystemAlerts', {
      displayName: '風化促進管理システムアラート',
      topicName: 'weathering-system-alerts'
    });

    // Email通知設定（実際のメールアドレスに変更）
    alertTopic.addSubscription(
      new snsSubscriptions.EmailSubscription('admin@your-domain.com')
    );

    // Lambda Error Rate Alarm
    const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
      alarmName: 'WeatheringSystem-Lambda-Errors',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          FunctionName: 'customer-api' // 各関数分作成
        }
      }),
      threshold: 3,
      evaluationPeriods: 2,
      alarmDescription: 'Lambda関数エラー率が高すぎます',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });
    
    lambdaErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // API Gateway 5XX Error Alarm
    const apiGateway5xxAlarm = new cloudwatch.Alarm(this, 'ApiGateway5xxAlarm', {
      alarmName: 'WeatheringSystem-ApiGateway-5xx',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          ApiName: 'WeatheringManagementApi'
        }
      }),
      threshold: 5,
      evaluationPeriods: 2,
      alarmDescription: 'API Gateway 5XXエラーが多発しています'
    });

    apiGateway5xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // DynamoDB Throttle Alarm
    const dynamoThrottleAlarm = new cloudwatch.Alarm(this, 'DynamoThrottleAlarm', {
      alarmName: 'WeatheringSystem-DynamoDB-Throttle',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ThrottledRequests',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          TableName: 'WeatheringProjectData'
        }
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'DynamoDB リクエストがスロットルされています'
    });

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'SystemDashboard', {
      dashboardName: '風化促進管理システム-監視ダッシュボード'
    });

    // Lambda Metrics Widget
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Function Invocations',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            dimensionsMap: { FunctionName: 'customer-api' }
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            dimensionsMap: { FunctionName: 'project-api' }
          })
        ]
      }),
      
      new cloudwatch.GraphWidget({
        title: 'Lambda Function Duration',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
            dimensionsMap: { FunctionName: 'customer-api' }
          })
        ]
      })
    );

    // API Gateway Metrics Widget
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Count',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            dimensionsMap: { ApiName: 'WeatheringManagementApi' }
          })
        ]
      }),
      
      new cloudwatch.SingleValueWidget({
        title: 'API Gateway Latency (avg)',
        width: 6,
        height: 3,
        metrics: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Latency',
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
            dimensionsMap: { ApiName: 'WeatheringManagementApi' }
          })
        ]
      })
    );
  }
}
```

#### 監視スタックデプロイ
```bash
# 監視スタック追加
cd /mnt/c/optimize/weathering-management-system/infrastructure

# app.tsに監視スタック追加
# const monitoringStack = new MonitoringStack(app, 'WeatheringMonitoringStack');

# デプロイ
npx cdk deploy WeatheringMonitoringStack
```

### 3.2 構造化ログ実装
**所要時間**: 2時間

#### 共通ログライブラリ作成
**ファイル**: `infrastructure/lambda/shared/utils/logger.js`

```javascript
class Logger {
  constructor(service, requestId = null) {
    this.service = service;
    this.requestId = requestId;
  }
  
  _log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      requestId: this.requestId,
      ...data
    };
    
    const logMethod = level === 'ERROR' ? console.error : 
                     level === 'WARN' ? console.warn : console.log;
    
    logMethod(JSON.stringify(logEntry));
  }
  
  info(message, data = {}) {
    this._log('INFO', message, data);
  }
  
  error(message, error = null, data = {}) {
    const errorData = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : {};
    
    this._log('ERROR', message, { ...errorData, ...data });
  }
  
  warn(message, data = {}) {
    this._log('WARN', message, data);
  }
  
  debug(message, data = {}) {
    if (process.env.LOG_LEVEL === 'DEBUG') {
      this._log('DEBUG', message, data);
    }
  }
}

module.exports = Logger;
```

#### Lambda関数でのログ使用例
```javascript
// customer-api/index.js での使用例
const Logger = require('../shared/utils/logger');

exports.handler = async (event) => {
  const requestId = event.requestContext.requestId;
  const logger = new Logger('customer-api', requestId);
  
  logger.info('Customer API request started', {
    httpMethod: event.httpMethod,
    path: event.path,
    userAgent: event.headers['User-Agent']
  });
  
  const startTime = Date.now();
  
  try {
    const result = await processRequest(event);
    const duration = Date.now() - startTime;
    
    logger.info('Customer API request completed', {
      statusCode: result.statusCode,
      duration,
      customerId: result.customerId
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Customer API request failed', error, {
      httpMethod: event.httpMethod,
      path: event.path,
      duration
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
```

### 3.3 CloudWatch Insights設定
**所要時間**: 1時間

#### 事前設定クエリ作成
```sql
-- 1. エラー分析クエリ
fields @timestamp, level, service, message, error.message, requestId
| filter level = "ERROR"
| sort @timestamp desc
| limit 100

-- 2. パフォーマンス分析クエリ
fields @timestamp, service, duration, requestId
| filter ispresent(duration)
| stats avg(duration), max(duration), min(duration), count() by service
| sort avg(duration) desc

-- 3. API利用状況分析
fields @timestamp, httpMethod, path, statusCode, duration
| filter ispresent(httpMethod)
| stats count() by httpMethod, path
| sort count desc

-- 4. エラー頻度トレンド分析
fields @timestamp, service, error.message
| filter level = "ERROR"
| stats count() by bin(1h), service
| sort @timestamp

-- 5. 顧客操作トレンド
fields @timestamp, message, customerId
| filter message like /Customer/
| stats count() by bin(1h)
| sort @timestamp
```

**成功基準**:
- CloudWatch Dashboard作成完了
- アラート設定完了
- 構造化ログ実装完了
- Insights クエリ作成完了

---

## 🔒 4. セキュリティ・本番運用設定

### 4.1 WAF設定
**所要時間**: 2時間
**優先度**: 🟡 高

#### WAF WebACL作成
```bash
# WAF設定スクリプト実行
aws wafv2 create-web-acl \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://waf-rules.json \
  --name WeatheringSystemWebACL \
  --description "風化促進管理システム用WAF"

# API GatewayにWAF関連付け
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:ap-northeast-1:123456789012:regional/webacl/WeatheringSystemWebACL/12345678-1234-1234-1234-123456789012 \
  --resource-arn arn:aws:apigateway:ap-northeast-1::/restapis/3jng8xwirl/stages/prod
```

**WAFルール設定ファイル**: `waf-rules.json`
```json
[
  {
    "Name": "RateLimitRule",
    "Priority": 1,
    "Statement": {
      "RateBasedStatement": {
        "Limit": 2000,
        "AggregateKeyType": "IP"
      }
    },
    "Action": { "Block": {} },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "RateLimitRule"
    }
  },
  {
    "Name": "AWSManagedRulesCommonRuleSet",
    "Priority": 2,
    "OverrideAction": { "None": {} },
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesCommonRuleSet"
      }
    },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "CommonRuleSetMetric"
    }
  }
]
```

### 4.2 バックアップ設定
**所要時間**: 1時間

#### DynamoDB自動バックアップ
```bash
# Point-in-Time Recovery有効化確認
aws dynamodb describe-continuous-backups --table-name WeatheringProjectData

# 有効化されていない場合
aws dynamodb update-continuous-backups \
  --table-name WeatheringProjectData \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

#### S3ライフサイクル設定
```bash
# S3バケットライフサイクル設定
aws s3api put-bucket-lifecycle-configuration \
  --bucket weathering-project-reports-788026075178 \
  --lifecycle-configuration file://s3-lifecycle.json
```

**S3ライフサイクル設定**: `s3-lifecycle.json`
```json
{
  "Rules": [
    {
      "ID": "ReportLifecycle",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "reports/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "NoncurrentDays": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 1095
      }
    }
  ]
}
```

**成功基準**:
- WAF設定完了・動作確認
- 自動バックアップ動作確認
- セキュリティ設定完了

---

## 📋 5. 完了確認チェックリスト

### 5.1 必須項目（Phase 4完了要件）
- [ ] **CDKデプロイ**: 全コンポーネント本番環境デプロイ完了
- [ ] **API統合テスト**: 21エンドポイント100%動作確認
- [ ] **E2Eテスト**: フロントエンド統合テスト100%成功
- [ ] **監視設定**: CloudWatch・アラート・ダッシュボード設定完了
- [ ] **ログ基盤**: 構造化ログ・Insights設定完了
- [ ] **セキュリティ**: WAF・認証・権限設定完了
- [ ] **バックアップ**: 自動バックアップ・災害復旧設定完了

### 5.2 品質基準
- [ ] **パフォーマンス**: API レスポンス時間 < 2秒
- [ ] **エラー率**: システム全体エラー率 < 1%
- [ ] **セキュリティ**: 脆弱性0件・WAF動作確認
- [ ] **監視**: 全重要メトリクス監視・アラート設定
- [ ] **可用性**: システム稼働率99.9%目標設定

### 5.3 ドキュメント
- [ ] **運用手順書**: 日常・週次・月次運用手順
- [ ] **トラブルシューティング**: 問題対応手順
- [ ] **災害復旧手順**: 緊急時対応手順
- [ ] **API仕様書**: 全エンドポイント仕様書
- [ ] **監視設定書**: CloudWatch設定詳細

### 5.4 引き継ぎ成果物
- [ ] **稼働システム**: https://dikwcz6haxnrb.cloudfront.net/
- [ ] **API環境**: https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/
- [ ] **監視ダッシュボード**: CloudWatch Dashboard URL
- [ ] **バックアップ**: 自動バックアップ設定・復旧手順
- [ ] **セキュリティ**: WAF・認証システム完全稼働

---

## 🚨 6. 問題発生時の連絡・対応

### 6.1 エスカレーション手順
1. **即座にクリティカル**: システム完全停止
   - Lambda関数全停止
   - API Gateway全エラー
   - DynamoDB接続不可

2. **1時間以内に対応**: 機能制限
   - 特定API機能停止
   - パフォーマンス大幅悪化
   - 認証システム不安定

3. **当日中に対応**: 軽微な問題
   - ログ出力異常
   - 監視アラート誤発生
   - UI表示軽微な問題

### 6.2 緊急時コマンド
```bash
# システム状態確認
aws lambda list-functions --query 'Functions[].FunctionName' | grep -E "(customer|project|measurement|report)"

# API Gateway状態確認
aws apigateway get-rest-apis --query 'items[?name==`WeatheringManagementApi`]'

# DynamoDB状態確認
aws dynamodb describe-table --table-name WeatheringProjectData --query 'Table.TableStatus'

# CloudWatch最新アラーム確認
aws cloudwatch describe-alarms --alarm-names WeatheringSystem-Lambda-Errors WeatheringSystem-ApiGateway-5xx

# 緊急停止（必要時のみ）
# Lambda無効化
aws lambda put-function-concurrency --function-name customer-api --reserved-concurrent-executions 0

# API Gateway スロットリング
aws apigateway update-stage --rest-api-id 3jng8xwirl --stage-name prod --patch-ops op=replace,path=/throttle/rateLimit,value=1
```

---

## 🎯 Phase 4 成功完了の定義

### 最終成果物
1. **完全稼働システム**: 全機能100%動作
2. **監視体制**: 24/7監視・自動アラート体制
3. **運用準備**: 完全な運用手順・緊急対応体制
4. **セキュリティ**: 本番レベルセキュリティ実装
5. **バックアップ**: 自動バックアップ・災害復旧準備

### 運用開始可能状態
- **システム安定性**: 99.9%稼働率
- **パフォーマンス**: SLA基準達成
- **セキュリティ**: 脆弱性0件
- **運用体制**: 手順書・体制完備
- **監視体制**: 完全自動監視

---

**Phase 4: Cursor統合テスト・監視設定・本番運用準備 - 引き継ぎ完了**
**実装期間**: 5日間
**担当**: Cursor（統合テスト・運用設定）

// TODO: Phase 4統合テスト・監視設定・本番運用準備実施完了後、Phase 5運用最適化・機能拡張計画へ移行