# 風化促進CO2除去事業管理システム - GAS版アーキテクチャ設計書

## 🎯 システム概要

現在のAWSサーバーレスアーキテクチャ（React + Lambda + DynamoDB）をGoogle Apps Script (GAS)で実現した場合の設計書

### 現行システム仕様
- 顧客管理、プロジェクト管理、測定データ管理
- ML予測・異常検知・最適化推奨
- レポート生成（PDF/Excel）
- リアルタイム監視・アラート
- Cognito認証、API Gateway、DynamoDB

---

## 🏗️ GAS版システムアーキテクチャ

### **アーキテクチャ概要図**
```
┌─────────────────────────────────────────────────────────────┐
│                    フロントエンド層                           │
├─────────────────────────────────────────────────────────────┤
│ Option A: GAS HTML Service (Google Sites風)                │
│ Option B: React App → GAS Web Apps API呼び出し             │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    GAS Web Apps層                          │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│
│ │Customer API │ │Project API  │ │Measurement  │ │ML/Report ││
│ │GAS Web App  │ │GAS Web App  │ │API GAS App  │ │GAS App   ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  GAS Libraries層                           │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│
│ │共通関数Lib  │ │認証Lib      │ │データ操作Lib │ │ML予測Lib ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    データ層                                │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│
│ │Customers    │ │Projects     │ │Measurements │ │Reports   ││
│ │Spreadsheet  │ │Spreadsheet  │ │Spreadsheet  │ │Drive     ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               外部サービス統合層                             │
├─────────────────────────────────────────────────────────────┤
│ Google AI Platform │ Gmail API │ Calendar API │ Drive API   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 データアーキテクチャ

### **Google Spreadsheetsをデータベースとして活用**

#### 1. **Customers Spreadsheet** (顧客マスタ)
```javascript
// シート構造例
const CUSTOMERS_SCHEMA = {
  columns: [
    'customerId', 'companyName', 'contactName', 'email', 
    'phone', 'address', 'contractDate', 'status', 'createdAt', 'updatedAt'
  ],
  sheetId: 'CUSTOMERS_SHEET_ID'
};

// GAS関数例
function createCustomer(customerData) {
  const sheet = SpreadsheetApp.openById(CUSTOMERS_SCHEMA.sheetId).getActiveSheet();
  const newRow = [
    Utilities.getUuid(),
    customerData.companyName,
    customerData.contactName,
    customerData.email,
    customerData.phone,
    customerData.address,
    new Date(),
    'active',
    new Date(),
    new Date()
  ];
  sheet.appendRow(newRow);
  return newRow[0]; // customerId
}
```

#### 2. **Projects Spreadsheet** (プロジェクト管理)
```javascript
const PROJECTS_SCHEMA = {
  columns: [
    'projectId', 'customerId', 'projectName', 'location', 
    'startDate', 'endDate', 'co2Target', 'status', 'budget', 'createdAt'
  ],
  sheetId: 'PROJECTS_SHEET_ID'
};
```

#### 3. **Measurements Spreadsheet** (測定データ)
```javascript
const MEASUREMENTS_SCHEMA = {
  columns: [
    'measurementId', 'projectId', 'measurementDate', 'co2Level', 
    'pH', 'temperature', 'flowRate', 'rockDispersalAmount', 'createdAt'
  ],
  sheetId: 'MEASUREMENTS_SHEET_ID'
};
```

#### 4. **ML Predictions Spreadsheet** (予測結果)
```javascript
const ML_PREDICTIONS_SCHEMA = {
  columns: [
    'predictionId', 'projectId', 'predictionType', 'inputData',
    'predictedValue', 'confidence', 'timestamp', 'modelVersion'
  ],
  sheetId: 'ML_PREDICTIONS_SHEET_ID'
};
```

---

## 🔧 主要機能の実装アプローチ

### **1. API Gateway代替: GAS Web Apps**

```javascript
// メインAPIエントリーポイント (Code.gs)
function doGet(e) {
  const path = e.parameter.path;
  const method = 'GET';
  return routeRequest(method, path, e.parameter);
}

function doPost(e) {
  const path = e.parameter.path;
  const method = 'POST';
  const body = JSON.parse(e.postData.contents);
  return routeRequest(method, path, body);
}

#### **2.3 管理者用WebアプリAPI（AdminWebApp.gs）**

