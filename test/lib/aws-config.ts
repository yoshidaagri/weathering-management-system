import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

export interface AWSConfig {
  region: string;
  userPoolId: string;
  clientId: string;
}

export const getAWSConfig = (): AWSConfig => {
  const config: AWSConfig = {
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1',
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'mock-user-pool',
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || 'mock-client-id',
  };

  return config;
};

export const getCognitoClient = (): CognitoIdentityProviderClient => {
  const config = getAWSConfig();
  
  return new CognitoIdentityProviderClient({
    region: config.region,
  });
};