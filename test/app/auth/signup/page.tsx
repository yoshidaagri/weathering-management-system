'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/lib/auth-store';
import { SignUpData } from '@/lib/services/auth-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import Link from 'next/link';

interface SignUpFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName?: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, isLoading, error, clearError } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<SignUpFormData>({
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: SignUpFormData) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    clearError();

    try {
      const signUpData: SignUpData = {
        username: data.username,
        email: data.email,
        password: data.password,
        companyName: data.companyName || undefined,
      };

      await signUp(signUpData);
      router.push(`/auth/verify?username=${encodeURIComponent(data.username)}`);
    } catch (err) {
      console.error('SignUp failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            新規アカウント作成
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            または{' '}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              既存アカウントでログイン
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
                ユーザー名 <span className="text-red-500">*</span>
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register('username', {
                  required: 'ユーザー名は必須です',
                  minLength: {
                    value: 3,
                    message: 'ユーザー名は3文字以上で入力してください',
                  },
                  maxLength: {
                    value: 20,
                    message: 'ユーザー名は20文字以下で入力してください',
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: 'ユーザー名は英数字とアンダースコアのみ使用可能です',
                  },
                })}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register('email', {
                  required: 'メールアドレスは必須です',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: '正しいメールアドレスを入力してください',
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                会社名
              </label>
              <input
                id="companyName"
                type="text"
                autoComplete="organization"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register('companyName', {
                  maxLength: {
                    value: 100,
                    message: '会社名は100文字以下で入力してください',
                  },
                })}
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register('password', {
                  required: 'パスワードは必須です',
                  minLength: {
                    value: 8,
                    message: 'パスワードは8文字以上で入力してください',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                    message: 'パスワードは英大文字、英小文字、数字、記号をそれぞれ1文字以上含む必要があります',
                  },
                })}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
              <div className="mt-2 text-xs text-gray-600">
                <p>パスワードの要件：</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>8文字以上</li>
                  <li>英大文字、英小文字、数字、記号をそれぞれ1文字以上含む</li>
                </ul>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                パスワード確認 <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register('confirmPassword', {
                  required: 'パスワード確認は必須です',
                  validate: (value: string) => value === password || 'パスワードが一致しません',
                })}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={!isValid || isSubmitting || isLoading}
              className="w-full"
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  アカウント作成中...
                </div>
              ) : (
                'アカウントを作成'
              )}
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            アカウントを作成することで、利用規約とプライバシーポリシーに同意したことになります。
          </p>
        </div>
      </div>
    </div>
  );
}

// TODO: Cursor - 受入テスト実施