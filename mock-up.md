# 風化促進CO2除去・廃水処理事業Webアプリ AWS移行計画

## 1. 現在のモックアップ機能一覧

### 1.1 メインメニュー (Menu.tsx)
**ファイル**: `src/components/Menu.tsx`  
**機能概要**: アプリケーションのエントリーポイント  
**画面要素**:
- メニューカード（3つの主要機能へのナビゲーション）
- シンプルなカードレイアウト
- 各機能の説明文

**AWS移行時の実装**:
```
- 静的コンポーネントのため、そのままS3+CloudFrontで配信
- 認証後のランディングページとして機能
- Cognitoでログイン済みユーザーのみアクセス可能
```

### 1.2 事業計画シミュレーション (SimulationDashboard.tsx)
**ファイル**: `src/components/SimulationDashboard.tsx`  
**機能概要**: 風化促進事業の計画立案とシミュレーション  
**画面要素**:
- パラメータ入力フォーム（場所、流量、散布量など）
- リアルタイム計算結果表示
- グラフィカルな事業性評価ダッシュボード
- 投資回収期間、CO2削減効果の表示

**AWS移行時の実装**:
```
API Gateway + Lambda:
- POST /api/simulations/calculate
- GET /api/simulations/templates
- POST /api/simulations/save

DynamoDB:
- PK: PROJECT#{projectId}
- SK: SIMULATION#{simulationId}
- Attributes: parameters, results, createdAt
```

### 1.3 測定データ管理 (MeasurementDashboard.tsx)
**ファイル**: `src/components/MeasurementDashboard.tsx`  
**機能概要**: センサーデータの収集・管理・表示  
**画面要素**:
- データ入力フォーム（手動/CSV一括登録）
- 測定値の一覧表示（pH、温度、流量など）
- データ検索・フィルタリング機能
- データ編集・削除機能

**AWS移行時の実装**:
```
API Gateway + Lambda:
- GET /api/measurements
- POST /api/measurements
- POST /api/measurements/batch
- PUT /api/measurements/{id}
- DELETE /api/measurements/{id}

DynamoDB:
- PK: PROJECT#{projectId}
- SK: MEASUREMENT#{timestamp}
- GSI1PK: DATE#{date}
- GSI1SK: PROJECT#{projectId}#{timestamp}
```

### 1.4 計画/実績検証 (PlanActualDashboard.tsx)
**ファイル**: `src/components/PlanActualDashboard.tsx`  
**機能概要**: 事業計画と実績の比較分析  
**画面要素**:
- KPIカード（達成率表示）
- 計画vs実績の比較グラフ（Recharts使用）
- 月次詳細データテーブル
- アラート機能（目標未達時）
- レポート出力ボタン

**AWS移行時の実装**:
```
API Gateway + Lambda:
- GET /api/projects/{id}/plan-actual
- POST /api/projects/{id}/analysis
- GET /api/projects/{id}/kpis

DynamoDB + Analytics:
- 計画データと実績データの集計処理
- Step Functions で定期集計バッチ
- CloudWatch メトリクスとの連携
```

### 1.5 観測地点マップ (MonitoringMapDashboard.tsx)
**ファイル**: `src/components/MonitoringMapDashboard.tsx`  
**機能概要**: 監視地点の可視化とリアルタイムモニタリング  
**画面要素**:
- SVG地図表示（精進川鉱山エリア）
- 観測地点のステータス表示（正常/注意/異常）
- 地点詳細情報パネル
- pH値トレンドグラフ
- 統計情報表示
- 廃水処理状況セクション

**AWS移行時の実装**:
```
API Gateway + Lambda:
- GET /api/monitoring/sites
- GET /api/monitoring/sites/{siteId}/status
- GET /api/monitoring/sites/{siteId}/trends
- POST /api/monitoring/alerts

DynamoDB + IoT Core:
- IoTセンサーからのリアルタイムデータ受信
- DynamoDB Streams でリアルタイム更新
- EventBridge でアラート配信
```

## 2. 未実装の必要機能

### 2.1 認定機関報告書作成 (CertificationReportPage.tsx)
**機能概要**: カーボンオフセット認証機関向けMRV報告書生成  
**想定画面要素**:
- テンプレート選択
- データ自動集計
- 報告書プレビュー
- PDF生成・ダウンロード

**AWS実装計画**:
```
Step Functions:
- データ収集 → 集計 → PDF生成 → S3保存
Lambda Layers:
- PDF生成ライブラリ (Puppeteer/jsPDF)
S3:
- 生成済み報告書の保存
```

### 2.2 環境報告書作成 (EnvironmentReportPage.tsx)
**機能概要**: 行政提出用の環境監視報告書生成  
**想定画面要素**:
- 規制基準値との比較
- 環境影響評価
- 月次/年次レポート生成
- 官公庁フォーマット対応

