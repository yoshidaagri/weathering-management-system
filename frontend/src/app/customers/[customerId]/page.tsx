'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useCustomerStore } from '@/lib/stores/customer-store';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Building2, 
  Save, 
  Edit, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Users,
  Plus,
  FolderOpen
} from 'lucide-react';
import { UpdateCustomerRequest } from '@/types';
import { 
  formatDate, 
  formatRelativeTime, 
  industryLabels, 
  statusLabels, 
  statusColors, 
  isValidEmail,
  formatPhoneNumber 
} from '@/lib/utils';
import Link from 'next/link';

interface CustomerFormData extends UpdateCustomerRequest {}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.customerId as string;
  
  const { 
    currentCustomer, 
    isLoading, 
    error, 
    fetchCustomer, 
    updateCustomer, 
    deleteCustomer, 
    clearError 
  } = useCustomerStore();

  const [isEditing, setIsEditing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CustomerFormData>();

  // 顧客データ取得
  useEffect(() => {
    if (customerId) {
      fetchCustomer(customerId);
    }
  }, [customerId, fetchCustomer]);

  // フォームデータ設定
  useEffect(() => {
    if (currentCustomer && isEditing) {
      setValue('companyName', currentCustomer.companyName);
      setValue('industry', currentCustomer.industry);
      setValue('status', currentCustomer.status);
      setValue('contactInfo.email', currentCustomer.contactInfo.email);
      setValue('contactInfo.phone', currentCustomer.contactInfo.phone);
      setValue('contactInfo.address', currentCustomer.contactInfo.address);
    }
  }, [currentCustomer, isEditing, setValue]);

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    clearError();

    try {
      await updateCustomer(customerId, data);
      setIsEditing(false);
    } catch (error: any) {
      setSubmitError(error.message || '顧客の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSubmitError(null);
    clearError();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSubmitError(null);
    clearError();
    reset();
  };

  const handleDeleteCustomer = async () => {
    if (!currentCustomer) return;
    
    if (confirm(`「${currentCustomer.companyName}」を削除してもよろしいですか？`)) {
      try {
        await deleteCustomer(customerId);
        router.push('/customers');
      } catch (error) {
        console.error('Delete customer error:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">顧客情報を読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentCustomer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              {error || '顧客が見つかりません'}
              <div className="mt-4">
                <Link href="/customers">
                  <Button variant="outline">顧客一覧に戻る</Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/customers">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {currentCustomer.companyName}
              </h1>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[currentCustomer.status]}`}>
                  {statusLabels[currentCustomer.status]}
                </span>
                <span className="text-sm text-gray-500">
                  {industryLabels[currentCustomer.industry] || currentCustomer.industry}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {!isEditing && (
              <>
                <Button onClick={handleEdit} className="flex items-center space-x-2">
                  <Edit className="h-4 w-4" />
                  <span>編集</span>
                </Button>
                <Button 
                  onClick={handleDeleteCustomer} 
                  variant="destructive"
                  className="flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>削除</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* エラー表示 */}
        {submitError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {submitError}
              <Button
                variant="link"
                className="ml-2 h-auto p-0 text-red-600"
                onClick={() => setSubmitError(null)}
              >
                閉じる
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メイン情報 */}
          <div className="lg:col-span-2 space-y-6">
            {isEditing ? (
              /* 編集フォーム */
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* 基本情報編集 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5" />
                      <span>基本情報編集</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          会社名 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          {...register('companyName', {
                            required: '会社名は必須です',
                            minLength: { value: 1, message: '会社名は1文字以上で入力してください' },
                            maxLength: { value: 100, message: '会社名は100文字以下で入力してください' },
                          })}
                          className={errors.companyName ? 'border-red-500' : ''}
                        />
                        {errors.companyName && (
                          <p className="text-red-500 text-sm mt-1">{errors.companyName.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          業界 <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register('industry', { required: '業界は必須です' })}
                          className={`w-full h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.industry ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          {Object.entries(industryLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                        {errors.industry && (
                          <p className="text-red-500 text-sm mt-1">{errors.industry.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ステータス
                      </label>
                      <select
                        {...register('status')}
                        className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">アクティブ</option>
                        <option value="inactive">非アクティブ</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                {/* 連絡先情報編集 */}
                <Card>
                  <CardHeader>
                    <CardTitle>連絡先情報編集</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        メールアドレス <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email"
                        {...register('contactInfo.email', {
                          required: 'メールアドレスは必須です',
                          validate: (value) => !value || isValidEmail(value) || '有効なメールアドレスを入力してください',
                        })}
                        className={errors.contactInfo?.email ? 'border-red-500' : ''}
                      />
                      {errors.contactInfo?.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.contactInfo.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        電話番号 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="tel"
                        {...register('contactInfo.phone', {
                          required: '電話番号は必須です',
                          pattern: { value: /^[\d\-\(\)\s]+$/, message: '有効な電話番号を入力してください' },
                        })}
                        className={errors.contactInfo?.phone ? 'border-red-500' : ''}
                      />
                      {errors.contactInfo?.phone && (
                        <p className="text-red-500 text-sm mt-1">{errors.contactInfo.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        住所 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        {...register('contactInfo.address', {
                          required: '住所は必須です',
                          minLength: { value: 1, message: '住所は1文字以上で入力してください' },
                          maxLength: { value: 200, message: '住所は200文字以下で入力してください' },
                        })}
                        className={errors.contactInfo?.address ? 'border-red-500' : ''}
                      />
                      {errors.contactInfo?.address && (
                        <p className="text-red-500 text-sm mt-1">{errors.contactInfo.address.message}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 編集アクションボタン */}
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>保存中...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>保存</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              /* 表示モード */
              <>
                {/* 基本情報表示 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5" />
                      <span>基本情報</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">会社名</h4>
                        <p className="text-lg font-medium text-gray-900 mt-1">
                          {currentCustomer.companyName}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">業界</h4>
                        <p className="text-lg text-gray-900 mt-1">
                          {industryLabels[currentCustomer.industry] || currentCustomer.industry}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">ステータス</h4>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${statusColors[currentCustomer.status]}`}>
                        {statusLabels[currentCustomer.status]}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* 連絡先情報表示 */}
                <Card>
                  <CardHeader>
                    <CardTitle>連絡先情報</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">メールアドレス</h4>
                        <a 
                          href={`mailto:${currentCustomer.contactInfo.email}`}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {currentCustomer.contactInfo.email}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">電話番号</h4>
                        <a 
                          href={`tel:${currentCustomer.contactInfo.phone}`}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {formatPhoneNumber(currentCustomer.contactInfo.phone)}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">住所</h4>
                        <p className="text-gray-900 mt-1">
                          {currentCustomer.contactInfo.address}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* システム情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">システム情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <h5 className="text-sm font-medium text-gray-500">登録日</h5>
                    <p className="text-sm text-gray-900">{formatDate(currentCustomer.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <h5 className="text-sm font-medium text-gray-500">最終更新</h5>
                    <p className="text-sm text-gray-900">{formatRelativeTime(currentCustomer.updatedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="h-4 w-4 text-gray-400" />
                  <div>
                    <h5 className="text-sm font-medium text-gray-500">プロジェクト数</h5>
                    <p className="text-sm text-gray-900">{currentCustomer.projectCount}件</p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <h5 className="text-xs font-medium text-gray-500">顧客ID</h5>
                  <p className="text-xs text-gray-600 font-mono break-all">{currentCustomer.customerId}</p>
                </div>
              </CardContent>
            </Card>

            {/* 関連プロジェクト */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>関連プロジェクト</span>
                  <Button size="sm" className="flex items-center space-x-1">
                    <Plus className="h-3 w-3" />
                    <span>新規</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentCustomer.projectCount > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      {currentCustomer.projectCount}件のプロジェクトが関連付けられています
                    </p>
                    <Link href={`/projects?customerId=${currentCustomer.customerId}`}>
                      <Button variant="outline" className="w-full flex items-center space-x-2">
                        <FolderOpen className="h-4 w-4" />
                        <span>プロジェクト一覧を見る</span>
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <FolderOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-3">
                      まだプロジェクトがありません
                    </p>
                    <Link href={`/projects/new?customerId=${currentCustomer.customerId}`}>
                      <Button size="sm" className="flex items-center space-x-1">
                        <Plus className="h-3 w-3" />
                        <span>プロジェクト作成</span>
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}