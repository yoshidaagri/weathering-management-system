import { defineConfig, devices } from '@playwright/test';

/**
 * PlaywrightE2Eテスト設定
 * 風化促進CO2除去事業管理システム
 */
export default defineConfig({
  testDir: './e2e',
  
  /* 並列実行設定 */
  fullyParallel: true,
  
  /* CI環境では失敗時のリトライを無効化 */
  forbidOnly: !!process.env.CI,
  
  /* CI環境でのリトライ設定 */
  retries: process.env.CI ? 2 : 0,
  
  /* 並列実行ワーカー数 */
  workers: process.env.CI ? 1 : undefined,
  
  /* レポート設定 */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  /* 共通設定 */
  use: {
    /* ベースURL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* トレース設定 */
    trace: 'on-first-retry',
    
    /* スクリーンショット設定 */
    screenshot: 'only-on-failure',
    
    /* ビデオ録画 */
    video: 'retain-on-failure',
    
    /* ActionTimeout */
    actionTimeout: 30000,
    
    /* NavigationTimeout */
    navigationTimeout: 30000,
  },

  /* テストプロジェクト設定 */
  projects: [
    /* セットアップ（現在は無効化） */
    // {
    //   name: 'setup',
    //   testMatch: /.*\.setup\.ts/,
    // },

    /* Desktop Chrome */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // dependencies: ['setup'],
    },

    /* Desktop Firefox */
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // dependencies: ['setup'],
    },

    /* Desktop Safari */
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      // dependencies: ['setup'],
    },

    /* Mobile Chrome */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      // dependencies: ['setup'],
    },

    /* Mobile Safari */
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      // dependencies: ['setup'],
    },

    /* Microsoft Edge */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
      // dependencies: ['setup'],
    },
  ],

  /* 開発サーバー設定（現在は無効化） */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
}); 