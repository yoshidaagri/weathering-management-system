'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import Link from 'next/link';

interface VerifyFormData {
  confirmationCode: string;
}

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirmSignUp, resendConfirmationCode, isLoading, error, clearError } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [username, setUsername] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<VerifyFormData>({
    mode: 'onChange',
    defaultValues: {
      confirmationCode: '',
    },
  });

  useEffect(() => {
    const usernameParam = searchParams.get('username');
    if (usernameParam) {
      setUsername(usernameParam);
    } else {
      // ユーザー名が指定されていない場合は、サインアップページにリダイレクト
      router.push('/auth/signup');
    }
  }, [searchParams, router]);

  const onSubmit = async (data: VerifyFormData) => {
    if (isSubmitting || !username) return;
    
    setIsSubmitting(true);
    clearError();

    try {
      await confirmSignUp(username, data.confirmationCode);
      router.push('/auth/login?message=verification-success');
    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (isResending || !username) return;
    
    setIsResending(true);
    setResendSuccess(false);
    clearError();

    try {
      await resendConfirmationCode(username);
      setResendSuccess(true);
    } catch (err) {
      console.error('Resend failed:', err);
    } finally {
      setIsResending(false);
    }
  };

  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            メール確認
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            <strong>{username}</strong> に確認コードを送信しました。
            <br />
            メールをご確認ください。
          </p>
        </div>

        <Card className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <Alert variant="destructive">
                <span className="text-sm">{error}</span>
              </Alert>
            )}

            {resendSuccess && (
              <Alert>
                <span className="text-sm">確認コードを再送信しました。</span>
              </Alert>
            )}

            <div>
              <label htmlFor="confirmationCode" className="block text-sm font-medium text-gray-700">
                確認コード <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmationCode"
                type="text"
                autoComplete="one-time-code"
                placeholder="例: 123456"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
                {...register('confirmationCode', {
                  required: '確認コードは必須です',
                  pattern: {
                    value: /^[0-9]{6}$/,
                    message: '確認コードは6桁の数字で入力してください',
                  },
                })}
              />
              {errors.confirmationCode && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmationCode.message}</p>
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
                  確認中...
                </div>
              ) : (
                'アカウントを確認'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              確認コードが届いていませんか？
            </p>
            <Button
              variant="outline"
              onClick={handleResendCode}
              disabled={isResending}
              className="mt-2"
            >
              {isResending ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  再送信中...
                </div>
              ) : (
                '確認コードを再送信'
              )}
            </Button>
          </div>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            間違ったメールアドレスを入力しましたか？{' '}
            <Link
              href="/auth/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              戻る
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <VerifyForm />
    </Suspense>
  );
}

// TODO: Cursor - 受入テスト実施