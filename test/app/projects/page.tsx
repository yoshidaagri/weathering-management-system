'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// SVGアイコンコンポーネント
const FolderOpen = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const Plus = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const Edit = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const Calendar = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const Users = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const MapPin = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

type ProjectStatus = '計画中' | '実行中' | '完了' | '中止';

interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  customer: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  progress: number; // 0-100%
  budget: number; // 万円
  actualCost: number; // 万円
  targetCO2Removal: number; // ton/year
  actualCO2Removal: number; // ton/year
  responsiblePerson: string;
  lastUpdated: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: '山田鉱山風化促進プロジェクト',
      description: '銅鉱山の廃水を利用した風化促進によるCO2除去事業。年間1,500tonのCO2固定を目標とする。',
      location: '岩手県盛岡市',
      customer: '山田鉱業株式会社',
      status: '実行中',
      startDate: '2024-01-15',
      endDate: '2026-12-31',
      progress: 45,
      budget: 12000,
      actualCost: 5400,
      targetCO2Removal: 1500,
      actualCO2Removal: 675,
      responsiblePerson: '田中太郎',
      lastUpdated: '2024-01-20T15:30:00'
    },
    {
      id: '2',
      name: '佐藤鉱業CO2固定実証事業',
      description: '鉄鉱山での風化促進技術の実証実験。新しい散布手法の効果を検証する。',
      location: '北海道札幌市',
      customer: '佐藤鉱業株式会社',
      status: '計画中',
      startDate: '2024-03-01',
      endDate: '2025-08-31',
      progress: 15,
      budget: 8500,
      actualCost: 1275,
      targetCO2Removal: 1200,
      actualCO2Removal: 0,
      responsiblePerson: '鈴木花子',
      lastUpdated: '2024-01-18T10:15:00'
    },
    {
      id: '3',
      name: '高橋金属風化促進パイロット',
      description: 'アルミニウム精錬廃水を活用した小規模パイロットプロジェクト。',
      location: '大阪府大阪市',
      customer: '高橋金属工業',
      status: '完了',
      startDate: '2023-06-01',
      endDate: '2023-12-31',
      progress: 100,
      budget: 4500,
      actualCost: 4200,
      targetCO2Removal: 800,
      actualCO2Removal: 850,
      responsiblePerson: '伊藤次郎',
      lastUpdated: '2024-01-05T09:00:00'
    }
  ]);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    description: '',
    location: '',
    customer: '',
    status: '計画中',
    startDate: '',
    endDate: '',
    progress: 0,
    budget: 0,
    actualCost: 0,
    targetCO2Removal: 0,
    actualCO2Removal: 0,
    responsiblePerson: ''
  });

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case '計画中': return 'bg-blue-100 text-blue-800';
      case '実行中': return 'bg-green-100 text-green-800';
      case '完了': return 'bg-gray-100 text-gray-800';
      case '中止': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 20) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const handleSaveProject = () => {
    if (!formData.name || !formData.customer) return;

    const project: Project = {
      id: editMode ? selectedProject!.id : Date.now().toString(),
      name: formData.name!,
      description: formData.description!,
      location: formData.location!,
      customer: formData.customer!,
      status: formData.status!,
      startDate: formData.startDate!,
      endDate: formData.endDate!,
      progress: formData.progress || 0,
      budget: formData.budget || 0,
      actualCost: formData.actualCost || 0,
      targetCO2Removal: formData.targetCO2Removal || 0,
      actualCO2Removal: formData.actualCO2Removal || 0,
      responsiblePerson: formData.responsiblePerson!,
      lastUpdated: new Date().toISOString()
    };

    if (editMode) {
      setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    } else {
      setProjects(prev => [project, ...prev]);
    }

    setShowForm(false);
    setEditMode(false);
    setSelectedProject(null);
    setFormData({
      name: '',
      description: '',
      location: '',
      customer: '',
      status: '計画中',
      startDate: '',
      endDate: '',
      progress: 0,
      budget: 0,
      actualCost: 0,
      targetCO2Removal: 0,
      actualCO2Removal: 0,
      responsiblePerson: ''
    });
  };

  const handleEditProject = (project: Project) => {
    setFormData(project);
    setSelectedProject(project);
    setEditMode(true);
    setShowForm(true);
  };

  const handleNewProject = () => {
    setFormData({
      name: '',
      description: '',
      location: '',
      customer: '',
      status: '計画中',
      startDate: '',
      endDate: '',
      progress: 0,
      budget: 0,
      actualCost: 0,
      targetCO2Removal: 0,
      actualCO2Removal: 0,
      responsiblePerson: ''
    });
    setEditMode(false);
    setSelectedProject(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            プロジェクト管理
          </h1>
          <p className="text-gray-600">
            風化促進CO2除去事業のプロジェクト全体を管理し、進捗を追跡します
          </p>
        </div>

        {/* 操作パネル */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-4">
            <span className="text-sm font-medium text-gray-700">
              総プロジェクト数: {projects.length}件
            </span>
            <span className="text-sm font-medium text-green-600">
              実行中: {projects.filter(p => p.status === '実行中').length}件
            </span>
          </div>
          <Button
            onClick={handleNewProject}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            新規プロジェクト
          </Button>
        </div>

        {/* プロジェクト一覧 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {project.name}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <Button
                    onClick={() => handleEditProject(project)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {project.description}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {project.customer}
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {project.location}
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(project.startDate).toLocaleDateString('ja-JP')} 〜 {new Date(project.endDate).toLocaleDateString('ja-JP')}
                  </div>

                  {/* 進捗バー */}
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>進捗</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getProgressColor(project.progress)}`}
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* KPI */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">CO2除去量</p>
                      <p className="text-sm font-semibold">
                        {project.actualCO2Removal}/{project.targetCO2Removal} ton
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">予算執行率</p>
                      <p className="text-sm font-semibold">
                        {project.budget > 0 ? Math.round((project.actualCost / project.budget) * 100) : 0}%
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      担当: {project.responsiblePerson}
                    </p>
                    <p className="text-xs text-gray-500">
                      更新: {new Date(project.lastUpdated).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* プロジェクト作成・編集フォーム */}
        {showForm && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editMode ? 'プロジェクト編集' : '新規プロジェクト作成'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">プロジェクト名 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="例: 山田鉱山風化促進プロジェクト"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">プロジェクト概要</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="プロジェクトの詳細な説明を入力してください"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">顧客名 *</label>
                  <input
                    type="text"
                    value={formData.customer}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="例: 山田鉱業株式会社"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">所在地</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="例: 岩手県盛岡市"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ProjectStatus }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="計画中">計画中</option>
                    <option value="実行中">実行中</option>
                    <option value="完了">完了</option>
                    <option value="中止">中止</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
                  <input
                    type="text"
                    value={formData.responsiblePerson}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsiblePerson: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="例: 田中太郎"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">終了予定日</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">進捗率 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData(prev => ({ ...prev, progress: Number(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">予算 (万円)</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: Number(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">実費 (万円)</label>
                  <input
                    type="number"
                    value={formData.actualCost}
                    onChange={(e) => setFormData(prev => ({ ...prev, actualCost: Number(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">目標CO2除去量 (ton/year)</label>
                  <input
                    type="number"
                    value={formData.targetCO2Removal}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetCO2Removal: Number(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">実績CO2除去量 (ton/year)</label>
                  <input
                    type="number"
                    value={formData.actualCO2Removal}
                    onChange={(e) => setFormData(prev => ({ ...prev, actualCO2Removal: Number(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button
                  onClick={handleSaveProject}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  {editMode ? '更新' : '作成'}
                </Button>
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setEditMode(false);
                    setSelectedProject(null);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* プロジェクト概要統計 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">計画中</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {projects.filter(p => p.status === '計画中').length}
                  </p>
                </div>
                <FolderOpen className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">実行中</p>
                  <p className="text-2xl font-bold text-green-600">
                    {projects.filter(p => p.status === '実行中').length}
                  </p>
                </div>
                <FolderOpen className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">完了</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {projects.filter(p => p.status === '完了').length}
                  </p>
                </div>
                <FolderOpen className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">総CO2除去量</p>
                  <p className="text-2xl font-bold text-green-600">
                    {projects.reduce((sum, p) => sum + p.actualCO2Removal, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">ton/year</p>
                </div>
                <FolderOpen className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 