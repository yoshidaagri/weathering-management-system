'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, LogIn, Building2 } from 'lucide-react';
import { isValidEmail } from '@/lib/utils';
import Link from 'next/link';

interface LoginFormData {
  username: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setSubmitError(null);
    clearError();

    try {
      await signIn(data.username, data.password);
      router.push('/');
    } catch (error: any) {
      setSubmitError(error.message || 'ログインに失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-3 rounded-full">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            システムにログイン
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            風化促進CO2除去・廃水処理システム
          </p>
        </div>

        {/* ログインフォーム */}
        <Card>
          <CardHeader>
            <CardTitle>ログイン</CardTitle>
            <CardDescription>
              アカウント情報を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* デモログイン情報 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-900 mb-2">デモログイン情報</h3>
              <p className="text-sm text-blue-700">
                メールアドレス: <code className="bg-blue-100 px-1 rounded">demo@example.com</code><br/>
                パスワード: <code className="bg-blue-100 px-1 rounded">password123</code>
              </p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ユーザー名 / メールアドレス
                </label>
                <Input
                  {...register('username', {
                    required: 'ユーザー名またはメールアドレスは必須です',
                    minLength: {
                      value: 3,
                      message: 'ユーザー名は3文字以上で入力してください',
                    },
                  })}
                  type="text"
                  placeholder="ユーザー名またはメールアドレス"
                  className={errors.username ? 'border-red-500' : ''}
                  autoComplete="username"
                />
                {errors.username && (
                  <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード
                </label>
                <div className="relative">
                  <Input
                    {...register('password', {
                      required: 'パスワードは必須です',
                      minLength: {
                        value: 8,
                        message: 'パスワードは8文字以上で入力してください',
                      },
                    })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="パスワード"
                    className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    ログイン状態を保持
                  </label>
                </div>

                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  パスワードを忘れた方
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>ログイン中...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>ログイン</span>
                  </>
                )}
              </Button>
            </form>

            {/* 開発用テストボタン */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-3">開発環境用</p>
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => {
                    // 開発用のテストクレデンシャルを自動入力
                    const event = { target: { value: 'admin' } };
                    register('username').onChange(event);
                    register('password').onChange({ target: { value: 'AdminPass123!' } });
                  }}
                >
                  テスト用ログイン情報を入力
                </Button>
                <p className="text-xs text-gray-400 mt-2">
                  ユーザー名: admin / パスワード: AdminPass123!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* フッター */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は{' '}
            <Link href="/auth/signup" className="text-blue-600 hover:text-blue-500">
              こちらからサインアップ
            </Link>
          </p>
        </div>

        {/* システム情報 */}
        <div className="text-center">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900 mb-2">システム情報</h3>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <span className="font-medium">フロントエンド:</span>
                <br />
                Next.js 14 + TypeScript
              </div>
              <div>
                <span className="font-medium">認証:</span>
                <br />
                AWS Cognito
              </div>
              <div>
                <span className="font-medium">API:</span>
                <br />
                26エンドポイント稼働中
              </div>
              <div>
                <span className="font-medium">データベース:</span>
                <br />
                DynamoDB
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}