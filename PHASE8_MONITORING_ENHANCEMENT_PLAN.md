# Phase 8: モニタリング機能拡張・データ可視化強化計画

## 🎯 Phase 8 概要

**期間**: 2025年7月29日〜 (予定2-3週間)  
**担当**: Claude Code (モニタリング機能拡張・データ可視化強化)  
**前提条件**: Phase 7完了 (基本モニタリング機能実装完了)

## 📋 Phase 8 背景・必要性

### 🔗 **Phase 7からの発展**
Phase 7で実装した基本モニタリング機能をベースに、より高度な可視化・分析機能を実装：
- 基本メトリクス表示 → 高度なチャート・グラフ可視化
- 静的データ表示 → リアルタイム更新・アラート機能
- 単純な監視 → 予測分析・トレンド分析・相関分析

### 🚨 **重要要件**
1. **高度データ可視化**: Chart.js/Recharts統合によるインタラクティブチャート
2. **リアルタイム監視**: WebSocket/Server-Sent Events実装
3. **アラート・通知システム**: 閾値監視・自動通知機能
4. **分析ダッシュボード**: トレンド分析・相関分析・効率指標
5. **地図連携**: 測定ポイントの地理的可視化

## 🎯 Phase 8 実装目標

### ✅ **Phase 8.1: 高度チャート・可視化機能 (Week 1)**

#### 8.1.1 Chart.js/Recharts統合
```typescript
// チャートライブラリのインストール・設定
npm install chart.js react-chartjs-2 recharts date-fns

// チャートコンポーネント構造
components/charts/
├── TimeSeriesChart.tsx        // 時系列データ表示
├── MetricsComparisonChart.tsx // 複数指標比較
├── TrendAnalysisChart.tsx     // トレンド分析
├── CorrelationChart.tsx       // 相関分析
├── HeatmapChart.tsx          // ヒートマップ
└── GaugeChart.tsx            // ゲージチャート
```

#### 8.1.2 インタラクティブ時系列チャート
```typescript
interface TimeSeriesChartProps {
  data: MeasurementData[];
  metrics: string[];
  timeRange: 'hour' | 'day' | 'week' | 'month';
  realTime: boolean;
  annotations?: Array<{
    timestamp: string;
    message: string;
    type: 'info' | 'warning' | 'critical';
  }>;
}

// 機能:
// - ズーム・パン操作対応
// - 複数指標の重ね合わせ表示
// - アラートポイントの注釈表示
// - リアルタイム更新対応
// - データポイントのツールチップ表示
```

#### 8.1.3 ダッシュボード用メトリクスカード拡張
```typescript
interface AdvancedMetricCard {
  // 基本メトリクス (Phase 7)
  current: number;
  average24h: number;
  trend: 'up' | 'down' | 'stable';
  
  // 拡張メトリクス (Phase 8)
  sparklineData: number[];           // ミニチャート
  percentChange: number;             // 変化率
  prediction: number;                // 予測値
  confidenceInterval: [number, number]; // 信頼区間
  anomalyScore: number;              // 異常度スコア
  compareWithBaseline: number;       // ベースライン比較
}
```

### ✅ **Phase 8.2: リアルタイム監視・アラートシステム (Week 1-2)**

#### 8.2.1 WebSocket統合によるリアルタイム更新
```typescript
// WebSocket接続管理
class RealtimeDataService {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, (data: any) => void> = new Map();
  
  connect(projectId: string): void;
  subscribe(channel: string, callback: (data: any) => void): void;
  unsubscribe(channel: string): void;
  disconnect(): void;
}

// 使用例
const realtimeService = new RealtimeDataService();
realtimeService.connect(projectId);
realtimeService.subscribe('measurements', (data) => {
  updateChartData(data);
  checkAlertConditions(data);
});
```

#### 8.2.2 高度なアラート・通知システム
```typescript
interface AlertRule {
  ruleId: string;
  projectId: string;
  name: string;
  description: string;
  
  // 条件設定
  conditions: {
    parameter: keyof MeasurementData['values'];
    operator: '>' | '<' | '=' | '!=' | 'between' | 'trend';
    threshold: number | [number, number];
    duration: number;  // 継続時間（分）
    
    // 複合条件
    logicalOperator?: 'AND' | 'OR';
    secondaryCondition?: {
      parameter: keyof MeasurementData['values'];
      operator: string;
      threshold: number;
    };
  };
  
  // 通知設定
  notifications: {
    email: { enabled: boolean; recipients: string[] };
    sms: { enabled: boolean; recipients: string[] };
    dashboard: { enabled: boolean; priority: 'low' | 'medium' | 'high' };
    webhook: { enabled: boolean; url: string };
  };
  
  // スケジュール
  schedule: {
    enabled: boolean;
    timeRange: { start: string; end: string };
    daysOfWeek: number[];
  };
  
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

#### 8.2.3 アラート履歴・対応管理
```typescript
interface AlertHistory {
  alertId: string;
  ruleId: string;
  projectId: string;
  measurementId: string;
  
