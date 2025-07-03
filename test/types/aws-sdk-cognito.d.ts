declare module '@aws-sdk/client-cognito-identity-provider' {
  export interface CognitoIdentityProviderClientConfig {
    region: string;
    credentials?: any;
  }

  export class CognitoIdentityProviderClient {
    constructor(config: CognitoIdentityProviderClientConfig);
    send(command: any): Promise<any>;
  }

  export interface SignUpCommandInput {
    ClientId: string;
    Username: string;
    Password: string;
    UserAttributes?: Array<{
      Name: string;
      Value: string;
    }>;
  }

  export interface SignUpCommandOutput {
    UserSub: string;
    CodeDeliveryDetails?: any;
  }

  export interface InitiateAuthCommandInput {
    ClientId: string;
    AuthFlow: string;
    AuthParameters: Record<string, string>;
  }

  export interface InitiateAuthCommandOutput {
    ChallengeName?: string;
    Session?: string;
    AuthenticationResult?: {
      AccessToken: string;
      IdToken: string;
      RefreshToken: string;
      ExpiresIn: number;
    };
  }

  export interface ConfirmSignUpCommandInput {
    ClientId: string;
    Username: string;
    ConfirmationCode: string;
  }

  export interface ConfirmSignUpCommandOutput {
    $metadata: any;
  }

  export interface ForgotPasswordCommandInput {
    ClientId: string;
    Username: string;
  }

  export interface ForgotPasswordCommandOutput {
    CodeDeliveryDetails?: any;
  }

  export interface ConfirmForgotPasswordCommandInput {
    ClientId: string;
    Username: string;
    ConfirmationCode: string;
    Password: string;
  }

  export interface ConfirmForgotPasswordCommandOutput {
    $metadata: any;
  }

  export interface ResendConfirmationCodeCommandInput {
    ClientId: string;
    Username: string;
  }

  export interface ResendConfirmationCodeCommandOutput {
    CodeDeliveryDetails?: any;
  }

  export interface GetUserCommandInput {
    AccessToken: string;
  }

  export interface GetUserCommandOutput {
    Username: string;
    UserAttributes: Array<{
      Name: string;
      Value: string;
    }>;
  }

  export class SignUpCommand {
    constructor(input: SignUpCommandInput);
  }

  export class InitiateAuthCommand {
    constructor(input: InitiateAuthCommandInput);
  }

  export class ConfirmSignUpCommand {
    constructor(input: ConfirmSignUpCommandInput);
  }

  export class ForgotPasswordCommand {
    constructor(input: ForgotPasswordCommandInput);
  }

  export class ConfirmForgotPasswordCommand {
    constructor(input: ConfirmForgotPasswordCommandInput);
  }

  export class ResendConfirmationCodeCommand {
    constructor(input: ResendConfirmationCodeCommandInput);
  }

  export class GetUserCommand {
    constructor(input: GetUserCommandInput);
  }
} 