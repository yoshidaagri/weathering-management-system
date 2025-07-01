// src/components/Menu.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Menu: React.FC = () => {
  const menuItems = [
    {
      title: 'シミュレーション',
      path: '/simulation',
      description: '事業計画シミュレーションを実行',
      bgColor: 'bg-blue-100'
    },
    {
      title: '測定データ管理',
      path: '/measurement',
      description: '実施場所の測定データを管理',
      bgColor: 'bg-green-100'
    },
    {
      title: '計画/実績検証',
      path: '/plan-actual',
      description: '事業計画の達成状況を分析',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          CO2固定管理システム
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${item.bgColor} p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200`}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {item.title}
              </h2>
              <p className="text-gray-600">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Menu;