```javascript
// 管理者専用Webアプリ（全機能アクセス可能）
function doPost(e) {
  return routeAdminRequest(e.parameter.method, e.parameter.path, JSON.parse(e.parameter.data || '{}'));
}

function doGet(e) {
  return routeAdminRequest('GET', e.parameter.path, e.parameter);
}

function routeAdminRequest(method, path, data) {
  try {
    // 管理者認証チェック
    const adminUser = AdminAuthLib.authenticateAdmin(data.token);
    if (!adminUser) {
      return createResponse(401, { error: '管理者権限が必要です' });
    }
    
    // 管理者情報をデータに追加
    data.currentAdmin = adminUser;
    
    // ルーティング（管理者は全機能アクセス可能）
    switch(path) {
      case 'customers':
        return CustomersAPI.handleRequest(method, data);
      case 'projects':
        return ProjectsAPI.handleRequest(method, data);
      case 'measurements':
        return MeasurementsAPI.handleRequest(method, data);
      case 'ml-predictions':
        return MLPredictionsAPI.handleRequest(method, data);
      case 'reports':
        return ReportsAPI.handleRequest(method, data);
      case 'analytics':
        return AnalyticsAPI.handleRequest(method, data);
      case 'user-management':
        return AdminUserManagementAPI.handleRequest(method, data);
      case 'system-monitor':
        return SystemMonitorAPI.handleRequest(method, data);
      default:
        return createResponse(404, { error: 'Not Found' });
    }
  } catch (error) {
    console.error('Admin API Error:', error);
    return createResponse(500, { error: 'Internal Server Error' });
  }
}
```

#### **2.4 顧客用WebアプリAPI（CustomerWebApp.gs）**

```javascript
// 顧客専用Webアプリ（自社データのみアクセス可能）
function doPost(e) {
  return routeCustomerRequest(e.parameter.method, e.parameter.path, JSON.parse(e.parameter.data || '{}'));
}

function doGet(e) {
  return routeCustomerRequest('GET', e.parameter.path, e.parameter);
}

function routeCustomerRequest(method, path, data) {
  try {
    // 顧客認証チェック
    const customerUser = CustomerAuthLib.authenticateCustomer(data.token);
    if (!customerUser) {
      return createResponse(401, { error: '認証が必要です' });
    }
    
    // 顧客情報をデータに追加
    data.currentCustomer = customerUser;
    
    // ルーティング（顧客は限定的な機能のみ）
    switch(path) {
      case 'my-projects':
        return CustomerProjectsAPI.handleRequest(method, data);
      case 'my-measurements':
        return CustomerMeasurementsAPI.handleRequest(method, data);
      case 'my-reports':
        return CustomerReportsAPI.handleRequest(method, data);
      case 'my-analytics':
        return CustomerAnalyticsAPI.handleRequest(method, data);
      default:
        return createResponse(404, { error: 'Not Found' });
    }
  } catch (error) {
    console.error('Customer API Error:', error);
    return createResponse(500, { error: 'Internal Server Error' });
  }
}

// 顧客専用プロジェクトAPI（自社データのみ）
const CustomerProjectsAPI = {
  handleRequest: function(method, data) {
    const { currentCustomer } = data;
    
    switch(method) {
      case 'GET':
        return this.getMyProjects(currentCustomer);
      case 'POST':
        return createResponse(403, { error: '新規プロジェクト作成は管理者にお問い合わせください' });
      default:
        return createResponse(405, { error: 'Method Not Allowed' });
    }
  },

  getMyProjects: function(customerUser) {
    // 自社のプロジェクトのみ取得
    const projectSheet = SpreadsheetApp.openById('PROJECTS_SHEET_ID').getActiveSheet();
    const data = projectSheet.getDataRange().getValues();
    const headers = data[0];
    
    const myProjects = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf('customerId')] === customerUser.customerId) {
        myProjects.push({
          projectId: data[i][headers.indexOf('projectId')],
          projectName: data[i][headers.indexOf('projectName')],
          status: data[i][headers.indexOf('status')],
          startDate: data[i][headers.indexOf('startDate')],
          description: data[i][headers.indexOf('description')]
        });
      }
    }
    
    return createResponse(200, { projects: myProjects });
  }
};

function createResponse(statusCode, data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### **2. 認証・ロール管理システム: Google Account統合**

#### **2.1 シンプルなユーザー管理（2画面分離方式）**

```javascript
// 簡素化されたユーザー管理
const USER_MANAGEMENT_SCHEMA = {
  // 管理者ユーザー管理
  adminUsers: {
    columns: ['adminId', 'email', 'name', 'isActive', 'lastLogin', 'createdAt'],
    sheetId: 'ADMIN_USERS_SHEET_ID'
  },
  
  // 顧客ユーザー管理
  customerUsers: {
    columns: ['userId', 'email', 'name', 'customerId', 'companyName', 'isActive', 'lastLogin', 'createdAt'],
    sheetId: 'CUSTOMER_USERS_SHEET_ID'
  }
};

