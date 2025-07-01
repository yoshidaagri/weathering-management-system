## システム仕様手順書.md

```markdown
# 風化促進CO2除去・廃水処理事業Webアプリ システム仕様手順書

## 1. プロジェクト概要

### 1.1 目的
鉱山廃水における風化促進による二酸化炭素除去と廃水処理事業の管理システムをAWSサーバーレスアーキテクチャで構築し、Claude Artifactsを活用して効率的に開発する。

### 1.2 開発方針
- **段階的開発**: MVPから始めて機能を順次追加
- **サーバーレスファースト**: 運用コストとスケーラビリティを重視
- **Claude Artifacts活用**: コード生成で開発速度向上
- **Infrastructure as Code**: AWS CDKで全てをコード管理

## 2. システムアーキテクチャ

### 2.1 全体構成図
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   CloudFront    │────▶│ S3 (React App)│     │    Cognito      │
└─────────────────┘     └──────────────┘     └─────────────────┘
│                                              │
▼                                              ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  API Gateway    │────▶│    Lambda    │────▶│   DynamoDB      │
└─────────────────┘     └──────────────┘     └─────────────────┘
│                        │
▼                        ▼
┌──────────────┐     ┌─────────────────┐
│ EventBridge  │     │ DynamoDB Streams│
└──────────────┘     └─────────────────┘
│
▼
┌──────────────┐
│Step Functions│
└──────────────┘

### 2.2 主要コンポーネント

#### フロントエンド
- **ホスティング**: S3 + CloudFront
- **フレームワーク**: React + Next.js
- **認証**: AWS Cognito (直接連携)

#### バックエンド
- **API**: API Gateway + Lambda
- **データベース**: DynamoDB (Single Table Design)
- **ファイルストレージ**: S3
- **ワークフロー**: Step Functions
- **イベント処理**: EventBridge + DynamoDB Streams

## 3. データベース設計（DynamoDB）

### 3.1 テーブル構造
Table Name: WeatheringProjectTable
Primary Key:

PK (Partition Key): String
SK (Sort Key): String

GSI1:

GSI1PK: String
GSI1SK: String

GSI2:

GSI2PK: String
GSI2SK: String

### 3.2 エンティティ設計
顧客（鉱山事業者）
PK: CUSTOMER#${customerId}
SK: METADATA
Attributes: companyName, contactInfo, createdAt, updatedAt
プロジェクト（事業計画）
PK: CUSTOMER#${customerId}
SK: PROJECT#${projectId}
GSI1PK: PROJECT#${projectId}
GSI1SK: METADATA
Attributes: projectName, location, status, startDate, endDate
測定データ
PK: PROJECT#${projectId}
SK: MEASUREMENT#${timestamp}
GSI1PK: DATE#${date}
GSI1SK: PROJECT#{projectId}#
{timestamp}
Attributes: pH, temperature, flowRate, co2Absorption, metalConcentration

計画データ
PK: PROJECT#${projectId}
SK: PLAN#${planId}
Attributes: targetCO2, targetpH, spreadingAmount, schedule
レポート
PK: PROJECT#${projectId}
SK: REPORT#{reportId}#
{reportType}
GSI2PK: REPORTTYPE#${reportType}
GSI2SK: DATE#${date}
Attributes: reportData, status, submittedAt

## 4. 開発手順（Claude Artifacts活用）

### Phase 1: 基盤構築（Week 1-2）

#### Step 1: AWS環境セットアップ
```bash
# Claude Artifactsへの依頼例
"AWS CDKでプロジェクトの初期セットアップを作成してください。
必要なもの: Cognito User Pool、S3バケット、DynamoDBテーブル"

Step 2: 認証基盤
# Claude Artifactsへの依頼例
"Cognitoを直接使った認証機能のReactコンポーネントを作成してください。
ログイン、ログアウト、パスワードリセット機能を含めてください"

Step 3: 基本的なCRUD API
# Claude Artifactsへの依頼例
"顧客情報のCRUD操作を行うLambda関数とAPI Gatewayの設定をCDKで作成してください"

Phase 2: コア機能実装（Week 3-4）
Step 4: 事業計画シミュレーション
# Claude Artifactsへの依頼例
"事業計画シミュレーション機能のReactコンポーネントを作成してください。
パラメータ入力フォームと結果表示のダッシュボードを含めてください"

Step 5: 測定データ管理
# Claude Artifactsへの依頼例
"測定データを登録・検索・表示するLambda関数群を作成してください。
バッチ登録とリアルタイム登録の両方に対応してください"

