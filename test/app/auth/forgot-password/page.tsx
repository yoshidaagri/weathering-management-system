'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import Link from 'next/link';

interface ForgotPasswordFormData {
  username: string;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentUsername, setSentUsername] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordFormData>({
    mode: 'onChange',
    defaultValues: {
      username: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    clearError();

    try {
      await forgotPassword(data.username);
      setSentUsername(data.username);
      setEmailSent(true);
    } catch (err) {
      console.error('Forgot password failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              パスワードリセット
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              パスワードリセットの手順を送信しました
            </p>
          </div>

          <Card className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                メールを送信しました
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                <strong>{sentUsername}</strong> にパスワードリセットの手順を送信しました。
                メールをご確認ください。
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/auth/login')}
                  className="w-full"
                >
                  ログイン画面に戻る
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEmailSent(false);
                    setSentUsername('');
                  }}
                  className="w-full"
                >
                  別のアカウントでリセット
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            パスワードを忘れた場合
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            ユーザー名を入力してください。パスワードリセットの手順をメールで送信します。
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
                ユーザー名またはメールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register('username', {
                  required: 'ユーザー名またはメールアドレスは必須です',
                  minLength: {
                    value: 2,
                    message: '2文字以上で入力してください',
                  },
                })}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
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
                  送信中...
                </div>
              ) : (
                'パスワードリセットメールを送信'
              )}
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            アカウントを思い出しましたか？{' '}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// TODO: Cursor - 受入テスト実施