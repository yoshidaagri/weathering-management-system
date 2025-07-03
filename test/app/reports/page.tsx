'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// SVGアイコンコンポーネント
const FileText = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Download = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Eye = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const Calendar = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const Shield = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const Globe = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

type ReportType = 'MRV' | 'ENVIRONMENTAL';

interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  sections: string[];
  lastUpdated: string;
  version: string;
}

interface GeneratedReport {
  id: string;
  name: string;
  type: ReportType;
  project: string;
  generatedAt: string;
  period: string;
  status: 'generated' | 'submitted' | 'approved';
  fileSize: string;
}

export default function ReportsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [reportPeriod, setReportPeriod] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const templates: ReportTemplate[] = [
    {
      id: '1',
      name: 'MRV報告書（年次）',
      type: 'MRV',
      description: '認証機関向けの測定・報告・検証レポート。年次のCO2固定量実績を詳細に報告。',
      sections: [
        '1. プロジェクト概要',
        '2. 測定方法・設備',
        '3. CO2固定量実績',
        '4. 品質管理・検証',
        '5. データベース記録',
        '6. 第三者検証結果'
      ],
      lastUpdated: '2024-01-15',
      version: 'v2.1'
    },
    {
      id: '2',
      name: 'MRV報告書（四半期）',
      type: 'MRV',
      description: '四半期ごとの進捗報告用MRV報告書。短期間の実績とトレンド分析を含む。',
      sections: [
        '1. 四半期概要',
        '2. 実績サマリー',
        '3. 測定データ分析',
        '4. 課題・改善点',
        '5. 次期予測'
      ],
      lastUpdated: '2024-01-10',
      version: 'v1.3'
    },
    {
      id: '3',
      name: '環境影響評価報告書',
      type: 'ENVIRONMENTAL',
      description: '行政機関向けの環境報告書。重金属濃度・水質監視結果を中心とした環境影響評価。',
      sections: [
        '1. 環境監視概要',
        '2. 水質測定結果',
        '3. 重金属濃度分析',
        '4. 生態系への影響',
        '5. 法規制遵守状況',
        '6. 改善措置'
      ],
      lastUpdated: '2024-01-12',
      version: 'v3.0'
    },
    {
      id: '4',
      name: '月次環境モニタリング報告書',
      type: 'ENVIRONMENTAL',
      description: '月次の環境監視データをまとめた簡易レポート。pH・流量・温度の日常監視結果。',
      sections: [
        '1. 月次サマリー',
        '2. 日常測定データ',
        '3. 異常値分析',
        '4. 対応措置',
        '5. 翌月計画'
      ],
      lastUpdated: '2024-01-08',
      version: 'v1.1'
    }
  ];

  const generatedReports: GeneratedReport[] = [
    {
      id: '1',
      name: 'MRV報告書（年次）- 山田鉱山プロジェクト',
      type: 'MRV',
      project: '山田鉱山風化促進プロジェクト',
      generatedAt: '2024-01-20T15:30:00',
      period: '2023年度',
      status: 'approved',
      fileSize: '2.4MB'
    },
    {
      id: '2',
      name: '環境影響評価報告書 - 佐藤鉱業プロジェクト',
      type: 'ENVIRONMENTAL',
      project: '佐藤鉱業CO2固定実証事業',
      generatedAt: '2024-01-18T10:15:00',
      period: '2024年Q1',
      status: 'submitted',
      fileSize: '1.8MB'
    },
    {
      id: '3',
      name: '月次環境モニタリング - 高橋金属パイロット',
      type: 'ENVIRONMENTAL',
      project: '高橋金属風化促進パイロット',
      generatedAt: '2024-01-15T09:00:00',
      period: '2024年1月',
      status: 'generated',
      fileSize: '856KB'
    }
  ];

  const projects = [
    '山田鉱山風化促進プロジェクト',
    '佐藤鉱業CO2固定実証事業',
    '高橋金属風化促進パイロット'
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'bg-blue-100 text-blue-800';
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'generated': return '生成済み';
      case 'submitted': return '提出済み';
      case 'approved': return '承認済み';
      default: return '不明';
    }
  };

  const handleGenerateReport = () => {
    if (!selectedTemplate || !selectedProject || !reportPeriod) {
      alert('テンプレート、プロジェクト、期間を選択してください。');
      return;
    }

    // 実際のPDF生成処理（mock）
    const newReport: GeneratedReport = {
      id: Date.now().toString(),
      name: `${selectedTemplate.name} - ${selectedProject}`,
      type: selectedTemplate.type,
      project: selectedProject,
      generatedAt: new Date().toISOString(),
      period: reportPeriod,
      status: 'generated',
      fileSize: '1.2MB'
    };

    alert(`レポートが生成されました: ${newReport.name}`);
    setShowPreview(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            レポート生成
          </h1>
          <p className="text-gray-600">
            MRV報告書・環境報告書を自動生成し、認証機関・行政機関への提出を支援します
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* レポートテンプレート選択 */}
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-purple-600" />
                  レポートテンプレート
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{template.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          template.type === 'MRV' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {template.type === 'MRV' ? (
                            <span className="flex items-center">
                              <Shield className="h-3 w-3 mr-1" />
                              MRV
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <Globe className="h-3 w-3 mr-1" />
                              環境
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      <div className="text-xs text-gray-500">
                        <p>更新: {new Date(template.lastUpdated).toLocaleDateString('ja-JP')}</p>
                        <p>バージョン: {template.version}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 生成済みレポート履歴 */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">生成済みレポート</h3>
                <div className="space-y-3">
                  {generatedReports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>期間: {report.period}</span>
                          <span>生成: {new Date(report.generatedAt).toLocaleDateString('ja-JP')}</span>
                          <span>サイズ: {report.fileSize}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                          {getStatusText(report.status)}
                        </span>
                        <Button className="p-2 text-gray-400 hover:text-gray-600">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* レポート生成パネル */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">レポート生成設定</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      プロジェクト選択 *
                    </label>
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">プロジェクトを選択...</option>
                      {projects.map((project) => (
                        <option key={project} value={project}>
                          {project}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      対象期間 *
                    </label>
                    <input
                      type="text"
                      value={reportPeriod}
                      onChange={(e) => setReportPeriod(e.target.value)}
                      placeholder="例: 2024年度、2024年Q1、2024年1月"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {selectedTemplate && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">選択されたテンプレート</h4>
                      <p className="text-sm text-purple-800 mb-3">{selectedTemplate.name}</p>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-purple-700">含まれるセクション:</p>
                        {selectedTemplate.sections.map((section, index) => (
                          <p key={index} className="text-xs text-purple-600">• {section}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowPreview(true)}
                      disabled={!selectedTemplate || !selectedProject || !reportPeriod}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      プレビュー
                    </Button>
                  </div>

                  <Button
                    onClick={handleGenerateReport}
                    disabled={!selectedTemplate || !selectedProject || !reportPeriod}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF生成
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 統計情報 */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">生成統計</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">今月生成数</span>
                    <span className="font-semibold">8件</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">MRV報告書</span>
                    <span className="font-semibold">3件</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">環境報告書</span>
                    <span className="font-semibold">5件</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600">平均生成時間</span>
                    <span className="font-semibold">3.2分</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* プレビューモーダル */}
        {showPreview && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">レポートプレビュー</h3>
                  <Button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </Button>
                </div>

                <div className="border border-gray-300 rounded-lg p-6 bg-white">
                  <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedTemplate.name}
                    </h1>
                    <p className="text-gray-600">
                      プロジェクト: {selectedProject}
                    </p>
                    <p className="text-gray-600">
                      対象期間: {reportPeriod}
                    </p>
                    <p className="text-gray-600">
                      生成日: {new Date().toLocaleDateString('ja-JP')}
                    </p>
                  </div>

                  <div className="space-y-6">
                    {selectedTemplate.sections.map((section, index) => (
                      <div key={index} className="border-l-4 border-purple-500 pl-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{section}</h3>
                        <div className="text-sm text-gray-600 space-y-2">
                          <p>[このセクションには実際のデータと分析結果が表示されます]</p>
                          <p className="bg-gray-100 p-2 rounded">
                            例: CO2固定量実績、測定データ分析、品質管理結果など
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex gap-2 justify-end">
                  <Button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    閉じる
                  </Button>
                  <Button
                    onClick={handleGenerateReport}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                  >
                    この内容でPDF生成
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 