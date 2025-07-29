'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project, MeasurementData } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface MeasurementDetailPageProps {
  params: {
    projectId: string;
    measurementId: string;
  };
}

export default function MeasurementDetailPage({ params }: MeasurementDetailPageProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [measurement, setMeasurement] = useState<MeasurementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [projectResponse, measurementResponse] = await Promise.all([
          apiClient.getProject(params.projectId),
          apiClient.getMeasurement(params.projectId, params.measurementId)
        ]);

        setProject(projectResponse.project);
        setMeasurement(measurementResponse.measurement);
      } catch (err) {
        console.error('データ取得エラー:', err);
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (params.projectId && params.measurementId) {
      fetchData();
    }
  }, [params.projectId, params.measurementId]);

  const handleDelete = async () => {
    if (!measurement || !window.confirm('この測定データを削除してもよろしいですか？')) {
      return;
    }

    try {
      setDeleting(true);
      await apiClient.deleteMeasurement(params.projectId, params.measurementId);
      router.push(`/projects/${params.projectId}/measurements`);
    } catch (err) {
      console.error('削除エラー:', err);
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  // アラートレベルの色とラベルを取得
  const getAlertLevelInfo = (level: 'normal' | 'warning' | 'critical') => {
    switch (level) {
      case 'normal':
        return { color: 'bg-green-100 text-green-800', label: '正常' };
      case 'warning':
        return { color: 'bg-yellow-100 text-yellow-800', label: '警告' };
      case 'critical':
        return { color: 'bg-red-100 text-red-800', label: '危険' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: level };
    }
  };

  // データ品質の色とラベルを取得
  const getQualityLevelInfo = (quality: 'excellent' | 'good' | 'fair' | 'poor') => {
    switch (quality) {
      case 'excellent':
        return { color: 'bg-green-100 text-green-800', label: '優秀' };
      case 'good':
        return { color: 'bg-blue-100 text-blue-800', label: '良好' };
      case 'fair':
        return { color: 'bg-yellow-100 text-yellow-800', label: '普通' };
      case 'poor':
        return { color: 'bg-red-100 text-red-800', label: '不良' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: quality };
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

  // 測定値の表示用フォーマット
  const formatMeasurementValue = (key: string, value: number): { label: string; formattedValue: string } => {
    const formats: Record<string, { label: string; unit: string; precision: number }> = {
      ph: { label: 'pH値', unit: '', precision: 1 },
      temperature: { label: '温度', unit: '°C', precision: 1 },
      turbidity: { label: '濁度', unit: 'NTU', precision: 1 },
      conductivity: { label: '電気伝導度', unit: 'μS/cm', precision: 0 },
      dissolvedOxygen: { label: '溶存酸素', unit: 'mg/L', precision: 1 },
      co2Concentration: { label: 'CO2濃度', unit: 'ppm', precision: 0 },
      humidity: { label: '湿度', unit: '%', precision: 1 },
      airPressure: { label: '気圧', unit: 'hPa', precision: 1 },
      windSpeed: { label: '風速', unit: 'm/s', precision: 1 },
      soilPH: { label: '土壌pH', unit: '', precision: 1 },
      soilMoisture: { label: '土壌水分', unit: '%', precision: 1 },
      organicMatter: { label: '有機物', unit: '%', precision: 1 },
      iron: { label: '鉄濃度', unit: 'mg/L', precision: 2 },
      copper: { label: '銅濃度', unit: 'mg/L', precision: 2 },
      zinc: { label: '亜鉛濃度', unit: 'mg/L', precision: 2 },
      lead: { label: '鉛濃度', unit: 'mg/L', precision: 2 },
      cadmium: { label: 'カドミウム濃度', unit: 'mg/L', precision: 3 },
      flowRate: { label: '流量', unit: 'L/min', precision: 1 },
      processedVolume: { label: '処理量', unit: 'L', precision: 0 },
      co2Captured: { label: 'CO2除去量', unit: 'kg', precision: 1 },
      mineralPrecipitation: { label: '鉱物沈殿量', unit: 'kg', precision: 1 }
    };

    const format = formats[key] || { label: key, unit: '', precision: 2 };
    return {
      label: format.label,
      formattedValue: `${value.toFixed(format.precision)}${format.unit ? ` ${format.unit}` : ''}`
    };
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

  if (error || !measurement) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg mb-4">
            {error || '測定データが見つかりません'}
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${params.projectId}/measurements`)}
          >
            測定データ一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  const alertInfo = getAlertLevelInfo(measurement.alertLevel);
  const qualityInfo = getQualityLevelInfo(measurement.qualityFlags.dataQuality);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${params.projectId}/measurements`)}
            >
              ← 測定データ一覧に戻る
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">測定データ詳細</h1>
          <p className="text-gray-600 mt-2">
            {project?.projectName} - {new Date(measurement.timestamp).toLocaleString('ja-JP')}
          </p>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end gap-4 mb-6">
          <Button
            onClick={() => router.push(`/projects/${params.projectId}/measurements/${params.measurementId}/edit`)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            編集
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            {deleting ? '削除中...' : '削除'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 基本情報 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">基本情報</h2>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">測定ID</div>
                <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                  {measurement.measurementId}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">測定日時</div>
                <div className="font-medium">
                  {new Date(measurement.timestamp).toLocaleString('ja-JP')}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">データ種別</div>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {getTypeLabel(measurement.type)}
                </span>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">アラートレベル</div>
                <span className={`inline-block px-3 py-1 rounded text-sm ${alertInfo.color}`}>
                  {alertInfo.label}
                </span>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">データ品質</div>
                <span className={`inline-block px-3 py-1 rounded text-sm ${qualityInfo.color}`}>
                  {qualityInfo.label}
                </span>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">校正状態</div>
                <span className={`inline-block px-3 py-1 rounded text-sm ${
                  measurement.qualityFlags.calibrationStatus === 'calibrated' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {measurement.qualityFlags.calibrationStatus === 'calibrated' ? '校正済み' : '校正必要'}
                </span>
              </div>

              {measurement.qualityFlags.anomalyDetected && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">異常検知</div>
                  <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded text-sm">
                    異常値を検出
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* 位置情報 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">位置情報</h2>
            
            <div className="space-y-4">
              {measurement.location.siteName && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">測定地点名</div>
                  <div className="font-medium">{measurement.location.siteName}</div>
                </div>
              )}

              <div>
                <div className="text-sm text-gray-600 mb-1">緯度</div>
                <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                  {measurement.location.latitude}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">経度</div>
                <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                  {measurement.location.longitude}
                </div>
              </div>

              {/* 地図表示エリア（将来の拡張用） */}
              <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center">
                <div className="text-gray-500 text-sm">
                  地図表示（将来実装予定）
                </div>
              </div>
            </div>
          </Card>

          {/* 測定値 */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">測定値</h2>
            
            {Object.keys(measurement.values).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                測定値が記録されていません
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(measurement.values).map(([key, value]) => {
                  if (value == null) return null;
                  
                  const { label, formattedValue } = formatMeasurementValue(key, value);
                  
                  return (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">{label}</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formattedValue}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 追加情報 */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">追加情報</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {measurement.operatorId && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">操作者ID</div>
                    <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                      {measurement.operatorId}
                    </div>
                  </div>
                )}

                {measurement.deviceId && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">測定機器ID</div>
                    <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                      {measurement.deviceId}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-gray-600 mb-1">作成日時</div>
                  <div className="text-sm">
                    {new Date(measurement.createdAt).toLocaleString('ja-JP')}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-1">更新日時</div>
                  <div className="text-sm">
                    {new Date(measurement.updatedAt).toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>

              <div>
                {measurement.notes && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">メモ</div>
                    <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                      {measurement.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

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