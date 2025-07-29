# Phase 7: 測定データ管理・モニタリング機能実装計画

## 🎯 Phase 7 概要

**期間**: 2025年7月28日〜 (予定2-3週間)  
**担当**: Claude Code (測定データ管理・モニタリング機能実装)  
**前提条件**: Phase 6完了 (プロジェクト管理機能実装完了)

## 📋 Phase 7 背景・必要性

### 🔗 **プロジェクト管理との統合**
風化促進CO2除去・廃水処理事業において、**日々のモニタリング**は事業の成功に不可欠：
- プロジェクト実行中のリアルタイムデータ収集
- pH、温度、CO2濃度、流量、重金属濃度の継続監視
- データに基づく運用最適化・異常検知

### 🚨 **重要要件**
1. **CSV一括取り込み**: 現場測定器からのデータを効率的に登録
2. **時系列データ管理**: 継続的な測定値の蓄積・可視化
3. **アラート機能**: 閾値超過時の即座通知
4. **プロジェクト連携**: プロジェクト別データ管理

## 🎯 Phase 7 実装目標

### ✅ **Phase 7.1: 測定データCRUD基盤 (Week 1)**

#### 7.1.1 測定データ型定義・API統合
```typescript
interface MeasurementData {
  measurementId: string;
  projectId: string;
  timestamp: string;
  type: 'water_quality' | 'atmospheric' | 'soil';
  location: {
    latitude: number;
    longitude: number;
    siteName?: string;
  };
  values: {
    // 水質データ
    ph?: number;
    temperature?: number;    // ℃
    turbidity?: number;      // NTU
    conductivity?: number;   // μS/cm
    dissolvedOxygen?: number; // mg/L
    
    // 大気データ
    co2Concentration?: number; // ppm
    humidity?: number;         // %
    airPressure?: number;      // hPa
    windSpeed?: number;        // m/s
    
    // 土壌データ
    soilPH?: number;
    soilMoisture?: number;    // %
    organicMatter?: number;   // %
    
    // 重金属濃度
    iron?: number;           // mg/L
    copper?: number;         // mg/L
    zinc?: number;           // mg/L
    lead?: number;           // mg/L
    cadmium?: number;        // mg/L
    
    // 流量・処理量
    flowRate?: number;       // L/min
    processedVolume?: number; // L
    
    // CO2除去関連
    co2Captured?: number;    // kg
    mineralPrecipitation?: number; // kg
  };
  qualityFlags: {
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
    calibrationStatus: 'calibrated' | 'needs_calibration';
    anomalyDetected: boolean;
  };
  alertLevel: 'normal' | 'warning' | 'critical';
  notes?: string;
  operatorId?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### 7.1.2 測定データ一覧画面 (`/projects/[projectId]/measurements`)
- **プロジェクト別測定データ表示**
- **時系列チャート可視化** (Chart.js / Recharts)
- **データ種別フィルタ** (water_quality, atmospheric, soil)
- **期間指定フィルタ** (日別・週別・月別)
- **アラートレベル別表示**
- **リアルタイム更新** (5分間隔)

#### 7.1.3 測定データ詳細画面 (`/projects/[projectId]/measurements/[measurementId]`)
- **全測定値詳細表示**
- **グラフ可視化** (単一データポイント詳細)
- **品質フラグ・アラート表示**
- **編集・削除機能**
- **関連データ参照** (前後の測定値)

### ✅ **Phase 7.2: CSV取り込み機能 (Week 1-2)** ← **最重要**

#### 7.2.1 CSV取り込み画面 (`/projects/[projectId]/measurements/import`)
```typescript
interface CSVImportInterface {
  // ファイルアップロード
  fileUpload: File;
  
  // カラムマッピング設定
  columnMapping: {
    timestamp: string;     // "日時" カラム
    ph: string;           // "pH" カラム  
    temperature: string;   // "温度" カラム
    co2Concentration: string; // "CO2濃度" カラム
    flowRate: string;     // "流量" カラム
    iron: string;         // "鉄濃度" カラム
    // ... 他の測定項目
  };
  
  // データ検証設定
  validation: {
    skipInvalidRows: boolean;
    dateFormat: string;    // "YYYY-MM-DD HH:mm:ss"
    numberFormat: 'decimal' | 'comma';
  };
  
