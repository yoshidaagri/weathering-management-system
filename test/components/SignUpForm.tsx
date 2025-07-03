'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../lib/auth-store';
import { SignUpData } from '../lib/cognito';

interface SignUpFormData extends SignUpData {
  confirmPassword: string;
}

interface SignUpFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function SignUpForm({ onSuccess, onSwitchToLogin }: SignUpFormProps) {
  const { signUp, confirmSignUp, resendConfirmationCode, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState<'signup' | 'confirm'>('signup');
  const [username, setUsername] = useState('');

  const {
    register: registerSignUp,
    handleSubmit: handleSubmitSignUp,
    formState: { errors: errorsSignUp },
    watch,
    reset: resetSignUp,
  } = useForm<SignUpFormData>();

  const {
    register: registerConfirm,
    handleSubmit: handleSubmitConfirm,
    formState: { errors: errorsConfirm },
  } = useForm<{ confirmationCode: string }>();

  const password = watch('password');

  const onSubmitSignUp = async (data: SignUpFormData) => {
    try {
      clearError();
      await signUp({
        username: data.username,
        password: data.password,
        email: data.email,
        companyName: data.companyName,
      });
      setUsername(data.username);
      setStep('confirm');
      resetSignUp();
    } catch (error) {
      // エラーはstore内で処理済み
    }
  };

  const onSubmitConfirm = async (data: { confirmationCode: string }) => {
    try {
      clearError();
      await confirmSignUp(username, data.confirmationCode);
      onSuccess?.();
    } catch (error) {
      // エラーはstore内で処理済み
    }
  };

  const handleResendCode = async () => {
    try {
      clearError();
      await resendConfirmationCode(username);
    } catch (error) {
      // エラーはstore内で処理済み
    }
  };

  if (step === 'confirm') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold text-center mb-6">確認</h2>
          
          <p className="text-sm text-gray-600 mb-4">
            {username} に確認コードを送信しました。メールをご確認ください。
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmitConfirm(onSubmitConfirm)} className="space-y-4">
            <div>
              <label htmlFor="confirmationCode" className="block text-sm font-medium text-gray-700 mb-1">
                確認コード
              </label>
              <input
                id="confirmationCode"
                type="text"
                {...registerConfirm('confirmationCode', { 
                  required: '確認コードは必須です',
                  pattern: { value: /^\d{6}$/, message: '確認コードは6桁の数字です' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123456"
                disabled={isLoading}
              />
              {errorsConfirm.confirmationCode && (
                <p className="mt-1 text-sm text-red-600">{errorsConfirm.confirmationCode.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md"
            >
              {isLoading ? '確認中...' : '確認'}
            </button>
          </form>

          <div className="mt-4 space-y-2">
            <button
              onClick={handleResendCode}
              disabled={isLoading}
              className="w-full text-sm text-blue-600 hover:text-blue-800 underline"
            >
              確認コードを再送信
            </button>
            
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
        <h2 className="text-2xl font-bold text-center mb-6">新規登録</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmitSignUp(onSubmitSignUp)} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              ユーザー名 *
            </label>
            <input
              id="username"
              type="text"
              {...registerSignUp('username', { 
                required: 'ユーザー名は必須です',
                minLength: { value: 3, message: 'ユーザー名は3文字以上である必要があります' },
                pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'ユーザー名は半角英数字とアンダースコアのみ使用できます' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="username"
              disabled={isLoading}
            />
            {errorsSignUp.username && (
              <p className="mt-1 text-sm text-red-600">{errorsSignUp.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス *
            </label>
            <input
              id="email"
              type="email"
              {...registerSignUp('email', { 
                required: 'メールアドレスは必須です',
                pattern: { value: /^\S+@\S+\.\S+$/, message: '有効なメールアドレスを入力してください' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@company.com"
              disabled={isLoading}
            />
            {errorsSignUp.email && (
              <p className="mt-1 text-sm text-red-600">{errorsSignUp.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              会社名
            </label>
            <input
              id="companyName"
              type="text"
              {...registerSignUp('companyName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="株式会社○○"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              パスワード *
            </label>
            <input
              id="password"
              type="password"
              {...registerSignUp('password', { 
                required: 'パスワードは必須です',
                minLength: { value: 8, message: 'パスワードは8文字以上である必要があります' },
                pattern: { 
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 
                  message: 'パスワードは大文字、小文字、数字を含む必要があります' 
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="パスワードを入力"
              disabled={isLoading}
            />
            {errorsSignUp.password && (
              <p className="mt-1 text-sm text-red-600">{errorsSignUp.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              パスワード確認 *
            </label>
            <input
              id="confirmPassword"
              type="password"
              {...registerSignUp('confirmPassword', { 
                required: 'パスワード確認は必須です',
                validate: (value: string) => value === password || 'パスワードが一致しません'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="パスワードを再入力"
              disabled={isLoading}
            />
            {errorsSignUp.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errorsSignUp.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md"
          >
            {isLoading ? '登録中...' : '新規登録'}
          </button>
        </form>

        <div className="mt-6 text-center">
          {onSwitchToLogin && (
            <div className="text-sm text-gray-600">
              既にアカウントをお持ちの場合は{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-800 underline"
                disabled={isLoading}
              >
                ログイン
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}