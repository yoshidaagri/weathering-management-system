# Phase 5 ML予測API機能再デプロイ作業指示書

## 🎯 作業概要
CloudFormationスタックのUPDATE_ROLLBACK_FAILEDから復旧し、Phase 5のML予測API機能を正常にデプロイする

## 📋 現在の状況

### ✅ 正常稼働中のリソース
- Lambda関数（4つ）
  - `WeatheringProjectStack-ProjectApiFunction931A0493-RS5XbBlbKxgS`
  - `WeatheringProjectStack-ReportGeneratorFunction9B20-90lWr7dbMqNC`
  - `WeatheringProjectStack-CustomerApiFunctionBCE3D4F0-1WyjSMj5GKPb`
  - `WeatheringProjectStack-MeasurementApiFunction87069-SDaRP0fzM5ow`

### ❌ 削除されたリソース
- ML予測API Lambda関数
- API Gateway（全体）
- CloudWatch Logs（ML予測API関連）

### ⚠️ 問題の原因
- DynamoDBテーブルの請求モード変更で1日1回制限に抵触
- CloudFormationスタックが不整合状態になった

## 🔧 修正作業手順

### 1. CDKコードの問題修正

#### A. DynamoDBテーブル設定の修正
```bash
cd infrastructure
```

**修正対象ファイル:** `lib/main-stack.ts`

**修正内容:**
```typescript
// 現在の設定（問題の原因）
const table = new dynamodb.Table(this, 'WeatheringProjectTable', {
  // billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // この変更が原因
  billingMode: dynamodb.BillingMode.PROVISIONED, // 元の設定に戻す
  readCapacity: 5,
  writeCapacity: 5,
  // その他の設定は維持
});
```

#### B. API Gateway設定の確認
```typescript
// API Gateway設定の確認
const api = new apigateway.RestApi(this, 'WeatheringProjectApi', {
  restApiName: 'WeatheringProjectApi',
  description: 'Weathering Project API',
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
    allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
  },
});
```

### 2. 段階的再デプロイ手順

#### Phase 1: CDK差分確認
```bash
# CDKの差分を確認
npx cdk diff

# 期待される出力: DynamoDBテーブルの変更なし、ML予測API追加のみ
```

#### Phase 2: 安全なデプロイ実行
```bash
# 1. 依存関係の更新
npm install

# 2. CDKブートストラップ確認
npx cdk bootstrap

# 3. 段階的デプロイ実行
npx cdk deploy --require-approval never

# 4. デプロイ進行状況監視
# 別ターミナルで監視
aws cloudformation describe-stack-events --region ap-northeast-1 --stack-name WeatheringProjectStack --query "StackEvents[0:5].{Time:Timestamp,Status:ResourceStatus,Type:ResourceType}" --output table
```

#### Phase 3: デプロイ後確認
```bash
# 1. スタックステータス確認
aws cloudformation describe-stacks --region ap-northeast-1 --stack-name WeatheringProjectStack --query "Stacks[0].StackStatus" --output text
# 期待値: UPDATE_COMPLETE

# 2. Lambda関数一覧確認
aws lambda list-functions --region ap-northeast-1 --query "Functions[?contains(FunctionName, 'WeatheringProjectStack')].FunctionName" --output text
# 期待値: 5つの関数（ML予測API含む）

# 3. API Gateway確認
aws apigateway get-rest-apis --region ap-northeast-1 --query "items[?contains(name, 'WeatheringProjectStack')].{Name:name,Id:id}" --output table
# 期待値: API Gateway 1つ
```

### 3. 機能動作確認

#### A. ML予測API Lambda関数テスト
```bash
# テストスクリプト実行
cd test-scripts
node lambda-direct-test.js
```

**期待される結果:**
- 全5つのLambda関数が正常応答
- ML予測API関数のテスト成功

#### B. API Gateway統合テスト
```bash
# API Gateway経由のテスト
node ml-api-integration-test.js
```

**期待される結果:**
- 全26エンドポイントが正常応答
- 認証フローが正常動作

## 🚨 注意事項・制約事項

### DynamoDBテーブル関連
- **請求モード変更は24時間に1回のみ**: 今回は元の設定に戻すため変更なし
- **既存データの保持**: テーブル構造変更時はデータバックアップを事前取得
- **インデックス変更**: GSI/LSIの追加・削除は慎重に実行

### CloudFormationスタック関連
- **ロールバック失敗時の対応**: `continue-update-rollback`コマンドを使用
- **リソース削除の確認**: 不要なリソースが残留していないかチェック
- **スタック削除の禁止**: 本番環境では絶対にスタック削除しない

### Lambda関数関連
- **環境変数の確認**: 新しい関数に適切な環境変数が設定されているか
- **IAMロール権限**: ML予測API用の適切な権限が付与されているか
- **VPC設定**: 必要に応じてVPC内リソースへのアクセス権限確認

## 📊 成功判定基準

### 必須条件
1. ✅ CloudFormationスタック: `UPDATE_COMPLETE`
2. ✅ Lambda関数: 5つすべて正常稼働
3. ✅ API Gateway: 正常作成・応答
4. ✅ DynamoDBテーブル: 既存データ保持・正常アクセス

### 推奨条件
1. ✅ ML予測API直接テスト: 全エンドポイント成功
2. ✅ API Gateway統合テスト: 全26エンドポイント成功
3. ✅ 既存機能の非回帰確認: 基本4機能の動作確認

## 🔄 失敗時の対応手順

### Case 1: DynamoDBテーブル更新再失敗
```bash
# 手動でテーブル設定を確認
aws dynamodb describe-table --region ap-northeast-1 --table-name WeatheringProjectTable --query "Table.BillingModeSummary"

# 必要に応じて24時間待機後再実行
```

### Case 2: Lambda関数デプロイ失敗
```bash
# 個別関数の状態確認
aws lambda get-function --region ap-northeast-1 --function-name [関数名]

# ログの確認
aws logs describe-log-groups --region ap-northeast-1 --log-group-name-prefix "/aws/lambda/WeatheringProjectStack"
```

### Case 3: API Gateway作成失敗
```bash
# API Gateway削除後再作成
aws apigateway delete-rest-api --region ap-northeast-1 --rest-api-id [API-ID]

# CDK再デプロイ
npx cdk deploy --require-approval never
```

## 📝 作業完了チェックリスト

### 事前準備
- [ ] 現在のスタック状態確認完了
- [ ] CDKコード修正完了
- [ ] 依存関係更新完了

### デプロイ実行
- [ ] CDK差分確認完了
- [ ] 安全なデプロイ実行完了
- [ ] スタックステータス確認完了

### 動作確認
- [ ] Lambda関数一覧確認完了
- [ ] API Gateway確認完了
- [ ] ML予測API直接テスト完了
- [ ] API Gateway統合テスト完了

### 最終確認
- [ ] 既存機能の非回帰確認完了
- [ ] パフォーマンス監視設定確認完了
- [ ] エラーログ確認完了
- [ ] 作業完了報告書作成完了

## 🎯 次のステップ

作業完了後、以下を実施：
1. **フロントエンド連携テスト**: 高度分析ダッシュボードの動作確認
2. **パフォーマンス最適化**: CloudWatch監視・アラーム設定
3. **E2Eテスト**: 包括的なユーザーシナリオテスト
4. **本番環境デプロイ**: S3/CloudFront更新

---

**作成日**: 2024年12月19日  
**作成者**: Cursor AI  
**対象バージョン**: Phase 5 ML予測API機能  
**更新履歴**: 初版作成 