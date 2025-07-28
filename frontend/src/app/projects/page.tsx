'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Project, ProjectQuery } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const query: ProjectQuery = {
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter as any }),
        ...(typeFilter && { projectType: typeFilter as any })
      };

      const response = await apiClient.getProjects(query);
      setProjects(response.projects);
    } catch (err) {
      console.error('プロジェクト取得エラー:', err);
      setError(err instanceof Error ? err.message : 'プロジェクトの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    fetchProjects();
  }, [searchTerm, statusFilter, typeFilter, fetchProjects]);

  const formatBudget = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency === 'JPY' ? 'JPY' : 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">プロジェクト管理</h1>
          <p className="text-gray-600 mt-2">風化促進CO2除去・廃水処理プロジェクトの管理</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            新規プロジェクト作成
          </Button>
        </Link>
      </div>

      {/* フィルター */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            検索
          </label>
          <Input
            type="text"
            placeholder="プロジェクト名、説明、顧客名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ステータス
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべて</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            プロジェクトタイプ
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべて</option>
            {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* プロジェクト一覧 */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            {searchTerm || statusFilter || typeFilter 
              ? '検索条件に一致するプロジェクトが見つかりません'
              : 'プロジェクトがまだ登録されていません'
            }
          </div>
          <Link href="/projects/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              最初のプロジェクトを作成
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.projectId} className="p-6 hover:shadow-lg transition-shadow">
              <Link href={`/projects/${project.projectId}`}>
                <div className="cursor-pointer">
                  {/* ステータスバッジ */}
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {PROJECT_TYPE_LABELS[project.projectType]}
                    </span>
                  </div>

                  {/* プロジェクト名・説明 */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {project.projectName}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>

                  {/* 顧客名 */}
                  <div className="mb-4">
                    <span className="text-sm text-gray-500">顧客: </span>
                    <span className="text-sm font-medium text-gray-900">
                      {project.customerName}
                    </span>
                  </div>

                  {/* 場所 */}
                  <div className="mb-4">
                    <span className="text-xs text-gray-500">場所: </span>
                    <span className="text-xs text-gray-700">
                      {project.location.prefecture} {project.location.city}
                    </span>
                  </div>

                  {/* 予算・期間 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">予算:</span>
                      <span className="font-medium">
                        {formatBudget(project.budget.totalBudget, project.budget.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">期間:</span>
                      <span className="text-gray-700">
                        {formatDate(project.timeline.startDate)} ～ {formatDate(project.timeline.endDate)}
                      </span>
                    </div>
                  </div>

                  {/* CO2目標 */}
                  {project.targetMetrics.co2RemovalTarget && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">CO2除去目標:</span>
                        <span className="font-medium text-green-600">
                          {project.targetMetrics.co2RemovalTarget.toLocaleString()} t/年
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}

      {/* TODO: Cursor - 受入テスト実施 */}
    </div>
  );
}