/** @type {import('next').NextConfig} */
const nextConfig = {
  // 開発環境では静的エクスポートを無効化（動的ルート対応）
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    trailingSlash: true,
  }),
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod',
    NEXT_PUBLIC_USER_POOL_ID: process.env.NEXT_PUBLIC_USER_POOL_ID || 'ap-northeast-1_BEnyexqxY',
    NEXT_PUBLIC_USER_POOL_CLIENT_ID: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '2gqqmrdorakjgq7ahuvlq5f9e2',
    NEXT_PUBLIC_REGION: process.env.NEXT_PUBLIC_REGION || 'ap-northeast-1'
  }
}

module.exports = nextConfig