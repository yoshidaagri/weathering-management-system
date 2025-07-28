'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCustomerStore } from '@/lib/stores/customer-store';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Filter, Building2, Mail, Phone, MapPin, Users, Edit, Trash2 } from 'lucide-react';
import { Customer } from '@/types';
import { formatDate, formatRelativeTime, industryLabels, statusLabels, statusColors, truncateString } from '@/lib/utils';
import Link from 'next/link';

export default function CustomersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { 
    customers, 
    isLoading, 
    error, 
    filters, 
    nextToken, 
    fetchCustomers, 
    deleteCustomer, 
    setFilters, 
    clearError 
  } = useCustomerStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [industryFilter, setIndustryFilter] = useState('');

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // 初期データ読み込み
  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomers();
    }
  }, [isAuthenticated, fetchCustomers]);

  // フィルタ適用
  const handleSearch = () => {
    setFilters({
      search: searchTerm,
      status: statusFilter || undefined,
      industry: industryFilter || undefined,
    });
    fetchCustomers();
  };

  // フィルタリセット
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setIndustryFilter('');
    setFilters({
      search: '',
      status: undefined,
      industry: undefined,
    });
    fetchCustomers();
  };

  // 顧客削除
  const handleDeleteCustomer = async (customerId: string, companyName: string) => {
    if (confirm(`「${companyName}」を削除してもよろしいですか？`)) {
      try {
        await deleteCustomer(customerId);
      } catch (error) {
        console.error('Delete customer error:', error);
      }
    }
  };

  // さらに読み込み
  const handleLoadMore = () => {
    if (nextToken) {
      fetchCustomers({ nextToken }, true);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">顧客管理</h1>
            <p className="text-gray-600 mt-2">企業情報の登録・管理</p>
          </div>
          <Link href="/customers/new">
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>新規顧客登録</span>
            </Button>
          </Link>
        </div>

        {/* 検索・フィルタ */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>検索・フィルタ</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  会社名検索
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="会社名を入力..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | '')}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  <option value="active">アクティブ</option>
                  <option value="inactive">非アクティブ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  業界
                </label>
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  {Object.entries(industryLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end space-x-2">
                <Button onClick={handleSearch} className="flex-1">
                  検索
                </Button>
                <Button onClick={handleResetFilters} variant="outline">
                  リセット
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* エラー表示 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {error}
              <Button
                variant="link"
                className="ml-2 h-auto p-0 text-red-600"
                onClick={clearError}
              >
                閉じる
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* ローディング表示 */}
        {isLoading && customers.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">顧客データを読み込み中...</p>
          </div>
        )}

        {/* 顧客一覧 */}
        {!isLoading && customers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">顧客が見つかりません</h3>
              <p className="text-gray-600 mb-6">
                {filters.search || filters.status || filters.industry
                  ? '検索条件に一致する顧客がありません。フィルタを調整してください。'
                  : 'まだ顧客が登録されていません。最初の顧客を登録しましょう。'}
              </p>
              <Link href="/customers/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新規顧客登録
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((customer: Customer) => (
              <Card key={customer.customerId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {truncateString(customer.companyName, 30)}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[customer.status]}`}>
                          {statusLabels[customer.status]}
                        </span>
                        <span className="text-xs text-gray-500">
                          {industryLabels[customer.industry] || customer.industry}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Link href={`/customers/${customer.customerId}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteCustomer(customer.customerId, customer.companyName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{customer.contactInfo.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{customer.contactInfo.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{customer.contactInfo.address}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{customer.projectCount}件のプロジェクト</span>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    登録日: {formatDate(customer.createdAt)}
                    {customer.updatedAt !== customer.createdAt && (
                      <span className="block">
                        更新: {formatRelativeTime(customer.updatedAt)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* さらに読み込みボタン */}
        {nextToken && !isLoading && (
          <div className="text-center mt-8">
            <Button onClick={handleLoadMore} variant="outline">
              さらに読み込む
            </Button>
          </div>
        )}

        {/* ローディング中（追加読み込み） */}
        {isLoading && customers.length > 0 && (
          <div className="text-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
      </main>
    </div>
  );
}