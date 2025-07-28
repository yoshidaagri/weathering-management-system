'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FolderOpen, BarChart3, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const features = [
    {
      title: '顧客管理',
      description: '企業情報の登録・管理とプロジェクト関連付け',
      icon: Users,
      href: '/customers',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'プロジェクト管理',
      description: '風化促進CO2除去プロジェクトの計画・進捗管理',
      icon: FolderOpen,
      href: '/projects',
      color: 'bg-green-50 text-green-600',
    },
    {
      title: '測定データ管理',
      description: 'pH、温度、CO2濃度等の測定データ収集・分析',
      icon: BarChart3,
      href: '/measurements',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'レポート生成',
      description: 'MRV報告書・環境報告書の自動生成・管理',
      icon: FileText,
      href: '/reports',
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダーセクション */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            風化促進CO2除去・廃水処理システム
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            鉱山廃水における風化促進による二酸化炭素除去と廃水処理事業の
            包括的な管理プラットフォーム
          </p>
        </div>

        {/* 機能カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link href={feature.href}>
                    <Button className="w-full group">
                      <span>開始</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* システム概要 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>システムの特徴</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
                <div>
                  <h4 className="font-medium text-gray-900">統合管理</h4>
                  <p className="text-sm text-gray-600">
                    顧客からプロジェクト、測定データまで一元管理
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
                <div>
                  <h4 className="font-medium text-gray-900">リアルタイム監視</h4>
                  <p className="text-sm text-gray-600">
                    CO2固定量・水質データのリアルタイム追跡
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-purple-600 mt-2"></div>
                <div>
                  <h4 className="font-medium text-gray-900">自動レポート</h4>
                  <p className="text-sm text-gray-600">
                    MRV報告書の自動生成・コンプライアンス対応
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>技術仕様</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">フロントエンド</span>
                <span className="text-sm font-medium">Next.js 14 + TypeScript</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">バックエンド</span>
                <span className="text-sm font-medium">AWS Lambda + API Gateway</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">データベース</span>
                <span className="text-sm font-medium">DynamoDB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">認証</span>
                <span className="text-sm font-medium">AWS Cognito</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">APIエンドポイント</span>
                <span className="text-sm font-medium">26個稼働中</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}