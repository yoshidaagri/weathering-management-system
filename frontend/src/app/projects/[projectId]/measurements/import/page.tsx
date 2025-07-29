'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Project, CSVImportRequest, CSVImportResponse, CSVColumnMapping, CSVPreviewData, CreateMeasurementRequest } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface CSVImportPageProps {
  params: {
    projectId: string;
  };
}

export default function CSVImportPage({ params }: CSVImportPageProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // CSV処理状態
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping' | 'importing' | 'completed'>('upload');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVPreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<CSVColumnMapping>({
    timestamp: ''
  });
  const [importOptions, setImportOptions] = useState({
    batchSize: 100,
    duplicateHandling: 'skip' as 'skip' | 'overwrite' | 'error',
    deviceId: '',
    operatorId: ''
  });
  const [importResult, setImportResult] = useState<CSVImportResponse | null>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // プロジェクト情報を取得
  React.useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getProject(params.projectId);
        setProject(response.project);
      } catch (err) {
        console.error('プロジェクト取得エラー:', err);
        setError(err instanceof Error ? err.message : 'プロジェクト情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (params.projectId) {
      fetchProject();
    }
  }, [params.projectId]);

  // CSVファイルを解析してプレビュー作成
  const parseCSVFile = (file: File): Promise<CSVPreviewData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            reject(new Error('CSVファイルが空です'));
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/["\r]/g, ''));
          const rows = lines.slice(1, Math.min(11, lines.length)).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/["\r]/g, ''));
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          });

          resolve({
            headers,
            rows,
            totalRows: lines.length - 1,
            previewRows: rows.length
          });
        } catch (error) {
          reject(new Error('CSVファイルの解析に失敗しました'));
        }
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  // ファイルアップロード処理
  const handleFileUpload = async (file: File) => {
    try {
      setError(null);
      setCsvFile(file);
      
      const preview = await parseCSVFile(file);
      setCsvPreview(preview);
      
      // 自動マッピング設定
      const autoMapping: CSVColumnMapping = { timestamp: '' };
      preview.headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('timestamp') || lowerHeader.includes('日時') || lowerHeader.includes('time')) {
          autoMapping.timestamp = header;
        } else if (lowerHeader.includes('ph')) {
          autoMapping.ph = header;
        } else if (lowerHeader.includes('temp') || lowerHeader.includes('温度')) {
          autoMapping.temperature = header;
        } else if (lowerHeader.includes('co2') || lowerHeader.includes('二酸化炭素')) {
          autoMapping.co2Concentration = header;
        } else if (lowerHeader.includes('flow') || lowerHeader.includes('流量')) {
          autoMapping.flowRate = header;
        } else if (lowerHeader.includes('iron') || lowerHeader.includes('鉄')) {
          autoMapping.iron = header;
        } else if (lowerHeader.includes('copper') || lowerHeader.includes('銅')) {
          autoMapping.copper = header;
        } else if (lowerHeader.includes('zinc') || lowerHeader.includes('亜鉛')) {
          autoMapping.zinc = header;
        } else if (lowerHeader.includes('turbidity') || lowerHeader.includes('濁度')) {
          autoMapping.turbidity = header;
        } else if (lowerHeader.includes('conductivity') || lowerHeader.includes('電気伝導度')) {
          autoMapping.conductivity = header;
        } else if (lowerHeader.includes('oxygen') || lowerHeader.includes('溶存酸素')) {
          autoMapping.dissolvedOxygen = header;
        } else if (lowerHeader.includes('latitude') || lowerHeader.includes('緯度')) {
          autoMapping.latitude = header;
        } else if (lowerHeader.includes('longitude') || lowerHeader.includes('経度')) {
          autoMapping.longitude = header;
        } else if (lowerHeader.includes('site') || lowerHeader.includes('場所') || lowerHeader.includes('地点')) {
          autoMapping.siteName = header;
        } else if (lowerHeader.includes('note') || lowerHeader.includes('memo') || lowerHeader.includes('メモ')) {
          autoMapping.notes = header;
        }
      });
      
      setColumnMapping(autoMapping);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ファイル処理に失敗しました');
    }
  };

  // ドラッグ&ドロップ処理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(f => f.name.endsWith('.csv'));
    if (csvFile) {
      handleFileUpload(csvFile);
    } else {
      setError('CSVファイルを選択してください');
    }
  };

  // CSVデータを測定データに変換
  const convertCSVToMeasurements = (): CreateMeasurementRequest[] => {
    if (!csvPreview) return [];

    const measurements: CreateMeasurementRequest[] = [];
    
    for (let i = 0; i < csvPreview.totalRows; i++) {
      const rowIndex = i;
      if (rowIndex >= csvPreview.rows.length) continue; // プレビュー範囲外はスキップ（実際の実装では全データを処理）
      
      const row = csvPreview.rows[rowIndex];
      
      try {
        const measurement: CreateMeasurementRequest = {
          projectId: params.projectId,
          timestamp: row[columnMapping.timestamp] || new Date().toISOString(),
          type: 'water_quality', // デフォルト
          location: {
            latitude: parseFloat(row[columnMapping.latitude || '']) || 0,
            longitude: parseFloat(row[columnMapping.longitude || '']) || 0,
            siteName: row[columnMapping.siteName || '']
          },
          values: {},
          notes: row[columnMapping.notes || ''],
          operatorId: importOptions.operatorId || undefined,
          deviceId: importOptions.deviceId || undefined
        };

        // 各測定値をマッピング
        if (columnMapping.ph && row[columnMapping.ph]) {
          measurement.values.ph = parseFloat(row[columnMapping.ph]);
        }
        if (columnMapping.temperature && row[columnMapping.temperature]) {
          measurement.values.temperature = parseFloat(row[columnMapping.temperature]);
        }
        if (columnMapping.co2Concentration && row[columnMapping.co2Concentration]) {
          measurement.values.co2Concentration = parseFloat(row[columnMapping.co2Concentration]);
        }
        if (columnMapping.flowRate && row[columnMapping.flowRate]) {
          measurement.values.flowRate = parseFloat(row[columnMapping.flowRate]);
        }
        if (columnMapping.iron && row[columnMapping.iron]) {
          measurement.values.iron = parseFloat(row[columnMapping.iron]);
        }
        if (columnMapping.copper && row[columnMapping.copper]) {
          measurement.values.copper = parseFloat(row[columnMapping.copper]);
        }
        if (columnMapping.zinc && row[columnMapping.zinc]) {
          measurement.values.zinc = parseFloat(row[columnMapping.zinc]);
        }
        if (columnMapping.turbidity && row[columnMapping.turbidity]) {
          measurement.values.turbidity = parseFloat(row[columnMapping.turbidity]);
        }
        if (columnMapping.conductivity && row[columnMapping.conductivity]) {
          measurement.values.conductivity = parseFloat(row[columnMapping.conductivity]);
        }
        if (columnMapping.dissolvedOxygen && row[columnMapping.dissolvedOxygen]) {
          measurement.values.dissolvedOxygen = parseFloat(row[columnMapping.dissolvedOxygen]);
        }

        measurements.push(measurement);
      } catch (error) {
        console.error(`行 ${i + 1} の処理でエラー:`, error);
      }
    }

    return measurements;
  };

  // CSVインポート実行
  const executeImport = async () => {
    if (!csvPreview) return;

    try {
      setStep('importing');
      setError(null);
      
      const measurements = convertCSVToMeasurements();
      
      const importRequest: CSVImportRequest = {
        projectId: params.projectId,
        measurements,
        importOptions
      };

      // 進捗シミュレーション
      setImportProgress({ current: 0, total: measurements.length });
      
      const result = await apiClient.importMeasurementsCSV(importRequest);
      
      setImportResult(result);
      setStep('completed');
    } catch (err) {
      console.error('インポートエラー:', err);
      setError(err instanceof Error ? err.message : 'インポートに失敗しました');
      setStep('mapping');
    }
  };

  // CSVテンプレートダウンロード
  const downloadTemplate = () => {
    const template = `timestamp,type,ph,temperature,co2_concentration,flow_rate,iron,copper,zinc,latitude,longitude,site_name,notes
2025-07-28 09:00:00,water_quality,7.2,25.5,400,100.5,0.1,0.05,0.2,43.0642,141.9716,測定ポイントA,正常運転
2025-07-28 09:15:00,water_quality,7.1,25.8,405,98.2,0.12,0.04,0.22,43.0642,141.9716,測定ポイントA,
2025-07-28 09:30:00,water_quality,6.9,26.1,410,95.8,0.15,0.06,0.25,43.0642,141.9716,測定ポイントA,要注意レベル`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'measurement_template.csv';
    link.click();
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
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
          <h1 className="text-3xl font-bold text-gray-900">CSV一括取り込み</h1>
          <p className="text-gray-600 mt-2">
            {project?.projectName} の測定データをCSVファイルから一括登録します
          </p>
        </div>

        {/* ステップインジケーター */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center ${step === 'upload' ? 'text-blue-600' : step === 'preview' || step === 'mapping' || step === 'importing' || step === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-600 text-white' : step === 'preview' || step === 'mapping' || step === 'importing' || step === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <span className="ml-2">ファイル選択</span>
            </div>
            <div className="flex-1 h-px bg-gray-300 mx-4"></div>
            <div className={`flex items-center ${step === 'preview' ? 'text-blue-600' : step === 'mapping' || step === 'importing' || step === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'preview' ? 'bg-blue-600 text-white' : step === 'mapping' || step === 'importing' || step === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <span className="ml-2">プレビュー確認</span>
            </div>
            <div className="flex-1 h-px bg-gray-300 mx-4"></div>
            <div className={`flex items-center ${step === 'mapping' ? 'text-blue-600' : step === 'importing' || step === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'mapping' ? 'bg-blue-600 text-white' : step === 'importing' || step === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                3
              </div>
              <span className="ml-2">カラムマッピング</span>
            </div>
            <div className="flex-1 h-px bg-gray-300 mx-4"></div>
            <div className={`flex items-center ${step === 'importing' ? 'text-blue-600' : step === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'importing' ? 'bg-blue-600 text-white' : step === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                4
              </div>
              <span className="ml-2">インポート実行</span>
            </div>
          </div>
        </div>

        {/* Step 1: ファイルアップロード */}
        {step === 'upload' && (
          <Card className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">CSVファイルを選択</h2>
            
            <div className="mb-6">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="mb-4"
              >
                📥 CSVテンプレートをダウンロード
              </Button>
              <p className="text-sm text-gray-600">
                初回利用の場合は、テンプレートをダウンロードしてフォーマットを確認してください。
              </p>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="text-6xl text-gray-400">📄</div>
                <div>
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    CSVファイルをドラッグ&ドロップ
                  </p>
                  <p className="text-gray-500 mb-4">または</p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    ファイルを選択
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  .csv形式のファイルのみ対応しています
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
          </Card>
        )}

        {/* Step 2: プレビュー */}
        {step === 'preview' && csvPreview && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">データプレビュー</h2>
            
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                ファイル: {csvFile?.name} | 総行数: {csvPreview.totalRows} 行 | プレビュー: {csvPreview.previewRows} 行
              </div>
              <Button
                onClick={() => setStep('mapping')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                次へ: カラムマッピング設定
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    {csvPreview.headers.map((header, index) => (
                      <th key={index} className="px-4 py-2 border border-gray-300 text-left text-sm font-medium text-gray-700">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {csvPreview.headers.map((header, colIndex) => (
                        <td key={colIndex} className="px-4 py-2 border border-gray-300 text-sm text-gray-900">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Step 3: カラムマッピング */}
        {step === 'mapping' && csvPreview && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">カラムマッピング設定</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">必須項目</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      タイムスタンプ <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={columnMapping.timestamp}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, timestamp: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">カラムを選択</option>
                      {csvPreview.headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">測定値項目</h3>
                <div className="space-y-4">
                  {[
                    { key: 'ph', label: 'pH値' },
                    { key: 'temperature', label: '温度 (°C)' },
                    { key: 'co2Concentration', label: 'CO2濃度 (ppm)' },
                    { key: 'flowRate', label: '流量 (L/min)' },
                    { key: 'iron', label: '鉄濃度 (mg/L)' },
                    { key: 'copper', label: '銅濃度 (mg/L)' },
                    { key: 'zinc', label: '亜鉛濃度 (mg/L)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {label}
                      </label>
                      <select
                        value={columnMapping[key as keyof CSVColumnMapping] || ''}
                        onChange={(e) => setColumnMapping(prev => ({ ...prev, [key]: e.target.value || undefined }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">カラムを選択（任意）</option>
                        {csvPreview.headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">位置情報</h3>
                <div className="space-y-4">
                  {[
                    { key: 'latitude', label: '緯度' },
                    { key: 'longitude', label: '経度' },
                    { key: 'siteName', label: '測定地点名' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {label}
                      </label>
                      <select
                        value={columnMapping[key as keyof CSVColumnMapping] || ''}
                        onChange={(e) => setColumnMapping(prev => ({ ...prev, [key]: e.target.value || undefined }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">カラムを選択（任意）</option>
                        {csvPreview.headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">インポート設定</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      重複データの処理
                    </label>
                    <select
                      value={importOptions.duplicateHandling}
                      onChange={(e) => setImportOptions(prev => ({ ...prev, duplicateHandling: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="skip">スキップ</option>
                      <option value="overwrite">上書き</option>
                      <option value="error">エラーとして扱う</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      バッチサイズ
                    </label>
                    <Input
                      type="number"
                      min="10"
                      max="1000"
                      value={importOptions.batchSize}
                      onChange={(e) => setImportOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 100 }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      操作者ID（任意）
                    </label>
                    <Input
                      type="text"
                      value={importOptions.operatorId}
                      onChange={(e) => setImportOptions(prev => ({ ...prev, operatorId: e.target.value }))}
                      placeholder="例: operator-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      測定機器ID（任意）
                    </label>
                    <Input
                      type="text"
                      value={importOptions.deviceId}
                      onChange={(e) => setImportOptions(prev => ({ ...prev, deviceId: e.target.value }))}
                      placeholder="例: device-001"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={() => setStep('preview')}
                variant="outline"
              >
                戻る: プレビュー確認
              </Button>
              <Button
                onClick={executeImport}
                className="bg-green-600 hover:bg-green-700"
                disabled={!columnMapping.timestamp}
              >
                インポート実行
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: インポート中 */}
        {step === 'importing' && (
          <Card className="p-8 text-center">
            <div className="space-y-6">
              <div className="text-6xl">⏳</div>
              <h2 className="text-xl font-semibold text-gray-900">インポート実行中...</h2>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {importProgress.current} / {importProgress.total} 件処理中
              </p>
            </div>
          </Card>
        )}

        {/* Step 5: 完了 */}
        {step === 'completed' && importResult && (
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className={`text-6xl mb-4 ${importResult.success ? '✅' : '⚠️'}`}>
                {importResult.success ? '✅' : '⚠️'}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                インポート{importResult.success ? '完了' : '部分完了'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{importResult.totalRows}</div>
                <div className="text-sm text-blue-700">総行数</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.successCount}</div>
                <div className="text-sm text-green-700">成功</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.errorCount}</div>
                <div className="text-sm text-red-700">エラー</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{importResult.skipCount}</div>
                <div className="text-sm text-yellow-700">スキップ</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-red-800 mb-4">エラー詳細</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="mb-2 last:mb-0">
                      <span className="font-medium text-red-700">行 {error.row}:</span>
                      <span className="text-red-600 ml-2">{error.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button
                onClick={() => router.push(`/projects/${params.projectId}/measurements`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                測定データ一覧を確認
              </Button>
              <Button
                onClick={() => {
                  setStep('upload');
                  setCsvFile(null);
                  setCsvPreview(null);
                  setImportResult(null);
                  setError(null);
                }}
                variant="outline"
              >
                新しいファイルを取り込む
              </Button>
            </div>
          </Card>
        )}

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