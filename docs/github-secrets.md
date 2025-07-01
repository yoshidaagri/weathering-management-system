# GitHub Secrets 設定ガイド

## 必要なSecrets

リポジトリの Settings > Secrets and variables > Actions で以下のSecretsを設定してください。

### 開発環境用

| Secret名 | 説明 | 取得方法 |
|----------|------|----------|
| AWS_ACCESS_KEY_ID_DEV | 開発環境用AWSアクセスキー | IAMユーザー作成時に取得 |
| AWS_SECRET_ACCESS_KEY_DEV | 開発環境用AWSシークレットキー | IAMユーザー作成時に取得 |
| AWS_ACCOUNT_ID | AWSアカウントID | AWSコンソールから確認 |
| CLOUDFRONT_DISTRIBUTION_ID_DEV | 開発環境CloudFront ID | CDKデプロイ後に取得 |

### 本番環境用

| Secret名 | 説明 | 取得方法 |
|----------|------|----------|
| AWS_ACCESS_KEY_ID_PROD | 本番環境用AWSアクセスキー | IAMユーザー作成時に取得 |
| AWS_SECRET_ACCESS_KEY_PROD | 本番環境用AWSシークレットキー | IAMユーザー作成時に取得 |
| CLOUDFRONT_DISTRIBUTION_ID_PROD | 本番環境CloudFront ID | CDKデプロイ後に取得 |

### 通知用

| Secret名 | 説明 | 取得方法 |
|----------|------|----------|
| SLACK_WEBHOOK | Slack通知用Webhook URL | Slack Appから取得 |

## IAMポリシー

GitHub Actions用のIAMユーザーには以下のポリシーをアタッチしてください：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "cognito-idp:*",
        "cloudfront:*",
        "iam:*",
        "logs:*",
        "events:*",
        "states:*",
        "ssm:*"
      ],
      "Resource": "*"
    }
  ]
}