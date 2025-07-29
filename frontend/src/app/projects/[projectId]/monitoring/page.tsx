'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project, MeasurementData } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface MonitoringPageProps {
  params: {
    projectId: string;
  };
}

interface MetricsSummary {
  current: number | null;
  average24h: number | null;
  trend: 'up' | 'down' | 'stable';
  alertLevel: 'normal' | 'warning' | 'critical';
}

interface MonitoringData {
  ph: MetricsSummary;
  temperature: MetricsSummary;
  co2Concentration: MetricsSummary;
  flowRate: MetricsSummary;
  iron: MetricsSummary;
  copper: MetricsSummary;
  zinc: MetricsSummary;
}

export default function MonitoringPage({ params }: MonitoringPageProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);

  // データを取得する関数
  const fetchMonitoringData = async () => {
    try {
      setError(null);

      const [projectResponse, measurementsResponse] = await Promise.all([
        apiClient.getProject(params.projectId),
        apiClient.getMeasurements(params.projectId, {
          limit: 100,
          // 過去24時間のデータを取得
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        })
      ]);

      setProject(projectResponse.project);
      setMeasurements(measurementsResponse.measurements);
      
      // モニタリング用のサマリーデータを生成
      const summary = generateMetricsSummary(measurementsResponse.measurements);
      setMonitoringData(summary);
      
      setLastUpdate(new Date());
    } catch (err) {
      console.error('データ取得エラー:', err);
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    }
  };

  // 初回データ取得
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchMonitoringData();
      setLoading(false);
    };

    if (params.projectId) {
      loadData();
    }
  }, [params.projectId]);

  // 自動更新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMonitoringData();
    }, 5 * 60 * 1000); // 5分間隔

    return () => clearInterval(interval);
  }, [autoRefresh, params.projectId]);

  // メトリクスのサマリーを生成
  const generateMetricsSummary = (data: MeasurementData[]): MonitoringData => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // 最新のデータ（1時間以内）
    const recentData = data.filter(d => new Date(d.timestamp).getTime() > oneHourAgo);
    // 24時間のデータ
    const dayData = data.filter(d => new Date(d.timestamp).getTime() > twentyFourHoursAgo);

    const calculateMetric = (key: keyof MeasurementData['values']): MetricsSummary => {
      const recentValues = recentData
        .map(d => d.values[key])
        .filter((v): v is number => v != null);
      
      const dayValues = dayData
        .map(d => d.values[key])
        .filter((v): v is number => v != null);

      const current = recentValues.length > 0 ? recentValues[recentValues.length - 1] : null;
      const average24h = dayValues.length > 0 
        ? dayValues.reduce((sum, val) => sum + val, 0) / dayValues.length 
        : null;

      // トレンド計算（直近5つの値の傾向）
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (dayValues.length >= 5) {
        const recent5 = dayValues.slice(-5);
        const first2Avg = (recent5[0] + recent5[1]) / 2;
        const last2Avg = (recent5[3] + recent5[4]) / 2;
        const change = ((last2Avg - first2Avg) / first2Avg) * 100;
        
        if (change > 5) trend = 'up';
        else if (change < -5) trend = 'down';
      }

      // アラートレベル判定
      let alertLevel: 'normal' | 'warning' | 'critical' = 'normal';
      if (current != null) {
        if (key === 'ph') {
          if (current < 6.5 || current > 8.5) alertLevel = 'warning';
          if (current < 6.0 || current > 9.0) alertLevel = 'critical';
        } else if (key === 'iron' && current > 10) {
          alertLevel = 'warning';
        } else if (key === 'copper' && current > 1) {
          alertLevel = 'warning';
        } else if (key === 'zinc' && current > 5) {
          alertLevel = 'warning';
        }
      }

      return { current, average24h, trend, alertLevel };
    };

    return {
      ph: calculateMetric('ph'),
      temperature: calculateMetric('temperature'),
      co2Concentration: calculateMetric('co2Concentration'),
      flowRate: calculateMetric('flowRate'),
      iron: calculateMetric('iron'),
      copper: calculateMetric('copper'),
      zinc: calculateMetric('zinc')
    };
  };

  // メトリクスカードのコンポーネント
  const MetricCard = ({ 
    title, 
    unit, 
    data, 
    precision = 1 
  }: { 
    title: string; 
    unit: string; 
    data: MetricsSummary; 
    precision?: number;
  }) => {
    const getAlertColor = (level: 'normal' | 'warning' | 'critical') => {
      switch (level) {
        case 'normal': return 'border-green-200 bg-green-50';
        case 'warning': return 'border-yellow-200 bg-yellow-50';
        case 'critical': return 'border-red-200 bg-red-50';
      }
    };

    const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
      switch (trend) {
        case 'up': return '📈';
        case 'down': return '📉';
        case 'stable': return '➖';
      }
    };

    return (
      <Card className={`p-4 ${getAlertColor(data.alertLevel)}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          <span className="text-lg">{getTrendIcon(data.trend)}</span>
        </div>
        
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900">
            {data.current != null ? `${data.current.toFixed(precision)}${unit}` : '---'}
          </div>
          <div className="text-xs text-gray-500">
            24h平均: {data.average24h != null ? `${data.average24h.toFixed(precision)}${unit}` : '---'}
          </div>
          {data.alertLevel !== 'normal' && (
            <div className={`text-xs font-medium ${
              data.alertLevel === 'warning' ? 'text-yellow-700' : 'text-red-700'
            }`}>
              {data.alertLevel === 'warning' ? '⚠️ 警告レベル' : '🚨 危険レベル'}
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${params.projectId}`)}
          >
            プロジェクト詳細に戻る
          </Button>
        </div>
      </div>
    );
  }

  const criticalAlerts = monitoringData ? 
    Object.values(monitoringData).filter(metric => metric.alertLevel === 'critical').length : 0;
  const warningAlerts = monitoringData ? 
    Object.values(monitoringData).filter(metric => metric.alertLevel === 'warning').length : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${params.projectId}`)}
            >
              ← プロジェクト詳細に戻る
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">リアルタイム監視</h1>
              <p className="text-gray-600 mt-2">
                {project?.projectName} の監視ダッシュボード
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-2">
                最終更新: {lastUpdate.toLocaleString('ja-JP')}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="mr-2"
                  />
                  自動更新 (5分間隔)
                </label>
                <Button
                  size="sm"
                  onClick={fetchMonitoringData}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  手動更新
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* アラートサマリー */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">✅</div>
              <div>
                <div className="text-lg font-semibold text-green-800">
                  {monitoringData ? Object.values(monitoringData).filter(m => m.alertLevel === 'normal').length : 0}
                </div>
                <div className="text-sm text-green-700">正常な指標</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⚠️</div>
              <div>
                <div className="text-lg font-semibold text-yellow-800">{warningAlerts}</div>
                <div className="text-sm text-yellow-700">警告レベル</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🚨</div>
              <div>
                <div className="text-lg font-semibold text-red-800">{criticalAlerts}</div>
                <div className="text-sm text-red-700">危険レベル</div>
              </div>
            </div>
          </Card>
        </div>

        {/* メトリクス一覧 */}
        {monitoringData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            <MetricCard title="pH値" unit="" data={monitoringData.ph} precision={1} />
            <MetricCard title="温度" unit="°C" data={monitoringData.temperature} precision={1} />
            <MetricCard title="CO2濃度" unit="ppm" data={monitoringData.co2Concentration} precision={0} />
            <MetricCard title="流量" unit="L/min" data={monitoringData.flowRate} precision={1} />
            <MetricCard title="鉄濃度" unit="mg/L" data={monitoringData.iron} precision={2} />
            <MetricCard title="銅濃度" unit="mg/L" data={monitoringData.copper} precision={2} />
            <MetricCard title="亜鉛濃度" unit="mg/L" data={monitoringData.zinc} precision={2} />
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="text-gray-500 text-lg mb-4">データを読み込み中...</div>
          </Card>
        )}

        {/* 最近の測定データ */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">最近の測定データ</h2>
          {measurements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              測定データがありません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">日時</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">種別</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">アラート</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">pH</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">温度</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">CO2</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">流量</th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.slice(0, 10).map((measurement) => (
                    <tr key={measurement.measurementId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm">
                        {new Date(measurement.timestamp).toLocaleString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-2 px-4 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {measurement.type === 'water_quality' ? '水質' : 
                           measurement.type === 'atmospheric' ? '大気' : '土壌'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          measurement.alertLevel === 'normal' ? 'bg-green-100 text-green-800' :
                          measurement.alertLevel === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {measurement.alertLevel === 'normal' ? '正常' :
                           measurement.alertLevel === 'warning' ? '警告' : '危険'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-sm font-mono">
                        {measurement.values.ph?.toFixed(1) || '---'}
                      </td>
                      <td className="py-2 px-4 text-sm font-mono">
                        {measurement.values.temperature?.toFixed(1) || '---'}°C
                      </td>
                      <td className="py-2 px-4 text-sm font-mono">
                        {measurement.values.co2Concentration?.toFixed(0) || '---'}ppm
                      </td>
                      <td className="py-2 px-4 text-sm font-mono">
                        {measurement.values.flowRate?.toFixed(1) || '---'}L/min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${params.projectId}/measurements`)}
            >
              すべての測定データを表示
            </Button>
          </div>
        </Card>

        {/* エラー表示 */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>

      {/* TODO: Cursor - 受入テスト実施 */}
    </div>
  );
}