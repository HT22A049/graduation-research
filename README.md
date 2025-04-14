# プロジェクト概要
卒業研究で開発した、**自然言語処理を用いた入力時間を短縮するタスク管理アプリケーション**です。ユーザーが100文字程度の文章で予定を入力すると、日付・内容などを自動的に抽出し、タスクとして登録できます。

# 使用技術
- フロントエンド: React, JavaScript
- バックエンド: Node.js, Express
- API連携: Google Cloud Natural Language API
- その他: Docker(開発環境)

# 主な機能
- 入力文から自動的にタスク名・詳細・日付を抽出
- タスクリストとしてUIに表示
- サーバーサイドでテキスト解析を実行し、結果を返却

# 開発背景
「自然言語処理を用いたタスク自動分類」をテーマとした卒業研究の一環で制作しました。ユーザーが予定を言葉で入力するだけで、煩雑な登録作業を軽減することを目的としています。

# セットアップ
- git clone https://github.com/HT22A049/graduation-research
- cd graduation-research
- npm install
- npm start

# 備考
- Google CloudのAPIキーが必要です。.envファイルに設定してください。

- WSL2環境で開発・動作確認済み。
