import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // ログインページに移動
  await page.goto('/auth/login');

  // 開発用：認証不要モックダッシュボードボタンを使用
  await expect(page.getByText('🚀 認証不要モックダッシュボード')).toBeVisible();
  await page.click('button:has-text("🚀 認証不要モックダッシュボード")');

  // モックダッシュボードへのリダイレクト確認
  await page.waitForURL('/mock-dashboard');
  await expect(page.locator('h1')).toContainText('モックダッシュボード');

  // 認証状態を保存（モック環境として）
  await page.context().storageState({ path: authFile });
});

export { authFile }; 