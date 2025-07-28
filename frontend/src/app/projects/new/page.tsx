'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Customer, CreateProjectRequest } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function NewProjectPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateProjectRequest>({
    projectName: '',
    description: '',
    customerId: '',
    location: {
      prefecture: '',
      city: '',
      address: '',
      coordinates: {
        latitude: 0,
        longitude: 0
      }
    },
    projectType: 'co2_removal',
    targetMetrics: {
      co2RemovalTarget: 0,
      wastewaterVolumeTarget: 0,
      processingCapacity: 0
    },
    timeline: {
      startDate: '',
      endDate: ''
    },
    budget: {
      totalBudget: 0,
      currency: 'JPY'
    },
    status: 'planning',
    tags: [],
    assignedPersonnel: []
  });

  // 顧客一覧を取得
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await apiClient.getCustomers({ status: 'active' });
        setCustomers(response.customers);
      } catch (err) {
        console.error('顧客一覧取得エラー:', err);
      }
    };

    fetchCustomers();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof CreateProjectRequest] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId) {
      setError('顧客を選択してください');
      return;
    }

    if (!formData.projectName.trim()) {
      setError('プロジェクト名を入力してください');
      return;
    }

    if (!formData.timeline.startDate || !formData.timeline.endDate) {
      setError('開始日と終了日を入力してください');
      return;
    }

    if (new Date(formData.timeline.startDate) >= new Date(formData.timeline.endDate)) {
      setError('終了日は開始日より後の日付を選択してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.createProject(formData);
      
      router.push(`/projects/${response.project.projectId}`);
    } catch (err) {
      console.error('プロジェクト作成エラー:', err);
      setError(err instanceof Error ? err.message : 'プロジェクトの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">新規プロジェクト作成</h1>
          <p className="text-gray-600 mt-2">新しい風化促進CO2除去・廃水処理プロジェクトを登録します</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 基本情報 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">基本情報</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    プロジェクト名 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => handleInputChange('projectName', e.target.value)}
                    placeholder="例: 北海道石炭採掘CO2除去プロジェクト"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="プロジェクトの詳細説明を入力してください"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    顧客 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => handleInputChange('customerId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">顧客を選択してください</option>
                    {customers.map(customer => (
                      <option key={customer.customerId} value={customer.customerId}>
                        {customer.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    プロジェクトタイプ
                  </label>
                  <select
                    value={formData.projectType}
                    onChange={(e) => handleInputChange('projectType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="co2_removal">CO2除去</option>
                    <option value="wastewater_treatment">廃水処理</option>
                    <option value="combined">統合システム</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* 場所情報 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">場所情報</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    都道府県 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.location.prefecture}
                    onChange={(e) => handleInputChange('location.prefecture', e.target.value)}
                    placeholder="例: 北海道"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    市区町村 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.location.city}
                    onChange={(e) => handleInputChange('location.city', e.target.value)}
                    placeholder="例: 夕張市"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    住所 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.location.address}
                    onChange={(e) => handleInputChange('location.address', e.target.value)}
                    placeholder="例: 清水沢宮前町1-1"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      緯度
                    </label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formData.location.coordinates?.latitude || ''}
                      onChange={(e) => handleInputChange('location.coordinates.latitude', parseFloat(e.target.value) || 0)}
                      placeholder="例: 43.0642"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      経度
                    </label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formData.location.coordinates?.longitude || ''}
                      onChange={(e) => handleInputChange('location.coordinates.longitude', parseFloat(e.target.value) || 0)}
                      placeholder="例: 141.9716"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* 目標指標 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">目標指標</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CO2除去目標 (t/年)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.targetMetrics.co2RemovalTarget || ''}
                    onChange={(e) => handleInputChange('targetMetrics.co2RemovalTarget', parseInt(e.target.value) || 0)}
                    placeholder="例: 1000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    廃水処理量目標 (m³/日)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.targetMetrics.wastewaterVolumeTarget || ''}
                    onChange={(e) => handleInputChange('targetMetrics.wastewaterVolumeTarget', parseInt(e.target.value) || 0)}
                    placeholder="例: 500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    処理能力 (t/日)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.targetMetrics.processingCapacity || ''}
                    onChange={(e) => handleInputChange('targetMetrics.processingCapacity', parseInt(e.target.value) || 0)}
                    placeholder="例: 200"
                  />
                </div>
              </div>
            </Card>

            {/* 予算・期間 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">予算・期間</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    総予算 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={formData.budget.totalBudget || ''}
                      onChange={(e) => handleInputChange('budget.totalBudget', parseInt(e.target.value) || 0)}
                      placeholder="例: 50000000"
                      className="flex-1"
                      required
                    />
                    <select
                      value={formData.budget.currency}
                      onChange={(e) => handleInputChange('budget.currency', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="JPY">JPY</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開始日 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.timeline.startDate.split('T')[0]}
                    onChange={(e) => handleInputChange('timeline.startDate', e.target.value + 'T00:00:00Z')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    終了日 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.timeline.endDate.split('T')[0]}
                    onChange={(e) => handleInputChange('timeline.endDate', e.target.value + 'T23:59:59Z')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    初期ステータス
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="planning">計画中</option>
                    <option value="active">実行中</option>
                  </select>
                </div>
              </div>
            </Card>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* ボタン */}
          <div className="mt-8 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/projects')}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? '作成中...' : 'プロジェクト作成'}
            </Button>
          </div>
        </form>
      </div>

      {/* TODO: Cursor - 受入テスト実施 */}
    </div>
  );
}