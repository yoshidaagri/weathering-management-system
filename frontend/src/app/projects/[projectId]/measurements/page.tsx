'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project, MeasurementData, MeasurementQuery } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface MeasurementsPageProps {
  params: {
    projectId: string;
  };
}

export default function MeasurementsPage({ params }: MeasurementsPageProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // フィルタ状態
  const [filters, setFilters] = useState<MeasurementQuery>({
    limit: 20,
    type: undefined,
    alertLevel: undefined,
    startDate: undefined,
    endDate: undefined,
    search: ''
  });

  // プロジェクト情報と測定データを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [projectResponse, measurementsResponse] = await Promise.all([
          apiClient.getProject(params.projectId),
          apiClient.getMeasurements(params.projectId, filters)
        ]);

        setProject(projectResponse.project);
        setMeasurements(measurementsResponse.measurements);
        setNextToken(measurementsResponse.nextToken);
        setHasMore(!!measurementsResponse.nextToken);
      } catch (err) {
        console.error('データ取得エラー:', err);
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (params.projectId) {
      fetchData();
    }
  }, [params.projectId, filters]);

  // 追加データを読み込み
  const loadMore = async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const response = await apiClient.getMeasurements(params.projectId, {
        ...filters,
        nextToken
      });

      setMeasurements(prev => [...prev, ...response.measurements]);
      setNextToken(response.nextToken);
      setHasMore(!!response.nextToken);
    } catch (err) {
      console.error('追加データ取得エラー:', err);
      setError(err instanceof Error ? err.message : '追加データの取得に失敗しました');
    } finally {
      setLoadingMore(false);
    }
  };

  // フィルタ更新
  const updateFilter = (key: keyof MeasurementQuery, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  // 検索実行
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // フィルタが更新されると自動的にuseEffectが再実行される
  };

  // アラートレベルの色を取得
  const getAlertLevelColor = (level: 'normal' | 'warning' | 'critical') => {
    switch (level) {
      case 'normal': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // データ種別の表示名
  const getTypeLabel = (type: 'water_quality' | 'atmospheric' | 'soil') => {
    switch (type) {
      case 'water_quality': return '水質データ';
      case 'atmospheric': return '大気データ';
      case 'soil': return '土壌データ';
      default: return type;
    }
  };

  // 主要な測定値を表示
  const getKeyValues = (measurement: MeasurementData) => {
    const keyValues: string[] = [];
    
    if (measurement.values.ph) keyValues.push(`pH: ${measurement.values.ph}`);
    if (measurement.values.temperature) keyValues.push(`温度: ${measurement.values.temperature}°C`);
    if (measurement.values.co2Concentration) keyValues.push(`CO2: ${measurement.values.co2Concentration}ppm`);
    if (measurement.values.flowRate) keyValues.push(`流量: ${measurement.values.flowRate}L/min`);
    
    return keyValues.slice(0, 3).join(', ');
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
            onClick={() => router.push('/projects')}
          >
            プロジェクト一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">測定データ管理</h1>
          <p className="text-gray-600 mt-2">
            {project?.projectName} の測定データを管理します
          </p>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <Button
              onClick={() => router.push(`/projects/${params.projectId}/measurements/new`)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              新規測定データ登録
            </Button>
            <Button
              onClick={() => router.push(`/projects/${params.projectId}/measurements/import`)}
              className="bg-green-600 hover:bg-green-700"
            >
              CSV一括取り込み
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            総データ数: {measurements.length} 件
          </div>
        </div>

        {/* フィルタ */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">フィルタ・検索</h2>
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  データ種別
                </label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => updateFilter('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  <option value="water_quality">水質データ</option>
                  <option value="atmospheric">大気データ</option>
                  <option value="soil">土壌データ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  アラートレベル
                </label>
                <select
                  value={filters.alertLevel || ''}
                  onChange={(e) => updateFilter('alertLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  <option value="normal">正常</option>
                  <option value="warning">警告</option>
                  <option value="critical">危険</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始日
                </label>
                <Input
                  type="date"
                  value={filters.startDate?.split('T')[0] || ''}
                  onChange={(e) => updateFilter('startDate', e.target.value ? e.target.value + 'T00:00:00Z' : '')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  終了日
                </label>
                <Input
                  type="date"
                  value={filters.endDate?.split('T')[0] || ''}
                  onChange={(e) => updateFilter('endDate', e.target.value ? e.target.value + 'T23:59:59Z' : '')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  検索
                </label>
                <Input
                  type="text"
                  placeholder="場所名、メモで検索"
                  value={filters.search || ''}
                  onChange={(e) => updateFilter('search', e.target.value)}
                />
              </div>
            </div>
          </form>
        </Card>

        {/* 測定データ一覧 */}
        {measurements.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-gray-500 text-lg mb-4">測定データがありません</div>
            <p className="text-gray-400 mb-6">
              最初の測定データを登録するか、CSVファイルから一括取り込みしてください。
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => router.push(`/projects/${params.projectId}/measurements/new`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                新規登録
              </Button>
              <Button
                onClick={() => router.push(`/projects/${params.projectId}/measurements/import`)}
                variant="outline"
              >
                CSV取り込み
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {measurements.map((measurement) => (
              <Card
                key={measurement.measurementId}
                className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/projects/${params.projectId}/measurements/${measurement.measurementId}`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {getTypeLabel(measurement.type)}
                    </span>
                    <span className={`text-sm px-2 py-1 rounded ${getAlertLevelColor(measurement.alertLevel)}`}>
                      {measurement.alertLevel === 'normal' ? '正常' : 
                       measurement.alertLevel === 'warning' ? '警告' : '危険'}
                    </span>
                    <span className="text-sm px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      品質: {measurement.qualityFlags.dataQuality === 'excellent' ? '優秀' :
                             measurement.qualityFlags.dataQuality === 'good' ? '良好' :
                             measurement.qualityFlags.dataQuality === 'fair' ? '普通' : '不良'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(measurement.timestamp).toLocaleString('ja-JP')}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">測定場所</div>
                    <div className="font-medium">
                      {measurement.location.siteName || `${measurement.location.latitude}, ${measurement.location.longitude}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">主要測定値</div>
                    <div className="font-medium text-sm">
                      {getKeyValues(measurement) || '測定値なし'}
                    </div>
                  </div>
                </div>

                {measurement.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">メモ</div>
                    <div className="text-sm text-gray-800">{measurement.notes}</div>
                  </div>
                )}

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/projects/${params.projectId}/measurements/${measurement.measurementId}/edit`);
                    }}
                  >
                    編集
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: 削除確認ダイアログ
                    }}
                  >
                    削除
                  </Button>
                </div>
              </Card>
            ))}

            {/* 追加読み込みボタン */}
            {hasMore && (
              <div className="text-center py-4">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  variant="outline"
                >
                  {loadingMore ? '読み込み中...' : 'さらに読み込む'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* エラー表示 */}
        {error && measurements.length > 0 && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>

      {/* TODO: Cursor - 受入テスト実施 */}
    </div>
  );
}