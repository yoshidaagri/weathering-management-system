'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/layout/header';

export default function MeasurementsIndexPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.getProjects({
          status: 'active',
          limit: 50
        });

        setProjects(response.projects);
      } catch (err) {
        console.error('プロジェクト取得エラー:', err);
        setError(err instanceof Error ? err.message : 'プロジェクトの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-red-600 text-lg mb-4">{error}</div>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
            >
              ホームに戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダー */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
              >
                ← ホームに戻る
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">測定データ管理</h1>
            <p className="text-gray-600 mt-2">
              プロジェクトを選択して測定データを管理してください
            </p>
          </div>

          {/* プロジェクト選択 */}
          {projects.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-gray-500 text-lg mb-4">アクティブなプロジェクトがありません</div>
              <p className="text-gray-400 mb-6">
                測定データを管理するには、まずプロジェクトを作成してください。
              </p>
              <Button
                onClick={() => router.push('/projects/new')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                新規プロジェクト作成
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.projectId}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/projects/${project.projectId}/measurements`)}
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {project.projectName}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {project.description}
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">ステータス:</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {project.status === 'active' ? '実行中' :
                         project.status === 'planning' ? '計画中' :
                         project.status === 'completed' ? '完了' :
                         project.status === 'cancelled' ? 'キャンセル' : '保留中'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">種別:</span>
                      <span className="text-gray-700">
                        {project.projectType === 'co2_removal' ? 'CO2除去' :
                         project.projectType === 'wastewater_treatment' ? '廃水処理' : '統合システム'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">場所:</span>
                      <span className="text-gray-700">
                        {project.location.prefecture} {project.location.city}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/projects/${project.projectId}/measurements`);
                      }}
                    >
                      測定データ管理
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/projects/${project.projectId}/monitoring`);
                      }}
                    >
                      監視
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* 機能説明 */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="text-2xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">測定データ管理</h3>
              <p className="text-sm text-gray-600">
                pH、温度、CO2濃度、流量、重金属濃度などの測定データを時系列で管理・分析できます。
              </p>
            </Card>

            <Card className="p-6">
              <div className="text-2xl mb-3">📥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">CSV一括取り込み</h3>
              <p className="text-sm text-gray-600">
                現場測定器からのCSVファイルを一括で取り込み、自動バリデーション・エラー検出機能付き。
              </p>
            </Card>

            <Card className="p-6">
              <div className="text-2xl mb-3">📈</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">リアルタイム監視</h3>
              <p className="text-sm text-gray-600">
                測定データのリアルタイム監視、アラート機能、トレンド分析でプロジェクトを最適化。
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* TODO: Cursor - 受入テスト実施 */}
    </div>
  );
}