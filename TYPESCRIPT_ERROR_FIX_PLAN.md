# TypeScript エラー修正計画書

## 🎯 目的
AWS S3へのビルド・デプロイを実行するため、TypeScriptエラーを修正して`npm run build`を成功させる

## 📊 現在の状況

### ✅ 修正完了項目
1. **`app/customers/[customerId]/page.tsx`**
   - `apiClient.getProjects(customerId)` → `apiClient.getProjects({ customerId })` に修正
   - `response.data.items` → `response.data.projects` に修正
   - 2つのSelectコンポーネントを標準`<select>`要素に変更
   - 不要な`Select`コンポーネントのimport削除

2. **`app/customers/page.tsx`**
   - `apiClient.getCustomers()` の引数を正しいオブジェクト形式に修正
   - `newCustomer`オブジェクトに`projectCount: 0`を追加
   - 1つの業界Selectコンポーネントを標準`<select>`要素に変更
   - 不要な`Select`コンポーネントのimport削除

### ❌ 残存エラー (5箇所)

#### **ファイル: `app/customers/page.tsx`**

**1. 行290: ステータスフィルター**
```typescript
// 現在のエラーコード
<Select
  value={selectedStatus}
  onValueChange={(value) => setSelectedStatus(value as 'active' | 'inactive')}
  options={[
    { value: 'active', label: 'アクティブ' },
    { value: 'inactive', label: '非アクティブ' }
  ]}
/>
```

**2. 行460: 新規作成フォーム - 業界**
```typescript
// 現在のエラーコード
<Select
  value={newCustomer.industry}
  onValueChange={(value) => setNewCustomer(prev => ({ ...prev, industry: value }))}
  options={industryOptions.map(industry => ({ value: industry, label: industry }))}
/>
```

**3. 行471: 新規作成フォーム - ステータス**
```typescript
// 現在のエラーコード
<Select
  value={newCustomer.status}
  onValueChange={(value) => setNewCustomer(prev => ({ ...prev, status: value as 'active' | 'inactive' }))}
  options={[
    { value: 'active', label: 'アクティブ' },
    { value: 'inactive', label: '非アクティブ' }
  ]}
/>
```

**4. 行572: 編集フォーム - 業界**
```typescript
// 現在のエラーコード
<Select
  value={editingCustomer?.industry || ''}
  onValueChange={(value) => setEditingCustomer(prev => prev ? { ...prev, industry: value } : null)}
  options={industryOptions.map(industry => ({ value: industry, label: industry }))}
/>
```

**5. 行583: 編集フォーム - ステータス**
```typescript
// 現在のエラーコード
<Select
  value={editingCustomer?.status || 'active'}
  onValueChange={(value) => setEditingCustomer(prev => prev ? { ...prev, status: value as 'active' | 'inactive' } : null)}
  options={[
    { value: 'active', label: 'アクティブ' },
    { value: 'inactive', label: '非アクティブ' }
  ]}
/>
```

## 🔧 修正方法

### **パターン1: ステータス選択 (行290, 471, 583)**
```typescript
<select
  value={selectedStatus}
  onChange={(e) => setSelectedStatus(e.target.value as 'active' | 'inactive')}
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="active">アクティブ</option>
  <option value="inactive">非アクティブ</option>
</select>
```

### **パターン2: 業界選択 (行460, 572)**
```typescript
<select
  value={newCustomer.industry}
  onChange={(e) => setNewCustomer(prev => ({ ...prev, industry: e.target.value }))}
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="">業界を選択</option>
  {industryOptions.map(industry => (
    <option key={industry} value={industry}>{industry}</option>
  ))}
</select>
```

## 📋 修正手順

### **Step 1: ステータスフィルター修正 (行290付近)**
```typescript
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    ステータス
  </label>
  <select
    value={selectedStatus}
    onChange={(e) => setSelectedStatus(e.target.value as 'active' | 'inactive')}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="active">アクティブ</option>
    <option value="inactive">非アクティブ</option>
  </select>
</div>
```

### **Step 2: 新規作成フォーム - 業界 (行460付近)**
```typescript
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    業界 *
  </label>
  <select
    value={newCustomer.industry}
    onChange={(e) => setNewCustomer(prev => ({ ...prev, industry: e.target.value }))}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">業界を選択</option>
    {industryOptions.map(industry => (
      <option key={industry} value={industry}>{industry}</option>
    ))}
  </select>
</div>
```

### **Step 3: 新規作成フォーム - ステータス (行471付近)**
```typescript
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    ステータス
  </label>
  <select
    value={newCustomer.status}
    onChange={(e) => setNewCustomer(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="active">アクティブ</option>
    <option value="inactive">非アクティブ</option>
  </select>
</div>
```

### **Step 4: 編集フォーム - 業界 (行572付近)**
```typescript
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    業界
  </label>
  <select
    value={editingCustomer?.industry || ''}
    onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, industry: e.target.value } : null)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">業界を選択</option>
    {industryOptions.map(industry => (
      <option key={industry} value={industry}>{industry}</option>
    ))}
  </select>
</div>
```

### **Step 5: 編集フォーム - ステータス (行583付近)**
```typescript
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    ステータス
  </label>
  <select
    value={editingCustomer?.status || 'active'}
    onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, status: e.target.value as 'active' | 'inactive' } : null)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="active">アクティブ</option>
    <option value="inactive">非アクティブ</option>
  </select>
</div>
```

## ✅ 修正後の確認コマンド

```bash
# testディレクトリで実行
npm run build
```

## 🚀 成功後のデプロイ手順

修正完了後、以下のコマンドでAWSデプロイを実行：

```bash
# 1. ビルド実行（outフォルダ生成）
npm run build

# 2. outフォルダをS3にアップロード
aws s3 sync out s3://weathering-project-frontend-788026075178

# 3. CloudFrontキャッシュ無効化
aws cloudfront create-invalidation --distribution-id ERCBD6UW7KRBP --paths "/*"
```

## 📝 注意事項

1. **絶対に`.next`フォルダをS3にアップロードしない**
   - 静的サイト用は`out`フォルダのみ使用

2. **Selectコンポーネントの一貫性**
   - すべて標準`<select>`要素を使用
   - Tailwind CSSクラスで統一されたスタイリング

3. **型安全性**
   - `as 'active' | 'inactive'`での明示的な型キャスト
   - nullチェックの適切な実装

---
**作成日時**: 2024年12月19日  
**作成者**: Cursor (品質保証フェーズ)  
**次のアクション**: Claude Codeによる修正実装 