/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    AWS_REGION: process.env.AWS_REGION || 'ap-northeast-1',
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
    API_GATEWAY_URL: process.env.API_GATEWAY_URL,
  },
}

module.exports = nextConfig