import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';

export class WeatheringProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==================== Frontend Infrastructure ====================
    // S3 Bucket for React App
    const websiteBucket = new s3.Bucket(this, 'WeatheringWebsiteBucket', {
      bucketName: `weathering-project-frontend-${this.account}`,
      //websiteIndexDocument: 'index.html',
      //websiteErrorDocument: 'error.html',
      publicReadAccess: false,
      // 👇 OAI使用時の正しい設定
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true,
    });

    // CloudFront OAI
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
    
    // 👇 明示的なバケットポリシーを追加（重複削除）
    websiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [oai.grantPrincipal],
        actions: ['s3:GetObject'],
        resources: [websiteBucket.arnForObjects('*')],
      })
    );

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'WeatheringDistribution', {
      defaultBehavior: {
        // 👇 S3Originを使用（バケット設定修正で対応）
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // ==================== Authentication ====================
    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'WeatheringUserPool', {
      userPoolName: 'weathering-project-users',
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'WeatheringUserPoolClient', {
      userPool,
      authFlows: {
        userSrp: true,
        custom: true,
      },
      generateSecret: false,
      preventUserExistenceErrors: true,
    });

    // Identity Pool
    const identityPool = new cognito.CfnIdentityPool(this, 'WeatheringIdentityPool', {
      identityPoolName: 'weathering-project-identity',
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    // ==================== Database ====================
    // DynamoDB Table  
    const table = new dynamodb.Table(this, 'WeatheringProjectTable', {
      tableName: 'WeatheringProjectData',
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      // Provisioned Billing with Auto Scaling for better cost control
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI1
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING,
      },
      readCapacity: 3,
      writeCapacity: 3,
    });

    // GSI2
    table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: {
        name: 'GSI2PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI2SK',
        type: dynamodb.AttributeType.STRING,
      },
      readCapacity: 3,
      writeCapacity: 3,
    });

    // DynamoDB Auto Scaling設定
    const readScaling = table.autoScaleReadCapacity({
      minCapacity: 5,
      maxCapacity: 100,
    });
    readScaling.scaleOnUtilization({
      targetUtilizationPercent: 70,
    });

    const writeScaling = table.autoScaleWriteCapacity({
      minCapacity: 5,
      maxCapacity: 100,
    });
    writeScaling.scaleOnUtilization({
      targetUtilizationPercent: 70,
    });

    // ==================== Storage ====================
    // S3 Bucket for Data Storage
    const dataBucket = new s3.Bucket(this, 'WeatheringDataBucket', {
      bucketName: `weathering-project-data-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'delete-old-versions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
        {
          id: 'archive-old-data',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ==================== Lambda Layer ====================
    const lambdaLayer = new lambda.LayerVersion(this, 'WeatheringLambdaLayer', {
      code: lambda.Code.fromAsset('layers/nodejs'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Common dependencies for Weathering Project',
    });

    // ==================== Lambda Functions ====================
    // Lambda Execution Role
    const lambdaRole = new iam.Role(this, 'WeatheringLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB permissions
    table.grantReadWriteData(lambdaRole);
    dataBucket.grantReadWrite(lambdaRole);

    // Customer API Lambda
    const customerLambda = new lambda.Function(this, 'CustomerApiFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/customer-api'),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: dataBucket.bucketName,
        // DynamoDB Connection Pool最適化
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      role: lambdaRole,
      layers: [lambdaLayer],
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      reservedConcurrentExecutions: 10,
    });

    // Provisioned Concurrency for Customer API (高頻度アクセス想定)
    const customerLambdaAlias = customerLambda.addAlias('live', {
      provisionedConcurrentExecutions: 2,
    });

    // Project API Lambda
    const projectLambda = new lambda.Function(this, 'ProjectApiFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/project-api'),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: dataBucket.bucketName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      role: lambdaRole,
      layers: [lambdaLayer],
      timeout: cdk.Duration.seconds(20),
      memorySize: 384,
      reservedConcurrentExecutions: 15,
    });

    // Provisioned Concurrency for Project API
    const projectLambdaAlias = projectLambda.addAlias('live', {
      provisionedConcurrentExecutions: 3,
    });

    // Measurement API Lambda  
    const measurementLambda = new lambda.Function(this, 'MeasurementApiFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/measurement-api'),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: dataBucket.bucketName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      role: lambdaRole,
      layers: [lambdaLayer],
      timeout: cdk.Duration.seconds(25),
      memorySize: 512,
      reservedConcurrentExecutions: 20,
    });

    // Provisioned Concurrency for Measurement API (高頻度データ取得想定)
    const measurementLambdaAlias = measurementLambda.addAlias('live', {
      provisionedConcurrentExecutions: 5,
    });

    // Report Generator Lambda
    const reportLambda = new lambda.Function(this, 'ReportGeneratorFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/report-generator'),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: dataBucket.bucketName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      role: lambdaRole,
      layers: [lambdaLayer],
      timeout: cdk.Duration.minutes(3),
      memorySize: 768,
      reservedConcurrentExecutions: 5,
    });

    // Report Lambda は低頻度なのでProvisioned Concurrencyは設定しない

    // ML Prediction API Lambda
    const mlPredictionLambda = new lambda.Function(this, 'MLPredictionFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/ml-prediction-api'),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: dataBucket.bucketName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      role: lambdaRole,
      layers: [lambdaLayer],
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrentExecutions: 10,
    });

    // ML Prediction Lambda Alias
    const mlPredictionLambdaAlias = mlPredictionLambda.addAlias('live', {
      provisionedConcurrentExecutions: 2,
    });

    // ==================== API Gateway ====================
    const api = new apigateway.RestApi(this, 'WeatheringApi', {
      restApiName: 'Weathering Project API',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 200,
        throttlingBurstLimit: 400,
        // キャッシュ設定追加
        cachingEnabled: true,
        cacheClusterEnabled: true,
        cacheClusterSize: '0.5',
        cacheTtl: cdk.Duration.minutes(5),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // ==================== CloudWatch Monitoring ====================
    // Lambda関数のログ保持期間を設定してコスト削減
    new logs.LogGroup(this, 'CustomerLambdaLogGroup', {
      logGroupName: `/aws/lambda/${customerLambda.functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new logs.LogGroup(this, 'ProjectLambdaLogGroup', {
      logGroupName: `/aws/lambda/${projectLambda.functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new logs.LogGroup(this, 'MeasurementLambdaLogGroup', {
      logGroupName: `/aws/lambda/${measurementLambda.functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new logs.LogGroup(this, 'ReportLambdaLogGroup', {
      logGroupName: `/aws/lambda/${reportLambda.functionName}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new logs.LogGroup(this, 'MLPredictionLambdaLogGroup', {
      logGroupName: `/aws/lambda/${mlPredictionLambda.functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // パフォーマンス監視用のCloudWatch Alarm
    // Lambda Duration Alarm
    new cloudwatch.Alarm(this, 'CustomerLambdaDurationAlarm', {
      alarmName: 'customer-lambda-duration-high',
      metric: customerLambda.metricDuration(),
      threshold: 10000, // 10秒
      evaluationPeriods: 2,
      alarmDescription: 'Customer Lambda execution duration is too high',
    });

    // DynamoDB Throttle Alarm
    new cloudwatch.Alarm(this, 'DynamoDBThrottleAlarm', {
      alarmName: 'dynamodb-throttle-detected',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'UserErrors',
        dimensionsMap: {
          TableName: table.tableName,
        },
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'DynamoDB throttling detected',
    });

    // API Gateway Error Rate Alarm
    new cloudwatch.Alarm(this, 'ApiGateway4xxAlarm', {
      alarmName: 'api-gateway-4xx-errors',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '4XXError',
        dimensionsMap: {
          ApiName: api.restApiName,
        },
        statistic: 'Sum',
      }),
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'High 4XX error rate detected',
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'WeatheringAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: 'WeatheringAuthorizer',
    });

    // API Resources
    const apiResource = api.root.addResource('api');
    const customersResource = apiResource.addResource('customers');
    const customerResource = customersResource.addResource('{customerId}');
    const projectsResource = apiResource.addResource('projects');
    const projectResource = projectsResource.addResource('{projectId}');
    const measurementsResource = projectResource.addResource('measurements');
    const measurementResource = measurementsResource.addResource('{measurementId}');
    const measurementBatchResource = measurementsResource.addResource('batch');
    const reportsResource = projectResource.addResource('reports');
    const reportResource = reportsResource.addResource('{reportId}');
    const reportDownloadResource = reportResource.addResource('download');
    
    // ML Prediction API Resources
    const predictionsResource = projectResource.addResource('predictions');
    const co2PredictionResource = predictionsResource.addResource('co2-fixation');
    const anomaliesResource = projectResource.addResource('anomalies');
    const recommendationsResource = projectResource.addResource('recommendations');
    const modelsResource = apiResource.addResource('models');
    const trainResource = modelsResource.addResource('train');
    const modelResource = modelsResource.addResource('{modelId}');
    const performanceResource = modelResource.addResource('performance');

    // Customer endpoints
    // GET /api/customers - 顧客一覧取得
    customersResource.addMethod('GET', new apigateway.LambdaIntegration(customerLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    // POST /api/customers - 顧客作成
    customersResource.addMethod('POST', new apigateway.LambdaIntegration(customerLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/customers/{customerId} - 顧客詳細取得
    customerResource.addMethod('GET', new apigateway.LambdaIntegration(customerLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // PUT /api/customers/{customerId} - 顧客更新
    customerResource.addMethod('PUT', new apigateway.LambdaIntegration(customerLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // DELETE /api/customers/{customerId} - 顧客削除
    customerResource.addMethod('DELETE', new apigateway.LambdaIntegration(customerLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Project endpoints
    // GET /api/projects - プロジェクト一覧取得
    projectsResource.addMethod('GET', new apigateway.LambdaIntegration(projectLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    // POST /api/projects - プロジェクト作成
    projectsResource.addMethod('POST', new apigateway.LambdaIntegration(projectLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/projects/{projectId} - プロジェクト詳細取得
    projectResource.addMethod('GET', new apigateway.LambdaIntegration(projectLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // PUT /api/projects/{projectId} - プロジェクト更新
    projectResource.addMethod('PUT', new apigateway.LambdaIntegration(projectLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // DELETE /api/projects/{projectId} - プロジェクト削除
    projectResource.addMethod('DELETE', new apigateway.LambdaIntegration(projectLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Measurement endpoints
    // GET /api/projects/{projectId}/measurements - 測定データ一覧取得
    measurementsResource.addMethod('GET', new apigateway.LambdaIntegration(measurementLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    // POST /api/projects/{projectId}/measurements - 測定データ作成
    measurementsResource.addMethod('POST', new apigateway.LambdaIntegration(measurementLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/projects/{projectId}/measurements/{measurementId} - 測定データ詳細取得
    measurementResource.addMethod('GET', new apigateway.LambdaIntegration(measurementLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // PUT /api/projects/{projectId}/measurements/{measurementId} - 測定データ更新
    measurementResource.addMethod('PUT', new apigateway.LambdaIntegration(measurementLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // DELETE /api/projects/{projectId}/measurements/{measurementId} - 測定データ削除
    measurementResource.addMethod('DELETE', new apigateway.LambdaIntegration(measurementLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /api/projects/{projectId}/measurements/batch - 測定データバッチ作成
    measurementBatchResource.addMethod('POST', new apigateway.LambdaIntegration(measurementLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Report endpoints
    // POST /api/projects/{projectId}/reports - レポート生成
    reportsResource.addMethod('POST', new apigateway.LambdaIntegration(reportLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    // GET /api/projects/{projectId}/reports - レポート一覧取得
    reportsResource.addMethod('GET', new apigateway.LambdaIntegration(reportLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/projects/{projectId}/reports/{reportId} - レポート詳細取得
    reportResource.addMethod('GET', new apigateway.LambdaIntegration(reportLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // DELETE /api/projects/{projectId}/reports/{reportId} - レポート削除
    reportResource.addMethod('DELETE', new apigateway.LambdaIntegration(reportLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/projects/{projectId}/reports/{reportId}/download - レポートダウンロード
    reportDownloadResource.addMethod('GET', new apigateway.LambdaIntegration(reportLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ML Prediction endpoints
    // GET /api/projects/{projectId}/predictions/co2-fixation - CO2固定量予測
    co2PredictionResource.addMethod('GET', new apigateway.LambdaIntegration(mlPredictionLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestParameters: {
        'method.request.querystring.timeframe': false,
      },
    });

    // GET /api/projects/{projectId}/anomalies - 異常検出
    anomaliesResource.addMethod('GET', new apigateway.LambdaIntegration(mlPredictionLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestParameters: {
        'method.request.querystring.period': false,
      },
    });

    // GET /api/projects/{projectId}/recommendations - 最適化推奨
    recommendationsResource.addMethod('GET', new apigateway.LambdaIntegration(mlPredictionLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /api/models/train - モデル訓練開始
    trainResource.addMethod('POST', new apigateway.LambdaIntegration(mlPredictionLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/models/{modelId}/performance - モデル性能取得
    performanceResource.addMethod('GET', new apigateway.LambdaIntegration(mlPredictionLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ==================== Parameter Store ====================
    // Store configuration in Parameter Store
    new ssm.StringParameter(this, 'ApiEndpoint', {
      parameterName: '/weathering-project/api-endpoint',
      stringValue: api.url,
    });

    new ssm.StringParameter(this, 'UserPoolId', {
      parameterName: '/weathering-project/user-pool-id',
      stringValue: userPool.userPoolId,
    });

    new ssm.StringParameter(this, 'UserPoolClientId', {
      parameterName: '/weathering-project/user-pool-client-id',
      stringValue: userPoolClient.userPoolClientId,
    });

    new ssm.StringParameter(this, 'IdentityPoolId', {
      parameterName: '/weathering-project/identity-pool-id',
      stringValue: identityPool.ref,
    });

    new ssm.StringParameter(this, 'CloudFrontUrl', {
      parameterName: '/weathering-project/cloudfront-url',
      stringValue: `https://${distribution.distributionDomainName}`,
    });

    // ==================== Outputs ====================
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
    });

    new cdk.CfnOutput(this, 'ApiURL', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'UserPoolIdOutput', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientIdOutput', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 Website Bucket Name',
    });
  }
}