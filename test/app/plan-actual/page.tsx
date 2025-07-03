'use client';

import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectItem } from '@/components/ui/select';

// アイコンコンポーネント（一時的にSVGで代替）
const AlertCircleIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7,10 12,15 17,10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const FilterIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3"></polygon>
  </svg>
);

// データ型定義
interface PlanActualData {
  month: string;
  plan: number;
  actual: number;
}

export default function PlanActualPage() {
  // 表示期間の選択状態
  const [period, setPeriod] = useState('monthly');

  // サンプルデータ - 後でAPIから取得するように変更
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
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">計画/実績検証</h1>
            <p className="text-sm text-gray-500">事業計画の達成状況を分析</p>
          </div>
          <div className="flex gap-3">
            <Select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-40"
            >
              <SelectItem value="monthly">月次表示</SelectItem>
              <SelectItem value="quarterly">四半期表示</SelectItem>
              <SelectItem value="yearly">年次表示</SelectItem>
            </Select>
            <Button variant="outline" className="flex items-center gap-2">
              <FilterIcon />
              フィルター
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <DownloadIcon />
              レポート出力
            </Button>
          </div>
        </div>

        {/* アラート */}
        <Alert className="mb-6 bg-amber-50">
          <AlertCircleIcon />
          <AlertDescription className="text-amber-600">
            CO2固定量が計画を下回っています。散布量の調整を検討してください。
          </AlertDescription>
        </Alert>

        {/* KPIカード */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
            <h4 className="text-sm font-medium text-gray-500">CO2固定量 達成率</h4>
            <p className="text-3xl font-bold text-indigo-600 mt-2">85%</p>
            <p className="text-sm text-gray-500 mt-1">計画: 150 t-CO2 / 実績: 127.5 t-CO2</p>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50">
            <h4 className="text-sm font-medium text-gray-500">散布量 達成率</h4>
            <p className="text-3xl font-bold text-emerald-600 mt-2">92%</p>
            <p className="text-sm text-gray-500 mt-1">計画: 1,000 t / 実績: 920 t</p>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-fuchsia-50">
            <h4 className="text-sm font-medium text-gray-500">固定効率</h4>
            <p className="text-3xl font-bold text-fuchsia-600 mt-2">0.139</p>
            <p className="text-sm text-gray-500 mt-1">計画比: -8%</p>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50">
            <h4 className="text-sm font-medium text-gray-500">事業コスト</h4>
            <p className="text-3xl font-bold text-red-600 mt-2">95%</p>
            <p className="text-sm text-gray-500 mt-1">予算内で進行中</p>
          </Card>
        </div>

        {/* グラフエリア */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* CO2固定量の推移 */}
          <Card className="p-6">
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
          </Card>

          {/* 散布量の推移 */}
          <Card className="p-6">
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
          </Card>
        </div>

        {/* 詳細データテーブル */}
        <Card className="p-6">
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
                {co2FixationData.slice(-3).map((data, index) => (
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
        </Card>

        {/* ナビゲーション */}
        <div className="mt-8 flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            ← メインメニューに戻る
          </Button>
        </div>
      </div>
    </div>
  );
} 