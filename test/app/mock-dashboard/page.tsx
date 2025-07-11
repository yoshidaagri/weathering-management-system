'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardView } from '../../lib/stores/ui-store';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import MockMonitoringDashboard from '../../components/MockMonitoringDashboard';
import MockPlanActualDashboard from '../../components/MockPlanActualDashboard';

// モックユーザーデータ（認証なし）
const mockUser = {
  username: 'mock-user',
  email: 'mock@example.com',
  companyName: 'モック開発会社',
  isVerified: true,
};

export default function MockDashboardPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<DashboardView>('projects');

  // ナビゲーション処理
  const handleViewChange = (view: DashboardView) => {
    setCurrentView(view);
    console.log(`${view}画面に切り替え`);
  };

  // 実際のログイン画面に戻る
  const goToLogin = () => {
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 認証なしのヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                🚀 モックダッシュボード（開発用）
              </h1>
            </div>

            {/* モックユーザー情報と操作 */}
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <div className="font-medium text-gray-900">{mockUser.username}</div>
                <div className="text-gray-500">{mockUser.companyName}</div>
              </div>
              <button
                onClick={goToLogin}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                ログイン画面に戻る
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* サイドバー */}
        <Sidebar 
          currentView={currentView} 
          onViewChange={handleViewChange}
        />
        
        {/* メインコンテンツ */}
        <main className="flex-1 p-6">
          {/* 開発ステータス表示 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  モックダッシュボード実行中 - {currentView}
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>• 認証をスキップして開発用画面を表示中</p>
                  <p>• 実際のCognito認証は不要</p>
                  <p>• サイドバーナビゲーションをテスト可能</p>
                </div>
              </div>
            </div>
          </div>

          {/* コンテンツエリア - 選択されたビューに応じて表示 */}
          {currentView === 'projects' && (
            <div className="space-y-6">
              {/* プロジェクト概要 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            アクティブプロジェクト
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            5件
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            測定ポイント
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            12箇所
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            月間CO2除去量
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            1,247 t
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* プロジェクト一覧 */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    プロジェクト管理（開発用）
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div className="border-l-4 border-green-400 bg-green-50 p-4">
                      <p className="text-sm text-green-600">精進川鉱山 - 風化促進実証事業</p>
                      <p className="text-sm text-gray-600">CO2除去量目標: 1,500 t-CO2/年</p>
                    </div>
                    <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
                      <p className="text-sm text-blue-600">大雪山系 - 広域散布実証事業</p>
                      <p className="text-sm text-gray-600">CO2除去量目標: 3,000 t-CO2/年</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'customers' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    顧客管理（開発用）
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div className="border-l-4 border-purple-400 bg-purple-50 p-4">
                      <p className="text-sm text-purple-600">鉱山事業者A - 精進川鉱山</p>
                      <p className="text-sm text-gray-600">契約プロジェクト数: 2件</p>
                    </div>
                    <div className="border-l-4 border-orange-400 bg-orange-50 p-4">
                      <p className="text-sm text-orange-600">鉱山事業者B - 大雪山系</p>
                      <p className="text-sm text-gray-600">契約プロジェクト数: 1件</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'monitoring' && <MockMonitoringDashboard />}
          {currentView === 'analysis' && <MockPlanActualDashboard />}
          
          {currentView === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    レポート生成（開発用）
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
                        <h4 className="font-medium text-gray-900">MRV報告書</h4>
                        <p className="text-sm text-gray-600">測定・報告・検証レポート</p>
                      </button>
                      <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
                        <h4 className="font-medium text-gray-900">環境報告書</h4>
                        <p className="text-sm text-gray-600">行政向け環境監視レポート</p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 