  // アラート詳細
  severity: 'info' | 'warning' | 'critical';
  parameter: string;
  actualValue: number;
  threshold: number | [number, number];
  message: string;
  
  // 状態管理
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated';
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  
  // 対応記録
  responseActions: Array<{
    timestamp: string;
    action: string;
    performedBy: string;
    notes: string;
  }>;
  
  createdAt: string;
  updatedAt: string;
}
```

### ✅ **Phase 8.3: 分析ダッシュボード・高度分析機能 (Week 2-3)**

#### 8.3.1 トレンド分析ダッシュボード
```typescript
interface TrendAnalysisData {
  parameter: string;
  timeRange: string;
  
  // 統計データ
  statistics: {
    mean: number;
    median: number;
    standardDeviation: number;
    min: number;
    max: number;
    percentiles: { p25: number; p50: number; p75: number; p95: number };
  };
  
  // トレンド情報
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    r_squared: number;
    significance: number;
    seasonality: boolean;
  };
  
  // 予測データ
  forecast: Array<{
    timestamp: string;
    predicted: number;
    lower_bound: number;
    upper_bound: number;
    confidence: number;
  }>;
}
```

#### 8.3.2 相関分析・関係性可視化
```typescript
interface CorrelationAnalysis {
  parameters: string[];
  correlationMatrix: number[][];
  significantCorrelations: Array<{
    param1: string;
    param2: string;
    correlation: number;
    pValue: number;
    significance: 'low' | 'medium' | 'high';
    interpretation: string;
  }>;
  
  // 散布図データ
  scatterPlots: Array<{
    xParam: string;
    yParam: string;
    data: Array<{ x: number; y: number; timestamp: string }>;
    trendLine: { slope: number; intercept: number; r_squared: number };
  }>;
}
```

#### 8.3.3 効率指標・KPIダッシュボード
```typescript
interface EfficiencyMetrics {
  projectId: string;
  timeRange: string;
  
  // CO2除去効率
  co2RemovalEfficiency: {
    totalCO2Removed: number;      // kg
    removalRate: number;          // kg/day
    efficiencyTrend: 'improving' | 'declining' | 'stable';
    targetAchievement: number;    // %
  };
  
  // 廃水処理効率
  wastewaterTreatmentEfficiency: {
    totalVolumeProcessed: number; // L
    processingRate: number;       // L/day
    qualityImprovement: {
      phStabilization: number;    // %
      turbidityReduction: number; // %
      heavyMetalRemoval: number;  // %
    };
  };
  
  // 運用効率
  operationalEfficiency: {
    uptime: number;               // %
    dataQualityScore: number;     // %
    alertResponseTime: number;    // minutes
    maintenanceCompliance: number; // %
  };
  
  // コスト効率
  costEfficiency: {
    costPerKgCO2: number;         // JPY/kg
    costPerLiterProcessed: number; // JPY/L
    budgetUtilization: number;    // %
  };
}
```

### ✅ **Phase 8.4: 地図連携・地理的可視化 (Week 2-3)**

#### 8.4.1 測定ポイント地図表示
```typescript
// Leaflet/MapboxGL統合
npm install leaflet react-leaflet mapbox-gl

interface MapDashboard {
  // 地図設定
  center: [number, number];
  zoom: number;
  
  // 測定ポイント
  measurementPoints: Array<{
    id: string;
    location: { latitude: number; longitude: number };
    siteName: string;
    currentValues: Partial<MeasurementData['values']>;
    alertLevel: 'normal' | 'warning' | 'critical';
    lastUpdate: string;
    
    // 表示設定
    marker: {
      color: string;
      size: number;
      icon: string;
    };
  }>;
  
  // レイヤー管理
  layers: {
    heatmap: boolean;          // ヒートマップ表示
    clusters: boolean;         // クラスター表示
    trajectories: boolean;     // 測定経路表示
    alerts: boolean;          // アラート表示
  };
}
```

#### 8.4.2 ヒートマップ・等高線表示
```typescript
interface SpatialAnalysis {
  parameter: string;
  timeRange: string;
  
  // グリッドデータ
  gridData: Array<{
    latitude: number;
    longitude: number;
    value: number;
    interpolated: boolean;
  }>;
  
  // 等高線データ
  contours: Array<{
    level: number;
    coordinates: Array<[number, number]>;
    color: string;
  }>;
  
