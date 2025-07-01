'use client';

import { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface MetricCard {
  title: string;
  value: string;
  unit: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

export default function MonitoringDashboard() {
  const [refreshTime, setRefreshTime] = useState(new Date());
  const [isLive, setIsLive] = useState(true);

  // 自動更新機能
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setRefreshTime(new Date());
    }, 30000); // 30秒ごとに更新

    return () => clearInterval(interval);
  }, [isLive]);

  // サンプルデータ
  const metrics: MetricCard[] = [
    {
      title: 'CO2吸収量',
      value: '1,247',
      unit: 'kg/日',
      change: 5.2,
      color: 'text-green-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-2a2 2 0 012-2h2a2 2 0 012 2v2m0 0V14m0-2.5h4l2 5.5H9l2-5.5z" />
        </svg>
      )
    },
    {
      title: 'pH値',
      value: '7.2',
      unit: '',
      change: -0.8,
      color: 'text-blue-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    },
    {
      title: '流量',
      value: '89.3',
      unit: 'L/min',
      change: 2.1,
      color: 'text-cyan-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: '温度',
      value: '24.5',
      unit: '°C',
      change: 1.3,
      color: 'text-orange-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  // CO2吸収量のトレンドデータ
  const co2TrendData = {
    labels: ['6:00', '9:00', '12:00', '15:00', '18:00', '21:00'],
    datasets: [
      {
        label: 'CO2吸収量 (kg/h)',
        data: [45, 52, 48, 61, 55, 67],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // pH値の変化データ
  const phTrendData = {
    labels: ['6:00', '9:00', '12:00', '15:00', '18:00', '21:00'],
    datasets: [
      {
        label: 'pH値',
        data: [7.1, 7.3, 7.2, 7.4, 7.1, 7.2],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // 処理効率データ
  const efficiencyData = {
    labels: ['CO2除去', '重金属除去', 'pH調整'],
    datasets: [
      {
        data: [89, 94, 87],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(249, 115, 22, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(249, 115, 22)',
        ],
        borderWidth: 2,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">リアルタイムモニタリング</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isLive ? 'ライブ' : '停止中'}
            </span>
          </div>
          <button
            onClick={() => setIsLive(!isLive)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isLive ? '停止' : '開始'}
          </button>
          <div className="text-sm text-gray-500">
            最終更新: {refreshTime.toLocaleTimeString('ja-JP')}
          </div>
        </div>
      </div>

      {/* メトリクスカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <div className="flex items-baseline space-x-1">
                  <p className="text-2xl font-semibold text-gray-900">
                    {metric.value}
                  </p>
                  <p className="text-sm text-gray-500">{metric.unit}</p>
                </div>
                <div className="flex items-center mt-1">
                  <span className={`text-sm font-medium ${
                    metric.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">前時間比</span>
                </div>
              </div>
              <div className={`${metric.color}`}>
                {metric.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* チャート */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CO2吸収量トレンド</h3>
          <div className="h-64">
            <Line data={co2TrendData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">pH値変化</h3>
          <div className="h-64">
            <Line data={phTrendData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">処理効率</h3>
          <div className="h-64">
            <Doughnut 
              data={efficiencyData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }} 
            />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">アラート・通知</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-yellow-800">注意</p>
                <p className="text-sm text-yellow-700">pH値が目標範囲を下回っています</p>
              </div>
              <div className="text-xs text-yellow-600 ml-auto">2分前</div>
            </div>
            
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-green-800">正常</p>
                <p className="text-sm text-green-700">CO2吸収量が目標値を達成しました</p>
              </div>
              <div className="text-xs text-green-600 ml-auto">5分前</div>
            </div>
            
            <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-blue-800">情報</p>
                <p className="text-sm text-blue-700">定期メンテナンスが予定されています</p>
              </div>
              <div className="text-xs text-blue-600 ml-auto">10分前</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}