# 風化促進CO2除去・廃水処理システム - フロントエンド

鉱山廃水における風化促進による二酸化炭素除去と廃水処理事業の管理システムのフロントエンドアプリケーション

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand
- **フォーム**: React Hook Form
- **認証**: AWS Cognito
- **UI コンポーネント**: 自作コンポーネントライブラリ

## 機能

### ✅ 実装済み機能

#### 認証システム
- AWS Cognito統合ログイン・ログアウト
- JWT トークン管理
- 保護されたルート

#### 顧客管理
- 顧客一覧（検索・フィルタ・ページネーション）
- 顧客作成フォーム
- 顧客詳細・編集画面
- 顧客削除機能

### 🔄 開発予定機能

#### プロジェクト管理
- プロジェクト一覧・作成・編集
- 顧客選択統合
- プロジェクト進捗管理

#### 測定データ管理
- データ入力・可視化
- リアルタイム監視

#### レポート生成
- MRV報告書生成
- PDF出力機能

## セットアップ

### 前提条件

- Node.js 18.x以上
- npm または yarn

### インストール

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 型チェック
npm run type-check

# リント実行
npm run lint
```

### 環境変数

以下の環境変数を`.env.local`に設定してください：

```env
NEXT_PUBLIC_API_BASE_URL=https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod
NEXT_PUBLIC_USER_POOL_ID=ap-northeast-1_BEnyexqxY
NEXT_PUBLIC_USER_POOL_CLIENT_ID=2gqqmrdorakjgq7ahuvlq5f9e2
NEXT_PUBLIC_REGION=ap-northeast-1
```

## プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── auth/              # 認証ページ
│   ├── customers/         # 顧客管理ページ
│   ├── projects/          # プロジェクト管理ページ（予定）
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # ホームページ
├── components/            # React コンポーネント
│   ├── layout/           # レイアウトコンポーネント
│   ├── providers/        # プロバイダーコンポーネント
│   └── ui/               # UIコンポーネント
├── lib/                  # ライブラリ・ユーティリティ
│   ├── stores/           # Zustand ストア
│   ├── api-client.ts     # API クライアント
│   ├── auth.ts           # 認証ロジック
│   └── utils.ts          # ユーティリティ関数
└── types/                # TypeScript 型定義
    └── index.ts
```

## API 統合

### 顧客管理 API

- `GET /api/customers` - 顧客一覧取得
- `GET /api/customers/{id}` - 顧客詳細取得
- `POST /api/customers` - 顧客作成
- `PUT /api/customers/{id}` - 顧客更新
- `DELETE /api/customers/{id}` - 顧客削除

### 認証

すべてのAPIリクエストはAWS Cognito JWTトークンによる認証が必要です。
APIクライアントが自動的にAuthorizationヘッダーを付与します。

## 開発ガイドライン

### コーディング規約

- TypeScript を使用し、型安全性を保つ
- ESLint + Prettier による自動フォーマット
- コンポーネントは単一責任の原則に従う
- ユーティリティ関数は `lib/utils.ts` に配置

### 状態管理

- グローバル状態は Zustand を使用
- ローカル状態は useState を使用
- フォーム状態は React Hook Form を使用

### スタイリング

- Tailwind CSS を使用
- カスタムコンポーネントは `components/ui/` に配置
- レスポンシブデザインを考慮

## テスト

### 開発用テストアカウント

```
ユーザー名: admin
パスワード: AdminPass123!
```

## デプロイ

### 静的サイト生成

```bash
npm run build
```

生成された `out/` フォルダを AWS S3 + CloudFront にデプロイします。

### 本番環境

- **URL**: https://dikwcz6haxnrb.cloudfront.net/
- **CDN**: AWS CloudFront
- **ホスティング**: AWS S3

## トラブルシューティング

### よくある問題

1. **認証エラー**
   - Cognito の設定を確認
   - 環境変数の設定を確認

2. **API 接続エラー**
   - ネットワーク接続を確認
   - API Gateway の URL を確認

3. **ビルドエラー**
   - TypeScript エラーを修正
   - 依存関係を再インストール

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 開発チーム

- **Claude Code**: フロントエンド開発・UI実装
- **Phase 6**: 顧客管理機能実装完了