  // 統計情報
  spatialStatistics: {
    hotspots: Array<{ latitude: number; longitude: number; intensity: number }>;
    coldspots: Array<{ latitude: number; longitude: number; intensity: number }>;
    gradients: Array<{ from: [number, number]; to: [number, number]; magnitude: number }>;
  };
}
```

## 🛠 Phase 8 技術仕様

### フロントエンド拡張技術スタック
```json
{
  "dependencies": {
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "recharts": "^2.8.0",
    "date-fns": "^2.30.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "mapbox-gl": "^2.15.0",
    "d3": "^7.8.5",
    "react-d3-graph": "^2.6.0"
  }
}
```

### チャート設定例
```typescript
// 時系列チャート設定
const timeSeriesConfig = {
  type: 'line',
  data: {
    datasets: [
      {
        label: 'pH値',
        data: phData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        yAxisID: 'y-ph'
      },
      {
        label: '温度',
        data: temperatureData,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        yAxisID: 'y-temp'
      }
    ]
  },
  options: {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x',
        },
        pan: {
          enabled: true,
          mode: 'x',
        }
      },
      annotation: {
        annotations: alertAnnotations
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            hour: 'HH:mm',
            day: 'MM/DD'
          }
        }
      },
      'y-ph': {
        type: 'linear',
        display: true,
        position: 'left',
        min: 0,
        max: 14
      },
      'y-temp': {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        }
      }
    }
  }
};
```

### WebSocket実装例
```typescript
// リアルタイムデータ受信
const useRealtimeData = (projectId: string) => {
  const [data, setData] = useState<MeasurementData[]>([]);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3001/projects/${projectId}/measurements`);
    
    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      setData(prev => [...prev.slice(-100), newData]); // 最新100件保持
    };
    
    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };
    
    return () => ws.close();
  }, [projectId]);
  
  return { data, connected };
};
```

## 📊 Phase 8 成果物・完了基準

### 🎯 **実装完了基準**
- ✅ Chart.js/Recharts統合完了
- ✅ リアルタイム更新機能動作
- ✅ アラート・通知システム動作
- ✅ 高度分析ダッシュボード完成
- ✅ 地図連携機能動作
- ✅ TypeScriptエラー0件達成

### 📁 **成果物ファイル構成**
```
frontend/src/
├── app/projects/[projectId]/
│   ├── monitoring/
│   │   ├── page.tsx                    # 拡張モニタリングダッシュボード
│   │   ├── analytics/page.tsx          # 分析ダッシュボード
│   │   ├── alerts/page.tsx             # アラート管理
│   │   └── map/page.tsx                # 地図ダッシュボード
├── components/charts/                  # チャートコンポーネント群
│   ├── TimeSeriesChart.tsx
│   ├── MetricsComparisonChart.tsx
│   ├── TrendAnalysisChart.tsx
│   ├── CorrelationChart.tsx
│   ├── HeatmapChart.tsx
│   └── GaugeChart.tsx
├── components/monitoring/              # モニタリング専用コンポーネント
│   ├── RealtimeMetricCard.tsx
│   ├── AlertNotification.tsx
│   ├── EfficiencyDashboard.tsx
│   └── MapDashboard.tsx
├── lib/realtime/                       # リアルタイム通信
│   ├── websocket-client.ts
│   ├── alert-service.ts
│   └── notification-service.ts
├── lib/analytics/                      # 分析・統計処理
│   ├── trend-analysis.ts
│   ├── correlation-analysis.ts
│   ├── forecasting.ts
│   └── spatial-analysis.ts
└── types/
    ├── charts.ts                       # チャート型定義
    ├── alerts.ts                       # アラート型定義
    └── analytics.ts                    # 分析型定義
```

## 🚀 Phase 8 → Phase 9 引き継ぎ予定

### Phase 9 推奨内容
1. **レポート生成システム**: 高度分析結果を活用したMRV報告書
2. **AI/ML予測機能**: 測定データに基づく予測・最適化
3. **モバイルアプリ・PWA**: 現場作業者向けモバイル対応
4. **システム統合・最適化**: パフォーマンス向上・運用最適化

## 📝 Phase 8 開発ノート

### 重要な設計原則
1. **パフォーマンス重視**: 大量データの効率的可視化
2. **リアルタイム性**: WebSocket/SSEによる即座更新
3. **ユーザビリティ**: 直感的で操作しやすいチャート・ダッシュボード
4. **拡張性**: 新しい分析機能・チャート種別の追加容易性

### 開発効率化戦略
- **段階的実装**: チャート基盤 → リアルタイム → 分析 → 地図の順序
- **コンポーネント設計**: 再利用可能なチャートコンポーネント群
- **データ管理**: Phase 7の測定データとシームレス連携

### パフォーマンス最適化ポイント
- **仮想化**: 大量データポイントの効率的描画
- **メモ化**: 重い計算結果のキャッシュ
- **ウェブワーカー**: UI更新を妨げない非同期処理
- **データ圧縮**: WebSocket通信の最適化

---

**Phase 8開始日**: 2025年7月29日  
**Phase 8担当**: Claude Code  
**Phase 8目標**: 高度データ可視化・リアルタイム監視・分析ダッシュボード完全実装