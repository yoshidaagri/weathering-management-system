# 風化促進CO2除去事業管理システム - Phase 2 詳細作業指示書

## 🔐 Phase 2: 認証・API連携実装（詳細版）

### 2.1 AWS Cognito認証統合

#### 2.1.1 Cognito設定確認とSDK統合
**担当**: Claude Code
**作業内容**:
1. AWS SDK v3のCognito Identity Provider Client設定
   - `lib/aws-config.ts`作成
   - 環境変数からUser Pool ID、Client ID読み込み
   - Cognitoクライアント初期化

2. 認証サービスレイヤー実装
   - `lib/services/auth-service.ts`作成
   - signUp、signIn、signOut、forgotPassword関数
   - トークン管理ユーティリティ

**テスト**: 
- 各認証関数のユニットテスト作成
- モックCognitoレスポンスでテスト

**成果物**:
```
test/
├── lib/
│   ├── aws-config.ts
│   ├── services/
│   │   └── auth-service.ts
│   └── __tests__/
│       └── auth-service.test.ts
```

---

#### 2.1.2 ログイン画面実装
**担当**: Claude Code
**作業内容**:
1. ログインページコンポーネント作成
   - `app/auth/login/page.tsx`
   - React Hook Form使用
   - エラーハンドリング（無効な認証情報、ネットワークエラー）

2. Zustandストア更新
   - `lib/stores/auth-store.ts`改修
   - Cognito統合（現在はモック）
   - トークン永続化（localStorage）

**テスト**:
- ログインフォームのバリデーションテスト
- 認証成功/失敗シナリオのテスト

**受入テスト** (Cursor担当):
- 実際のCognitoに接続してログイン確認
- エラーメッセージ表示確認
- リダイレクト動作確認

---

#### 2.1.3 サインアップ画面実装
**担当**: Claude Code
**作業内容**:
1. サインアップページ作成
   - `app/auth/signup/page.tsx`
   - メール確認コード入力画面
   - パスワード要件表示

2. 確認コード検証フロー
   - `app/auth/verify/page.tsx`
   - 再送信機能

**テスト**:
- フォームバリデーション
- 確認コードフロー

**受入テスト** (Cursor担当):
- 実際のメール受信確認
- 確認コード入力→アカウント有効化

---

#### 2.1.4 保護されたルート実装
**担当**: Claude Code
**作業内容**:
1. 認証ミドルウェア作成
   - `middleware.ts`
   - JWTトークン検証
   - 未認証時は`/auth/login`へリダイレクト

2. レイアウト更新
   - `app/layout.tsx`改修
   - 認証状態に応じたナビゲーション表示

**テスト**:
- 保護されたルートアクセステスト
- トークン期限切れテスト

**E2Eテスト** (Cursor + PlaywrightMCP担当):
```typescript
test('未認証ユーザーのアクセス制限', async ({ page }) => {
  await page.goto('/projects');
  await expect(page).toHaveURL('/auth/login');
});
```

---

### 2.2 顧客管理CRUD API

#### 2.2.1 Customer Lambda関数実装
**担当**: Claude Code
**作業内容**:
1. Lambda関数作成
   - `infrastructure/lambda/customer/index.ts`
   - CRUD操作（Create, Read, Update, Delete）
   - DynamoDB DocumentClient使用

2. 入力検証
   - Zodスキーマ定義
   - リクエスト/レスポンス型定義

**テスト**:
- 各CRUD操作のユニットテスト
- DynamoDBモック使用

---

#### 2.2.2 DynamoDB データアクセス層
**担当**: Claude Code
**作業内容**:
1. リポジトリパターン実装
   - `infrastructure/lambda/shared/repositories/customer-repository.ts`
   - Single Table Design実装
   - GSIを使用した検索

2. エンティティ設計
```typescript
// PK: CUSTOMER#${customerId}
// SK: METADATA
interface CustomerEntity {
  PK: string;
  SK: string;
  customerId: string;
  companyName: string;
  contactInfo: ContactInfo;
  createdAt: string;
  updatedAt: string;
}
```

**テスト**:
- リポジトリメソッドのテスト
- エラーケーステスト

---

#### 2.2.3 API Gateway統合
**担当**: Claude Code (CDK更新)
**作業内容**:
1. API Gateway設定更新
   - `infrastructure/lib/main-stack.ts`
   - Cognito Authorizer追加
   - CORS設定

2. エンドポイント定義
```
GET    /api/customers
GET    /api/customers/{customerId}
POST   /api/customers
PUT    /api/customers/{customerId}
DELETE /api/customers/{customerId}
```

