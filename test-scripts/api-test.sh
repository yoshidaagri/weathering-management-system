#!/bin/bash

# Phase 3 API統合テストスクリプト
# 使用方法: ./api-test.sh <auth-token>

set -e

# 設定
API_BASE="https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod"
AUTH_TOKEN="${1:-}"

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ エラー: 認証トークンが必要です"
    echo "使用方法: $0 <Bearer-token>"
    echo "例: $0 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'"
    exit 1
fi

echo "🚀 Phase 3 API統合テスト開始"
echo "API Base URL: $API_BASE"
echo "Auth Token: ${AUTH_TOKEN:0:20}..."
echo ""

# テスト結果記録用
TEST_RESULTS=()
CUSTOMER_ID=""
PROJECT_ID=""
MEASUREMENT_ID=""
REPORT_ID=""

# テスト実行関数
run_test() {
    local test_name="$1"
    local curl_command="$2"
    local expected_status="$3"
    
    echo "🧪 テスト: $test_name"
    
    # APIコール実行
    response=$(eval "$curl_command" 2>/dev/null || echo "ERROR")
    status_code=$(echo "$response" | jq -r '.status // 500' 2>/dev/null || echo "500")
    
    if [ "$response" = "ERROR" ] || [ "$status_code" != "$expected_status" ]; then
        echo "❌ FAIL: $test_name"
        echo "   期待ステータス: $expected_status, 実際: $status_code"
        TEST_RESULTS+=("FAIL: $test_name")
    else
        echo "✅ PASS: $test_name"
        TEST_RESULTS+=("PASS: $test_name")
    fi
    
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
    
    return 0
}

# 1. 顧客管理APIテスト
echo "=== 1. 顧客管理APIテスト ==="

# 顧客一覧取得
run_test "顧客一覧取得" \
    "curl -s -X GET '${API_BASE}/api/customers' -H 'Authorization: ${AUTH_TOKEN}' -H 'Content-Type: application/json'" \
    "200"

# 顧客作成
CUSTOMER_DATA='{
    "companyName": "テスト会社_'$(date +%s)'",
    "contactInfo": {
        "email": "test@example.com",
        "phone": "03-1234-5678",
        "address": "東京都港区"
    },
    "industry": "製造業",
    "status": "active"
}'

customer_response=$(curl -s -X POST "${API_BASE}/api/customers" \
    -H "Authorization: ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$CUSTOMER_DATA")

CUSTOMER_ID=$(echo "$customer_response" | jq -r '.customer.customerId' 2>/dev/null || echo "")

if [ -n "$CUSTOMER_ID" ] && [ "$CUSTOMER_ID" != "null" ]; then
    echo "✅ PASS: 顧客作成 (ID: $CUSTOMER_ID)"
    TEST_RESULTS+=("PASS: 顧客作成")
else
    echo "❌ FAIL: 顧客作成"
    TEST_RESULTS+=("FAIL: 顧客作成")
fi

# 2. プロジェクト管理APIテスト
echo "=== 2. プロジェクト管理APIテスト ==="

