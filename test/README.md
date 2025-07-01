# 風化促進CO2除去・廃水処理システム - フロントエンド

## 概要
シンプルなReact + Next.js構成によるフロントエンドアプリケーション（Step1テスト）

## 技術スタック
- React 18 + TypeScript
- Next.js 14 (App Router)
- Tailwind CSS
- AWS Cognito (直接連携、Amplifyなし)
- Zustand (状態管理)
- Chart.js / Recharts (データビジュアライゼーション)

## セットアップ

1. 依存関係のインストール:
```bash
npm install
```

2. 環境変数の設定:
```bash
cp .env.local.example .env.local
# .env.localを編集してAWS設定を入力
```

3. 開発サーバーの起動:
```bash
npm run dev
```

## 主な特徴
- AWS Amplifyを使用せず、シンプルな構成
- AWS Cognitoとの直接連携
- モダンなReact開発環境
- TypeScript対応
- Tailwind CSSによるスタイリング