**CD/CI** (Cursor担当):
1. CDKデプロイ自動化
   - GitHub Actions設定
   - 環境別デプロイ（dev/staging/prod）

---

#### 2.2.4 顧客管理UI実装
**担当**: Claude Code
**作業内容**:
1. 顧客一覧画面
   - `app/customers/page.tsx`
   - データテーブル（検索、ソート、ページネーション）
   - 削除確認モーダル

2. 顧客詳細/編集画面
   - `app/customers/[id]/page.tsx`
   - フォーム自動入力
   - 更新成功/失敗通知

3. APIクライアント更新
   - `lib/api-client.ts`
   - 実際のAPI呼び出し実装
   - エラーハンドリング

**テスト**:
- コンポーネントテスト
- APIモックでの動作確認

**統合テスト** (Cursor担当):
- 実APIとの連携確認
- CRUD全操作のフロー確認

---

### 2.3 プロジェクト管理API実装

#### 2.3.1 Project Lambda関数
**担当**: Claude Code
**作業内容**:
1. Lambda関数作成
   - `infrastructure/lambda/project/index.ts`
   - 顧客との関連付けロジック
   - ステータス管理

2. ビジネスルール実装
   - プロジェクト作成時の検証
   - ステータス遷移ルール
   - 顧客ごとのプロジェクト数制限

**テスト**:
- ビジネスルールテスト
- 境界値テスト

---

#### 2.3.2 測定データAPI
**担当**: Claude Code
**作業内容**:
1. Measurement Lambda関数
   - `infrastructure/lambda/measurement/index.ts`
   - バッチ登録エンドポイント
   - 時系列データ最適化

2. データ検証
   - 測定値の妥当性チェック
   - 重複データ防止

**テスト**:
- 大量データ処理テスト
- パフォーマンステスト

---

### 品質保証プロセス（全タスク共通）

#### 開発フェーズ (Claude Code)
1. 機能実装
2. ユニットテスト作成
3. ローカル動作確認
4. `// TODO: Cursor - 受入テスト実施`コメント追加

#### テストフェーズ (Cursor)
1. 統合テスト追加
2. API連携確認
3. エラーケース網羅

#### CD/CIフェーズ (Cursor)
1. GitHub Actionsワークフロー作成
2. 自動テスト実行
3. AWS環境へ自動デプロイ

#### 本番テストフェーズ (Cursor + PlaywrightMCP)
1. E2Eテストシナリオ作成
2. CloudFront URLでテスト実行
3. クロスブラウザ確認
4. パフォーマンス測定

---

## 📊 進捗管理

### チェックリスト形式の進捗管理

#### 2.1 Cognito認証（5日間）
- [ ] 2.1.1 Cognito SDK統合 (0.5日)
  - [ ] 開発完了 (Claude)
  - [ ] 受入テスト (Cursor)
  - [ ] CI/CD設定 (Cursor)
- [ ] 2.1.2 ログイン画面 (1日)
  - [ ] 開発完了 (Claude)
  - [ ] 統合テスト (Cursor)
  - [ ] E2Eテスト (Cursor)
- [ ] 2.1.3 サインアップ画面 (1日)
  - [ ] 開発完了 (Claude)
  - [ ] 統合テスト (Cursor)
  - [ ] E2Eテスト (Cursor)
- [ ] 2.1.4 保護ルート (0.5日)
  - [ ] 開発完了 (Claude)
  - [ ] E2Eテスト (Cursor)

#### 2.2 顧客管理API（3日間）
- [ ] 2.2.1 Lambda実装 (1日)
  - [ ] 開発完了 (Claude)
  - [ ] デプロイ (Cursor)
- [ ] 2.2.2 DynamoDB層 (0.5日)
  - [ ] 開発完了 (Claude)
  - [ ] 統合テスト (Cursor)
- [ ] 2.2.3 API Gateway (0.5日)
  - [ ] CDK更新 (Claude)
  - [ ] デプロイ自動化 (Cursor)
- [ ] 2.2.4 顧客管理UI (1日)
  - [ ] 開発完了 (Claude)
  - [ ] E2Eテスト (Cursor)

---

## 成功基準

### 各フェーズの完了条件
1. **開発完了**: 全ユニットテストがパス
2. **統合テスト完了**: API連携が正常動作
3. **CI/CD完了**: 自動デプロイが成功
4. **E2E完了**: 全シナリオがパス
5. **本番確認**: CloudFront URLで動作確認

### 品質指標
- テストカバレッジ: 80%以上
- TypeScript型カバレッジ: 100%
- E2Eテスト成功率: 100%
- デプロイ成功率: 95%以上

---

**更新日**: 2025-01-04
**バージョン**: 2.0 (詳細版)