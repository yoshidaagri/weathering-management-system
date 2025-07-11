# Cursor テスト実行ガイド - Phase 3 統合テスト

## 🎯 テスト実行概要

**目的**: Phase 3で実装したプロジェクト・測定データ・レポート管理APIの統合テスト
**対象**: 4つのLambda関数 + API Gateway + フロントエンド統合
**重要度**: 高（本番稼働前の最終確認）

## 📋 事前準備チェックリスト

### ✅ 必須確認事項
- [ ] AWS CLI設定完了（`aws configure list`）
- [ ] Node.js 18.x以上インストール確認（`node --version`）
- [ ] CDK CLI インストール確認（`npx cdk --version`）
- [ ] プロジェクトディレクトリ確認（`/mnt/c/optimize/weathering-management-system`）

### ✅ 環境情報確認
- [ ] CloudFront URL: https://dikwcz6haxnrb.cloudfront.net/
- [ ] API Gateway URL: https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/
- [ ] User Pool ID: ap-northeast-1_BEnyexqxY
- [ ] Cognito動作確認: ログイン機能が正常動作

## 🚀 テスト実行手順

### Step 1: CDKデプロイ実行

```bash
# infrastructureディレクトリに移動
cd infrastructure

# 依存関係インストール
npm install

# CDK設定確認
npx cdk list

# 変更差分確認（重要：デプロイ前に必ず確認）
npx cdk diff

# デプロイ実行
npx cdk deploy --require-approval never

# デプロイ完了確認
npx cdk output
```

**期待される出力**:
```
✅ WeatheringProjectStack

Outputs:
ApiURL = https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod/
UserPoolIdOutput = ap-northeast-1_BEnyexqxY
WebsiteURL = https://dikwcz6haxnrb.cloudfront.net
```

### Step 2: Lambda関数動作確認

```bash
# Lambda関数一覧確認
aws lambda list-functions --query 'Functions[?contains(FunctionName, `Weathering`)]'

# 各関数の設定確認
aws lambda get-function --function-name WeatheringProjectStack-ProjectApiFunction
aws lambda get-function --function-name WeatheringProjectStack-MeasurementApiFunction  
aws lambda get-function --function-name WeatheringProjectStack-ReportGeneratorFunction
aws lambda get-function --function-name WeatheringProjectStack-CustomerApiFunction

# 関数ログ確認（エラーがないかチェック）
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/WeatheringProjectStack
```

### Step 3: API Gateway エンドポイント確認

```bash
# API Gateway 設定確認
aws apigateway get-rest-apis --query 'items[?name==`Weathering Project API`]'

# リソース構造確認
aws apigateway get-resources --rest-api-id <API_ID>

# Cognito Authorizer確認
aws apigateway get-authorizers --rest-api-id <API_ID>
```

### Step 4: フロントエンド統合テスト

```bash
# testディレクトリに移動
cd ../test

# 依存関係確認
npm install

# TypeScriptコンパイル確認
npx tsc --noEmit

# ビルド実行
npm run build

# 開発サーバー起動
npm run dev
```

**確認項目**:
- [ ] http://localhost:3000 でアプリケーション起動
- [ ] ログイン画面の表示
- [ ] 認証フローの動作
- [ ] 各ページ（顧客・プロジェクト・測定データ・レポート）の表示

## 🧪 API機能テスト

### テスト1: 顧客管理API

```bash
# API呼び出し用トークン取得（ログイン後）
export AUTH_TOKEN="Bearer <your-token-here>"
export API_BASE="https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod"

# 顧客一覧取得テスト
curl -X GET "${API_BASE}/api/customers" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "Content-Type: application/json"

# 顧客作成テスト
curl -X POST "${API_BASE}/api/customers" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "テスト会社",
    "contactInfo": {
      "email": "test@example.com",
      "phone": "03-1234-5678",
      "address": "東京都港区"
    },
    "industry": "製造業",
    "status": "active"
  }'
```

### テスト2: プロジェクト管理API

```bash
# プロジェクト作成テスト（customerIdは上記で作成したものを使用）
curl -X POST "${API_BASE}/api/projects" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テストプロジェクト",
    "description": "統合テスト用プロジェクト",
    "customerId": "<customer-id-from-previous-test>",
    "siteLocation": {
      "latitude": 35.6762,
      "longitude": 139.6503,
      "address": "東京都港区"
    },
    "budget": 1000000,
    "co2Target": 100,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z"
  }'

# プロジェクト一覧取得
curl -X GET "${API_BASE}/api/projects" \
  -H "Authorization: ${AUTH_TOKEN}"
```

### テスト3: 測定データAPI

