'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// SVGアイコンコンポーネント
const BarChart3 = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const LineChart = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
);

const MapPin = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const FileText = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Users = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const Database = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

export default function Home() {
  const menuItems = [
    {
      title: "事業計画シミュレーション",
      description: "CO2固定量とコスト効果を事前検証",
      icon: BarChart3,
      href: "/simulation",
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "計画/実績検証",
      description: "計画と実績の比較分析ダッシュボード",
      icon: LineChart,
      href: "/plan-actual",
      color: "bg-green-100 text-green-600"
    },
    {
      title: "モニタリングマップ",
      description: "リアルタイム測定データと地理的分布",
      icon: MapPin,
      href: "/monitoring",
      color: "bg-purple-100 text-purple-600"
    },
    {
      title: "測定データ管理",
      description: "pH、温度、流量などの測定データ入力・管理",
      icon: Database,
      href: "/measurements",
      color: "bg-orange-100 text-orange-600"
    },
    {
      title: "プロジェクト管理",
      description: "事業プロジェクトの作成・編集・進捗管理",
      icon: Users,
      href: "/projects",
      color: "bg-pink-100 text-pink-600"
    },
    {
      title: "レポート生成",
      description: "MRV報告書・環境報告書の自動生成",
      icon: FileText,
      href: "/reports",
      color: "bg-indigo-100 text-indigo-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            風化促進CO2除去事業管理システム
          </h1>
          <p className="text-xl text-gray-600">
            鉱山廃水における風化促進による二酸化炭素除去と廃水処理事業の管理システム
          </p>
          <div className="mt-4 px-4 py-2 bg-green-100 text-green-800 rounded-full inline-block">
            <span className="text-sm font-medium">✓ システム構築完了 - 開発環境稼働中</span>
          </div>
        </div>

        {/* メニューグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${item.color} group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* 開発情報 */}
        <div className="mt-12 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">開発環境情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">ローカル開発:</span>
              <span className="ml-2 text-blue-600">http://localhost:3000</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">AWS本番:</span>
              <span className="ml-2 text-blue-600">https://dikwcz6haxnrb.cloudfront.net</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">状態:</span>
              <span className="ml-2 text-green-600">● 稼働中</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}