#!/bin/bash

# 風化促進プロジェクト AWS CDK デプロイスクリプト

set -e

# 環境変数の設定
ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-ap-northeast-1}
AWS_PROFILE=${AWS_PROFILE:-default}

echo "=================================="
echo "Weathering Project Deployment"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Profile: $AWS_PROFILE"
echo "=================================="

# 依存関係のインストール
echo "Installing dependencies..."
npm install

# Lambda Layerのビルド
echo "Building Lambda layer..."
cd layers/nodejs
npm install
cd ../..

# Lambda関数のビルド
echo "Building Lambda functions..."
for func in customer-api project-api measurement-api report-generator; do
  echo "Building $func..."
  cd lambda/$func
  npm install
  npm run build
  cd ../..
done

# CDKのブートストラップ（初回のみ）
if [ "$ENVIRONMENT" == "dev" ]; then
  echo "Bootstrapping CDK..."
  npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION --profile $AWS_PROFILE
fi

# CDKのデプロイ
echo "Deploying CDK stack..."
npx cdk deploy WeatheringProjectStack-$ENVIRONMENT \
  --context environment=$ENVIRONMENT \
  --profile $AWS_PROFILE \
  --require-approval never

# Parameter Storeの設定
echo "Setting up Parameter Store..."
aws ssm put-parameter \
  --name "/weathering-project/$ENVIRONMENT/deployment-date" \
  --value "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --type String \
  --overwrite \
  --profile $AWS_PROFILE \
  --region $AWS_REGION

echo "=================================="
echo "Deployment completed successfully!"
echo "=================================="

# アウトプットの表示
aws cloudformation describe-stacks \
  --stack-name WeatheringProjectStack-$ENVIRONMENT \
  --query 'Stacks[0].Outputs' \
  --profile $AWS_PROFILE \
  --region $AWS_REGION