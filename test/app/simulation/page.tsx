'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// SVGアイコンコンポーネント
const Calculator = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const TrendingUp = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const DollarSign = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

interface SimulationParams {
  spreadingAmount: number; // 散布量 (ton/month)
  reactionEfficiency: number; // 反応効率 (%)
  timeCoefficient: number; // 時間係数
  initialInvestment: number; // 初期投資 (万円)
  annualRevenue: number; // 年間収益 (万円)
  annualOperatingCost: number; // 年間運用費 (万円)
  projectPeriod: number; // 事業期間 (年)
}

interface SimulationResults {
  co2RemovalAmount: number; // CO2除去量 (ton/year)
  paybackPeriod: number; // 投資回収期間 (年)
  totalRevenue: number; // 総収益 (万円)
  totalCost: number; // 総コスト (万円)
  netProfit: number; // 純利益 (万円)
  roi: number; // ROI (%)
}

export default function SimulationPage() {
  const [params, setParams] = useState<SimulationParams>({
    spreadingAmount: 100,
    reactionEfficiency: 85,
    timeCoefficient: 0.8,
    initialInvestment: 5000,
    annualRevenue: 2000,
    annualOperatingCost: 800,
    projectPeriod: 10
  });

  const [results, setResults] = useState<SimulationResults | null>(null);

  const calculateSimulation = () => {
    // CO2除去量計算: 散布量 × 反応効率 × 時間係数 × 12ヶ月
    const co2RemovalAmount = params.spreadingAmount * (params.reactionEfficiency / 100) * params.timeCoefficient * 12;
    
    // 投資回収期間計算: 初期投資 ÷ (年間収益 - 年間運用費)
    const annualNetIncome = params.annualRevenue - params.annualOperatingCost;
    const paybackPeriod = annualNetIncome > 0 ? params.initialInvestment / annualNetIncome : 0;
    
    // その他の計算
    const totalRevenue = params.annualRevenue * params.projectPeriod;
    const totalCost = params.initialInvestment + (params.annualOperatingCost * params.projectPeriod);
    const netProfit = totalRevenue - totalCost;
    const roi = params.initialInvestment > 0 ? (netProfit / params.initialInvestment) * 100 : 0;

    setResults({
      co2RemovalAmount,
      paybackPeriod,
      totalRevenue,
      totalCost,
      netProfit,
      roi
    });
  };

  const handleInputChange = (field: keyof SimulationParams, value: number) => {
    setParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            事業計画シミュレーション
          </h1>
          <p className="text-gray-600">
            CO2固定量とコスト効果を事前検証し、最適な事業計画を策定します
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* パラメータ入力セクション */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calculator className="h-5 w-5 mr-2 text-blue-600" />
                  シミュレーションパラメータ
                </h3>
                
                <div className="space-y-4">
                  {/* 技術パラメータ */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">技術パラメータ</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          散布量 (ton/月)
                        </label>
                        <input
                          type="number"
                          value={params.spreadingAmount}
                          onChange={(e) => handleInputChange('spreadingAmount', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          反応効率 (%)
                        </label>
                        <input
                          type="number"
                          value={params.reactionEfficiency}
                          onChange={(e) => handleInputChange('reactionEfficiency', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          時間係数
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={params.timeCoefficient}
                          onChange={(e) => handleInputChange('timeCoefficient', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          事業期間 (年)
                        </label>
                        <input
                          type="number"
                          value={params.projectPeriod}
                          onChange={(e) => handleInputChange('projectPeriod', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 経済パラメータ */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-3">経済パラメータ</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          初期投資 (万円)
                        </label>
                        <input
                          type="number"
                          value={params.initialInvestment}
                          onChange={(e) => handleInputChange('initialInvestment', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          年間収益 (万円)
                        </label>
                        <input
                          type="number"
                          value={params.annualRevenue}
                          onChange={(e) => handleInputChange('annualRevenue', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          年間運用費 (万円)
                        </label>
                        <input
                          type="number"
                          value={params.annualOperatingCost}
                          onChange={(e) => handleInputChange('annualOperatingCost', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Button 
                    onClick={calculateSimulation}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    シミュレーション実行
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 結果表示セクション */}
          <div className="space-y-6">
            {results && (
              <>
                {/* KPI結果 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">CO2除去量</p>
                          <p className="text-2xl font-bold text-green-600">
                            {results.co2RemovalAmount.toFixed(1)}
                          </p>
                          <p className="text-xs text-gray-500">ton/年</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">投資回収期間</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {results.paybackPeriod.toFixed(1)}
                          </p>
                          <p className="text-xs text-gray-500">年</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 詳細結果 */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      財務分析結果
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <span className="text-sm text-gray-600">総収益</span>
                          <p className="text-lg font-semibold text-green-600">
                            {results.totalRevenue.toLocaleString()}万円
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">総コスト</span>
                          <p className="text-lg font-semibold text-red-600">
                            {results.totalCost.toLocaleString()}万円
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                        <div>
                          <span className="text-sm text-gray-600">純利益</span>
                          <p className={`text-xl font-bold ${results.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {results.netProfit.toLocaleString()}万円
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">ROI</span>
                          <p className={`text-xl font-bold ${results.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {results.roi.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 分析コメント */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      分析結果
                    </h3>
                    <div className="space-y-2">
                      {results.paybackPeriod <= 5 && (
                        <div className="p-3 bg-green-100 border border-green-300 rounded-md">
                          <p className="text-green-800 text-sm">
                            ✅ 投資回収期間が5年以内で、収益性の高い事業計画です。
                          </p>
                        </div>
                      )}
                      {results.paybackPeriod > 5 && results.paybackPeriod <= 10 && (
                        <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md">
                          <p className="text-yellow-800 text-sm">
                            ⚠️ 投資回収期間が長期になります。パラメータの見直しを検討してください。
                          </p>
                        </div>
                      )}
                      {results.paybackPeriod > 10 && (
                        <div className="p-3 bg-red-100 border border-red-300 rounded-md">
                          <p className="text-red-800 text-sm">
                            ❌ 投資回収期間が10年を超えます。事業計画の大幅な見直しが必要です。
                          </p>
                        </div>
                      )}
                      {results.co2RemovalAmount >= 1000 && (
                        <div className="p-3 bg-blue-100 border border-blue-300 rounded-md">
                          <p className="text-blue-800 text-sm">
                            🌍 年間1,000ton以上のCO2除去が見込まれ、環境への大きな貢献が期待できます。
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!results && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calculator className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    パラメータを入力してシミュレーションを実行してください
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 