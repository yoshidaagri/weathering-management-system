'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Project } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const PROJECT_TYPE_LABELS = {
  'co2_removal': 'CO2除去',
  'wastewater_treatment': '廃水処理',
  'combined': '統合システム'
};

const STATUS_LABELS = {
  'planning': '計画中',
  'active': '実行中',
  'completed': '完了',
  'cancelled': 'キャンセル',
  'on_hold': '保留中'
};

const STATUS_COLORS = {
  'planning': 'bg-yellow-100 text-yellow-800',
  'active': 'bg-green-100 text-green-800',
  'completed': 'bg-blue-100 text-blue-800',
  'cancelled': 'bg-red-100 text-red-800',
  'on_hold': 'bg-gray-100 text-gray-800'
};

interface ProjectDetailPageProps {
  params: {
    projectId: string;
  };
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.getProject(params.projectId);
        setProject(response.project);
      } catch (err) {
        console.error('プロジェクト取得エラー:', err);
        setError(err instanceof Error ? err.message : 'プロジェクトの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (params.projectId) {
      fetchProject();
    }
  }, [params.projectId]);

  const handleDelete = async () => {
    if (!project || !window.confirm(`プロジェクト「${project.projectName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      setDeleting(true);
      await apiClient.deleteProject(project.projectId);
      router.push('/projects');
    } catch (err) {
      console.error('プロジェクト削除エラー:', err);
      setError(err instanceof Error ? err.message : 'プロジェクトの削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const formatBudget = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency === 'JPY' ? 'JPY' : 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateBudgetUsagePercent = () => {
    if (!project?.budget.usedBudget || !project?.budget.totalBudget) return 0;
    return Math.round((project.budget.usedBudget / project.budget.totalBudget) * 100);
  };

  const calculateProgressPercent = () => {
    if (!project?.timeline) return 0;
    
    const start = new Date(project.timeline.startDate).getTime();
    const end = new Date(project.timeline.endDate).getTime();
    const now = Date.now();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    return Math.round(((now - start) / (end - start)) * 100);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg mb-4">
            {error || 'プロジェクトが見つかりません'}
          </div>
          <Link href="/projects">
            <Button variant="outline">
              プロジェクト一覧に戻る
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const budgetUsagePercent = calculateBudgetUsagePercent();
  const progressPercent = calculateProgressPercent();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{project.projectName}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[project.status]}`}>
              {STATUS_LABELS[project.status]}
            </span>
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <span>{PROJECT_TYPE_LABELS[project.projectType]}</span>
            <span>•</span>
            <span>顧客: {project.customerName}</span>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Link href={`/projects/${project.projectId}/edit`}>
            <Button variant="outline">
              編集
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {deleting ? '削除中...' : '削除'}
          </Button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メイン情報 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">基本情報</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">説明</h3>
                <p className="text-gray-900">{project.description || '説明がありません'}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">場所</h3>
                  <p className="text-gray-900">
                    {project.location.prefecture} {project.location.city}
                    <br />
                    {project.location.address}
                  </p>
                  {project.location.coordinates && (
                    <p className="text-sm text-gray-600 mt-1">
                      緯度: {project.location.coordinates.latitude}, 経度: {project.location.coordinates.longitude}
                    </p>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">期間</h3>
                  <p className="text-gray-900">
                    {formatDate(project.timeline.startDate)} 〜 {formatDate(project.timeline.endDate)}
                  </p>
                  
                  {/* 進捗バー */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>進捗</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 目標指標 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">目標指標</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {project.targetMetrics.co2RemovalTarget && (
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {project.targetMetrics.co2RemovalTarget.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">CO2除去目標 (t/年)</div>
                </div>
              )}
              
              {project.targetMetrics.wastewaterVolumeTarget && (
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {project.targetMetrics.wastewaterVolumeTarget.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">廃水処理量目標 (m³/日)</div>
                </div>
              )}
              
              {project.targetMetrics.processingCapacity && (
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {project.targetMetrics.processingCapacity.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">処理能力 (t/日)</div>
                </div>
              )}
            </div>
          </Card>

          {/* マイルストーン */}
          {project.timeline.milestones && project.timeline.milestones.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">マイルストーン</h2>
              <div className="space-y-3">
                {project.timeline.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{milestone.name}</h3>
                      <p className="text-sm text-gray-600">
                        目標日: {formatDate(milestone.targetDate)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                      milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {milestone.status === 'completed' ? '完了' :
                       milestone.status === 'in_progress' ? '進行中' : '未開始'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 予算情報 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">予算情報</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>総予算</span>
                  <span>{formatBudget(project.budget.totalBudget, project.budget.currency)}</span>
                </div>
                
                {project.budget.usedBudget && (
                  <>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>使用予算</span>
                      <span>{formatBudget(project.budget.usedBudget, project.budget.currency)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm font-medium mb-2">
                      <span>使用率</span>
                      <span>{budgetUsagePercent}%</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          budgetUsagePercent > 90 ? 'bg-red-500' :
                          budgetUsagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}
                      ></div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* プロジェクト詳細 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">プロジェクト詳細</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-500">作成日</h3>
                <p className="text-gray-900">{formatDate(project.createdAt)}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">最終更新</h3>
                <p className="text-gray-900">{formatDate(project.updatedAt)}</p>
              </div>

              {project.tags && project.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">タグ</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {project.assignedPersonnel && project.assignedPersonnel.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">担当者</h3>
                  <div className="space-y-1">
                    {project.assignedPersonnel.map((person, index) => (
                      <div key={index} className="text-sm text-gray-900">{person}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* アクション */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">関連機能</h2>
            <div className="space-y-3">
              <Link href={`/customers/${project.customerId}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  顧客詳細を表示
                </Button>
              </Link>
              
              <Button variant="outline" className="w-full justify-start" disabled>
                測定データを表示
              </Button>
              
              <Button variant="outline" className="w-full justify-start" disabled>
                レポートを生成
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* TODO: Cursor - 受入テスト実施 */}
    </div>
  );
}