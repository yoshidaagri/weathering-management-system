import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // ログインページに移動
  await page.goto('/auth/login');

  // フォーム要素の存在確認
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();

  // テストユーザーでログイン
  await page.fill('input[name="username"]', process.env.E2E_TEST_USERNAME || 'testuser@example.com');
  await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD || 'TestPassword123!');
  await page.click('button[type="submit"]');

  // ログイン成功の確認（ダッシュボードへのリダイレクト）
  await page.waitForURL('/');
  await expect(page.locator('h1')).toContainText('風化促進CO2除去事業管理システム');

  // 認証状態を保存
  await page.context().storageState({ path: authFile });
});

export { authFile }; 