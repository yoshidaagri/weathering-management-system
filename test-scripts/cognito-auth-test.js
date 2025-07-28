const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');

// Cognito設定
const COGNITO_CONFIG = {
  userPoolId: 'ap-northeast-1_0x6iE6PNE',
  clientId: '50p1v64p38fnhqclm9ms8p1d6r',
  region: 'ap-northeast-1',
};

// テスト用ユーザー（実際の環境では環境変数から取得）
const TEST_USER = {
  email: 'test@example.com',
  password: 'TempPassword123!',
  tempPassword: 'TempPassword123!',
  newPassword: 'NewPassword123!',
};

// API Gateway エンドポイント
const API_BASE_URL = 'https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod';

/**
 * Cognito認証テストクラス
 */
class CognitoAuthTest {
  constructor() {
    this.idToken = null;
    this.accessToken = null;
    this.refreshToken = null;
  }

  /**
   * HTTPリクエストを送信
   */
  async makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (data) {
        req.write(data);
      }
      req.end();
    });
  }

  /**
   * Cognito SRP認証を実行
   */
  async authenticateWithCognito() {
    try {
      console.log('🔐 Cognito SRP認証を開始...');
      
      // Step 1: InitiateAuth
      const initiateAuthResponse = await this.initiateAuth();
      console.log('✅ InitiateAuth成功');
      
      // Step 2: RespondToAuthChallenge (パスワード認証)
      const authResponse = await this.respondToAuthChallenge(initiateAuthResponse);
      console.log('✅ 認証成功');
      
      // トークンを保存
      this.idToken = authResponse.idToken;
      this.accessToken = authResponse.accessToken;
      this.refreshToken = authResponse.refreshToken;
      
      console.log(`🎯 IDトークン取得: ${this.idToken?.substring(0, 50)}...`);
      return true;
      
    } catch (error) {
      console.error('❌ 認証失敗:', error.message);
      return false;
    }
  }

  /**
   * InitiateAuth API呼び出し
   */
  async initiateAuth() {
    const payload = {
      AuthFlow: 'USER_SRP_AUTH',
      ClientId: COGNITO_CONFIG.clientId,
      AuthParameters: {
        USERNAME: TEST_USER.email,
        SRP_A: this.generateSrpA(),
      },
    };

    const options = {
      hostname: `cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com`,
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
    };

    const response = await this.makeRequest(options, JSON.stringify(payload));
    
    if (response.statusCode !== 200) {
      throw new Error(`InitiateAuth failed: ${response.statusCode} ${response.body}`);
    }

    return JSON.parse(response.body);
  }

  /**
   * RespondToAuthChallenge API呼び出し
   */
  async respondToAuthChallenge(initiateAuthResponse) {
    const payload = {
      ChallengeName: 'PASSWORD_VERIFIER',
      ClientId: COGNITO_CONFIG.clientId,
      ChallengeResponses: {
        USERNAME: TEST_USER.email,
        PASSWORD_CLAIM_SECRET_BLOCK: initiateAuthResponse.ChallengeParameters.SECRET_BLOCK,
        PASSWORD_CLAIM_SIGNATURE: this.generatePasswordSignature(initiateAuthResponse),
      },
      Session: initiateAuthResponse.Session,
    };

    const options = {
      hostname: `cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com`,
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge',
      },
    };

    const response = await this.makeRequest(options, JSON.stringify(payload));
    
    if (response.statusCode !== 200) {
      throw new Error(`RespondToAuthChallenge failed: ${response.statusCode} ${response.body}`);
    }

    const result = JSON.parse(response.body);
    return {
      idToken: result.AuthenticationResult.IdToken,
      accessToken: result.AuthenticationResult.AccessToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
    };
  }

  /**
   * SRP A値を生成（簡易版）
   */
  generateSrpA() {
    // 実際の実装では、SRP（Secure Remote Password）プロトコルを使用
    // ここでは簡略化のため、ランダムな値を返す
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * パスワード署名を生成（簡易版）
   */
  generatePasswordSignature(initiateAuthResponse) {
    // 実際の実装では、SRPプロトコルに基づいてパスワード署名を生成
    // ここでは簡略化のため、ランダムな値を返す
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 認証付きAPIテストを実行
   */
  async runAuthenticatedAPITest() {
    if (!this.idToken) {
      console.error('❌ IDトークンが取得されていません');
      return false;
    }

    console.log('🚀 認証付きAPI統合テスト開始');
    
    const testEndpoints = [
      { method: 'GET', path: '/api/customers', name: '顧客一覧取得' },
      { method: 'GET', path: '/api/projects', name: 'プロジェクト一覧取得' },
    ];

    let passedTests = 0;
    let totalTests = testEndpoints.length;

    for (const endpoint of testEndpoints) {
      try {
        console.log(`Testing: ${endpoint.method} ${endpoint.path}`);
        
        const url = new URL(API_BASE_URL + endpoint.path);
        const options = {
          hostname: url.hostname,
          port: 443,
          path: url.pathname + url.search,
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.idToken}`,
          },
        };

        const response = await this.makeRequest(options);
        
        if (response.statusCode < 400) {
          console.log(`✅ ${endpoint.name} - Status: ${response.statusCode}`);
          passedTests++;
        } else {
          console.log(`❌ ${endpoint.name} - Status: ${response.statusCode}`);
          console.log(`Response: ${response.body.substring(0, 200)}`);
        }
        
      } catch (error) {
        console.log(`❌ ${endpoint.name} - Error: ${error.message}`);
      }
    }

    console.log(`\n📊 テスト結果: ${passedTests}/${totalTests} 成功`);
    return passedTests === totalTests;
  }
}

/**
 * 簡易認証テスト（パスワード認証を簡略化）
 */
async function runSimpleAuthTest() {
  console.log('🔐 簡易認証テスト開始');
  
  // AdminInitiateAuth を使用（管理者による認証）
  const payload = {
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    ClientId: COGNITO_CONFIG.clientId,
    UserPoolId: COGNITO_CONFIG.userPoolId,
    AuthParameters: {
      USERNAME: 'testuser@example.com',
      PASSWORD: 'TestPassword123!',
    },
  };

  const options = {
    hostname: `cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com`,
    port: 443,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminInitiateAuth',
      'Authorization': 'AWS4-HMAC-SHA256 Credential=...' // 実際には適切なAWS署名が必要
    },
  };

  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: body,
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(JSON.stringify(payload));
      req.end();
    });

    console.log(`認証レスポンス: ${response.statusCode}`);
    console.log(`レスポンス本文: ${response.body.substring(0, 200)}...`);
    
  } catch (error) {
    console.error('認証エラー:', error.message);
  }
}

/**
 * 認証なしエンドポイントテスト
 */
async function testPublicEndpoints() {
  console.log('🌐 認証なしエンドポイントテスト');
  
  const publicEndpoints = [
    { method: 'GET', path: '/health', name: 'ヘルスチェック' },
    { method: 'OPTIONS', path: '/api/customers', name: 'CORS プリフライト' },
  ];

  for (const endpoint of publicEndpoints) {
    try {
      const url = new URL(API_BASE_URL + endpoint.path);
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const response = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              body: body,
            });
          });
        });

        req.on('error', (err) => {
          reject(err);
        });

        req.end();
      });

      console.log(`${endpoint.name}: Status ${response.statusCode}`);
      
    } catch (error) {
      console.log(`${endpoint.name}: Error - ${error.message}`);
    }
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🧪 Cognito認証統合テスト開始');
  console.log('=' * 50);
  
  // 1. 認証なしエンドポイントテスト
  await testPublicEndpoints();
  
  console.log('\n' + '=' * 50);
  
  // 2. 簡易認証テスト
  await runSimpleAuthTest();
  
  console.log('\n' + '=' * 50);
  
  // 3. SRP認証テスト（本格的な認証）
  const authTest = new CognitoAuthTest();
  
  // 認証実行
  const authSuccess = await authTest.authenticateWithCognito();
  
  if (authSuccess) {
    // 認証付きAPIテスト実行
    await authTest.runAuthenticatedAPITest();
  } else {
    console.log('❌ 認証に失敗したため、APIテストをスキップします');
  }
  
  console.log('\n🎯 Cognito認証統合テスト完了');
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CognitoAuthTest, runSimpleAuthTest, testPublicEndpoints }; 