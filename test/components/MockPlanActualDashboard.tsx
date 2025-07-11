'use client';

import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// データ型定義
interface PlanActualData {
  month: string;
  plan: number;
  actual: number;
}

const MockPlanActualDashboard: React.FC = () => {
  // 表示期間の選択状態
  const [period, setPeriod] = useState('monthly');

  // サンプルデータ
  const co2FixationData: PlanActualData[] = [
    { month: '4月', plan: 20, actual: 18 },
    { month: '5月', plan: 40, actual: 35 },
    { month: '6月', plan: 60, actual: 52 },
    { month: '7月', plan: 80, actual: 75 },
    { month: '8月', plan: 100, actual: 90 },
    { month: '9月', plan: 120, actual: 105 }
  ];

  const spreadingData: PlanActualData[] = [
    { month: '4月', plan: 150, actual: 140 },
    { month: '5月', plan: 150, actual: 145 },
    { month: '6月', plan: 150, actual: 148 },
    { month: '7月', plan: 150, actual: 152 },
    { month: '8月', plan: 150, actual: 145 },
    { month: '9月', plan: 150, actual: 140 }
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">計画/実績検証</h1>
          <p className="text-sm text-gray-500">事業計画の達成状況を分析</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white"
          >
            <option value="monthly">月次表示</option>
            <option value="quarterly">四半期表示</option>
            <option value="yearly">年次表示</option>
          </select>
          <button className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            フィルター
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            レポート出力
          </button>
        </div>
      </div>

      {/* アラート */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
        <div className="flex items-center text-amber-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          CO2固定量が計画を下回っています。散布量の調整を検討してください。
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow bg-gradient-to-br from-blue-50 to-indigo-50">
          <h4 className="text-sm font-medium text-gray-500">CO2固定量 達成率</h4>
          <p className="text-3xl font-bold text-indigo-600 mt-2">85%</p>
          <p className="text-sm text-gray-500 mt-1">計画: 150 t-CO2 / 実績: 127.5 t-CO2</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow bg-gradient-to-br from-green-50 to-emerald-50">
          <h4 className="text-sm font-medium text-gray-500">散布量 達成率</h4>
          <p className="text-3xl font-bold text-emerald-600 mt-2">92%</p>
          <p className="text-sm text-gray-500 mt-1">計画: 1,000 t / 実績: 920 t</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow bg-gradient-to-br from-purple-50 to-fuchsia-50">
          <h4 className="text-sm font-medium text-gray-500">固定効率</h4>
          <p className="text-3xl font-bold text-fuchsia-600 mt-2">0.139</p>
          <p className="text-sm text-gray-500 mt-1">計画比: -8%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow bg-gradient-to-br from-orange-50 to-red-50">
          <h4 className="text-sm font-medium text-gray-500">事業コスト</h4>
          <p className="text-3xl font-bold text-red-600 mt-2">95%</p>
          <p className="text-sm text-gray-500 mt-1">予算内で進行中</p>
        </div>
      </div>

      {/* グラフエリア */}
      <div className="grid grid-cols-2 gap-6">
        {/* CO2固定量の推移 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">CO2固定量の推移</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={co2FixationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="plan" stroke="#6366f1" name="計画" strokeWidth={2} />
                <Line type="monotone" dataKey="actual" stroke="#22c55e" name="実績" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 散布量の推移 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">散布量の推移</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spreadingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="plan" fill="#6366f1" name="計画" />
                <Bar dataKey="actual" fill="#22c55e" name="実績" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 詳細データテーブル */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">月次詳細データ</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">月</th>
                <th className="text-right py-2">CO2固定量<br/>計画(t)</th>
                <th className="text-right py-2">CO2固定量<br/>実績(t)</th>
                <th className="text-right py-2">達成率</th>
                <th className="text-right py-2">散布量<br/>計画(t)</th>
                <th className="text-right py-2">散布量<br/>実績(t)</th>
                <th className="text-right py-2">固定効率</th>
                <th className="text-left py-2">状態</th>
              </tr>
            </thead>
            <tbody>
              {co2FixationData.slice().reverse().slice(0, 3).map((data, index) => (
                <tr key={data.month} className="border-b">
                  <td className="py-2">{data.month}</td>
                  <td className="text-right py-2">{data.plan}</td>
                  <td className="text-right py-2">{data.actual}</td>
                  <td className="text-right py-2">
                    {((data.actual / data.plan) * 100).toFixed(1)}%
                  </td>
                  <td className="text-right py-2">150</td>
                  <td className="text-right py-2">145</td>
                  <td className="text-right py-2">0.142</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      (data.actual / data.plan) >= 0.9 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {(data.actual / data.plan) >= 0.9 ? '正常' : '注意'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MockPlanActualDashboard; 