# Weathering Management System

鉱山廃水における風化促進による二酸化炭素除去と廃水処理事業の管理システム

## リポジトリ情報

- **リポジトリURL**: https://github.com/yoshidaagri/weathering-management-system
- **メインブランチ**: main
- **開発ブランチ**: develop

## プロジェクト構造
weathering-management-system/
├── .github/                    # GitHub Actions設定
│   ├── workflows/
│   │   ├── deploy-dev.yml     # 開発環境デプロイ
│   │   ├── deploy-prod.yml    # 本番環境デプロイ
│   │   └── test.yml           # テスト実行
│   ├── CODEOWNERS             # コードオーナー設定
│   └── dependabot.yml         # 依存関係自動更新
├── infrastructure/             # AWS CDK インフラ定義
│   ├── lib/
│   │   └── main-stack.ts      # メインスタック定義
│   ├── bin/
│   │   └── app.ts             # CDKアプリケーション
│   └── cdk.json               # CDK設定
├── frontend/                   # React フロントエンド
│   ├── src/
│   ├── public/
│   └── package.json
├── lambda/                     # Lambda関数
│   ├── customer-api/
│   ├── project-api/
│   ├── measurement-api/
│   └── report-generator/
├── layers/                     # Lambda Layers
│   └── nodejs/
├── config/                     # 設定ファイル
│   ├── parameters.json
│   └── env/
├── scripts/                    # デプロイ・ユーティリティスクリプト
│   ├── deploy.sh
│   └── setup.sh
├── tests/                      # テストコード
│   ├── unit/
│   └── integration/
├── docs/                       # ドキュメント
│   ├── architecture.md
│   └── api.md
├── .cursorrules               # Cursor IDE設定
├── .gitignore
├── package.json
└── README.md

## 必要な環境

- Node.js 18.x 以上
- AWS CLI v2
- AWS CDK v2
- Docker (SAMローカルテスト用)

## セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/yoshidaagri/weathering-management-system.git
cd weathering-management-system

# 依存関係のインストール
npm install

# AWS認証情報の設定
aws configure

# 環境変数の設定
cp .env.example .env
デプロイ
bash# 開発環境へのデプロイ
npm run deploy:dev

# 本番環境へのデプロイ
npm run deploy:prod
開発ワークフロー

developブランチから機能ブランチを作成
変更を実装
プルリクエストを作成
レビュー・承認後、developへマージ
developからmainへのマージで本番デプロイ

ライセンス
Proprietary - All rights reserved

## 2. GitHub Actions CI/CD設定 (.github/workflows/deploy-dev.yml)

```yaml
name: Deploy to Development

on:
  push:
    branches:
      - develop
  pull_request:
    branches:
      - develop

env:
  AWS_REGION: ap-northeast-1
  NODE_VERSION: 18

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build application
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID_DEV }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY_DEV }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Install dependencies
        run: npm ci

      - name: Build Lambda layers
        run: |
          cd layers/nodejs
          npm ci --production
          cd ../..

      - name: Build Lambda functions
        run: |
          for func in customer-api project-api measurement-api report-generator; do
            cd lambda/$func
            npm ci
            npm run build
            cd ../..
          done

      - name: Deploy with CDK
        run: |
          npm install -g aws-cdk
          cdk deploy WeatheringProjectStack-dev --require-approval never

      - name: Deploy frontend to S3
        run: |
          cd frontend
          npm ci
          npm run build
          aws s3 sync build/ s3://weathering-frontend-${{ secrets.AWS_ACCOUNT_ID }}-dev --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID_DEV }} --paths "/*"

      - name: Run smoke tests
        run: npm run test:smoke

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Development deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()