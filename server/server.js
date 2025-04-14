const fs = require('fs');
const { google } = require('googleapis');
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const { analyzeText } = require('./analyzeText'); // analyzeText 関数をインポート

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Gmail API のスコープ
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// OAuth2クライアントの作成
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'http://localhost:3000/oauth2callback'  // リダイレクトURI
);

// トークンを取得またはリフレッシュする関数
const getAccessToken = () => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
};

// Gmail APIを使用して最新のメールを取得する関数
const listMessages = async (auth) => {
  const gmail = google.gmail({ version: 'v1', auth });
  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,  // 取得するメールの数を設定
      q: '',          // クエリを使ってフィルタリングも可能
    });
    const messages = res.data.messages;
    if (!messages || messages.length === 0) {
      console.log('No messages found.');
      return;
    }
    console.log('Messages:');
    for (let message of messages) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });
      console.log(`- ${msg.data.snippet}`);  // メールの内容のスニペットを表示
    }
  } catch (err) {
    console.log('The API returned an error: ' + err);
  }
};

// 新しいエンドポイント /authorize
app.get('/authorize', (req, res) => {
  getAccessToken();
  res.send('Authorization URL generated. Please visit the URL and authorize the app.');
});

// メールを取得してタスクに追加するエンドポイント
app.get('/getEmails', async (req, res) => {
  try {
    const token = JSON.parse(fs.readFileSync('token.json'));
    oAuth2Client.setCredentials(token);
    await listMessages(oAuth2Client);
    res.send('Emails retrieved.');
  } catch (error) {
    console.error('Error retrieving emails:', error);
    res.status(500).send('Error retrieving emails.');
  }
});

// トークンを保存する関数
const storeToken = (token) => {
  fs.writeFileSync('token.json', JSON.stringify(token));
};

// アクセストークンを取得して保存するエンドポイント
app.get('/oauth2callback', (req, res) => {
  const code = req.query.code;
  oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    oAuth2Client.setCredentials(token);
    storeToken(token);
    res.send('Authorization successful. You can now use the Gmail API.');
  });
});

app.post('/analyzeText', async (req, res) => {
  const text = req.body.text; // クライアントから送られてくるテキスト
  try {
    const analysisResult = await analyzeText(text); // テキストを解析
    res.json(analysisResult); // 結果をクライアントに返す
  } catch (error) {
    console.error('Error in analyzeText:', error); // エラーログを追加
    res.status(500).send('Internal Server Error'); // ユーザーフレンドリーなメッセージ
  }
});

// サーバーをポート3000で実行
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});