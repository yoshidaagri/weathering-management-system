# Phase 5 ML予測API機能再デプロイ実行ガイド

## 🎯 作業目標
CloudFormationスタックの UPDATE_ROLLBACK_COMPLETE 状態から、Phase 5のML予測API機能を正常にデプロイし、完全に動作させる。

## 📊 現在の状況（2024年12月19日時点）

### ✅ 正常に稼働中
- **CloudFormationスタック**: UPDATE_ROLLBACK_COMPLETE（正常状態）
- **DynamoDBテーブル**: WeatheringProjectData（PROVISIONED請求モード）
- **Lambda関数**: 4つが稼働中
  - CustomerApiFunction: `WeatheringProjectStack-CustomerApiFunctionBCE3D4F0-1WyjSMj5GKPb`
  - ProjectApiFunction: `WeatheringProjectStack-ProjectApiFunction931A0493-RS5XbBlbKxgS`
  - MeasurementApiFunction: `WeatheringProjectStack-MeasurementApiFunction87069-SDaRP0fzM5ow`
  - ReportGeneratorFunction: `WeatheringProjectStack-ReportGeneratorFunction9B20-90lWr7dbMqNC`

### ❌ 削除されたリソース
- **ML予測API Lambda関数**: ロールバック時に削除
- **API Gateway**: 完全削除
- **ML予測API関連のCloudWatch Logs**: 削除

### 🔍 CDK差分確認済み
- **DynamoDBテーブル**: 変更なし（請求モード問題は解決済み）
- **ML予測API Lambda関数**: 新規作成予定
- **API Gateway**: 完全再構築（パス構造最適化）
- **CloudWatch監視**: 強化版で追加

## 🚀 実行手順

### Step 1: 事前確認
```bash
# 現在の作業ディレクトリ確認
pwd
# 期待値: C:\optimize\weathering-management-system\infrastructure

# AWSアカウント確認
aws sts get-caller-identity
# 期待値: Account ID 788026075178

# CDKバージョン確認
npx cdk --version
# 期待値: 2.x.x
```

### Step 2: CDKデプロイ実行
```bash
# CDKデプロイ実行
npx cdk deploy --require-approval never

# 期待される進行状況:
# 1. スタック準備
# 2. Lambda関数の更新・作成
# 3. API Gateway再構築
# 4. CloudWatch設定
# 5. IAM権限設定
# 6. デプロイ完了
```

### Step 3: デプロイ監視
```bash
# 別のターミナルで監視（オプション）
aws cloudformation describe-stack-events --region ap-northeast-1 --stack-name WeatheringProjectStack --query "StackEvents[0:10].{Time:Timestamp,Status:ResourceStatus,Type:ResourceType,LogicalId:LogicalResourceId}" --output table
```

### Step 4: デプロイ完了確認
```bash
# 1. スタック状態確認
aws cloudformation describe-stacks --region ap-northeast-1 --stack-name WeatheringProjectStack --query "Stacks[0].StackStatus" --output text
# 期待値: UPDATE_COMPLETE

# 2. Lambda関数一覧確認
aws lambda list-functions --region ap-northeast-1 --query "Functions[?contains(FunctionName, 'WeatheringProjectStack')].FunctionName" --output text
# 期待値: 5つの関数（ML予測API含む）

# 3. API Gateway確認
aws apigateway get-rest-apis --region ap-northeast-1 --query "items[?contains(name, 'WeatheringProjectStack')].{Name:name,Id:id}" --output table
# 期待値: 1つのAPI Gateway

# 4. CloudWatch Logs確認
aws logs describe-log-groups --region ap-northeast-1 --log-group-name-prefix "/aws/lambda/WeatheringProjectStack" --query "logGroups[].logGroupName" --output text
# 期待値: 5つのログループ
```

### Step 5: 機能動作確認
```bash
# ML予測API Lambda関数の直接テスト
cd ../test-scripts
node lambda-direct-test.js
# 期待値: 全5つの関数が正常応答

# API Gateway経由のテスト
node ml-api-integration-test.js
# 期待値: 全26エンドポイントが正常応答
```

## 📋 成功判定基準

### 必須条件（すべて✅である必要がある）
- [ ] CloudFormationスタック: UPDATE_COMPLETE
- [ ] Lambda関数: 5つすべて稼働
- [ ] API Gateway: 1つ作成・応答OK
- [ ] DynamoDBテーブル: 既存データ保持・アクセス可能
- [ ] CloudWatch Logs: 5つのログループ作成

### 推奨条件（品質確認）
- [ ] ML予測API直接テスト: 100%成功
- [ ] API Gateway統合テスト: 100%成功
- [ ] 既存機能の非回帰確認: 基本4機能動作OK

## 🚨 想定されるエラーと対処法

### Case 1: Lambda関数作成失敗
```bash
# エラー詳細確認
aws logs describe-log-groups --region ap-northeast-1 --log-group-name-prefix "/aws/lambda/WeatheringProjectStack-MLPrediction"

# 対処法: Lambda関数個別確認
aws lambda get-function --region ap-northeast-1 --function-name WeatheringProjectStack-MLPredictionFunction...
```

### Case 2: API Gateway作成失敗
```bash
# エラー詳細確認
aws apigateway get-rest-apis --region ap-northeast-1

# 対処法: CDK差分再確認
npx cdk diff
```

### Case 3: 権限エラー
```bash
# IAMロール確認
aws iam get-role --role-name WeatheringProjectStack-...

# 対処法: CDK再デプロイ
npx cdk deploy --require-approval never
```

## 🔄 失敗時の緊急対応

### 完全ロールバック
```bash
# スタックの手動ロールバック
aws cloudformation cancel-update-stack --region ap-northeast-1 --stack-name WeatheringProjectStack

# 安全な状態まで戻す
aws cloudformation continue-update-rollback --region ap-northeast-1 --stack-name WeatheringProjectStack
```

### 段階的復旧
```bash
# 問題のあるリソースをスキップ
aws cloudformation continue-update-rollback --region ap-northeast-1 --stack-name WeatheringProjectStack --resources-to-skip [問題のリソース名]
```

## 📈 実行予定時間

| フェーズ | 所要時間 | 内容 |
|---------|----------|------|
| 事前確認 | 2分 | 環境・権限確認 |
| CDKデプロイ | 10-15分 | メインデプロイ作業 |
| デプロイ確認 | 3分 | 作成リソース確認 |
| 機能テスト | 5分 | API動作確認 |
| **合計** | **20-25分** | **全体作業時間** |

## 🎯 デプロイ実行の準備完了

### 実行前チェックリスト
- [ ] 作業ディレクトリ: `C:\optimize\weathering-management-system\infrastructure`
- [ ] AWS認証情報: 有効
- [ ] CDKバージョン: 2.x.x
- [ ] 作業指示書: 理解済み
- [ ] 緊急時対応手順: 把握済み

### 実行コマンド（準備完了）
```bash
npx cdk deploy --require-approval never
```

**✅ 準備完了。デプロイ実行の指示をお待ちしています。**

---

**作成日時**: 2024年12月19日  
**実行予定**: デプロイ指示後即座に実行  
**想定完了時間**: 実行開始から20-25分後  
**緊急連絡先**: 作業実行者（Cursor AI） 