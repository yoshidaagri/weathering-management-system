// プロジェクト管理CRUD機能テストスクリプト
import { apiClient } from './src/lib/api-client.js';

async function testProjectCRUD() {
  console.log('🧪 プロジェクト管理CRUD機能テスト開始\n');

  try {
    // 1. READ - プロジェクト一覧取得テスト
    console.log('=== 1. READ - プロジェクト一覧取得テスト ===');
    const listResult = await apiClient.getProjects();
    console.log('✅ 取得成功:', {
      プロジェクト数: listResult.projects.length,
      nextToken: listResult.nextToken,
      total: listResult.total
    });
    
    console.log('\n📋 既存プロジェクト一覧:');
    listResult.projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.projectName}`);
      console.log(`   顧客: ${project.customerName}`);
      console.log(`   ステータス: ${project.status}`);
      console.log(`   タイプ: ${project.projectType}`);
      console.log(`   予算: ${project.budget.totalBudget.toLocaleString()} ${project.budget.currency}`);
      console.log('');
    });

    // 2. READ - 顧客一覧取得（プロジェクト作成用）
    console.log('=== 顧客一覧取得（プロジェクト作成用） ===');
    const customersResult = await apiClient.getCustomers();
    console.log('✅ 顧客取得成功:', customersResult.customers.length + '件');
    
    if (customersResult.customers.length === 0) {
      console.log('❌ プロジェクト作成テストのための顧客が存在しません');
      return;
    }

    // 3. CREATE - プロジェクト作成テスト
    console.log('\n=== 2. CREATE - プロジェクト作成テスト ===');
    const testProject = {
      projectName: 'テスト用CO2除去プロジェクト',
      description: 'CRUD機能テスト用の新規プロジェクト',
      customerId: customersResult.customers[0].customerId,
      location: {
        prefecture: '東京都',
        city: '渋谷区',
        address: '渋谷1-1-1',
        coordinates: {
          latitude: 35.6588,
          longitude: 139.7016
        }
      },
      projectType: 'co2_removal',
      targetMetrics: {
        co2RemovalTarget: 500,
        wastewaterVolumeTarget: 300,
        processingCapacity: 100
      },
      timeline: {
        startDate: '2024-08-01T00:00:00Z',
        endDate: '2025-07-31T23:59:59Z'
      },
      budget: {
        totalBudget: 25000000,
        currency: 'JPY'
      },
      status: 'planning',
      tags: ['test', 'co2-removal'],
      assignedPersonnel: ['テスト担当者']
    };

    const createResult = await apiClient.createProject(testProject);
    console.log('✅ プロジェクト作成成功:', {
      プロジェクトID: createResult.project.projectId,
      プロジェクト名: createResult.project.projectName,
      顧客名: createResult.project.customerName,
      メッセージ: createResult.message
    });

    // 4. READ - プロジェクト詳細取得テスト
    console.log('\n=== 3. READ - プロジェクト詳細取得テスト ===');
    const detailResult = await apiClient.getProject(createResult.project.projectId);
    console.log('✅ プロジェクト詳細取得成功:', {
      プロジェクト名: detailResult.project.projectName,
      説明: detailResult.project.description,
      場所: `${detailResult.project.location.prefecture} ${detailResult.project.location.city}`,
      CO2目標: detailResult.project.targetMetrics.co2RemovalTarget + 't/年',
      予算: detailResult.project.budget.totalBudget.toLocaleString() + detailResult.project.budget.currency
    });

    // 5. UPDATE - プロジェクト更新テスト
    console.log('\n=== 4. UPDATE - プロジェクト更新テスト ===');
    const updateData = {
      projectName: 'テスト用CO2除去プロジェクト（更新済み）',
      description: '更新機能テスト完了',
      status: 'active',
      targetMetrics: {
        co2RemovalTarget: 750
      }
    };

    const updateResult = await apiClient.updateProject(createResult.project.projectId, updateData);
    console.log('✅ プロジェクト更新成功:', {
      更新後プロジェクト名: updateResult.project.projectName,
      更新後ステータス: updateResult.project.status,
      更新後CO2目標: updateResult.project.targetMetrics.co2RemovalTarget + 't/年',
      メッセージ: updateResult.message
    });

    // 6. DELETE - プロジェクト削除テスト
    console.log('\n=== 5. DELETE - プロジェクト削除テスト ===');
    const deleteResult = await apiClient.deleteProject(createResult.project.projectId);
    console.log('✅ プロジェクト削除成功:', deleteResult.message);

    // 7. 削除確認テスト
    console.log('\n=== 削除確認テスト ===');
    try {
      await apiClient.getProject(createResult.project.projectId);
      console.log('❌ 削除後もプロジェクトが存在しています');
    } catch (error) {
      console.log('✅ 削除確認成功: プロジェクトが正しく削除されました');
    }

    console.log('\n🎉 すべてのCRUD機能テストが正常に完了しました！');

  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    console.error(error.stack);
  }
}

// テスト実行
testProjectCRUD();