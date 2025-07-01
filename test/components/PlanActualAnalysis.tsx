'use client';

import { useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';

interface AnalysisData {
  period: string;
  planned: number;
  actual: number;
  variance: number;
  efficiency: number;
}

const sampleData: AnalysisData[] = [
  { period: '1月', planned: 4000, actual: 4200, variance: 5.0, efficiency: 105 },
  { period: '2月', planned: 4200, actual: 3800, variance: -9.5, efficiency: 90 },
  { period: '3月', planned: 4500, actual: 4600, variance: 2.2, efficiency: 102 },
  { period: '4月', planned: 4300, actual: 4150, variance: -3.5, efficiency: 97 },
  { period: '5月', planned: 4800, actual: 5100, variance: 6.3, efficiency: 106 },
  { period: '6月', planned: 5000, actual: 4950, variance: -1.0, efficiency: 99 },
];

export default function PlanActualAnalysis() {
  const [selectedPeriod, setSelectedPeriod] = useState('6ヶ月');
  const [selectedMetric, setSelectedMetric] = useState('co2');

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ja-JP').format(num);
  };

  // CO2除去量の計画vs実績
  const planActualData = {
    labels: sampleData.map(d => d.period),
    datasets: [
      {
        label: '計画値 (kg)',
        data: sampleData.map(d => d.planned),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: '実績値 (kg)',
        data: sampleData.map(d => d.actual),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // 効率性分析
  const efficiencyData = {
    labels: sampleData.map(d => d.period),
    datasets: [
      {
        label: '達成率 (%)',
        data: sampleData.map(d => d.efficiency),
        backgroundColor: sampleData.map(d => 
          d.efficiency >= 100 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: sampleData.map(d => 
          d.efficiency >= 100 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const totalPlanned = sampleData.reduce((sum, d) => sum + d.planned, 0);
  const totalActual = sampleData.reduce((sum, d) => sum + d.actual, 0);
  const overallVariance = ((totalActual - totalPlanned) / totalPlanned) * 100;
  const averageEfficiency = sampleData.reduce((sum, d) => sum + d.efficiency, 0) / sampleData.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">計画/実績分析</h2>
        <div className="flex space-x-4">
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="3ヶ月">過去3ヶ月</option>
            <option value="6ヶ月">過去6ヶ月</option>
            <option value="12ヶ月">過去12ヶ月</option>
          </select>
          <select 
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="co2">CO2除去量</option>
            <option value="ph">pH調整</option>
            <option value="flow">流量</option>
          </select>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">計画値合計</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(totalPlanned)}</p>
              <p className="text-xs text-gray-500">kg</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">実績値合計</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(totalActual)}</p>
              <p className="text-xs text-gray-500">kg</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
              overallVariance >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <svg className={`w-4 h-4 ${
                overallVariance >= 0 ? 'text-green-600' : 'text-red-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {overallVariance >= 0 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                )}
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">差異</p>
              <p className={`text-2xl font-semibold ${
                overallVariance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {overallVariance >= 0 ? '+' : ''}{overallVariance.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">平均達成率</p>
              <p className="text-2xl font-semibold text-gray-900">{averageEfficiency.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* チャート */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">計画vs実績推移</h3>
          <div className="h-80">
            <Line data={planActualData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">月別達成率</h3>
          <div className="h-80">
            <Bar data={efficiencyData} options={{
              ...chartOptions,
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 120,
                },
              },
            }} />
          </div>
        </div>
      </div>

      {/* 詳細テーブル */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">月別詳細分析</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    期間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    計画値 (kg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    実績値 (kg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    差異 (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    達成率 (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    評価
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sampleData.map((data, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {data.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(data.planned)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(data.actual)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      data.variance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {data.variance >= 0 ? '+' : ''}{data.variance}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {data.efficiency}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        data.efficiency >= 100 
                          ? 'bg-green-100 text-green-800' 
                          : data.efficiency >= 95 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {data.efficiency >= 100 ? '優秀' : data.efficiency >= 95 ? '良好' : '要改善'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 改善提案 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">改善提案</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">計画精度の向上</h4>
              <p className="text-sm text-gray-600 mt-1">
                過去のデータを活用して、より正確な月別計画値を設定することで、実行可能性を高められます。
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">好調期の要因分析</h4>
              <p className="text-sm text-gray-600 mt-1">
                5月のような高い達成率を示した期間の運用方法を分析し、他の期間でも同様の結果を目指しましょう。
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">低達成率期間の対策</h4>
              <p className="text-sm text-gray-600 mt-1">
                2月、4月のような低達成率の期間では、機器メンテナンスや運用プロセスの見直しが必要です。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}