  // 取り込み設定
  importOptions: {
    batchSize: number;     // 一度に処理する行数 (default: 100)
    duplicateHandling: 'skip' | 'overwrite' | 'error';
    deviceId?: string;     // 測定機器ID
    operatorId?: string;   // 操作者ID
  };
}
```

#### 7.2.2 CSV処理フロー
1. **ファイルアップロード**: drag & drop対応
2. **プレビュー表示**: 最初の10行をテーブル表示
3. **カラムマッピング**: 自動検出 + 手動調整
4. **バリデーション**: データ形式・範囲チェック
5. **エラー表示**: 不正データの行番号・内容表示
6. **バッチ処理**: 100件ずつAPI送信 (進捗表示)
7. **結果報告**: 成功・失敗・スキップ件数

#### 7.2.3 CSVテンプレート機能
```csv
timestamp,type,ph,temperature,co2_concentration,flow_rate,iron,copper,zinc,notes
2025-07-28 09:00:00,water_quality,7.2,25.5,400,100.5,0.1,0.05,0.2,正常運転
2025-07-28 09:15:00,water_quality,7.1,25.8,405,98.2,0.12,0.04,0.22,
2025-07-28 09:30:00,water_quality,6.9,26.1,410,95.8,0.15,0.06,0.25,要注意レベル
```

### ✅ **Phase 7.3: モニタリングダッシュボード (Week 2-3)**

#### 7.3.1 リアルタイム監視画面 (`/projects/[projectId]/monitoring`)
- **メトリクス概要カード**: 現在値・24時間平均・異常検知
- **時系列チャート**: 複数指標の重ね合わせ表示
- **アラート一覧**: 直近のアラート・対応状況
- **地図表示**: 測定ポイントの地理的分布
- **ステータス表示**: 機器稼働状況・通信状態

#### 7.3.2 分析ダッシュボード (`/projects/[projectId]/analytics`)
- **トレンド分析**: 長期傾向の可視化
- **相関分析**: pH-温度、流量-CO2濃度等の関係
- **効率指標**: CO2除去効率・処理量効率
- **品質レポート**: データ品質・欠損率
- **比較分析**: 期間比較・プロジェクト間比較

### ✅ **Phase 7.4: アラート・通知機能 (Week 2-3)**

#### 7.4.1 アラート設定画面 (`/projects/[projectId]/alerts`)
```typescript
interface AlertRule {
  ruleId: string;
  projectId: string;
  parameter: keyof MeasurementData['values'];
  condition: {
    operator: '>' | '<' | '=' | '!=' | 'between';
    threshold: number | [number, number];
    duration: number; // 継続時間（分）
  };
  severity: 'warning' | 'critical';
  enabled: boolean;
  notificationMethods: ('email' | 'sms' | 'dashboard')[];
  recipients: string[];
  message: string;
}
```

#### 7.4.2 アラート履歴画面 (`/projects/[projectId]/alerts/history`)
- **アラート一覧**: 発生日時・重要度・対応状況
- **フィルタリング**: 日付・重要度・パラメータ別
- **対応記録**: アラート対応の記録・コメント
- **統計表示**: アラート発生頻度・対応時間

## 🛠 Phase 7 技術仕様

### API設計
```typescript
// 測定データ管理API
GET    /api/projects/{projectId}/measurements              # 測定データ一覧
GET    /api/projects/{projectId}/measurements/{measurementId} # 測定データ詳細
POST   /api/projects/{projectId}/measurements              # 測定データ作成
POST   /api/projects/{projectId}/measurements/batch        # CSV一括登録
PUT    /api/projects/{projectId}/measurements/{measurementId} # 測定データ更新
DELETE /api/projects/{projectId}/measurements/{measurementId} # 測定データ削除