**AWS実装計画**:
```
同様にStep Functionsベースの自動生成
規制基準値のマスターデータ管理
複数フォーマット対応（PDF/Excel）
```

### 2.3 認証・認可機能 (AuthContext.tsx)
**機能概要**: ユーザー認証とアクセス制御  
**想定画面要素**:
- ログイン/ログアウト画面
- パスワードリセット
- 顧客別データアクセス制御

**AWS実装計画**:
```
Cognito User Pools:
- 顧客企業ごとのユーザーグループ
- MFA対応
- パスワードポリシー設定
```

## 3. Phase別移行計画

### Phase 1: 基盤構築 (Week 1-2)
**目標**: 認証機能とデータ基盤の構築

1. **AWS CDK環境構築**
   - Cognito User Pool設定
   - DynamoDB テーブル作成
   - S3バケット設定
   - API Gateway基盤

2. **認証機能実装**
   - AuthContext.tsx のCognito連携
   - ログイン/ログアウト機能
   - 保護されたルート実装

3. **デプロイ基盤**
   - S3 + CloudFront設定
   - CI/CDパイプライン構築

### Phase 2: コア機能移行 (Week 3-4)
**目標**: 測定データ管理とシミュレーション機能の実装

1. **測定データ管理API**
   - MeasurementDashboard.tsx のバックエンド連携
   - CRUD操作の実装
   - CSV一括登録機能

2. **シミュレーション機能**
   - SimulationDashboard.tsx のバックエンド連携
   - 計算ロジックのLambda実装
   - パラメータ保存機能

### Phase 3: 分析・監視機能 (Week 5-6)
**目標**: 高度な分析機能とリアルタイム監視

1. **計画実績分析**
   - PlanActualDashboard.tsx のバックエンド連携
   - 集計処理のLambda実装
   - KPI計算ロジック

2. **モニタリングマップ**
   - MonitoringMapDashboard.tsx のリアルタイム連携
   - IoTデータ受信機能
   - アラート機能

### Phase 4: レポート機能 (Week 7-8)
**目標**: 自動レポート生成と運用準備

1. **報告書生成機能**
   - Step Functions ワークフロー
   - PDF生成機能
   - テンプレート管理

2. **運用監視**
   - CloudWatch ダッシュボード
   - アラート設定
   - ログ監視

## 4. データ移行戦略

### 4.1 現在のモックデータ
```javascript
// 各コンポーネントで使用されているサンプルデータ
const sampleData = {
  measurements: [...], // pH, 温度, 流量データ
  planActual: [...],   // 計画vs実績データ
  monitoring: [...],   // 監視地点データ
  wastewater: [...],   // 廃水処理データ
};
```

### 4.2 DynamoDB スキーマ設計
```javascript
// 測定データの例
{
  PK: "PROJECT#proj001",
  SK: "MEASUREMENT#2024-01-11T15:30:00Z",
  GSI1PK: "DATE#2024-01-11",
  GSI1SK: "PROJECT#proj001#2024-01-11T15:30:00Z",
  siteId: "site-2",
  pH: 3.2,
  temperature: 15.5,
  flowRate: 1150,
  timestamp: "2024-01-11T15:30:00Z",
  status: "attention"
}
```

## 5. フロントエンド最適化

### 5.1 状態管理の実装
```javascript
// Context API → AWS SDK連携
const useAWSData = () => {
  // AWS SDK呼び出しロジック
  // エラーハンドリング
  // ローディング状態管理
};
```

### 5.2 コンポーネント最適化
- React.memo の適用
- useCallback/useMemo の活用
- 仮想化リスト（大量データ表示）
- Progressive Web App化

## 6. セキュリティ・性能考慮事項

### 6.1 セキュリティ
- Cognito JWT トークン検証
- API Gateway での認可制御
- CORS 設定
- CSP (Content Security Policy)

### 6.2 性能最適化
- Code Splitting
- Image 最適化
- CDN キャッシュ戦略
- Lambda コールドスタート対策

## 7. テスト戦略

### 7.1 フロントエンドテスト
```javascript
// React Testing Library
// Jest
// E2Eテスト (Playwright)
```

### 7.2 バックエンドテスト
```javascript
// Lambda単体テスト
// Integration テスト
// ロードテスト
```

## 8. 運用・監視

### 8.1 監視項目
- アプリケーションメトリクス
- ビジネスメトリクス
- エラー率・レスポンス時間
- コスト監視

### 8.2 アラート設定
- Lambda エラー率 > 5%
- API Gateway 4xx > 10%
- DynamoDB スロットリング発生
- 月次コスト $200 超過

この計画に基づいて、段階的にAWSクラウド環境への移行を進めることで、現在のReactモックアップを本格的なサーバーレスアプリケーションに発展させることができます。