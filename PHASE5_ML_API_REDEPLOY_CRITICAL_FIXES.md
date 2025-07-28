# Phase 5 ML予測API緊急修正作業指示書

## 🎯 現在の状況（2024年12月19日 21:53）

### ✅ 正常稼働中のリソース
- **ML予測Lambda関数**: `WeatheringProjectStack-MLPredictionFunction172496D-aev2vfy27U2b` ✅
- **基本Lambda関数（4つ）**: 全て正常稼働
  - CustomerApiFunction: `WeatheringProjectStack-CustomerApiFunctionBCE3D4F0-1WyjSMj5GKPb`
  - ProjectApiFunction: `WeatheringProjectStack-ProjectApiFunction931A0493-RS5XbBlbKxgS`
  - MeasurementApiFunction: `WeatheringProjectStack-MeasurementApiFunction87069-SDaRP0fzM5ow`
  - ReportGeneratorFunction: `WeatheringProjectStack-ReportGeneratorFunction9B20-90lWr7dbMqNC`
- **CloudWatch LogGroups**: 全て作成済み

### ❌ 問題のあるリソース
- **API Gateway**: ロールバック時に削除
- **Lambda Provisioned Concurrency**: CustomerApiFunction設定失敗
- **DynamoDBテーブル**: 請求モード1日1回制限で更新失敗

## 🚨 緊急修正が必要な問題

### 1. **DynamoDBテーブル請求モード問題**
**問題**: CDKが`PAY_PER_REQUEST`モードに変更しようとするが、実際のテーブルは`PROVISIONED`
**原因**: CDKとAWSの状態不整合

**修正方法**:
```typescript
// CDKコードでDynamoDBテーブル設定を現在の状態と一致させる
billingMode: dynamodb.BillingMode.PROVISIONED, // ✅ 既に設定済み
```

### 2. **Lambda Provisioned Concurrency設定問題**
**問題**: Provisioned Concurrency設定が失敗する
**原因**: Lambda関数の初期化時間またはリソース制限

**修正方法**:
```typescript
// Provisioned Concurrency設定を一時的に削除または調整
const customerLambdaAlias = customerLambda.addAlias('live', {
  // provisionedConcurrentExecutions: 2,  // 一時的にコメントアウト
});
```

## 🔧 緊急修正手順

### Step 1: CDKコードの修正
1. **Provisioned Concurrency設定を無効化**
   - `infrastructure/lib/main-stack.ts`のProvisioned Concurrency設定をコメントアウト
   - 5つのLambda関数全てで一時的に無効化

2. **DynamoDBテーブル設定の確認**
   - 現在の`billingMode: dynamodb.BillingMode.PROVISIONED`設定を維持

### Step 2: 段階的デプロイ実行
```bash
# インフラストラクチャディレクトリに移動
cd infrastructure

# 修正版をデプロイ
npx cdk deploy WeatheringProjectStack --app "node bin/main.js" --require-approval never
```

### Step 3: 機能確認
```bash
# Lambda関数の確認
aws lambda list-functions --region ap-northeast-1 --query "Functions[?contains(FunctionName, 'WeatheringProjectStack')].FunctionName" --output text

# API Gatewayの確認
aws apigateway get-rest-apis --region ap-northeast-1 --query "items[?contains(name, 'WeatheringProjectStack')]"

# ML予測API直接テスト
# test-scripts/lambda-direct-test.js を使用
```

## 🎯 期待される結果

### 修正後の目標状態
- **Lambda関数**: 5つ全て正常稼働（ML予測API含む）
- **API Gateway**: 全エンドポイント復旧
- **CloudFormationスタック**: `UPDATE_COMPLETE`状態
- **DynamoDBテーブル**: `PROVISIONED`モードで安定稼働

### 成功基準
1. **CDKデプロイ**: エラーなしで完了
2. **ML予測API**: 直接Lambda呼び出しで動作確認
3. **API Gateway**: 全26エンドポイント（21+5）が応答
4. **CloudFormationスタック**: 安定状態

## ⚠️ 注意事項

### DynamoDBテーブル制限
- **請求モード変更**: 明日（2025年7月13日）まで変更不可
- **対策**: 現在の`PROVISIONED`モードを維持

### Lambda Provisioned Concurrency
- **一時的無効化**: パフォーマンスに影響する可能性
- **後で再有効化**: 別途作業で段階的に設定

### API Gateway認証
- **Cognito認証**: 既存設定を維持
- **テスト用認証情報**: 
  - User Pool ID: `ap-northeast-1_BEnyexqxY`
  - Client ID: `2gqqmrdorakjgq7ahuvlq5f9e2`

## 📋 作業チェックリスト

- [ ] CDKコードのProvisioned Concurrency設定無効化
- [ ] DynamoDBテーブル設定確認
- [ ] 修正版CDKデプロイ実行
- [ ] Lambda関数動作確認
- [ ] API Gateway復旧確認
- [ ] ML予測API機能テスト
- [ ] CloudFormationスタック状態確認

## 🔄 次のフェーズ

修正完了後：
1. **機能テスト**: ML予測API全エンドポイント
2. **統合テスト**: フロントエンドとの連携確認
3. **パフォーマンス最適化**: Provisioned Concurrency再設定
4. **本番デプロイ**: S3 + CloudFront更新

---

**緊急度**: 🔴 高（ML予測API機能の完全復旧のため）
**推定作業時間**: 30-60分
**リスク**: 低（既存機能への影響最小） 