// アラート管理API
GET    /api/projects/{projectId}/alerts                    # アラート設定一覧
POST   /api/projects/{projectId}/alerts                    # アラート設定作成
PUT    /api/projects/{projectId}/alerts/{alertId}          # アラート設定更新
DELETE /api/projects/{projectId}/alerts/{alertId}          # アラート設定削除
GET    /api/projects/{projectId}/alerts/history            # アラート履歴
```

### フロントエンド技術スタック
- **Chart.js / Recharts**: 時系列グラフ・分析チャート
- **React-CSV**: CSV処理・エクスポート
- **Papa Parse**: CSV パース・バリデーション
- **React Hook Form**: フォーム管理
- **React Query**: API状態管理・キャッシュ
- **WebSocket**: リアルタイム更新（将来拡張）

### データ可視化ライブラリ
```typescript
// Chart.js設定例
const chartConfig = {
  type: 'line',
  data: {
    labels: timestamps,
    datasets: [
      {
        label: 'pH',
        data: phValues,
        borderColor: 'rgb(75, 192, 192)',
        yAxisID: 'y'
      },
      {
        label: '温度 (℃)',
        data: temperatureValues, 
        borderColor: 'rgb(255, 99, 132)',
        yAxisID: 'y1'
      }
    ]
  },
  options: {
    responsive: true,
    scales: {
      y: { type: 'linear', display: true, position: 'left' },
      y1: { type: 'linear', display: true, position: 'right' }
    }
  }
};
```

## 📊 Phase 7 成果物・完了基準

### 🎯 **実装完了基準**
- ✅ 測定データCRUD操作が完全動作
- ✅ CSV一括取り込み機能が正常動作
- ✅ プロジェクト連携が完全動作
- ✅ 時系列データ可視化が正常表示
- ✅ アラート機能が正常動作
- ✅ TypeScriptエラー0件達成

### 📁 **成果物ファイル構成**
```
frontend/
├── src/app/projects/[projectId]/
│   ├── measurements/
│   │   ├── page.tsx                    # 測定データ一覧
│   │   ├── [measurementId]/page.tsx    # 測定データ詳細
│   │   ├── new/page.tsx                # 測定データ作成
│   │   ├── import/page.tsx             # CSV取り込み ← 重要
│   │   └── analytics/page.tsx          # 分析ダッシュボード
│   ├── monitoring/page.tsx             # リアルタイム監視
│   └── alerts/
│       ├── page.tsx                    # アラート設定
│       └── history/page.tsx            # アラート履歴
├── components/
│   ├── charts/                         # チャートコンポーネント
│   │   ├── TimeSeriesChart.tsx
│   │   ├── MetricsCard.tsx
│   │   └── TrendAnalysis.tsx
│   ├── csv/                           # CSV処理コンポーネント
│   │   ├── CSVUploader.tsx
│   │   ├── ColumnMapper.tsx
│   │   └── ImportProgress.tsx
│   └── alerts/                        # アラートコンポーネント
│       ├── AlertRule.tsx
│       └── AlertHistory.tsx
├── lib/
│   ├── csv/                           # CSV処理ユーティリティ
│   │   ├── parser.ts
│   │   ├── validator.ts
│   │   └── mapper.ts
│   └── charts/                        # チャート設定
│       └── config.ts
└── types/
    ├── measurement.ts                 # 測定データ型定義
    ├── alert.ts                       # アラート型定義
    └── csv.ts                         # CSV型定義
```

## 🚀 Phase 7 → Phase 8 引き継ぎ予定

### Phase 8 推奨内容
1. **レポート生成UI復元**
2. **高度分析・AI予測ダッシュボード復元**
3. **モバイル対応・PWA化**
4. **IoTセンサー統合準備**

## 📝 Phase 7 開発ノート

### 重要な設計原則
1. **データ品質重視**: CSV取り込み時の厳密なバリデーション
2. **プロジェクト統合**: プロジェクト管理機能との完全連携
3. **リアルタイム性**: 継続的なデータ更新・監視
4. **操作性**: 現場作業者が使いやすいインターフェース

### 開発効率化戦略
- **段階的実装**: CRUD → CSV取り込み → 可視化 → アラートの順序
- **コンポーネント再利用**: チャート・フォームコンポーネントの統一設計
- **API統合パターン**: プロジェクト管理と同様のパターン適用

### CSV取り込み重要ポイント
- **エラーハンドリング**: 不正データの詳細表示・修正支援
- **パフォーマンス**: 大量データ(10,000行+)の効率的処理
- **ユーザビリティ**: ドラッグ&ドロップ・プログレス表示
- **データ整合性**: 重複データ・異常値の検出・対応

---

**Phase 7開始日**: 2025年7月28日  
**Phase 7担当**: Claude Code  
**Phase 7目標**: 測定データ管理・CSV取り込み・モニタリング機能完全実装