Phase 3: 高度な機能実装（Week 5-6）
Step 6: 計画/実績検証
# Claude Artifactsへの依頼例
"計画と実績を比較分析するダッシュボードコンポーネントを作成してください。
Chart.jsを使用してグラフ表示も含めてください"
Step 7: レポート生成
# Claude Artifactsへの依頼例
"Step Functionsを使ったレポート生成ワークフローを作成してください。
データ収集→集計→PDF生成→S3保存の流れで"

Phase 4: 運用準備（Week 7-8）
Step 8: モニタリング・アラート
# Claude Artifactsへの依頼例
"CloudWatchダッシュボードとアラート設定のCDKコードを作成してください"

Step 9: CI/CDパイプライン   
# Claude Artifactsへの依頼例
"GitHub ActionsでAWSへの自動デプロイを行うワークフローを作成してください"

5. API仕様
5.1 認証API
POST   /auth/login
POST   /auth/logout  
POST   /auth/refresh
POST   /auth/password/reset
5.2 顧客管理API
GET    /customers
GET    /customers/{customerId}
POST   /customers
PUT    /customers/{customerId}
DELETE /customers/{customerId}
5.3 プロジェクト管理API
GET    /projects
GET    /projects/{projectId}
POST   /projects
PUT    /projects/{projectId}
DELETE /projects/{projectId}
5.4 測定データAPI
GET    /projects/{projectId}/measurements
POST   /projects/{projectId}/measurements
POST   /projects/{projectId}/measurements/batch
GET    /projects/{projectId}/measurements/{measurementId}
5.5 レポートAPI
POST   /projects/{projectId}/reports/generate
GET    /projects/{projectId}/reports
GET    /projects/{projectId}/reports/{reportId}
GET    /projects/{projectId}/reports/{reportId}/download
6. セキュリティ設計
6.1 認証・認可

Cognito User Poolsでユーザー管理
JWT トークンベースの認証
API GatewayでCognito Authorizerを使用
顧客は自社データのみアクセス可能

6.2 データ保護

保存時の暗号化（DynamoDB、S3）
転送時の暗号化（HTTPS）
CloudFront + WAFでDDoS対策

6.3 アクセス制御

IAMロールは最小権限
API Keyによる追加認証
VPCは使用せず（コスト削減）

7. 監視・運用
7.1 モニタリング

CloudWatch Logs: 全Lambda関数のログ
CloudWatch Metrics: カスタムメトリクス
X-Ray: 分散トレーシング

7.2 アラート

Lambda エラー率
API Gateway 4xx/5xx エラー
DynamoDB スロットリング
月次コスト予算超過



本番環境（10顧客想定）

Lambda: $50
DynamoDB: $30
S3 + CloudFront: $20
API Gateway: $30
Cognito: $10
その他: $10
合計: 約$150/月

9. 開発タイムライン
Phase期間主要成果物
Phase 1Week 1-2基盤構築完了、認証機能実装
Phase 2Week 3-4コア機能（シミュレーション、データ管理）実装
Phase 3Week 5-6高度な機能（分析、レポート）実装
Phase 4Week 7-8運用準備、テスト、デプロイ

10. Claude Artifacts活用のコツ
10.1 効果的な依頼方法

具体的な要求: 曖昧な表現を避け、具体的な仕様を伝える
段階的な依頼: 大きな機能は小さく分割して依頼
コンテキスト提供: 関連するコードや設計を共有

10.2 生成コードの活用

レビュー必須: 生成されたコードは必ずレビュー
テスト作成: ユニットテストも同時に依頼
ドキュメント: コメントとREADMEの生成も依頼

10.3 反復的な改善

フィードバック: 生成結果に対する改善点を具体的に指摘
ベストプラクティス: AWSのベストプラクティスに準拠するよう指示
最適化: パフォーマンスとコストの最適化を常に意識

11. トラブルシューティング
一般的な問題と解決策

Lambda コールドスタート: Provisioned Concurrency または関数の最適化
DynamoDB スロットリング: Auto Scalingの設定または設計見直し
CORS エラー: API Gateway と Lambda レスポンスヘッダーの確認
認証エラー: Cognito トークンの有効期限とリフレッシュ処理の確認

12. 次のステップ

MVP完成後: ユーザーフィードバックを収集し、機能改善
スケール準備: 負荷テストとパフォーマンスチューニング
機能拡張: IoTセンサー連携、AI予測機能、モバイルアプリ
国際展開: 多言語対応、複数リージョン展開

13.モックアップ


これらのドキュメントは、AWSサーバーレスアーキテクチャとClaude Artifactsを活用した開発に最適化されています。段階的に実装を進めることで、技術力に自信のない学生起業家でも着実に開発を進められる構成になっています。