"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatheringProjectStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const cognito = require("aws-cdk-lib/aws-cognito");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");
const iam = require("aws-cdk-lib/aws-iam");
const ssm = require("aws-cdk-lib/aws-ssm");
const cloudwatch = require("aws-cdk-lib/aws-cloudwatch");
const logs = require("aws-cdk-lib/aws-logs");
class WeatheringProjectStack extends cdk.Stack {
    constructor(scope, id, props) {
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
        websiteBucket.addToResourcePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [oai.grantPrincipal],
            actions: ['s3:GetObject'],
            resources: [websiteBucket.arnForObjects('*')],
        }));
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
            threshold: 10000,
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
exports.WeatheringProjectStack = WeatheringProjectStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4tc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLHlDQUF5QztBQUN6Qyx5REFBeUQ7QUFDekQsOERBQThEO0FBQzlELHFEQUFxRDtBQUNyRCxtREFBbUQ7QUFDbkQseURBQXlEO0FBQ3pELGlEQUFpRDtBQUNqRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLHlEQUF5RDtBQUN6RCw2Q0FBNkM7QUFFN0MsTUFBYSxzQkFBdUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNuRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLG9FQUFvRTtRQUNwRSwwQkFBMEI7UUFDMUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNuRSxVQUFVLEVBQUUsK0JBQStCLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDekQscUNBQXFDO1lBQ3JDLHFDQUFxQztZQUNyQyxnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLGtCQUFrQjtZQUNsQixpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxVQUFVLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVU7WUFDMUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtZQUN2QyxTQUFTLEVBQUUsSUFBSTtTQUNoQixDQUFDLENBQUM7UUFFSCxpQkFBaUI7UUFDakIsTUFBTSxHQUFHLEdBQUcsSUFBSSxVQUFVLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTdELDJCQUEyQjtRQUMzQixhQUFhLENBQUMsbUJBQW1CLENBQy9CLElBQUksR0FBRyxDQUFDLGVBQWUs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LFNBQVMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO1lBQ2hDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRztZQUNkLFdBQVcsRUFBRSxpQkFBaUI7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVU7WUFDMUIsV0FBVyxFQUFFLHNCQUFzQjtTQUNwQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ2hELEtBQUssRUFBRSxjQUFjLENBQUMsZ0JBQWdCO1lBQ3RDLFdBQVcsRUFBRSw2QkFBNkI7U0FDM0MsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNsRCxLQUFLLEVBQUUsWUFBWSxDQUFDLGNBQWM7WUFDbEMsV0FBVyxFQUFFLDRCQUE0QjtTQUMxQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0QyxLQUFLLEVBQUUsYUFBYSxDQUFDLFVBQVU7WUFDL0IsV0FBVyxFQUFFLHdCQUF3QjtTQUN0QyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF0cUJELHdEQXNxQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBzc20gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuXG5leHBvcnQgY2xhc3MgV2VhdGhlcmluZ1Byb2plY3RTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09IEZyb250ZW5kIEluZnJhc3RydWN0dXJlID09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUzMgQnVja2V0IGZvciBSZWFjdCBBcHBcbiAgICBjb25zdCB3ZWJzaXRlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnV2VhdGhlcmluZ1dlYnNpdGVCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgd2VhdGhlcmluZy1wcm9qZWN0LWZyb250ZW5kLSR7dGhpcy5hY2NvdW50fWAsXG4gICAgICAvL3dlYnNpdGVJbmRleERvY3VtZW50OiAnaW5kZXguaHRtbCcsXG4gICAgICAvL3dlYnNpdGVFcnJvckRvY3VtZW50OiAnZXJyb3IuaHRtbCcsXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgIC8vIPCfkYcgT0FJ5L2/55So5pmC44Gu5q2j44GX44GE6Kit5a6aXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQ2xvdWRGcm9udCBPQUlcbiAgICBjb25zdCBvYWkgPSBuZXcgY2xvdWRmcm9udC5PcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLCAnT0FJJyk7XG4gICAgXG4gICAgLy8g8J+RhyDmmI7npLrnmoTjgarjg5DjgrHjg4Pjg4jjg53jg6rjgrfjg7zjgpLov73liqDvvIjph43opIfliYrpmaTvvIlcbiAgICB3ZWJzaXRlQnVja2V0LmFkZFRvUmVzb3VyY2VQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgcHJpbmNpcGFsczogW29haS5ncmFudFByaW5jaXBhbF0sXG4gICAgICAgIGFjdGlvbnM6IFsnczM6R2V0T2JqZWN0J10sXG4gICAgICAgIHJlc291cmNlczogW3dlYnNpdGVCdWNrZXQuYXJuRm9yT2JqZWN0cygnKicpXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIENsb3VkRnJvbnQgRGlzdHJpYnV0aW9uXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdXZWF0aGVyaW5nRGlzdHJpYnV0aW9uJywge1xuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIC8vIPCfkYcgUzNPcmlnaW7jgpLkvb/nlKjvvIjjg5DjgrHjg4Pjg4joqK3lrprkv67mraPjgaflr77lv5zvvIlcbiAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih3ZWJzaXRlQnVja2V0LCB7XG4gICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHk6IG9haSxcbiAgICAgICAgfSksXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgIH0sXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09IEF1dGhlbnRpY2F0aW9uID09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQ29nbml0byBVc2VyIFBvb2xcbiAgICBjb25zdCB1c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdXZWF0aGVyaW5nVXNlclBvb2wnLCB7XG4gICAgICB1c2VyUG9vbE5hbWU6ICd3ZWF0aGVyaW5nLXByb2plY3QtdXNlcnMnLFxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IGZhbHNlLFxuICAgICAgc2lnbkluQWxpYXNlczoge1xuICAgICAgICBlbWFpbDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBhdXRvVmVyaWZ5OiB7XG4gICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHBhc3N3b3JkUG9saWN5OiB7XG4gICAgICAgIG1pbkxlbmd0aDogOCxcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IHRydWUsXG4gICAgICB9LFxuICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgIH0pO1xuXG4gICAgLy8gVXNlciBQb29sIENsaWVudFxuICAgIGNvbnN0IHVzZXJQb29sQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQodGhpcywgJ1dlYXRoZXJpbmdVc2VyUG9vbENsaWVudCcsIHtcbiAgICAgIHVzZXJQb29sLFxuICAgICAgYXV0aEZsb3dzOiB7XG4gICAgICAgIHVzZXJTcnA6IHRydWUsXG4gICAgICAgIGN1c3RvbTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBnZW5lcmF0ZVNlY3JldDogZmFsc2UsXG4gICAgICBwcmV2ZW50VXNlckV4aXN0ZW5jZUVycm9yczogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIElkZW50aXR5IFBvb2xcbiAgICBjb25zdCBpZGVudGl0eVBvb2wgPSBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2wodGhpcywgJ1dlYXRoZXJpbmdJZGVudGl0eVBvb2wnLCB7XG4gICAgICBpZGVudGl0eVBvb2xOYW1lOiAnd2VhdGhlcmluZy1wcm9qZWN0LWlkZW50aXR5JyxcbiAgICAgIGFsbG93VW5hdXRoZW50aWNhdGVkSWRlbnRpdGllczogZmFsc2UsXG4gICAgICBjb2duaXRvSWRlbnRpdHlQcm92aWRlcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNsaWVudElkOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICAgIHByb3ZpZGVyTmFtZTogdXNlclBvb2wudXNlclBvb2xQcm92aWRlck5hbWUsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT0gRGF0YWJhc2UgPT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBEeW5hbW9EQiBUYWJsZSAgXG4gICAgY29uc3QgdGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1dlYXRoZXJpbmdQcm9qZWN0VGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6ICdXZWF0aGVyaW5nUHJvamVjdERhdGEnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICdQSycsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ1NLJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgLy8gUHJvdmlzaW9uZWQgQmlsbGluZyB3aXRoIEF1dG8gU2NhbGluZyBmb3IgYmV0dGVyIGNvc3QgY29udHJvbFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBST1ZJU0lPTkVELFxuICAgICAgcmVhZENhcGFjaXR5OiA1LFxuICAgICAgd3JpdGVDYXBhY2l0eTogNSxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICBzdHJlYW06IGR5bmFtb2RiLlN0cmVhbVZpZXdUeXBlLk5FV19BTkRfT0xEX0lNQUdFUyxcbiAgICB9KTtcblxuICAgIC8vIEdTSTFcbiAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdHU0kxJyxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAnR1NJMVBLJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiAnR1NJMVNLJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgcmVhZENhcGFjaXR5OiAzLFxuICAgICAgd3JpdGVDYXBhY2l0eTogMyxcbiAgICB9KTtcblxuICAgIC8vIEdTSTJcbiAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdHU0kyJyxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAnR1NJMlBLJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiAnR1NJMlNLJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgcmVhZENhcGFjaXR5OiAzLFxuICAgICAgd3JpdGVDYXBhY2l0eTogMyxcbiAgICB9KTtcblxuICAgIC8vIER5bmFtb0RCIEF1dG8gU2NhbGluZ+ioreWumlxuICAgIGNvbnN0IHJlYWRTY2FsaW5nID0gdGFibGUuYXV0b1NjYWxlUmVhZENhcGFjaXR5KHtcbiAgICAgIG1pbkNhcGFjaXR5OiA1LFxuICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcbiAgICB9KTtcbiAgICByZWFkU2NhbGluZy5zY2FsZU9uVXRpbGl6YXRpb24oe1xuICAgICAgdGFyZ2V0VXRpbGl6YXRpb25QZXJjZW50OiA3MCxcbiAgICB9KTtcblxuICAgIGNvbnN0IHdyaXRlU2NhbGluZyA9IHRhYmxlLmF1dG9TY2FsZVdyaXRlQ2FwYWNpdHkoe1xuICAgICAgbWluQ2FwYWNpdHk6IDUsXG4gICAgICBtYXhDYXBhY2l0eTogMTAwLFxuICAgIH0pO1xuICAgIHdyaXRlU2NhbGluZy5zY2FsZU9uVXRpbGl6YXRpb24oe1xuICAgICAgdGFyZ2V0VXRpbGl6YXRpb25QZXJjZW50OiA3MCxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09IFN0b3JhZ2UgPT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBTMyBCdWNrZXQgZm9yIERhdGEgU3RvcmFnZVxuICAgIGNvbnN0IGRhdGFCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdXZWF0aGVyaW5nRGF0YUJ1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGB3ZWF0aGVyaW5nLXByb2plY3QtZGF0YS0ke3RoaXMuYWNjb3VudH1gLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ2RlbGV0ZS1vbGQtdmVyc2lvbnMnLFxuICAgICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdhcmNoaXZlLW9sZC1kYXRhJyxcbiAgICAgICAgICB0cmFuc2l0aW9uczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5JTkZSRVFVRU5UX0FDQ0VTUyxcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygzMCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5HTEFDSUVSLFxuICAgICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDkwKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PSBMYW1iZGEgTGF5ZXIgPT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBsYW1iZGFMYXllciA9IG5ldyBsYW1iZGEuTGF5ZXJWZXJzaW9uKHRoaXMsICdXZWF0aGVyaW5nTGFtYmRhTGF5ZXInLCB7XG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xheWVycy9ub2RlanMnKSxcbiAgICAgIGNvbXBhdGlibGVSdW50aW1lczogW2xhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YXSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29tbW9uIGRlcGVuZGVuY2llcyBmb3IgV2VhdGhlcmluZyBQcm9qZWN0JyxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09IExhbWJkYSBGdW5jdGlvbnMgPT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBMYW1iZGEgRXhlY3V0aW9uIFJvbGVcbiAgICBjb25zdCBsYW1iZGFSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdXZWF0aGVyaW5nTGFtYmRhUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IER5bmFtb0RCIHBlcm1pc3Npb25zXG4gICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpO1xuICAgIGRhdGFCdWNrZXQuZ3JhbnRSZWFkV3JpdGUobGFtYmRhUm9sZSk7XG5cbiAgICAvLyBDdXN0b21lciBBUEkgTGFtYmRhXG4gICAgY29uc3QgY3VzdG9tZXJMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDdXN0b21lckFwaUZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9jdXN0b21lci1hcGknKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IHRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQlVDS0VUX05BTUU6IGRhdGFCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgLy8gRHluYW1vREIgQ29ubmVjdGlvbiBQb29s5pyA6YGp5YyWXG4gICAgICAgIEFXU19OT0RFSlNfQ09OTkVDVElPTl9SRVVTRV9FTkFCTEVEOiAnMScsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIGxheWVyczogW2xhbWJkYUxheWVyXSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDE1KSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDEwLFxuICAgIH0pO1xuXG4gICAgLy8gUHJvdmlzaW9uZWQgQ29uY3VycmVuY3kgZm9yIEN1c3RvbWVyIEFQSSAo6auY6aC75bqm44Ki44Kv44K744K55oOz5a6aKVxuICAgIGNvbnN0IGN1c3RvbWVyTGFtYmRhQWxpYXMgPSBjdXN0b21lckxhbWJkYS5hZGRBbGlhcygnbGl2ZScsIHtcbiAgICAgIHByb3Zpc2lvbmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDIsXG4gICAgfSk7XG5cbiAgICAvLyBQcm9qZWN0IEFQSSBMYW1iZGFcbiAgICBjb25zdCBwcm9qZWN0TGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUHJvamVjdEFwaUZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wcm9qZWN0LWFwaScpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogdGFibGUudGFibGVOYW1lLFxuICAgICAgICBCVUNLRVRfTkFNRTogZGF0YUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICBBV1NfTk9ERUpTX0NPTk5FQ1RJT05fUkVVU0VfRU5BQkxFRDogJzEnLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICBsYXllcnM6IFtsYW1iZGFMYXllcl0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygyMCksXG4gICAgICBtZW1vcnlTaXplOiAzODQsXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAxNSxcbiAgICB9KTtcblxuICAgIC8vIFByb3Zpc2lvbmVkIENvbmN1cnJlbmN5IGZvciBQcm9qZWN0IEFQSVxuICAgIGNvbnN0IHByb2plY3RMYW1iZGFBbGlhcyA9IHByb2plY3RMYW1iZGEuYWRkQWxpYXMoJ2xpdmUnLCB7XG4gICAgICBwcm92aXNpb25lZENvbmN1cnJlbnRFeGVjdXRpb25zOiAzLFxuICAgIH0pO1xuXG4gICAgLy8gTWVhc3VyZW1lbnQgQVBJIExhbWJkYSAgXG4gICAgY29uc3QgbWVhc3VyZW1lbnRMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdNZWFzdXJlbWVudEFwaUZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9tZWFzdXJlbWVudC1hcGknKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IHRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQlVDS0VUX05BTUU6IGRhdGFCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgQVdTX05PREVKU19DT05ORUNUSU9OX1JFVVNFX0VOQUJMRUQ6ICcxJyxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgbGF5ZXJzOiBbbGFtYmRhTGF5ZXJdLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMjUpLFxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMjAsXG4gICAgfSk7XG5cbiAgICAvLyBQcm92aXNpb25lZCBDb25jdXJyZW5jeSBmb3IgTWVhc3VyZW1lbnQgQVBJICjpq5jpoLvluqbjg4fjg7zjgr/lj5blvpfmg7PlrpopXG4gICAgY29uc3QgbWVhc3VyZW1lbnRMYW1iZGFBbGlhcyA9IG1lYXN1cmVtZW50TGFtYmRhLmFkZEFsaWFzKCdsaXZlJywge1xuICAgICAgcHJvdmlzaW9uZWRDb25jdXJyZW50RXhlY3V0aW9uczogNSxcbiAgICB9KTtcblxuICAgIC8vIFJlcG9ydCBHZW5lcmF0b3IgTGFtYmRhXG4gICAgY29uc3QgcmVwb3J0TGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUmVwb3J0R2VuZXJhdG9yRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3JlcG9ydC1nZW5lcmF0b3InKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IHRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQlVDS0VUX05BTUU6IGRhdGFCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgQVdTX05PREVKU19DT05ORUNUSU9OX1JFVVNFX0VOQUJMRUQ6ICcxJyxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgbGF5ZXJzOiBbbGFtYmRhTGF5ZXJdLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMyksXG4gICAgICBtZW1vcnlTaXplOiA3NjgsXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiA1LFxuICAgIH0pO1xuXG4gICAgLy8gUmVwb3J0IExhbWJkYSDjga/kvY7poLvluqbjgarjga7jgadQcm92aXNpb25lZCBDb25jdXJyZW5jeeOBr+ioreWumuOBl+OBquOBhFxuXG4gICAgLy8gTUwgUHJlZGljdGlvbiBBUEkgTGFtYmRhXG4gICAgY29uc3QgbWxQcmVkaWN0aW9uTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnTUxQcmVkaWN0aW9uRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL21sLXByZWRpY3Rpb24tYXBpJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiB0YWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEJVQ0tFVF9OQU1FOiBkYXRhQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgIEFXU19OT0RFSlNfQ09OTkVDVElPTl9SRVVTRV9FTkFCTEVEOiAnMScsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIGxheWVyczogW2xhbWJkYUxheWVyXSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDEwLFxuICAgIH0pO1xuXG4gICAgLy8gTUwgUHJlZGljdGlvbiBMYW1iZGEgQWxpYXNcbiAgICBjb25zdCBtbFByZWRpY3Rpb25MYW1iZGFBbGlhcyA9IG1sUHJlZGljdGlvbkxhbWJkYS5hZGRBbGlhcygnbGl2ZScsIHtcbiAgICAgIHByb3Zpc2lvbmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDIsXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PSBBUEkgR2F0ZXdheSA9PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ1dlYXRoZXJpbmdBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogJ1dlYXRoZXJpbmcgUHJvamVjdCBBUEknLFxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6ICdwcm9kJyxcbiAgICAgICAgdGhyb3R0bGluZ1JhdGVMaW1pdDogMjAwLFxuICAgICAgICB0aHJvdHRsaW5nQnVyc3RMaW1pdDogNDAwLFxuICAgICAgICAvLyDjgq3jg6Pjg4Pjgrfjg6XoqK3lrprov73liqBcbiAgICAgICAgY2FjaGluZ0VuYWJsZWQ6IHRydWUsXG4gICAgICAgIGNhY2hlQ2x1c3RlckVuYWJsZWQ6IHRydWUsXG4gICAgICAgIGNhY2hlQ2x1c3RlclNpemU6ICcwLjUnLFxuICAgICAgICBjYWNoZVR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICB9LFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJ10sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT0gQ2xvdWRXYXRjaCBNb25pdG9yaW5nID09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gTGFtYmRh6Zai5pWw44Gu44Ot44Kw5L+d5oyB5pyf6ZaT44KS6Kit5a6a44GX44Gm44Kz44K544OI5YmK5ribXG4gICAgbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0N1c3RvbWVyTGFtYmRhTG9nR3JvdXAnLCB7XG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2xhbWJkYS8ke2N1c3RvbWVyTGFtYmRhLmZ1bmN0aW9uTmFtZX1gLFxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ1Byb2plY3RMYW1iZGFMb2dHcm91cCcsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvbGFtYmRhLyR7cHJvamVjdExhbWJkYS5mdW5jdGlvbk5hbWV9YCxcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdNZWFzdXJlbWVudExhbWJkYUxvZ0dyb3VwJywge1xuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9sYW1iZGEvJHttZWFzdXJlbWVudExhbWJkYS5mdW5jdGlvbk5hbWV9YCxcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdSZXBvcnRMYW1iZGFMb2dHcm91cCcsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvbGFtYmRhLyR7cmVwb3J0TGFtYmRhLmZ1bmN0aW9uTmFtZX1gLFxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuVFdPX1dFRUtTLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdNTFByZWRpY3Rpb25MYW1iZGFMb2dHcm91cCcsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvbGFtYmRhLyR7bWxQcmVkaWN0aW9uTGFtYmRhLmZ1bmN0aW9uTmFtZX1gLFxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8g44OR44OV44Kp44O844Oe44Oz44K555uj6KaW55So44GuQ2xvdWRXYXRjaCBBbGFybVxuICAgIC8vIExhbWJkYSBEdXJhdGlvbiBBbGFybVxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdDdXN0b21lckxhbWJkYUR1cmF0aW9uQWxhcm0nLCB7XG4gICAgICBhbGFybU5hbWU6ICdjdXN0b21lci1sYW1iZGEtZHVyYXRpb24taGlnaCcsXG4gICAgICBtZXRyaWM6IGN1c3RvbWVyTGFtYmRhLm1ldHJpY0R1cmF0aW9uKCksXG4gICAgICB0aHJlc2hvbGQ6IDEwMDAwLCAvLyAxMOenklxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQ3VzdG9tZXIgTGFtYmRhIGV4ZWN1dGlvbiBkdXJhdGlvbiBpcyB0b28gaGlnaCcsXG4gICAgfSk7XG5cbiAgICAvLyBEeW5hbW9EQiBUaHJvdHRsZSBBbGFybVxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdEeW5hbW9EQlRocm90dGxlQWxhcm0nLCB7XG4gICAgICBhbGFybU5hbWU6ICdkeW5hbW9kYi10aHJvdHRsZS1kZXRlY3RlZCcsXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9EeW5hbW9EQicsXG4gICAgICAgIG1ldHJpY05hbWU6ICdVc2VyRXJyb3JzJyxcbiAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgIFRhYmxlTmFtZTogdGFibGUudGFibGVOYW1lLFxuICAgICAgICB9LFxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgfSksXG4gICAgICB0aHJlc2hvbGQ6IDEsXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdEeW5hbW9EQiB0aHJvdHRsaW5nIGRldGVjdGVkJyxcbiAgICB9KTtcblxuICAgIC8vIEFQSSBHYXRld2F5IEVycm9yIFJhdGUgQWxhcm1cbiAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQXBpR2F0ZXdheTR4eEFsYXJtJywge1xuICAgICAgYWxhcm1OYW1lOiAnYXBpLWdhdGV3YXktNHh4LWVycm9ycycsXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcbiAgICAgICAgbWV0cmljTmFtZTogJzRYWEVycm9yJyxcbiAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgIEFwaU5hbWU6IGFwaS5yZXN0QXBpTmFtZSxcbiAgICAgICAgfSxcbiAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcbiAgICAgIH0pLFxuICAgICAgdGhyZXNob2xkOiAxMCxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0hpZ2ggNFhYIGVycm9yIHJhdGUgZGV0ZWN0ZWQnLFxuICAgIH0pO1xuXG4gICAgLy8gQ29nbml0byBBdXRob3JpemVyXG4gICAgY29uc3QgYXV0aG9yaXplciA9IG5ldyBhcGlnYXRld2F5LkNvZ25pdG9Vc2VyUG9vbHNBdXRob3JpemVyKHRoaXMsICdXZWF0aGVyaW5nQXV0aG9yaXplcicsIHtcbiAgICAgIGNvZ25pdG9Vc2VyUG9vbHM6IFt1c2VyUG9vbF0sXG4gICAgICBhdXRob3JpemVyTmFtZTogJ1dlYXRoZXJpbmdBdXRob3JpemVyJyxcbiAgICB9KTtcblxuICAgIC8vIEFQSSBSZXNvdXJjZXNcbiAgICBjb25zdCBhcGlSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdhcGknKTtcbiAgICBjb25zdCBjdXN0b21lcnNSZXNvdXJjZSA9IGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdjdXN0b21lcnMnKTtcbiAgICBjb25zdCBjdXN0b21lclJlc291cmNlID0gY3VzdG9tZXJzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tjdXN0b21lcklkfScpO1xuICAgIGNvbnN0IHByb2plY3RzUmVzb3VyY2UgPSBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgncHJvamVjdHMnKTtcbiAgICBjb25zdCBwcm9qZWN0UmVzb3VyY2UgPSBwcm9qZWN0c1Jlc291cmNlLmFkZFJlc291cmNlKCd7cHJvamVjdElkfScpO1xuICAgIGNvbnN0IG1lYXN1cmVtZW50c1Jlc291cmNlID0gcHJvamVjdFJlc291cmNlLmFkZFJlc291cmNlKCdtZWFzdXJlbWVudHMnKTtcbiAgICBjb25zdCBtZWFzdXJlbWVudFJlc291cmNlID0gbWVhc3VyZW1lbnRzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3ttZWFzdXJlbWVudElkfScpO1xuICAgIGNvbnN0IG1lYXN1cmVtZW50QmF0Y2hSZXNvdXJjZSA9IG1lYXN1cmVtZW50c1Jlc291cmNlLmFkZFJlc291cmNlKCdiYXRjaCcpO1xuICAgIGNvbnN0IHJlcG9ydHNSZXNvdXJjZSA9IHByb2plY3RSZXNvdXJjZS5hZGRSZXNvdXJjZSgncmVwb3J0cycpO1xuICAgIGNvbnN0IHJlcG9ydFJlc291cmNlID0gcmVwb3J0c1Jlc291cmNlLmFkZFJlc291cmNlKCd7cmVwb3J0SWR9Jyk7XG4gICAgY29uc3QgcmVwb3J0RG93bmxvYWRSZXNvdXJjZSA9IHJlcG9ydFJlc291cmNlLmFkZFJlc291cmNlKCdkb3dubG9hZCcpO1xuICAgIFxuICAgIC8vIE1MIFByZWRpY3Rpb24gQVBJIFJlc291cmNlc1xuICAgIGNvbnN0IHByZWRpY3Rpb25zUmVzb3VyY2UgPSBwcm9qZWN0UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3ByZWRpY3Rpb25zJyk7XG4gICAgY29uc3QgY28yUHJlZGljdGlvblJlc291cmNlID0gcHJlZGljdGlvbnNSZXNvdXJjZS5hZGRSZXNvdXJjZSgnY28yLWZpeGF0aW9uJyk7XG4gICAgY29uc3QgYW5vbWFsaWVzUmVzb3VyY2UgPSBwcm9qZWN0UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2Fub21hbGllcycpO1xuICAgIGNvbnN0IHJlY29tbWVuZGF0aW9uc1Jlc291cmNlID0gcHJvamVjdFJlc291cmNlLmFkZFJlc291cmNlKCdyZWNvbW1lbmRhdGlvbnMnKTtcbiAgICBjb25zdCBtb2RlbHNSZXNvdXJjZSA9IGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdtb2RlbHMnKTtcbiAgICBjb25zdCB0cmFpblJlc291cmNlID0gbW9kZWxzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3RyYWluJyk7XG4gICAgY29uc3QgbW9kZWxSZXNvdXJjZSA9IG1vZGVsc1Jlc291cmNlLmFkZFJlc291cmNlKCd7bW9kZWxJZH0nKTtcbiAgICBjb25zdCBwZXJmb3JtYW5jZVJlc291cmNlID0gbW9kZWxSZXNvdXJjZS5hZGRSZXNvdXJjZSgncGVyZm9ybWFuY2UnKTtcblxuICAgIC8vIEN1c3RvbWVyIGVuZHBvaW50c1xuICAgIC8vIEdFVCAvYXBpL2N1c3RvbWVycyAtIOmhp+WuouS4gOimp+WPluW+l1xuICAgIGN1c3RvbWVyc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3VzdG9tZXJMYW1iZGEpLCB7XG4gICAgICBhdXRob3JpemVyLFxuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcbiAgICB9KTtcbiAgICBcbiAgICAvLyBQT1NUIC9hcGkvY3VzdG9tZXJzIC0g6aGn5a6i5L2c5oiQXG4gICAgY3VzdG9tZXJzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3VzdG9tZXJMYW1iZGEpLCB7XG4gICAgICBhdXRob3JpemVyLFxuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcbiAgICB9KTtcblxuICAgIC8vIEdFVCAvYXBpL2N1c3RvbWVycy97Y3VzdG9tZXJJZH0gLSDpoaflrqLoqbPntLDlj5blvpdcbiAgICBjdXN0b21lclJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3VzdG9tZXJMYW1iZGEpLCB7XG4gICAgICBhdXRob3JpemVyLFxuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcbiAgICB9KTtcblxuICAgIC8vIFBVVCAvYXBpL2N1c3RvbWVycy97Y3VzdG9tZXJJZH0gLSDpoaflrqLmm7TmlrBcbiAgICBjdXN0b21lclJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3VzdG9tZXJMYW1iZGEpLCB7XG4gICAgICBhdXRob3JpemVyLFxuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcbiAgICB9KTtcblxuICAgIC8vIERFTEVURSAvYXBpL2N1c3RvbWVycy97Y3VzdG9tZXJJZH0gLSDpoaflrqLliYrpmaRcbiAgICBjdXN0b21lclJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3VzdG9tZXJMYW1iZGEpLCB7XG4gICAgICBhdXRob3JpemVyLFxuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcbiAgICB9KTtcblxuICAgIC8vIFByb2plY3QgZW5kcG9pbnRzXG4gICAgLy8gR0VUIC9hcGkvcHJvamVjdHMgLSDjg5fjg63jgrjjgqfjgq/jg4jkuIDopqflj5blvpdcbiAgICBwcm9qZWN0c1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvamVjdExhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH0pO1xuICAgIFxuICAgIC8vIFBPU1QgL2FwaS9wcm9qZWN0cyAtIOODl+ODreOCuOOCp+OCr+ODiOS9nOaIkFxuICAgIHByb2plY3RzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvamVjdExhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH0pO1xuXG4gICAgLy8gR0VUIC9hcGkvcHJvamVjdHMve3Byb2plY3RJZH0gLSDjg5fjg63jgrjjgqfjgq/jg4joqbPntLDlj5blvpdcbiAgICBwcm9qZWN0UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9qZWN0TGFtYmRhKSwge1xuICAgICAgYXV0aG9yaXplcixcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlnYXRld2F5LkF1dGhvcml6YXRpb25UeXBlLkNPR05JVE8sXG4gICAgfSk7XG5cbiAgICAvLyBQVVQgL2FwaS9wcm9qZWN0cy97cHJvamVjdElkfSAtIOODl+ODreOCuOOCp+OCr+ODiOabtOaWsFxuICAgIHByb2plY3RSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb2plY3RMYW1iZGEpLCB7XG4gICAgICBhdXRob3JpemVyLFxuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcbiAgICB9KTtcblxuICAgIC8vIERFTEVURSAvYXBpL3Byb2plY3RzL3twcm9qZWN0SWR9IC0g44OX44Ot44K444Kn44Kv44OI5YmK6ZmkXG4gICAgcHJvamVjdFJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvamVjdExhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH0pO1xuXG4gICAgLy8gTWVhc3VyZW1lbnQgZW5kcG9pbnRzXG4gICAgLy8gR0VUIC9hcGkvcHJvamVjdHMve3Byb2plY3RJZH0vbWVhc3VyZW1lbnRzIC0g5ris5a6a44OH44O844K/5LiA6Kan5Y+W5b6XXG4gICAgbWVhc3VyZW1lbnRzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihtZWFzdXJlbWVudExhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH0pO1xuICAgIFxuICAgIC8vIFBPU1QgL2FwaS9wcm9qZWN0cy97cHJvamVjdElkfS9tZWFzdXJlbWVudHMgLSDmuKzlrprjg4fjg7zjgr/kvZzmiJBcbiAgICBtZWFzdXJlbWVudHNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihtZWFzdXJlbWVudExhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH0pO1xuXG4gICAgLy8gR0VUIC9hcGkvcHJvamVjdHMve3Byb2plY3RJZH0vbWVhc3VyZW1lbnRzL3ttZWFzdXJlbWVudElkfSAtIOa4rOWumuODh+ODvOOCv+ips+e0sOWPluW+l1xuICAgIG1lYXN1cmVtZW50UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihtZWFzdXJlbWVudExhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH0pO1xuXG4gICAgLy8gUFVUIC9hcGkvcHJvamVjdHMve3Byb2plY3RJZH0vbWVhc3VyZW1lbnRzL3ttZWFzdXJlbWVudElkfSAtIOa4rOWumuODh+ODvOOCv+abtOaWsFxuICAgIG1lYXN1cmVtZW50UmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihtZWFzdXJlbWVudExhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH0pO1xuXG4gICAgLy8gREVMRVRFIC9hcGkvcHJvamVjdHMve3Byb2plY3RJZH0vbWVhc3VyZW1lbnRzL3ttZWFzdXJlbWVudElkfSAtIOa4rOWumuODh+ODvOOCv+WJiumZpFxuICAgIG1lYXN1cmVtZW50UmVzb3VyY2UuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihtZWFzdXJlbWVudExhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH0pO1xuXG4gICAgLy8gUE9TVCAvYXBpL3Byb2plY3RzL3twcm9qZWN0SWR9L21lYXN1cmVtZW50cy9iYXRjaCAtIOa4rOWumuODh+ODvOOCv+ODkOODg+ODgeS9nOaIkFxuICAgIG1lYXN1cmVtZW50QmF0Y2hSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihtZWFzdXJlbWVudExhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH0pO1xuXG4gICAgLy8gUmVwb3J0IGVuZHBvaW50c1xuICAgIC8vIFBPU1QgL2FwaS9wcm9qZWN0cy97cHJvamVjdElkfS9yZXBvcnRzIC0g44Os44Od44O844OI55Sf5oiQXG4gICAgcmVwb3J0c1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJlcG9ydExhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH0pO1xuICAgIFxuICAgIC8vIEdFVCAvYXBpL3Byb2plY3RzL3twcm9qZWN0SWR9L3JlcG9ydHMgLSDjg6zjg53jg7zjg4jkuIDopqflj5blvpdcbiAgICByZXBvcnRzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyZXBvcnRMYW1iZGEpLCB7XG4gICAgICBhdXRob3JpemVyLFxuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcbiAgICB9KTtcblxuICAgIC8vIEdFVCAvYXBpL3Byb2plY3RzL3twcm9qZWN0SWR9L3JlcG9ydHMve3JlcG9ydElkfSAtIOODrOODneODvOODiOips+e0sOWPluW+l1xuICAgIHJlcG9ydFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmVwb3J0TGFtYmRhKSwge1xuICAgICAgYXV0aG9yaXplcixcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlnYXRld2F5LkF1dGhvcml6YXRpb25UeXBlLkNPR05JVE8sXG4gICAgfSk7XG5cbiAgICAvLyBERUxFVEUgL2FwaS9wcm9qZWN0cy97cHJvamVjdElkfS9yZXBvcnRzL3tyZXBvcnRJZH0gLSDjg6zjg53jg7zjg4jliYrpmaRcbiAgICByZXBvcnRSZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJlcG9ydExhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH0pO1xuXG4gICAgLy8gR0VUIC9hcGkvcHJvamVjdHMve3Byb2plY3RJZH0vcmVwb3J0cy97cmVwb3J0SWR9L2Rvd25sb2FkIC0g44Os44Od44O844OI44OA44Km44Oz44Ot44O844OJXG4gICAgcmVwb3J0RG93bmxvYWRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJlcG9ydExhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH0pO1xuXG4gICAgLy8gTUwgUHJlZGljdGlvbiBlbmRwb2ludHNcbiAgICAvLyBHRVQgL2FwaS9wcm9qZWN0cy97cHJvamVjdElkfS9wcmVkaWN0aW9ucy9jbzItZml4YXRpb24gLSBDTzLlm7rlrprph4/kuojmuKxcbiAgICBjbzJQcmVkaWN0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihtbFByZWRpY3Rpb25MYW1iZGEpLCB7XG4gICAgICBhdXRob3JpemVyLFxuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdtZXRob2QucmVxdWVzdC5xdWVyeXN0cmluZy50aW1lZnJhbWUnOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBHRVQgL2FwaS9wcm9qZWN0cy97cHJvamVjdElkfS9hbm9tYWxpZXMgLSDnlbDluLjmpJzlh7pcbiAgICBhbm9tYWxpZXNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKG1sUHJlZGljdGlvbkxhbWJkYSksIHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgICAgcmVxdWVzdFBhcmFtZXRlcnM6IHtcbiAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LnF1ZXJ5c3RyaW5nLnBlcmlvZCc6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEdFVCAvYXBpL3Byb2plY3RzL3twcm9qZWN0SWR9L3JlY29tbWVuZGF0aW9ucyAtIOacgOmBqeWMluaOqOWlqFxuICAgIHJlY29tbWVuZGF0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24obWxQcmVkaWN0aW9uTGFtYmRhKSwge1xuICAgICAgYXV0aG9yaXplcixcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlnYXRld2F5LkF1dGhvcml6YXRpb25UeXBlLkNPR05JVE8sXG4gICAgfSk7XG5cbiAgICAvLyBQT1NUIC9hcGkvbW9kZWxzL3RyYWluIC0g44Oi44OH44Or6KiT57e06ZaL5aeLXG4gICAgdHJhaW5SZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihtbFByZWRpY3Rpb25MYW1iZGEpLCB7XG4gICAgICBhdXRob3JpemVyLFxuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcbiAgICB9KTtcblxuICAgIC8vIEdFVCAvYXBpL21vZGVscy97bW9kZWxJZH0vcGVyZm9ybWFuY2UgLSDjg6Ljg4fjg6vmgKfog73lj5blvpdcbiAgICBwZXJmb3JtYW5jZVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24obWxQcmVkaWN0aW9uTGFtYmRhKSwge1xuICAgICAgYXV0aG9yaXplcixcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlnYXRld2F5LkF1dGhvcml6YXRpb25UeXBlLkNPR05JVE8sXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PSBQYXJhbWV0ZXIgU3RvcmUgPT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBTdG9yZSBjb25maWd1cmF0aW9uIGluIFBhcmFtZXRlciBTdG9yZVxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdBcGlFbmRwb2ludCcsIHtcbiAgICAgIHBhcmFtZXRlck5hbWU6ICcvd2VhdGhlcmluZy1wcm9qZWN0L2FwaS1lbmRwb2ludCcsXG4gICAgICBzdHJpbmdWYWx1ZTogYXBpLnVybCxcbiAgICB9KTtcblxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdVc2VyUG9vbElkJywge1xuICAgICAgcGFyYW1ldGVyTmFtZTogJy93ZWF0aGVyaW5nLXByb2plY3QvdXNlci1wb29sLWlkJyxcbiAgICAgIHN0cmluZ1ZhbHVlOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgIH0pO1xuXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiAnL3dlYXRoZXJpbmctcHJvamVjdC91c2VyLXBvb2wtY2xpZW50LWlkJyxcbiAgICAgIHN0cmluZ1ZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgIH0pO1xuXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ0lkZW50aXR5UG9vbElkJywge1xuICAgICAgcGFyYW1ldGVyTmFtZTogJy93ZWF0aGVyaW5nLXByb2plY3QvaWRlbnRpdHktcG9vbC1pZCcsXG4gICAgICBzdHJpbmdWYWx1ZTogaWRlbnRpdHlQb29sLnJlZixcbiAgICB9KTtcblxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdDbG91ZEZyb250VXJsJywge1xuICAgICAgcGFyYW1ldGVyTmFtZTogJy93ZWF0aGVyaW5nLXByb2plY3QvY2xvdWRmcm9udC11cmwnLFxuICAgICAgc3RyaW5nVmFsdWU6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09IE91dHB1dHMgPT09PT09PT09PT09PT09PT09PT1cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2Vic2l0ZVVSTCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgRGlzdHJpYnV0aW9uIFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVVJMJywge1xuICAgICAgdmFsdWU6IGFwaS51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZE91dHB1dCcsIHtcbiAgICAgIHZhbHVlOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xDbGllbnRJZE91dHB1dCcsIHtcbiAgICAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBDbGllbnQgSUQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Nsb3VkRnJvbnREaXN0cmlidXRpb25JZCcsIHtcbiAgICAgIHZhbHVlOiBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgRGlzdHJpYnV0aW9uIElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTM0J1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogd2Vic2l0ZUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTMyBXZWJzaXRlIEJ1Y2tldCBOYW1lJyxcbiAgICB9KTtcbiAgfVxufSJdfQ==