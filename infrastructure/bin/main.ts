#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WeatheringProjectStack } from '../lib/main-stack';

const app = new cdk.App();
new WeatheringProjectStack(app, 'WeatheringProjectStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});