'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// SVGマップコンポーネント
const SiteMap = () => (
  <svg viewBox="0 0 800 600" className="w-full h-full">
    {/* 背景 */}
    <rect width="800" height="600" fill="#E5E7EB"/>
    
    {/* 等高線（簡易表現） */}
    <path d="M100,300 Q400,250 700,300" stroke="#D1D5DB" strokeWidth="2" fill="none"/>
    <path d="M150,350 Q400,300 650,350" stroke="#D1D5DB" strokeWidth="2" fill="none"/>
    <path d="M200,400 Q400,350 600,400" stroke="#D1D5DB" strokeWidth="2" fill="none"/>
    
    {/* 精進川の流れ */}
    <path 
      d="M300,150 Q350,200 400,250 Q450,300 500,350 Q550,400 600,450" 
      stroke="#60A5FA" 
      strokeWidth="8"
      fill="none"
    />
    
    {/* 散布エリア */}
    <path 
      d="M350,200 Q400,180 450,200 Q500,220 450,300 Q400,320 350,300 Q300,280 350,200" 
      fill="#34D399" 
      fillOpacity="0.2" 
      stroke="#34D399"
      strokeWidth="2"
    />
    
    {/* 処理施設 */}
    <rect x="380" y="240" width="40" height="30" fill="#3B82F6"/>
    
    {/* 測定地点 */}
    <circle cx="350" cy="200" r="8" fill="#22C55E"/> {/* 地点1: 坑口 */}
    <circle cx="380" cy="250" r="8" fill="#F59E0B"/> {/* 地点2: 処理施設入口 */}
    <circle cx="420" cy="260" r="8" fill="#22C55E"/> {/* 地点3: 処理施設出口 */}
    
    {/* 地名ラベル */}
    <text x="400" y="50" textAnchor="middle" fontSize="20" fill="#374151">精進川鉱山エリア</text>
    
    {/* コンパス */}
    <g transform="translate(700, 50)">
      <circle cx="0" cy="0" r="20" fill="white" stroke="#D1D5DB"/>
      <text x="0" y="-5" textAnchor="middle" fontSize="12">N</text>
      <text x="5" y="0" textAnchor="start" fontSize="12">E</text>
      <text x="0" y="10" textAnchor="middle" fontSize="12">S</text>
      <text x="-5" y="0" textAnchor="end" fontSize="12">W</text>
    </g>
    
    {/* スケール */}
    <g transform="translate(50, 550)">
      <line x1="0" y1="0" x2="100" y2="0" stroke="black" strokeWidth="2"/>
      <text x="50" y="20" textAnchor="middle" fontSize="12">100m</text>
    </g>
  </svg>
);

const MockMonitoringDashboard: React.FC = () => {
  const [selectedPoint, setSelectedPoint] = useState('point1');

  // pH値トレンドデータ
  const phTrendData = [
    { time: '10:30', value: 2.8 },
    { time: '11:30', value: 2.9 },
    { time: '12:30', value: 3.1 },
    { time: '13:30', value: 3.2 },
    { time: '14:30', value: 3.0 },
    { time: '15:30', value: 3.2 },
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">観測地点マップ</h1>
          <p className="text-sm text-gray-500">風化促進事業 モニタリングダッシュボード</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50">
            データ更新
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            CSV出力
          </button>
        </div>
      </div>

      {/* アラート */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
        <div className="flex items-center text-amber-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          地点2（処理施設入口）でpH値が基準値を超過しています。
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 地図エリア */}
        <div className="col-span-8">
          <div className="bg-white p-6 rounded-lg shadow">
            {/* 地図表示 */}
            <div className="aspect-[4/3] bg-gray-100 rounded-lg relative mb-4">
              <SiteMap />
              
              {/* マップコントロール */}
              <div className="absolute top-2 right-2 bg-white rounded shadow-lg p-2">
                <div className="space-y-2">
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">+</button>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">-</button>
                </div>
              </div>

              {/* 凡例 */}
              <div className="absolute bottom-2 left-2 bg-white/90 rounded p-2 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>正常</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span>注意</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>異常</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 観測地点一覧 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium">地点1: 坑口</h4>
                <p className="text-xs text-gray-500 mb-2">42.0519° N, 140.8147° E</p>
                <div className="space-y-1 text-sm">
                  <p>pH: 2.8</p>
                  <p>流量: 1,200 m³/日</p>
                  <p>温度: 15.2℃</p>
                </div>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-medium">地点2: 処理施設入口</h4>
                <p className="text-xs text-gray-500 mb-2">42.0521° N, 140.8150° E</p>
                <div className="space-y-1 text-sm">
                  <p>pH: 3.2</p>
                  <p>流量: 1,150 m³/日</p>
                  <p>温度: 15.5℃</p>
                </div>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium">地点3: 処理施設出口</h4>
                <p className="text-xs text-gray-500 mb-2">42.0523° N, 140.8152° E</p>
                <div className="space-y-1 text-sm">
                  <p>pH: 2.9</p>
                  <p>流量: 1,100 m³/日</p>
                  <p>温度: 15.0℃</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 詳細データ */}
        <div className="col-span-4 space-y-6">
          {/* 地点情報 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">地点2: 処理施設入口</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">最終更新</p>
                <p className="font-semibold">2024/01/11 15:30</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ステータス</p>
                <div className="flex items-center gap-2 text-amber-600">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <p className="font-semibold">注意</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">設置センサー</p>
                <p className="font-semibold">pH, 流量, 温度</p>
              </div>
            </div>
          </div>

          {/* トレンドグラフ */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">pH値トレンド</h3>
              <select className="p-1 border rounded">
                <option>24時間</option>
                <option>1週間</option>
                <option>1ヶ月</option>
              </select>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={phTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" name="pH値" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 統計情報 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">統計情報</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">平均pH値</span>
                <span className="font-semibold">3.02</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">最大pH値</span>
                <span className="font-semibold">3.2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">最小pH値</span>
                <span className="font-semibold">2.8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">標準偏差</span>
                <span className="font-semibold">0.14</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockMonitoringDashboard; 