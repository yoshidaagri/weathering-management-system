'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/lib/auth-store';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

interface ForgotPasswordData {
  username: string;
}

interface ResetPasswordData {
  confirmationCode: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ForgotPasswordForm({ onSuccess, onSwitchToLogin }: ForgotPasswordFormProps) {
  const { forgotPassword, confirmForgotPassword, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [username, setUsername] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm();

  const newPassword = watch('newPassword');

  const onSubmitRequest = async (data: ForgotPasswordData) => {
    try {
      clearError();
      await forgotPassword(data.username);
      setUsername(data.username);
      setStep('reset');
      reset();
    } catch (error) {
      // エラーはstore内で処理済み
    }
  };

  const onSubmitReset = async (data: ResetPasswordData) => {
    try {
      clearError();
      await confirmForgotPassword(username, data.confirmationCode, data.newPassword);
      onSuccess?.();
    } catch (error) {
      // エラーはstore内で処理済み
    }
  };

  if (step === 'reset') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold text-center mb-6">パスワードリセット</h2>
          
          <p className="text-sm text-gray-600 mb-4">
            {username} に確認コードを送信しました。メールをご確認の上、新しいパスワードを設定してください。
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmitReset)} className="space-y-4">
            <div>
              <label htmlFor="confirmationCode" className="block text-sm font-medium text-gray-700 mb-1">
                確認コード *
              </label>
              <input
                id="confirmationCode"
                type="text"
                {...register('confirmationCode', { 
                  required: '確認コードは必須です',
                  pattern: { value: /^\d{6}$/, message: '確認コードは6桁の数字です' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123456"
                disabled={isLoading}
              />
              {errors.confirmationCode && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmationCode.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード *
              </label>
              <input
                id="newPassword"
                type="password"
                {...register('newPassword', { 
                  required: 'パスワードは必須です',
                  minLength: { value: 8, message: 'パスワードは8文字以上である必要があります' },
                  pattern: { 
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 
                    message: 'パスワードは大文字、小文字、数字を含む必要があります' 
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="新しいパスワード"
                disabled={isLoading}
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード確認 *
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword', { 
                  required: 'パスワード確認は必須です',
                  validate: value => value === newPassword || 'パスワードが一致しません'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="パスワードを再入力"
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md"
            >
              {isLoading ? 'パスワード変更中...' : 'パスワード変更'}
            </button>
          </form>

          <div className="mt-4">
            {onSwitchToLogin && (
              <button
                onClick={onSwitchToLogin}
                className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
                disabled={isLoading}
              >
                ログインに戻る
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-6">パスワードを忘れた場合</h2>
        
        <p className="text-sm text-gray-600 mb-4">
          ユーザー名を入力してください。パスワードリセット用の確認コードをメールで送信します。
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmitRequest)} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              ユーザー名 *
            </label>
            <input
              id="username"
              type="text"
              {...register('username', { 
                required: 'ユーザー名は必須です',
                minLength: { value: 3, message: 'ユーザー名は3文字以上である必要があります' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ユーザー名を入力"
              disabled={isLoading}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md"
          >
            {isLoading ? '送信中...' : '確認コードを送信'}
          </button>
        </form>

        <div className="mt-6">
          {onSwitchToLogin && (
            <div className="text-center text-sm text-gray-600">
              <button
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-800 underline"
                disabled={isLoading}
              >
                ログインに戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}