'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useCustomerStore } from '@/lib/stores/customer-store';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import { CreateCustomerRequest } from '@/types';
import { industryLabels, isValidEmail } from '@/lib/utils';
import Link from 'next/link';

interface CustomerFormData extends CreateCustomerRequest {}

export default function NewCustomerPage() {
  const router = useRouter();
  const { createCustomer, isLoading, error, clearError } = useCustomerStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<CustomerFormData>({
    defaultValues: {
      status: 'active',
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    clearError();

    try {
      await createCustomer(data);
      
      // 成功時は顧客一覧ページにリダイレクト
      router.push('/customers');
    } catch (error: any) {
      setSubmitError(error.message || '顧客の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    reset();
    setSubmitError(null);
    clearError();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="flex items-center space-x-4 mb-8">
          <Link href="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">新規顧客登録</h1>
            <p className="text-gray-600 mt-2">企業情報を入力して新しい顧客を登録します</p>
          </div>
        </div>

        {/* エラー表示 */}
        {(error || submitError) && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {error || submitError}
              <Button
                variant="link"
                className="ml-2 h-auto p-0 text-red-600"
                onClick={() => {
                  clearError();
                  setSubmitError(null);
                }}
              >
                閉じる
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>基本情報</span>
              </CardTitle>
              <CardDescription>
                企業の基本的な情報を入力してください
              </CardDescription>
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
                      minLength: {
                        value: 1,
                        message: '会社名は1文字以上で入力してください',
                      },
                      maxLength: {
                        value: 100,
                        message: '会社名は100文字以下で入力してください',
                      },
                    })}
                    placeholder="株式会社○○"
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
                    {...register('industry', {
                      required: '業界は必須です',
                    })}
                    className={`w-full h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.industry ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">業界を選択してください</option>
                    {Object.entries(industryLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
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

          {/* 連絡先情報 */}
          <Card>
            <CardHeader>
              <CardTitle>連絡先情報</CardTitle>
              <CardDescription>
                企業の連絡先情報を入力してください
              </CardDescription>
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
                    validate: (value) => isValidEmail(value) || '有効なメールアドレスを入力してください',
                  })}
                  placeholder="contact@example.com"
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
                    pattern: {
                      value: /^[\d\-\(\)\s]+$/,
                      message: '有効な電話番号を入力してください',
                    },
                  })}
                  placeholder="03-1234-5678"
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
                    minLength: {
                      value: 1,
                      message: '住所は1文字以上で入力してください',
                    },
                    maxLength: {
                      value: 200,
                      message: '住所は200文字以下で入力してください',
                    },
                  })}
                  placeholder="東京都港区○○ 1-2-3"
                  className={errors.contactInfo?.address ? 'border-red-500' : ''}
                />
                {errors.contactInfo?.address && (
                  <p className="text-red-500 text-sm mt-1">{errors.contactInfo.address.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* アクションボタン */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting || isLoading}
            >
              リセット
            </Button>
            <Link href="/customers">
              <Button 
                type="button" 
                variant="ghost"
                disabled={isSubmitting || isLoading}
              >
                キャンセル
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="flex items-center space-x-2"
            >
              {isSubmitting || isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>登録中...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>顧客登録</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}