if [ -n "$CUSTOMER_ID" ] && [ "$CUSTOMER_ID" != "null" ]; then
    # プロジェクト作成
    PROJECT_DATA='{
        "name": "テストプロジェクト_'$(date +%s)'",
        "description": "統合テスト用プロジェクト",
        "customerId": "'$CUSTOMER_ID'",
        "siteLocation": {
            "latitude": 35.6762,
            "longitude": 139.6503,
            "address": "東京都港区"
        },
        "budget": 1000000,
        "co2Target": 100,
        "startDate": "2025-01-01T00:00:00Z",
        "endDate": "2025-12-31T23:59:59Z"
    }'

    project_response=$(curl -s -X POST "${API_BASE}/api/projects" \
        -H "Authorization: ${AUTH_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$PROJECT_DATA")

    PROJECT_ID=$(echo "$project_response" | jq -r '.project.projectId' 2>/dev/null || echo "")

    if [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
        echo "✅ PASS: プロジェクト作成 (ID: $PROJECT_ID)"
        TEST_RESULTS+=("PASS: プロジェクト作成")
    else
        echo "❌ FAIL: プロジェクト作成"
        TEST_RESULTS+=("FAIL: プロジェクト作成")
    fi

    # プロジェクト一覧取得
    run_test "プロジェクト一覧取得" \
        "curl -s -X GET '${API_BASE}/api/projects' -H 'Authorization: ${AUTH_TOKEN}'" \
        "200"
fi

# 3. 測定データAPIテスト
echo "=== 3. 測定データAPIテスト ==="

if [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
    # 測定データ作成
    MEASUREMENT_DATA='{
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
        "type": "water_quality",
        "values": {
            "ph": 7.2,
            "temperature": 25.5,
            "co2Concentration": 400,
            "flowRate": 100.5,
            "iron": 0.1,
            "copper": 0.05,
            "zinc": 0.2
        },
        "location": {
            "latitude": 35.6762,
            "longitude": 139.6503
        }
    }'

    measurement_response=$(curl -s -X POST "${API_BASE}/api/projects/${PROJECT_ID}/measurements" \
        -H "Authorization: ${AUTH_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$MEASUREMENT_DATA")

    MEASUREMENT_ID=$(echo "$measurement_response" | jq -r '.measurement.measurementId' 2>/dev/null || echo "")

    if [ -n "$MEASUREMENT_ID" ] && [ "$MEASUREMENT_ID" != "null" ]; then
        echo "✅ PASS: 測定データ作成 (ID: $MEASUREMENT_ID)"
        TEST_RESULTS+=("PASS: 測定データ作成")
    else
        echo "❌ FAIL: 測定データ作成"
        TEST_RESULTS+=("FAIL: 測定データ作成")
    fi

    # 測定データ一覧取得
    run_test "測定データ一覧取得" \
        "curl -s -X GET '${API_BASE}/api/projects/${PROJECT_ID}/measurements' -H 'Authorization: ${AUTH_TOKEN}'" \
        "200"

    # バッチ測定データ作成
    BATCH_DATA='{
        "measurements": [
            {
                "timestamp": "'$(date -u -d "+1 hour" +%Y-%m-%dT%H:%M:%SZ)'",
                "type": "water_quality",
                "values": {
                    "ph": 7.1,
                    "temperature": 26.0,
                    "co2Concentration": 410,
                    "flowRate": 105.0,
                    "iron": 0.12,
                    "copper": 0.06,
                    "zinc": 0.25
                }
            },
            {
                "timestamp": "'$(date -u -d "+2 hours" +%Y-%m-%dT%H:%M:%SZ)'",
                "type": "atmospheric",
                "values": {
                    "co2Concentration": 420,
                    "temperature": 28.0
                }
            }
        ]
    }'

    run_test "バッチ測定データ作成" \
        "curl -s -X POST '${API_BASE}/api/projects/${PROJECT_ID}/measurements/batch' -H 'Authorization: ${AUTH_TOKEN}' -H 'Content-Type: application/json' -d '$BATCH_DATA'" \
        "201"
fi

# 4. レポート生成APIテスト
echo "=== 4. レポート生成APIテスト ==="

if [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
    # レポート生成
    REPORT_DATA='{
        "type": "mrv",
        "format": "json",
        "parameters": {
            "startDate": "2025-01-01",
            "endDate": "'$(date +%Y-%m-%d)'"
        }
    }'

    report_response=$(curl -s -X POST "${API_BASE}/api/projects/${PROJECT_ID}/reports" \
        -H "Authorization: ${AUTH_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$REPORT_DATA")

    REPORT_ID=$(echo "$report_response" | jq -r '.report.reportId' 2>/dev/null || echo "")

    if [ -n "$REPORT_ID" ] && [ "$REPORT_ID" != "null" ]; then
        echo "✅ PASS: レポート生成開始 (ID: $REPORT_ID)"
        TEST_RESULTS+=("PASS: レポート生成開始")
    else
        echo "❌ FAIL: レポート生成開始"
        TEST_RESULTS+=("FAIL: レポート生成開始")
    fi

    # レポート一覧取得
    run_test "レポート一覧取得" \
        "curl -s -X GET '${API_BASE}/api/projects/${PROJECT_ID}/reports' -H 'Authorization: ${AUTH_TOKEN}'" \
        "200"
fi

# 5. テスト結果サマリー
echo "==============================================="
echo "🏁 テスト完了サマリー"
echo "==============================================="

PASS_COUNT=0
FAIL_COUNT=0

for result in "${TEST_RESULTS[@]}"; do
    echo "$result"
    if [[ $result == PASS* ]]; then
        ((PASS_COUNT++))
    else
        ((FAIL_COUNT++))
    fi
done

echo ""
echo "📊 結果統計:"
echo "   ✅ 成功: $PASS_COUNT"
echo "   ❌ 失敗: $FAIL_COUNT"
echo "   📈 成功率: $(( PASS_COUNT * 100 / (PASS_COUNT + FAIL_COUNT) ))%"

if [ $FAIL_COUNT -eq 0 ]; then
    echo ""
    echo "🎉 全てのテストが成功しました！"
    echo "Phase 3 API統合テスト完了 ✅"
else
    echo ""
    echo "⚠️  一部のテストが失敗しました。"
    echo "詳細な調査が必要です。"
fi

echo ""
echo "📝 作成されたリソース:"
echo "   顧客ID: $CUSTOMER_ID"
echo "   プロジェクトID: $PROJECT_ID"
echo "   測定データID: $MEASUREMENT_ID"
echo "   レポートID: $REPORT_ID"

echo ""
echo "🔍 追加確認項目:"
echo "   - CloudWatch Logsでエラー確認"
echo "   - DynamoDBデータ確認"
echo "   - フロントエンド動作確認"

exit $FAIL_COUNT