# 風化促進CO2除去・廃水処理事業Webアプリ開発ルール

## プロジェクト概要
鉱山廃水における風化促進による二酸化炭素除去と廃水処理事業のWebアプリケーション開発
AWSサーバーレスアーキテクチャとClaude Artifactsを活用した効率的な開発を行う

## 技術スタック
### フロントエンド
- React 18.x with TypeScript
- Next.js 14.x (App Router)
- AWS Amplify UI Components
- Tailwind CSS
- Chart.js / Recharts (データビジュアライゼーション)
- React Hook Form (フォーム管理)
- Zustand (状態管理)

### バックエンド（AWSサーバーレス）
- AWS Lambda (Node.js 18.x/20.x)
- API Gateway (REST/GraphQL)
- DynamoDB (NoSQL データベース)
- S3 (ファイルストレージ)
- Cognito (認証・認可)
- EventBridge (イベント駆動処理)
- Step Functions (ワークフロー管理)
- CloudWatch (モニタリング)

### 開発ツール
- AWS CDK v2 (インフラ as Code)
- AWS SAM (ローカル開発・テスト)
- Claude Artifacts (コード生成・レビュー)
- GitHub Actions (CI/CD)

## Claude Artifacts活用ガイドライン

### 1. コンポーネント開発
- 各機能を小さなコンポーネントに分割して開発依頼
- 単一責任の原則に従った設計
- 例: "DynamoDBのテーブル設計をCDKで作成して"

### 2. Lambda関数開発
- 各APIエンドポイントごとに個別のLambda関数として開発
- 関数は単一の責務を持つように設計
- 例: "測定データを登録するLambda関数を作成して"

### 3. 段階的な実装
- MVP（最小限の実行可能な製品）から始める
- 機能ごとに順次実装を依頼
- 例: "まず認証機能のCognitoセットアップから始めて"

## コーディング規約

### TypeScript/JavaScript
```typescript
// Lambdaハンドラーの基本構造
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // ビジネスロジック
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};