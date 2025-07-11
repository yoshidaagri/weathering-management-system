'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/lib/auth-store';
import { LoginCredentials } from '@/lib/services/auth-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import Link from 'next/link';

interface LoginFormData {
  username: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginFormData>({
    mode: 'onChange',
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // フォームの値を監視
  const username = watch('username');
  const password = watch('password');
  
  // カスタムバリデーション（開発環境では緩和）
  const isFormValid = username.trim().length >= 2 && password.length >= 1;

  const onSubmit = async (data: LoginFormData) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    clearError();

    try {
      const credentials: LoginCredentials = {
        username: data.username,
        password: data.password,
      };

      await signIn(credentials);
      router.push('/projects');
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 開発用：認証不要モックダッシュボードに直接アクセス
  const goToMockDashboard = () => {
    // 認証をスキップして直接モックダッシュボードへ遷移
    router.push('/mock-dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            アカウントにログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            または{' '}
            <Link
              href="/auth/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              新規アカウントを作成
            </Link>
          </p>
        </div>

        <Card className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <Alert variant="destructive">
                <span className="text-sm">{error}</span>
              </Alert>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                ユーザー名またはメールアドレス
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="admin（開発用テスト）"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register('username', {
                  required: 'ユーザー名は必須です',
                  minLength: {
                    value: 2,
                    message: 'ユーザー名は2文字以上で入力してください',
                  },
                })}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="password（開発用テスト）"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register('password', {
                  required: 'パスワードは必須です',
                  minLength: {
                    value: 1, // 開発環境では1文字以上に緩和
                    message: 'パスワードを入力してください',
                  },
                })}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                パスワードをお忘れですか？
              </Link>
            </div>

            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting || isLoading}
              className="w-full"
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ログイン中...
                </div>
              ) : (
                'ログイン'
              )}
            </Button>
          </form>

          {/* 開発用：モックダッシュボードへの直接アクセス */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-2">開発用アクセス</p>
            <Button
              type="button"
              onClick={goToMockDashboard}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              🚀 認証不要モックダッシュボード
            </Button>
            <p className="text-xs text-gray-400 text-center mt-1">
              認証をスキップしてダッシュボードを確認
            </p>
          </div>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            風化促進CO2除去・廃水処理事業管理システム
          </p>
        </div>
      </div>
    </div>
  );
}

// TODO: Cursor - 受入テスト実施