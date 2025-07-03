'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// SVGアイコンコンポーネント
const Database = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const Plus = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const Search = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const Download = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const AlertTriangle = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

interface MeasurementData {
  id: string;
  timestamp: string;
  location: string;
  pH: number;
  temperature: number; // ℃
  flowRate: number; // m³/day
  co2Concentration: number; // ppm
  metalConcentration: {
    iron: number; // mg/L
    copper: number; // mg/L
    zinc: number; // mg/L
  };
  spreadingAmount: number; // ton/month
  notes?: string;
}

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<MeasurementData[]>([
    {
      id: '1',
      timestamp: '2024-01-15T10:30:00',
      location: '測定地点A',
      pH: 7.2,
      temperature: 15.5,
      flowRate: 1200,
      co2Concentration: 380,
      metalConcentration: { iron: 2.1, copper: 0.8, zinc: 1.2 },
      spreadingAmount: 95,
      notes: '正常範囲内'
    },
    {
      id: '2',
      timestamp: '2024-01-15T14:15:00',
      location: '測定地点B',
      pH: 6.8,
      temperature: 16.2,
      flowRate: 1150,
      co2Concentration: 420,
      metalConcentration: { iron: 3.2, copper: 1.1, zinc: 1.8 },
      spreadingAmount: 102,
      notes: 'CO2濃度やや高め'
    },
    {
      id: '3',
      timestamp: '2024-01-16T09:45:00',
      location: '測定地点C',
      pH: 7.8,
      temperature: 14.8,
      flowRate: 1320,
      co2Concentration: 350,
      metalConcentration: { iron: 1.8, copper: 0.6, zinc: 0.9 },
      spreadingAmount: 88,
      notes: '良好な状態'
    }
  ]);

  const [newMeasurement, setNewMeasurement] = useState<Partial<MeasurementData>>({
    location: '',
    pH: 7.0,
    temperature: 15.0,
    flowRate: 1000,
    co2Concentration: 400,
    metalConcentration: { iron: 2.0, copper: 1.0, zinc: 1.0 },
    spreadingAmount: 100,
    notes: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleAddMeasurement = () => {
    if (!newMeasurement.location) return;

    const measurement: MeasurementData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      location: newMeasurement.location,
      pH: newMeasurement.pH || 7.0,
      temperature: newMeasurement.temperature || 15.0,
      flowRate: newMeasurement.flowRate || 1000,
      co2Concentration: newMeasurement.co2Concentration || 400,
      metalConcentration: newMeasurement.metalConcentration || { iron: 2.0, copper: 1.0, zinc: 1.0 },
      spreadingAmount: newMeasurement.spreadingAmount || 100,
      notes: newMeasurement.notes || ''
    };

    setMeasurements(prev => [measurement, ...prev]);
    setNewMeasurement({
      location: '',
      pH: 7.0,
      temperature: 15.0,
      flowRate: 1000,
      co2Concentration: 400,
      metalConcentration: { iron: 2.0, copper: 1.0, zinc: 1.0 },
      spreadingAmount: 100,
      notes: ''
    });
    setShowForm(false);
  };

  const filteredMeasurements = measurements.filter(m =>
    m.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (pH: number, temperature: number) => {
    if (pH < 6.0 || pH > 8.0 || temperature < 5 || temperature > 25) {
      return 'text-red-600 bg-red-100';
    } else if (pH < 6.5 || pH > 7.5 || temperature < 10 || temperature > 20) {
      return 'text-yellow-600 bg-yellow-100';
    }
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            測定データ管理
          </h1>
          <p className="text-gray-600">
            pH、温度、流量、CO2濃度、重金属濃度などの測定データを入力・管理します
          </p>
        </div>

        {/* 操作パネル */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="測定地点または備考で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              新規測定データ
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center">
              <Download className="h-4 w-4 mr-2" />
              CSV出力
            </Button>
          </div>
        </div>

        {/* 新規データ入力フォーム */}
        {showForm && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">新規測定データ入力</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">測定地点</label>
                  <input
                    type="text"
                    value={newMeasurement.location}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例: 測定地点A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">pH値</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMeasurement.pH}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, pH: Number(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">温度 (℃)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMeasurement.temperature}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">流量 (m³/day)</label>
                  <input
                    type="number"
                    value={newMeasurement.flowRate}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, flowRate: Number(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CO2濃度 (ppm)</label>
                  <input
                    type="number"
                    value={newMeasurement.co2Concentration}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, co2Concentration: Number(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">散布量 (ton/month)</label>
                  <input
                    type="number"
                    value={newMeasurement.spreadingAmount}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, spreadingAmount: Number(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">鉄濃度 (mg/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMeasurement.metalConcentration?.iron}
                    onChange={(e) => setNewMeasurement(prev => ({
                      ...prev,
                      metalConcentration: { ...prev.metalConcentration!, iron: Number(e.target.value) }
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">銅濃度 (mg/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMeasurement.metalConcentration?.copper}
                    onChange={(e) => setNewMeasurement(prev => ({
                      ...prev,
                      metalConcentration: { ...prev.metalConcentration!, copper: Number(e.target.value) }
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">亜鉛濃度 (mg/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMeasurement.metalConcentration?.zinc}
                    onChange={(e) => setNewMeasurement(prev => ({
                      ...prev,
                      metalConcentration: { ...prev.metalConcentration!, zinc: Number(e.target.value) }
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                  <input
                    type="text"
                    value={newMeasurement.notes}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="測定時の特記事項など..."
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button
                  onClick={handleAddMeasurement}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  測定データ追加
                </Button>
                <Button
                  onClick={() => setShowForm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 測定データ一覧 */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      測定日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      測定地点
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      pH値
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      温度
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      流量
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CO2濃度
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      重金属濃度
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状態
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMeasurements.map((measurement, index) => (
                    <tr key={measurement.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(measurement.timestamp).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {measurement.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(measurement.pH, measurement.temperature)}`}>
                          {measurement.pH.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {measurement.temperature.toFixed(1)}℃
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {measurement.flowRate.toLocaleString()} m³/day
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {measurement.co2Concentration} ppm
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="text-xs">
                          <div>Fe: {measurement.metalConcentration.iron} mg/L</div>
                          <div>Cu: {measurement.metalConcentration.copper} mg/L</div>
                          <div>Zn: {measurement.metalConcentration.zinc} mg/L</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(measurement.pH < 6.0 || measurement.pH > 8.0) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            要注意
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            正常
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredMeasurements.length === 0 && (
          <div className="text-center py-12">
            <Database className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">検索条件に一致する測定データがありません</p>
          </div>
        )}
      </div>
    </div>
  );
} 