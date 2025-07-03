# CLAUDE.md - Claude Code開発ガイドライン

## 役割と責任範囲

### ✅ Claude Codeが担当する作業
1. **新規機能の開発実装**
   - Reactコンポーネントの作成
   - Lambda関数の実装
   - API統合コードの作成
   - ビジネスロジックの実装

2. **ユニットテストの作成**
   - Jest/React Testing Libraryを使用
   - 個々のコンポーネント・関数のテスト
   - モックを使用した単体テスト

### ❌ Claude Codeが行わない作業
- E2Eテスト、統合テストの実装
- CI/CDパイプラインの設定・修正
- AWS環境へのデプロイ作業
- ブラウザUIテストの実装
- 既存ファイルの大規模リファクタリング（Cursorが担当）

## 開発ルール

### ファイル作成規則
- 新規ファイルは必ず適切なディレクトリに作成
- テストファイルは`__tests__`フォルダに配置
- 型定義は`types/`フォルダに集約

### コーディング規約
```typescript
// 必ずTypeScriptで型安全に
interface Props {
  data: SomeType;
}

// エラーハンドリングを含める
try {
  // 処理
} catch (error) {
  console.error('具体的なエラーメッセージ', error);
}

// テスト可能な設計
export const pureFunction = (input: Input): Output => {
  // ビジネスロジック
};
## 品質基準

TypeScript型定義100%
主要関数にJSDocコメント
エラーハンドリング必須
console.logは開発用のみ（本番では削除）

## Cursorとの連携

開発完了後、必ず// TODO: Cursor - 受入テスト実施コメントを追加
テストデータはmock-data/フォルダに配置
APIエンドポイントは環境変数で管理

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