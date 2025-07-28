# ハッカソン開発ガイドライン (.cursorrules)

## プロジェクト概要
### 開発するアプリケーション
[チームで入力してください]

#### 問題定義
- 現在困っていること：
- なぜこの問題が重要なのか：
- 既存の解決方法の課題：

#### 対策・アプローチ
- この問題をどう解決するか：
- なぜこのアプローチを選んだか：
- 期待される効果：

#### 目的
- このアプリケーションで実現したいこと：
- 最終的なゴール：

#### 主な機能（重要！）
1. （メイン機能）：
2. （サポート機能）：
3. （追加機能・あれば嬉しい機能）：

#### ターゲットユーザー（ペルソナ）
**メインペルソナ**
- 名前：（例：田中花子さん）
- 年齢：
- 職業・属性：
- 日常の行動パターン：
- 抱えている課題：
- テクノロジーとの関わり方：
- このアプリを使うシチュエーション：

## 開発環境・技術スタック

### Phase 1: 基礎開発（HTML + JavaScript）
- **メイン技術**: HTML5, CSS3, Vanilla JavaScript
- **推奨構成**:
  ```
  project/
  ├── index.html
  ├── style.css
  ├── script.js
  └── assets/
      ├── images/
      └── data/
  ```
- **ローカル実行**: HTMLファイルを直接ブラウザで開く
- **データ保存**: localStorage, sessionStorage のみ使用

### Phase 2: サーバーサイド開発（Flask）
- **メイン技術**: Python Flask, HTML, CSS, JavaScript
- **推奨構成**:
  ```
  project/
  ├── app.py
  ├── requirements.txt
  ├── templates/
  │   └── index.html
  ├── static/
  │   ├── css/
  │   ├── js/
  │   └── images/
  └── data/
  ```
- **ローカル実行のみ**: 外部サーバー・クラウド利用禁止
- **データベース**: SQLite のみ使用（ローカルファイル）

## コーディング規約

### HTML
- セマンティックなタグを使用（header, main, section, article等）
- 適切なaria-label, alt属性を設定
- インデントは2スペース

### CSS
- BEM記法またはシンプルなクラス名を使用
- レスポンシブデザインを心がける
- カスタムプロパティ（CSS変数）を活用

### JavaScript
- ES6+の記法を使用（const/let, アロー関数等）
- 関数は純粋関数を心がける
- エラーハンドリングを適切に実装
- コメントで処理の意図を明記

### Python（Flask使用時）
- PEP 8に準拠
- 関数・クラスにdocstringを記載
- 適切な例外処理を実装

## コマンドルール
### ルール: Windows PowerShell環境でのターミナル規約
- このターミナルはWindowsのPowerShellです。Linux/bash特有のコマンドやオプションは絶対に使用しないでください。
- ファイルパスは、常にバックスラッシュ(`\`)を使用したWindows形式で記述してください。(例: "C:\Users\YourUser\Documents\file.txt")
- 環境変数にアクセスする際は、`$env:USERNAME` や `$env:USERPROFILE` のように `$env:` プレフィックスを使用してください。
- &&は絶対に禁止です。

### 1. 基本的な環境設定
- このターミナルはWindowsのPowerShellです。Linux/bash特有のコマンドやオプションは絶対に使用しないでください。
- ファイルパスは、常にバックスラッシュ(`\`)を使用したWindows形式で記述してください。(例: "C:\Users\YourUser\Documents\file.txt")
- 環境変数にアクセスする際は、`$env:USERNAME` や `$env:USERPROFILE` のように `$env:` プレフィックスを使用してください。

### 2. Linuxコマンドの禁止とPowerShell代替コマンドの指定
- `ls -la` のようなLinux形式のオプションは使用禁止です。ファイル一覧は `Get-ChildItem` (またはエイリアスの `ls`, `dir`) を使用してください。
- `grep` は使用禁止です。テキスト検索には `Select-String` (またはエイリアスの `sls`) を使用してください。
- `cp` は使用禁止です。ファイルのコピーには `Copy-Item` を使用してください。
- `mv` は使用禁止です。ファイルの移動には `Move-Item` を使用してください。
- `rm -rf` のようなLinuxオプションは使用禁止です。再帰的な削除には `Remove-Item -Recurse -Force` を使用してください。
- `mkdir -p` は使用禁止です。深い階層のディレクトリ作成には `New-Item -ItemType Directory -Force "C:\path\to\new\directory"` のように記述してください。
- `touch` は使用禁止です。空ファイルの作成には `New-Item -ItemType File "filename.txt"` を使用してください。
- `which` は使用禁止です。コマンドのパスを見つけるには `Get-Command` を使用してください。
- `curl` や `wget` は使用禁止です。Webリクエストには `Invoke-WebRequest` または `Invoke-RestMethod` を使用してください。

### 3. PowerShell特有の構文
- コマンドの出力を別のコマンドに渡す場合は、パイプライン(`|`)を正しく使用してください。

## 開発ワークフロー

### Phase 1: HTML/JavaScript開発時
1. プロジェクトフォルダを作成:
   ```powershell
   New-Item -ItemType Directory -Force "hackathon-project"
   Set-Location "hackathon-project"
   ```

2. 基本ファイルを作成:
   ```powershell
   New-Item -ItemType File "index.html"
   New-Item -ItemType File "style.css"
   New-Item -ItemType File "script.js"
   ```

3. 開発中のテスト: index.htmlをブラウザで直接開く

### Phase 2: Flask開発時
1. 仮想環境を作成・有効化:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

2. Flaskをインストール:
   ```powershell
   pip install flask
   pip freeze > requirements.txt
   ```

3. サーバー起動:
   ```powershell
   python app.py
   ```

## 禁止事項
- 外部クラウドサービス（AWS, GCP, Azure等）の利用
- 外部サーバーへのデプロイ
- 有料APIの使用
- 個人情報を扱うアプリケーション
- 過度に複雑なライブラリ・フレームワークの使用

## 推奨ライブラリ・ツール

### Phase 1用
- **CSS Framework**: なし（自作CSSを推奨）
- **JavaScript**: Vanilla JSのみ
- **データ**: JSON形式でローカルファイル保存

### Phase 2用
- **Flask拡張**: Flask-SQLAlchemy（任意）
- **テンプレート**: Jinja2（Flask標準）
- **データベース**: SQLite

## コード生成時の注意点
- 学習者向けなので、コメントを多めに記載
- 段階的に理解できるよう、シンプルで読みやすいコードを生成
- Windows環境でのパス指定、コマンド実行を考慮
- エラーハンドリングとデバッグのしやすさを重視
- セキュリティの基本（XSS対策等）を考慮したコード

## デバッグ・トラブルシューティング
- ブラウザの開発者ツールを積極的に使用
- console.log()でのデバッグを推奨
- エラーメッセージは日本語で分かりやすく表示
- 段階的なテスト（小さな機能から確認）

---
このルールに従って、学習者が段階的にスキルアップできるようサポートしてください。