// シンプルユーザー管理関数
function createAdminUser(email, name) {
  const sheet = SpreadsheetApp.openById(USER_MANAGEMENT_SCHEMA.adminUsers.sheetId).getActiveSheet();
  const adminId = Utilities.getUuid();
  const newRow = [adminId, email, name, true, null, new Date()];
  sheet.appendRow(newRow);
  return adminId;
}

function createCustomerUser(email, name, customerId, companyName) {
  const sheet = SpreadsheetApp.openById(USER_MANAGEMENT_SCHEMA.customerUsers.sheetId).getActiveSheet();
  const userId = Utilities.getUuid();
  const newRow = [userId, email, name, customerId, companyName, true, null, new Date()];
  sheet.appendRow(newRow);
  return userId;
}
```

#### **2.2 シンプルな認証システム（2画面分離）**

```javascript
// AdminAuthLib.gs (管理者画面用認証)
const AdminAuthLib = {
  validateToken: function(token) {
    try {
      const response = UrlFetchApp.fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`
      );
      const tokenInfo = JSON.parse(response.getContentText());
      return tokenInfo.email && tokenInfo.email_verified ? tokenInfo : false;
    } catch (error) {
      return false;
    }
  },

  // 管理者認証チェック
  authenticateAdmin: function(token) {
    const tokenInfo = this.validateToken(token);
    if (!tokenInfo) return null;
    
    // 管理者ユーザーリストから確認
    const adminUser = this.getAdminUser(tokenInfo.email);
    if (!adminUser || !adminUser.isActive) {
      return null; // 未登録または無効な管理者
    }
    
    // 最終ログイン時刻更新
    this.updateAdminLastLogin(adminUser.adminId);
    
    return adminUser;
  },

  getAdminUser: function(email) {
    const sheet = SpreadsheetApp.openById(USER_MANAGEMENT_SCHEMA.adminUsers.sheetId).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf('email')] === email) {
        return {
          adminId: data[i][headers.indexOf('adminId')],
          email: data[i][headers.indexOf('email')],
          name: data[i][headers.indexOf('name')],
          isActive: data[i][headers.indexOf('isActive')],
          lastLogin: data[i][headers.indexOf('lastLogin')]
        };
      }
    }
    return null;
  },

  updateAdminLastLogin: function(adminId) {
    const sheet = SpreadsheetApp.openById(USER_MANAGEMENT_SCHEMA.adminUsers.sheetId).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf('adminId')] === adminId) {
        sheet.getRange(i + 1, headers.indexOf('lastLogin') + 1).setValue(new Date());
        break;
      }
    }
  }
};

// CustomerAuthLib.gs (顧客画面用認証)
const CustomerAuthLib = {
  validateToken: function(token) {
    try {
      const response = UrlFetchApp.fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`
      );
      const tokenInfo = JSON.parse(response.getContentText());
      return tokenInfo.email && tokenInfo.email_verified ? tokenInfo : false;
    } catch (error) {
      return false;
    }
  },

  // 顧客認証チェック
  authenticateCustomer: function(token) {
    const tokenInfo = this.validateToken(token);
    if (!tokenInfo) return null;
    
    // 顧客ユーザーリストから確認
    const customerUser = this.getCustomerUser(tokenInfo.email);
    if (!customerUser || !customerUser.isActive) {
      return null; // 未登録または無効な顧客
    }
    
    // 最終ログイン時刻更新
    this.updateCustomerLastLogin(customerUser.userId);
    
    return customerUser;
  },

  getCustomerUser: function(email) {
    const sheet = SpreadsheetApp.openById(USER_MANAGEMENT_SCHEMA.customerUsers.sheetId).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf('email')] === email) {
        return {
          userId: data[i][headers.indexOf('userId')],
          email: data[i][headers.indexOf('email')],
          name: data[i][headers.indexOf('name')],
          customerId: data[i][headers.indexOf('customerId')],
          companyName: data[i][headers.indexOf('companyName')],
          isActive: data[i][headers.indexOf('isActive')],
          lastLogin: data[i][headers.indexOf('lastLogin')]
        };
      }
    }
    return null;
  },

  updateCustomerLastLogin: function(userId) {
    const sheet = SpreadsheetApp.openById(USER_MANAGEMENT_SCHEMA.customerUsers.sheetId).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf('userId')] === userId) {
        sheet.getRange(i + 1, headers.indexOf('lastLogin') + 1).setValue(new Date());
        break;
      }
    }
  },

  // 顧客の所有データのみアクセス許可
  isOwnResource: function(customerUser, resourceId) {
    // プロジェクトが自社のものかチェック
    const projectSheet = SpreadsheetApp.openById('PROJECTS_SHEET_ID').getActiveSheet();
    const projectData = projectSheet.getDataRange().getValues();
    
    for (let i = 1; i < projectData.length; i++) {
      if (projectData[i][0] === resourceId && projectData[i][1] === customerUser.customerId) {
        return true;
      }
    }
    return false;
  }
  
  getCurrentUser: function() {
    return Session.getActiveUser().getEmail();
  },
  
  hasPermission: function(userEmail, resource) {
    // 権限管理スプレッドシートで確認
    const permissionsSheet = SpreadsheetApp.openById(PERMISSIONS_SHEET_ID);
    const permissions = permissionsSheet.getDataRange().getValues();
    
    return permissions.some(row => 
      row[0] === userEmail && row[1] === resource && row[2] === 'allowed'
    );
  }
};
```

### **3. ML予測機能: Google AI Platform統合**

```javascript
// MLPredictionsAPI.gs
const MLPredictionsAPI = {
  predictCO2Fixation: function(projectId, inputData) {
    try {
      // 簡易予測アルゴリズム（線形回帰）
      const historicalData = MeasurementsLib.getByProjectId(projectId);
      const prediction = this.calculateLinearRegression(historicalData, inputData);
      
      // 予測結果をスプレッドシートに保存
      const predictionId = Utilities.getUuid();
      const sheet = SpreadsheetApp.openById(ML_PREDICTIONS_SCHEMA.sheetId);
      sheet.appendRow([
        predictionId,
        projectId,
        'co2_fixation',
        JSON.stringify(inputData),
        prediction.value,
        prediction.confidence,
        new Date(),
        '1.0'
      ]);
      
      return {
        predictionId: predictionId,
        predictedValue: prediction.value,
        confidence: prediction.confidence
      };
    } catch (error) {
      throw new Error(`ML prediction failed: ${error.message}`);
    }
  },
  
  calculateLinearRegression: function(historicalData, inputData) {
    // 簡易線形回帰実装
    if (historicalData.length < 3) {
      return { value: 0, confidence: 0 };
    }
    
    const x = historicalData.map(d => d.rockDispersalAmount);
    const y = historicalData.map(d => d.co2Level);
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const predictedValue = slope * inputData.rockDispersalAmount + intercept;
    const confidence = Math.min(0.95, historicalData.length / 100); // データ量に基づく信頼度
    
    return { value: predictedValue, confidence: confidence };
  }
};
```

### **4. レポート生成: Google Docs/Sheets API**

```javascript
// ReportsAPI.gs
const ReportsAPI = {
  generateMRVReport: function(projectId, startDate, endDate) {
    try {
      // データ取得
      const project = ProjectsLib.getById(projectId);
      const measurements = MeasurementsLib.getByProjectIdAndDateRange(
        projectId, startDate, endDate
      );
      
      // Google Docsテンプレートをコピー
      const templateId = 'MRV_REPORT_TEMPLATE_ID';
      const template = DriveApp.getFileById(templateId);
      const reportFile = template.makeCopy(`MRV Report - ${project.projectName} - ${new Date().toISOString()}`);
      
      // ドキュメント内容を更新
      const doc = DocumentApp.openById(reportFile.getId());
      const body = doc.getBody();
      
      // プレースホルダーを実際のデータで置換
      body.replaceText('{{PROJECT_NAME}}', project.projectName);
      body.replaceText('{{CUSTOMER_NAME}}', project.customerName);
      body.replaceText('{{REPORT_PERIOD}}', `${startDate} - ${endDate}`);
      
      // 測定データテーブルを挿入
      const table = body.appendTable();
      measurements.forEach(measurement => {
        const row = table.appendTableRow();
        row.appendTableCell(measurement.measurementDate);
        row.appendTableCell(measurement.co2Level.toString());
        row.appendTableCell(measurement.pH.toString());
        row.appendTableCell(measurement.temperature.toString());
      });
      
      doc.saveAndClose();
      
      // PDFエクスポート
      const pdfBlob = DriveApp.getFileById(reportFile.getId()).getAs('application/pdf');
      const pdfFile = DriveApp.createFile(pdfBlob);
      
      return {
        reportId: reportFile.getId(),
        pdfId: pdfFile.getId(),
        downloadUrl: pdfFile.getDownloadUrl()
      };
    } catch (error) {
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }
};
```

### **5. 監視・アラート機能: Time-driven Triggers**

```javascript
// MonitoringTriggers.gs
function setupMonitoringTriggers() {
  // 毎時実行のトリガー設定
  ScriptApp.newTrigger('checkAnomalies')
    .timeBased()
    .everyHours(1)
    .create();
    
  // 日次レポートトリガー
  ScriptApp.newTrigger('generateDailyReport')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
}

function checkAnomalies() {
  try {
    const recentMeasurements = MeasurementsLib.getRecent(24); // 過去24時間
    
    recentMeasurements.forEach(measurement => {
      // 異常値検知ロジック
      if (measurement.pH < 6.0 || measurement.pH > 8.0) {
        sendAlert('pH Anomaly', `pH value ${measurement.pH} detected in project ${measurement.projectId}`);
      }
      
      if (measurement.co2Level > 1000) {
        sendAlert('High CO2', `High CO2 level ${measurement.co2Level} detected in project ${measurement.projectId}`);
      }
    });
  } catch (error) {
    console.error('Anomaly check failed:', error);
  }
}

function sendAlert(title, message) {
  // Gmail APIでアラートメール送信
  const recipients = ['admin@weathering-project.com'];
  recipients.forEach(email => {
    GmailApp.sendEmail(
      email,
      `[ALERT] ${title}`,
      message,
      {
        name: 'Weathering Project Monitoring System'
      }
    );
  });
}
```

---

## 🚀 フロントエンド実装オプション

### **Option A: GAS HTML Service**

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
  <title>風化促進CO2除去事業管理システム</title>
</head>
<body>
  <div class="container">
    <h1>プロジェクト管理</h1>
    <div id="app">
      <div class="row">
        <div class="col-md-6">
          <h3>プロジェクト一覧</h3>
          <div id="projects-list"></div>
        </div>
        <div class="col-md-6">
          <h3>測定データ</h3>
          <div id="measurements-chart"></div>
        </div>
      </div>
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    // GAS関数を呼び出してデータを取得
    google.script.run
      .withSuccessHandler(displayProjects)
      .withFailureHandler(handleError)
      .getProjects();
      
    function displayProjects(projects) {
      const projectsList = document.getElementById('projects-list');
      projectsList.innerHTML = projects.map(project => 
        `<div class="card mb-2">
          <div class="card-body">
            <h5>${project.projectName}</h5>
            <p>顧客: ${project.customerName}</p>
            <p>状態: ${project.status}</p>
          </div>
        </div>`
      ).join('');
    }
    
    function handleError(error) {
      console.error('Error:', error);
      alert('データの取得に失敗しました');
    }
  </script>
</body>
</html>
```

### **Option B: 外部React App**

```javascript
// ReactアプリからGAS Web Appを呼び出し
const GAS_API_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

class WeatheringProjectAPI {
  static async callGASAPI(endpoint, method = 'GET', data = {}) {
    const url = `${GAS_API_URL}?path=${endpoint}`;
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method === 'POST' ? JSON.stringify(data) : undefined
    };
    
    const response = await fetch(url, options);
    return response.json();
  }
  
  static async getProjects() {
    return this.callGASAPI('projects');
  }
  
  static async createProject(projectData) {
    return this.callGASAPI('projects', 'POST', projectData);
  }
  
  static async getMeasurements(projectId) {
    return this.callGASAPI(`measurements?projectId=${projectId}`);
  }
}

// React コンポーネント例
function ProjectDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    WeatheringProjectAPI.getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="dashboard">
      <h2>プロジェクト管理</h2>
      {projects.map(project => (
        <ProjectCard key={project.projectId} project={project} />
      ))}
    </div>
  );
}
```

---

## ⚠️ GAS版の制約と対策

### **1. 実行時間制限 (6分)**
**制約**: 長時間処理が中断される
**対策**: 
- バッチ処理を分割して実行
- Time-driven Triggersで段階実行
- 処理状況をスプレッドシートで管理

```javascript
function processLargeBatch() {
  const BATCH_SIZE = 100;
  const processingState = PropertiesService.getScriptProperties();
  const lastProcessedIndex = parseInt(processingState.getProperty('lastIndex') || '0');
  
  const allData = MeasurementsLib.getAll();
  const batch = allData.slice(lastProcessedIndex, lastProcessedIndex + BATCH_SIZE);
  
  batch.forEach((item, index) => {
    // 処理実行
    processItem(item);
  });
  
  // 次回開始位置を保存
  processingState.setProperty('lastIndex', (lastProcessedIndex + BATCH_SIZE).toString());
  
  // まだ処理するデータがある場合、次のトリガーをセット
  if (lastProcessedIndex + BATCH_SIZE < allData.length) {
    ScriptApp.newTrigger('processLargeBatch').timeBased().after(30000).create();
  }
}
```

### **2. スプレッドシート操作制限**
**制約**: 大量データでのパフォーマンス低下
**対策**:
- バッチ読み込み・書き込み
- データのキャッシュ活用
- インデックス用のマスターシート作成

```javascript
const DataCache = {
  cache: {},
  
  getProjects: function() {
    if (!this.cache.projects) {
      const sheet = SpreadsheetApp.openById(PROJECTS_SHEET_ID);
      const data = sheet.getDataRange().getValues();
      this.cache.projects = data.slice(1).map(row => ({
        projectId: row[0],
        customerId: row[1],
        projectName: row[2],
        // ... other fields
      }));
    }
    return this.cache.projects;
  },
  
  invalidate: function(key) {
    delete this.cache[key];
  }
};
```

### **3. 同時実行制限**
**制約**: 並行処理ができない
**対策**:
- LockServiceを使用した排他制御
- 処理の順序化

```javascript
function safeDataUpdate(updateFunction) {
  const lock = LockService.getDocumentLock();
  try {
    lock.waitLock(30000); // 30秒待機
    updateFunction();
  } catch (e) {
    console.error('Could not obtain lock:', e);
  } finally {
    lock.releaseLock();
  }
}
```

---

## 🖥️ フロントエンド設計（シンプル2画面分離）

### **ログイン画面の分離**

#### **入口ページ（index.html）**
```html
<!DOCTYPE html>
<html>
<head>
  <title>風化促進CO2除去事業管理システム</title>
  <style>
    .login-selector { text-align: center; padding: 4rem; background: #f7fafc; }
    .login-option { margin: 2rem; padding: 2rem; border: 2px solid #e2e8f0; border-radius: 8px; display: inline-block; width: 300px; }
    .login-option:hover { background: #edf2f7; cursor: pointer; }
    .admin-option { border-color: #3182ce; }
    .customer-option { border-color: #38a169; }
  </style>
</head>
<body>
  <div class="login-selector">
    <h1>🌱 風化促進CO2除去事業管理システム</h1>
    <p>ログインタイプを選択してください</p>
    
    <div class="login-option admin-option" onclick="location.href='/admin-login'">
      <h2>🏢 管理者ログイン</h2>
      <p>システム管理者・オペレーター向け</p>
      <ul>
        <li>全顧客・プロジェクト管理</li>
        <li>ユーザー管理</li>
        <li>システム監視</li>
        <li>レポート生成</li>
      </ul>
    </div>
    
    <div class="login-option customer-option" onclick="location.href='/customer-login'">
      <h2>🏭 顧客ログイン</h2>
      <p>鉱山事業者向け</p>
      <ul>
        <li>自社プロジェクト閲覧</li>
        <li>測定データ確認</li>
        <li>分析結果表示</li>
        <li>レポートダウンロード</li>
      </ul>
    </div>
  </div>
</body>
</html>
```

#### **管理者用ログイン画面**
```html
<!DOCTYPE html>
<html>
<head>
  <title>管理者ログイン - 風化促進CO2除去システム</title>
  <style>
    .admin-login { background: #1a365d; color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-form { background: white; color: black; padding: 3rem; border-radius: 8px; width: 400px; }
  </style>
</head>
<body>
  <div class="admin-login">
    <div class="login-form">
      <h2>🏢 管理者ログイン</h2>
      <button id="admin-google-signin" class="google-signin-btn">
        Google アカウントでログイン
      </button>
      <p><small>管理者権限が登録されたアカウントのみアクセス可能</small></p>
    </div>
  </div>

  <script>
    function handleAdminSignIn() {
      gapi.load('auth2', function() {
        gapi.auth2.init({ client_id: 'YOUR_GOOGLE_CLIENT_ID' })
          .then(function() {
            const authInstance = gapi.auth2.getAuthInstance();
            authInstance.signIn().then(function(user) {
              const token = user.getAuthResponse().access_token;
              
              // 管理者認証API呼び出し
              fetch(ADMIN_WEBAPP_URL + '?path=auth/verify', {
                method: 'POST',
                body: new URLSearchParams({ token: token })
              })
              .then(response => response.json())
              .then(data => {
                if (data.adminUser) {
                  localStorage.setItem('adminToken', token);
                  location.href = '/admin-dashboard';
                } else {
                  alert('管理者権限がありません。顧客ログインをご利用ください。');
                  location.href = '/customer-login';
                }
              });
            });
          });
      });
    }

    document.getElementById('admin-google-signin').onclick = handleAdminSignIn;
  </script>
</body>
</html>
```

#### **顧客用ログイン画面**
```html
<!DOCTYPE html>
<html>
<head>
  <title>顧客ログイン - 風化促進CO2除去システム</title>
  <style>
    .customer-login { background: #2d3748; color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-form { background: white; color: black; padding: 3rem; border-radius: 8px; width: 400px; }
  </style>
</head>
<body>
  <div class="customer-login">
    <div class="login-form">
      <h2>🏭 顧客ログイン</h2>
      <button id="customer-google-signin" class="google-signin-btn">
        Google アカウントでログイン
      </button>
      <p><small>事前に登録された顧客アカウントのみアクセス可能</small></p>
    </div>
  </div>

  <script>
    function handleCustomerSignIn() {
      gapi.load('auth2', function() {
        gapi.auth2.init({ client_id: 'YOUR_GOOGLE_CLIENT_ID' })
          .then(function() {
            const authInstance = gapi.auth2.getAuthInstance();
            authInstance.signIn().then(function(user) {
              const token = user.getAuthResponse().access_token;
              
              // 顧客認証API呼び出し
              fetch(CUSTOMER_WEBAPP_URL + '?path=auth/verify', {
                method: 'POST',
                body: new URLSearchParams({ token: token })
              })
              .then(response => response.json())
              .then(data => {
                if (data.customerUser) {
                  localStorage.setItem('customerToken', token);
                  localStorage.setItem('companyName', data.customerUser.companyName);
                  location.href = '/customer-dashboard';
                } else {
                  alert('顧客権限がありません。管理者にお問い合わせください。');
                }
              });
            });
          });
      });
    }

    document.getElementById('customer-google-signin').onclick = handleCustomerSignIn;
  </script>
</body>
</html>
```

#### **シンプルなセキュリティ管理**

```javascript
// SecurityLib.gs（簡素版）
const SecurityLib = {
  // 基本的なセッション管理
  createSession: function(userType, userInfo) {
    const sessionId = Utilities.getUuid();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8時間
    
    const sessionData = {
      sessionId,
      userType, // 'admin' or 'customer'
      userInfo,
      createdAt: new Date(),
      expiresAt
    };
    
    PropertiesService.getScriptProperties().setProperty(
      `session_${sessionId}`, 
      JSON.stringify(sessionData)
    );
    
    return sessionId;
  },

  validateSession: function(sessionId) {
    const sessionData = PropertiesService.getScriptProperties().getProperty(`session_${sessionId}`);
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    if (new Date(session.expiresAt) < new Date()) {
      this.destroySession(sessionId);
      return null;
    }
    
    return session;
  },

  destroySession: function(sessionId) {
    PropertiesService.getScriptProperties().deleteProperty(`session_${sessionId}`);
  }
};
```

---

## 🛠️ セットアップ手順（シンプル版）

### **初期セットアップ**

```javascript
// Setup.gs（簡素版）
function setupSimpleSystem() {
  console.log('シンプルシステムのセットアップを開始...');
  
  // 1. 管理者ユーザー管理スプレッドシート作成
  const adminUsersSheet = SpreadsheetApp.create('AdminUsers_Management');
  const adminSheet = adminUsersSheet.getActiveSheet();
  adminSheet.getRange(1, 1, 1, 6).setValues([[
    'adminId', 'email', 'name', 'isActive', 'lastLogin', 'createdAt'
  ]]);
  
  // 2. 顧客ユーザー管理スプレッドシート作成
  const customerUsersSheet = SpreadsheetApp.create('CustomerUsers_Management');
  const customerSheet = customerUsersSheet.getActiveSheet();
  customerSheet.getRange(1, 1, 1, 8).setValues([[
    'userId', 'email', 'name', 'customerId', 'companyName', 'isActive', 'lastLogin', 'createdAt'
  ]]);
  
  // 3. 初期管理者作成
  createAdminUser('admin@weathering-project.com', 'システム管理者');
  
  // 4. システムプロパティ設定
  const properties = PropertiesService.getScriptProperties();
  properties.setProperties({
    'ADMIN_USERS_SHEET_ID': adminUsersSheet.getId(),
    'CUSTOMER_USERS_SHEET_ID': customerUsersSheet.getId(),
    'GOOGLE_CLIENT_ID': 'YOUR_GOOGLE_CLIENT_ID',
    'ADMIN_WEBAPP_URL': 'https://script.google.com/macros/s/YOUR_ADMIN_WEBAPP_ID/exec',
    'CUSTOMER_WEBAPP_URL': 'https://script.google.com/macros/s/YOUR_CUSTOMER_WEBAPP_ID/exec'
  });
  
  console.log('セットアップ完了');
  console.log('Admin Users Sheet ID:', adminUsersSheet.getId());
  console.log('Customer Users Sheet ID:', customerUsersSheet.getId());
  
  return {
    adminUsersSheetId: adminUsersSheet.getId(),
    customerUsersSheetId: customerUsersSheet.getId()
  };
}
```

### **シンプル運用ガイド**

#### **ユーザー管理**

| 画面 | 対象ユーザー | 機能 | 制限 |
|------|--------------|------|------|
| **管理者画面** | システム運営者 | 全機能、全データ管理 | なし |
| **顧客画面** | 鉱山事業者 | 自社データ閲覧・分析 | 他社データアクセス不可 |

#### **ユーザー追加フロー**

```
1. 管理者が適切なスプレッドシート（AdminUsers or CustomerUsers）にユーザー情報を追加
   ↓
2. ユーザーが適切なログイン画面からGoogleアカウントでログイン
   ↓
3. システムが自動認証、適切なダッシュボードに誘導
```

#### **基本的なセキュリティ**

- **認証**: Google Account必須
- **セッション**: 8時間で自動ログアウト
- **データ分離**: 顧客は自社データのみアクセス
- **管理者権限**: 事前登録されたアカウントのみ

---

## 💰 コスト比較

### **AWS版**
- Lambda: $0.20/月（軽使用）
- DynamoDB: $25/月（5GB、読み込み25単位、書き込み25単位）
- API Gateway: $3.50/月（100万リクエスト）
- S3: $2/月（100GB）
- Cognito: $0（MAU 50,000まで無料）
- **合計: 約$30.70/月**

### **GAS版**
- Google Apps Script: **完全無料**
- Google Drive: 15GB無料（追加100GB: $1.99/月）
- Google Workspace（オプション）: $6/月/ユーザー
- **合計: $0〜$7.99/月**

---

## 🔄 移行戦略

### **段階的移行アプローチ**

#### **Phase 1: データ層移行 (1週間)**
1. DynamoDBデータをGoogle Sheetsにエクスポート
2. スプレッドシート構造の最適化
3. データアクセス層の実装

#### **Phase 2: API層移行 (2週間)**
1. GAS Web AppsでAPIエンドポイント作成
2. 認証システムの実装
3. 既存APIとの互換性確保

#### **Phase 3: フロントエンド連携 (1週間)**
1. React AppをGAS APIに接続
2. 機能テスト・性能テスト
3. UI/UX調整

#### **Phase 4: 高度機能移行 (2週間)**
1. ML予測アルゴリズムの移植
2. レポート生成機能
3. 監視・アラート機能

---

## 📈 性能・スケーラビリティ

### **想定処理能力**

| 項目 | AWS版 | GAS版 | 制限要因 |
|------|-------|-------|----------|
| 同時ユーザー数 | 1000+ | 50-100 | GAS実行制限 |
| データ件数 | 100万件+ | 10万件 | スプレッドシート行数制限 |
| API応答時間 | 100ms | 500-2000ms | GAS起動時間 |
| バッチ処理 | 無制限 | 6分/実行 | GAS実行時間制限 |

### **スケールアップ戦略**
1. **データ分割**: 年次・プロジェクト別にスプレッドシート分割
2. **マイクロサービス化**: 機能別にGAS Webアプリを分離
3. **キャッシュ戦略**: CacheServiceを活用した応答高速化

---

## 🎯 結論・推奨事項

### **GAS版が適している場合**
- **小規模運用** (顧客数 < 50社、プロジェクト数 < 200)
- **コスト最優先** (予算 < $10/月)
- **Google Workspace環境** (既にG Suiteを使用)
- **開発リソース不足** (フルスタック開発者がいない)

### **AWS版が適している場合**  
- **中規模〜大規模運用** (顧客数 100社+、データ量大)
- **高性能要求** (応答時間 < 200ms必須)
- **本格的なML機能** (複雑な予測アルゴリズム)
- **将来的なスケール** (事業拡大予定)

### **ハイブリッド戦略**
- **初期フェーズ**: GAS版で低コスト運用開始
- **成長フェーズ**: 段階的にAWS版に移行
- **運用フェーズ**: AWS版でエンタープライズ運用

---

## 🎯 **シンプル2画面分離方式の利点**

### **✅ 開発・運用が簡単**
- 複雑な権限チェックロジック不要
- 管理者用・顧客用で明確に機能分離
- デバッグ・保守が容易

### **✅ セキュリティが明確**
- 画面レベルでのアクセス制御
- データ混在リスクの軽減
- 認証フローがシンプル

### **✅ ユーザビリティ向上**
- 役割に特化したUI/UX
- 不要な機能が表示されない
- 迷いのない操作性

### **✅ スケーラビリティ**
- 管理者機能と顧客機能を独立して改善可能
- 負荷分散しやすい
- 段階的な機能追加が容易

### **🎯 推奨実装順序**

1. **入口ページ作成** - ログインタイプ選択画面
2. **管理者用WebApp** - 全機能アクセス可能な管理画面
3. **顧客用WebApp** - 自社データのみアクセス可能な顧客画面
4. **認証システム統合** - Google Account認証
5. **データ分離確保** - 顧客IDベースのフィルタリング

この設計により、GAS版でもAWS版に匹敵する機能性と安全性を、より簡単な実装で実現できます。

---

**作成日**: 2024年12月19日  
**バージョン**: 2.0（シンプル2画面分離版）  
**対象システム**: 風化促進CO2除去事業管理システム 