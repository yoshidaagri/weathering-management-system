'use client';

import { useState } from 'react';

interface Project {
  id: string;
  name: string;
  location: string;
  status: 'planning' | 'active' | 'completed' | 'suspended';
  startDate: string;
  endDate: string;
  co2Target: number;
  co2Achieved: number;
  progress: number;
}

const sampleProjects: Project[] = [
  {
    id: '1',
    name: '鉱山A 風化促進プロジェクト',
    location: '北海道',
    status: 'active',
    startDate: '2024-01-15',
    endDate: '2024-12-31',
    co2Target: 50000,
    co2Achieved: 32000,
    progress: 64,
  },
  {
    id: '2',
    name: '鉱山B CO2除去システム',
    location: '岩手県',
    status: 'planning',
    startDate: '2024-03-01',
    endDate: '2025-02-28',
    co2Target: 75000,
    co2Achieved: 0,
    progress: 0,
  },
  {
    id: '3',
    name: '鉱山C 廃水処理事業',
    location: '秋田県',
    status: 'active',
    startDate: '2023-06-01',
    endDate: '2024-05-31',
    co2Target: 30000,
    co2Achieved: 28500,
    progress: 95,
  },
];

const statusConfig = {
  planning: { label: '計画中', color: 'bg-gray-100 text-gray-800' },
  active: { label: '実行中', color: 'bg-green-100 text-green-800' },
  completed: { label: '完了', color: 'bg-blue-100 text-blue-800' },
  suspended: { label: '中断', color: 'bg-red-100 text-red-800' },
};

export default function ProjectManagement() {
  const [projects] = useState<Project[]>(sampleProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ja-JP').format(num);
  };

  const ProjectCard = ({ project }: { project: Project }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[project.status].color}`}>
          {statusConfig[project.status].label}
        </span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {project.location}
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {project.startDate} 〜 {project.endDate}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">CO2除去進捗</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>達成: {formatNumber(project.co2Achieved)} kg</span>
            <span>目標: {formatNumber(project.co2Target)} kg</span>
          </div>
        </div>
        
        <div className="flex space-x-2 pt-4">
          <button 
            onClick={() => setSelectedProject(project)}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            詳細を見る
          </button>
          <button className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            編集
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">プロジェクト管理</h2>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>新規プロジェクト</span>
        </button>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">総プロジェクト数</p>
              <p className="text-2xl font-semibold text-gray-900">{projects.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">実行中</p>
              <p className="text-2xl font-semibold text-gray-900">
                {projects.filter(p => p.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">計画中</p>
              <p className="text-2xl font-semibold text-gray-900">
                {projects.filter(p => p.status === 'planning').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">総CO2除去量</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(projects.reduce((sum, p) => sum + p.co2Achieved, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* プロジェクト一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {/* プロジェクト詳細モーダル */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedProject.name}
                </h3>
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">場所</label>
                    <p className="text-gray-900">{selectedProject.location}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">ステータス</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusConfig[selectedProject.status].color}`}>
                      {statusConfig[selectedProject.status].label}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">開始日</label>
                    <p className="text-gray-900">{selectedProject.startDate}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">完了予定日</label>
                    <p className="text-gray-900">{selectedProject.endDate}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">CO2除去進捗</label>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full"
                      style={{ width: `${selectedProject.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>達成: {formatNumber(selectedProject.co2Achieved)} kg</span>
                    <span>目標: {formatNumber(selectedProject.co2Target)} kg</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  閉じる
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  編集
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}