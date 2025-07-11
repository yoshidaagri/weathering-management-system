const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const AWS = require('aws-sdk');

// JWKS client setup for Cognito
const createJwksClient = (userPoolId, region = 'ap-northeast-1') => {
  return jwksClient({
    jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Cognito JWT Token 検証
 * @param {string} token - Bearer token (without 'Bearer ' prefix)
 * @param {string} userPoolId - Cognito User Pool ID
 * @param {string} region - AWS Region
 * @returns {Promise<Object>} - 検証結果とユーザー情報
 */
const validateCognitoToken = async (token, userPoolId, region = 'ap-northeast-1') => {
  try {
    // JWT header decode to get kid (key ID)
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || !decodedHeader.header.kid) {
      throw new Error('Invalid token header');
    }

    // Get signing key from Cognito JWKS
    const client = createJwksClient(userPoolId, region);
    const key = await new Promise((resolve, reject) => {
      client.getSigningKey(decodedHeader.header.kid, (err, key) => {
        if (err) {
          reject(err);
        } else {
          resolve(key.getPublicKey());
        }
      });
    });

    // Verify token signature and claims
    const decoded = jwt.verify(token, key, {
      algorithms: ['RS256'],
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    });

    // Additional validations
    if (decoded.token_use !== 'access' && decoded.token_use !== 'id') {
      throw new Error('Invalid token usage');
    }

    if (decoded.exp * 1000 < Date.now()) {
      throw new Error('Token expired');
    }

    return {
      isValid: true,
      decoded,
      userId: decoded.sub,
      username: decoded.username || decoded['cognito:username'],
      groups: decoded['cognito:groups'] || [],
    };
  } catch (error) {
    console.error('JWT validation error:', error.message);
    return {
      isValid: false,
      error: error.message,
    };
  }
};

/**
 * API Gateway event から JWT トークンを抽出・検証
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} - 認証結果
 */
const validateAuthFromEvent = async (event) => {
  try {
    // Authorization header check
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return { isValid: false, message: 'Authorization header required' };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return { isValid: false, message: 'Invalid authorization format' };
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (!token) {
      return { isValid: false, message: 'Token not provided' };
    }

    // Get Cognito configuration from environment
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const region = process.env.AWS_REGION || 'ap-northeast-1';

    if (!userPoolId) {
      console.error('COGNITO_USER_POOL_ID environment variable not set');
      return { isValid: false, message: 'Authentication configuration error' };
    }

    // Validate token with Cognito
    const validationResult = await validateCognitoToken(token, userPoolId, region);
    
    if (!validationResult.isValid) {
      return { 
        isValid: false, 
        message: `Token validation failed: ${validationResult.error}` 
      };
    }

    return {
      isValid: true,
      user: {
        userId: validationResult.userId,
        username: validationResult.username,
        groups: validationResult.groups,
      },
      token: validationResult.decoded,
    };
  } catch (error) {
    console.error('Auth validation error:', error);
    return { 
      isValid: false, 
      message: 'Authentication failed' 
    };
  }
};

/**
 * 開発環境用のシンプルな認証（本番では使用しない）
 * @param {Object} event - API Gateway event
 * @returns {Object} - 認証結果
 */
const validateAuthMock = (event) => {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, message: 'Authorization header required' };
  }

  // 開発環境ではトークンの存在のみをチェック
  return {
    isValid: true,
    user: {
      userId: 'mock-user-id',
      username: 'mock-user',
      groups: ['Users'],
    },
    token: { sub: 'mock-user-id' },
  };
};

/**
 * メイン認証検証関数（環境に応じて実装を切り替え）
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} - 認証結果
 */
const validateAuth = async (event) => {
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       process.env.STAGE === 'dev' ||
                       !process.env.COGNITO_USER_POOL_ID;

  if (isDevelopment) {
    console.log('Using mock authentication for development');
    return validateAuthMock(event);
  }

  return await validateAuthFromEvent(event);
};

module.exports = {
  validateAuth,
  validateCognitoToken,
  validateAuthFromEvent,
  validateAuthMock,
}; 