```bash
# 測定データ作成テスト（projectIdは上記で作成したものを使用）
curl -X POST "${API_BASE}/api/projects/<project-id>/measurements" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-07-10T12:00:00Z",
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

# バッチ測定データ作成テスト
curl -X POST "${API_BASE}/api/projects/<project-id>/measurements/batch" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "measurements": [
      {
        "timestamp": "2025-07-10T13:00:00Z",
        "type": "water_quality",
        "values": {
          "ph": 7.1,
          "temperature": 26.0,
          "co2Concentration": 410,
          "flowRate": 105.0,
          "iron": 0.12,
          "copper": 0.06,
          "zinc": 0.25
        }
      },
      {
        "timestamp": "2025-07-10T14:00:00Z",
        "type": "atmospheric",
        "values": {
          "co2Concentration": 420,
          "temperature": 28.0
        }
      }
    ]
  }'
```

### テスト4: レポート生成API

```bash
# レポート生成テスト
curl -X POST "${API_BASE}/api/projects/<project-id>/reports" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "mrv",
    "format": "pdf",
    "parameters": {
      "startDate": "2025-01-01",
      "endDate": "2025-07-10"
    }
  }'

# レポート一覧確認
curl -X GET "${API_BASE}/api/projects/<project-id>/reports" \
  -H "Authorization: ${AUTH_TOKEN}"

# レポート詳細確認（reportIdは生成時に取得）
curl -X GET "${API_BASE}/api/projects/<project-id>/reports/<report-id>" \
  -H "Authorization: ${AUTH_TOKEN}"
```

## 🖥️ フロントエンド統合テスト

### 手動テストシナリオ

1. **認証フロー**
   - [ ] ログインページ表示
   - [ ] 正常なログイン（admin/password）
   - [ ] 不正な認証情報でのエラー表示
   - [ ] 認証後のリダイレクト

2. **顧客管理画面**
   - [ ] 顧客一覧表示
   - [ ] 新規顧客作成
   - [ ] 顧客詳細表示
   - [ ] 顧客情報編集
   - [ ] 検索・フィルタリング

3. **プロジェクト管理画面**
   - [ ] プロジェクト一覧表示
   - [ ] 新規プロジェクト作成
   - [ ] プロジェクト詳細表示
   - [ ] ステータス更新
   - [ ] 顧客フィルタリング

4. **測定データ画面**
   - [ ] 測定データ一覧表示
   - [ ] データ登録フォーム
   - [ ] バッチデータアップロード
   - [ ] 期間フィルタリング
   - [ ] アラート表示

5. **レポート画面**
   - [ ] レポート生成フォーム
   - [ ] 生成ステータス表示
   - [ ] ダウンロード機能
   - [ ] レポート履歴表示

## 🚨 トラブルシューティング

### よくあるエラーと対処法

#### 1. CDKデプロイエラー
```bash
# スタック状態確認
aws cloudformation describe-stacks --stack-name WeatheringProjectStack

# エラー詳細確認
aws cloudformation describe-stack-events --stack-name WeatheringProjectStack
```

#### 2. Lambda関数エラー
```bash
# 最新のログ確認
aws logs filter-log-events \
  --log-group-name /aws/lambda/WeatheringProjectStack-ProjectApiFunction \
  --start-time $(date -d "1 hour ago" +%s)000

# 環境変数確認
aws lambda get-function-configuration --function-name WeatheringProjectStack-ProjectApiFunction
```

#### 3. API Gateway 403エラー
- Cognito Authorizer設定確認
- トークンの有効性確認
- CORS設定確認

#### 4. DynamoDB エラー
```bash
# テーブル状態確認
aws dynamodb describe-table --table-name WeatheringProjectData

# GSI状態確認
aws dynamodb describe-table --table-name WeatheringProjectData --query 'Table.GlobalSecondaryIndexes'
```

#### 5. フロントエンドエラー
- ブラウザ開発者ツールでネットワークエラー確認
- コンソールログでJavaScriptエラー確認
- API_GATEWAY_URL環境変数確認

## ✅ テスト完了チェックリスト

### 必須項目
- [ ] CDKデプロイ成功
- [ ] 4つのLambda関数正常動作
- [ ] API Gateway全エンドポイント応答
- [ ] 認証フロー正常動作
- [ ] CRUD操作全て成功
- [ ] エラーハンドリング正常動作

### 推奨項目
- [ ] パフォーマンス測定
- [ ] 負荷テスト実行
- [ ] セキュリティテスト
- [ ] ブラウザ互換性確認

## 📊 テスト結果記録

### テスト実行日時
- 実行日: ___________
- 実行者: ___________
- 環境: ___________

### 結果サマリー
- [ ] 全テスト成功
- [ ] 一部テスト失敗（詳細記録）
- [ ] 要調査項目あり

### 発見した問題
1. ___________
2. ___________
3. ___________

### 次のアクション
1. ___________
2. ___________
3. ___________

---

**📞 サポート連絡先**
- 技術的問題: Claude Code 実装チーム
- AWS環境: インフラ担当者
- 緊急時: プロジェクトマネージャー

**🔗 関連リソース**
- [AWS Console](https://console.aws.amazon.com/)
- [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home#logsV2:)
- [DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
- [API Gateway Console](https://console.aws.amazon.com/apigateway/)

// TODO: Cursor - テスト実行・結果記録