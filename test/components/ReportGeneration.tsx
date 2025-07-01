'use client';

import { useState } from 'react';

interface Report {
  id: string;
  name: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  status: 'generating' | 'completed' | 'failed';
  createdAt: string;
  size: string;
  downloadUrl?: string;
}

const sampleReports: Report[] = [
  {
    id: '1',
    name: '2024年6月 月次レポート',
    type: 'monthly',
    status: 'completed',
    createdAt: '2024-07-01T09:00:00Z',
    size: '2.1 MB',
    downloadUrl: '#',
  },
  {
    id: '2',
    name: '2024年Q2 四半期レポート',
    type: 'quarterly',
    status: 'completed',
    createdAt: '2024-07-01T08:30:00Z',
    size: '5.8 MB',
    downloadUrl: '#',
  },
  {
    id: '3',
    name: 'カスタムレポート - プロジェクトA分析',
    type: 'custom',
    status: 'generating',
    createdAt: '2024-07-01T10:15:00Z',
    size: '生成中...',
  },
];

const reportTypes = [
  {
    id: 'monthly',
    name: '月次レポート',
    description: 'CO2除去量、pH値、流量等の月次実績レポート',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'quarterly',
    name: '四半期レポート',
    description: '四半期の実績サマリーと前年同期比較',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'annual',
    name: '年次レポート',
    description: '年間総括レポートと次年度計画',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: 'custom',
    name: 'カスタムレポート',
    description: '任意の期間・項目を指定したカスタムレポート',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
      </svg>
    ),
  },
];

const statusConfig = {
  generating: { label: '生成中', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: '完了', color: 'bg-green-100 text-green-800' },
  failed: { label: '失敗', color: 'bg-red-100 text-red-800' },
};

export default function ReportGeneration() {
  const [reports] = useState<Report[]>(sampleReports);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const handleGenerateReport = (type: string) => {
    setSelectedReportType(type);
    setShowGenerateModal(true);
  };

  const ReportCard = ({ report }: { report: Report }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[report.status].color}`}>
          {statusConfig[report.status].label}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>作成日時:</span>
          <span>{formatDate(report.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>ファイルサイズ:</span>
          <span>{report.size}</span>
        </div>
      </div>
      
      <div className="mt-4 flex space-x-2">
        {report.status === 'completed' && (
          <>
            <button className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-4-4m4 4l4-4m1 4h3a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2h6" />
              </svg>
              <span>ダウンロード</span>
            </button>
            <button className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </>
        )}
        {report.status === 'generating' && (
          <div className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-500 rounded-md flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            生成中...
          </div>
        )}
        {report.status === 'failed' && (
          <button className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
            再生成
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">レポート生成</h2>
        <button 
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>新規レポート生成</span>
        </button>
      </div>

      {/* レポートタイプ選択 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportTypes.map((type) => (
          <div 
            key={type.id}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleGenerateReport(type.id)}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="text-blue-600">
                {type.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{type.name}</h3>
            </div>
            <p className="text-sm text-gray-600">{type.description}</p>
            <div className="mt-4">
              <button className="w-full px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors">
                生成する
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 生成済みレポート一覧 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">生成済みレポート</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      </div>

      {/* レポート生成モーダル */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  レポート生成設定
                </h3>
                <button 
                  onClick={() => setShowGenerateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    レポートタイプ
                  </label>
                  <select 
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {reportTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    対象期間
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue="2024-06-01"
                    />
                    <input
                      type="date"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue="2024-06-30"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    含める項目
                  </label>
                  <div className="space-y-2">
                    {['CO2除去量', 'pH値変化', '流量データ', '温度データ', '効率分析', '計画対比'].map((item) => (
                      <label key={item} className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          defaultChecked
                        />
                        <span className="ml-2 text-sm text-gray-700">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    出力形式
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button 
                  onClick={() => {
                    setShowGenerateModal(false);
                    // ここでレポート生成処理を実行
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  生成開始
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}