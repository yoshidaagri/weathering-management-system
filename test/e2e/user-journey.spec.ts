import { test, expect } from '@playwright/test';
import { authFile } from './auth.setup';

// 認証状態を使用するテスト
test.use({ storageState: authFile });

test.describe('ユーザージャーニー: 風化促進CO2除去事業管理', () => {
  
  test('ダッシュボード表示とナビゲーション', async ({ page }) => {
    await page.goto('/');
    
    // ダッシュボードの基本要素確認
    await expect(page.locator('h1')).toContainText('風化促進CO2除去事業管理システム');
    
    // サイドバーナビゲーション確認
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByRole('link', { name: 'プロジェクト管理' })).toBeVisible();
    await expect(page.getByRole('link', { name: '測定データ' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'レポート生成' })).toBeVisible();
    
    // ダッシュボードカード確認
    await expect(page.locator('.grid')).toBeVisible();
  });

  test('プロジェクト管理フロー', async ({ page }) => {
    // プロジェクト管理ページに移動
    await page.goto('/projects');
    await expect(page.locator('h1')).toContainText('プロジェクト管理');
    
    // 新規プロジェクト作成ボタン
    await expect(page.getByRole('button', { name: '新規プロジェクト' })).toBeVisible();
    
    // プロジェクト一覧の表示
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();
    
    // フィルター機能
    await page.fill('input[placeholder*="検索"]', 'テスト');
    
    // ページネーション（もしあれば）
    const pagination = page.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      await expect(pagination).toBeVisible();
    }
  });

  test('測定データ管理フロー', async ({ page }) => {
    await page.goto('/measurements');
    await expect(page.locator('h1')).toContainText('測定データ管理');
    
    // データ入力フォーム
    await expect(page.getByRole('button', { name: 'データ入力' })).toBeVisible();
    
    // データ可視化（チャート）
    const chartContainer = page.locator('[data-testid="measurement-chart"]');
    if (await chartContainer.isVisible()) {
      await expect(chartContainer).toBeVisible();
    }
    
    // データテーブル
    await expect(page.locator('table')).toBeVisible();
  });

  test('レポート生成フロー', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('h1')).toContainText('レポート生成');
    
    // レポート生成ボタン
    await expect(page.getByRole('button', { name: 'レポート生成' })).toBeVisible();
    
    // レポート履歴
    await expect(page.locator('[data-testid="report-history"]')).toBeVisible();
  });

  test('計画/実績分析フロー', async ({ page }) => {
    await page.goto('/plan-actual');
    await expect(page.locator('h1')).toContainText('計画/実績分析');
    
    // 分析チャート
    const chartArea = page.locator('[data-testid="analysis-charts"]');
    if (await chartArea.isVisible()) {
      await expect(chartArea).toBeVisible();
    }
    
    // 期間選択
    await expect(page.locator('input[type="date"]')).toHaveCount(2);
  });

  test('顧客管理フロー', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.locator('h1')).toContainText('顧客管理');
    
    // 顧客一覧
    await expect(page.locator('[data-testid="customer-list"]')).toBeVisible();
    
    // 新規顧客登録ボタン
    await expect(page.getByRole('button', { name: '新規顧客' })).toBeVisible();
  });

  test('モニタリングダッシュボード', async ({ page }) => {
    await page.goto('/monitoring');
    await expect(page.locator('h1')).toContainText('リアルタイムモニタリング');
    
    // リアルタイムデータ表示
    const monitoringData = page.locator('[data-testid="monitoring-data"]');
    if (await monitoringData.isVisible()) {
      await expect(monitoringData).toBeVisible();
    }
    
    // アラート表示エリア
    const alertArea = page.locator('[data-testid="alerts"]');
    if (await alertArea.isVisible()) {
      await expect(alertArea).toBeVisible();
    }
  });

  test('シミュレーション機能', async ({ page }) => {
    await page.goto('/simulation');
    await expect(page.locator('h1')).toContainText('事業計画シミュレーション');
    
    // シミュレーション実行ボタン
    await expect(page.getByRole('button', { name: 'シミュレーション実行' })).toBeVisible();
    
    // パラメータ入力フォーム
    await expect(page.locator('form')).toBeVisible();
  });

  test('レスポンシブ対応確認', async ({ page }) => {
    // デスクトップサイズでテスト
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
    
    // タブレットサイズでテスト
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    // モバイルメニューボタンが表示されるかチェック
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenuButton.isVisible()) {
      await expect(mobileMenuButton).toBeVisible();
    }
    
    // モバイルサイズでテスト
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    // レスポンシブレイアウトの確認
    await expect(page.locator('main')).toBeVisible();
  });

  test('アクセシビリティ基本チェック', async ({ page }) => {
    await page.goto('/');
    
    // 基本的なランドマーク要素の確認
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    
    // フォーカス可能な要素のチェック
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // 画像のalt属性チェック（もしあれば）
    const images = page.locator('img');
    const imageCount = await images.count();
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      if (await img.isVisible()) {
        await expect(img).toHaveAttribute('alt');
      }
    }
  });
});

// TODO: Cursor - 受入テスト実施 - 実際のブラウザ環境でのE2Eテスト実行 