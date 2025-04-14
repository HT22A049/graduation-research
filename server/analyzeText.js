const language = require('@google-cloud/language');
const dotenv = require('dotenv');

// 環境変数を読み込む
dotenv.config();

// クライアントを作成
const client = new language.LanguageServiceClient();

// 日本標準時を基準にした解析
const referenceDate = new Date();
referenceDate.setHours(referenceDate.getHours() + 9);

// 正規表現を用いて様々な形式の日付を解析する関数
function parseDate(input) {
  // 全角数字・文字を半角に変換
  input = input.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });

  let match;

  // 年・月・日・時・分までを含む形式
  if ((match = input.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(午前|午後)?\s*(\d{1,2})時(\d{1,2})分/))) {
    const [_, year, month, day, ampm, hourStr, minute] = match;
    let hour = parseInt(hourStr, 10);
    if (ampm === '午後' && hour < 12) hour += 12;
    if (ampm === '午前' && hour === 12) hour = 0;
    return new Date(year, month - 1, day, hour, minute);
  } 
  // 年・月・日までの形式
  else if ((match = input.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/))) {
    const [_, year, month, day] = match;
    return new Date(year, month - 1, day);
  } 
  // 年/月/日 時:分形式
  else if ((match = input.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(午前|午後)?\s*(\d{1,2}):(\d{1,2})/))) {
    const [_, year, month, day, ampm, hourStr, minute] = match;
    let hour = parseInt(hourStr, 10);
    if (ampm === '午後' && hour < 12) hour += 12;
    if (ampm === '午前' && hour === 12) hour = 0;
    return new Date(year, month - 1, day, hour, minute);
  } 
  // 月/日 時:分形式
  else if ((match = input.match(/(\d{1,2})月(\d{1,2})日\s*(午前|午後)?\s*(\d{1,2})時(\d{1,2})分/))) {
    const [_, month, day, ampm, hourStr, minute] = match;
    let hour = parseInt(hourStr, 10);
    if (ampm === '午後' && hour < 12) hour += 12;
    if (ampm === '午前' && hour === 12) hour = 0;
    const today = new Date();
    return new Date(today.getFullYear(), month - 1, day, hour, minute);
  } 

  // 月/日 時形式（新たに追加）
  else if ((match = input.match(/(\d{1,2})月(\d{1,2})日\s*(午前|午後)?\s*(\d{1,2})時/))) {
    const [_, month, day, ampm, hourStr] = match;
    let hour = parseInt(hourStr, 10);
    if (ampm === '午後' && hour < 12) hour += 12;
    if (ampm === '午前' && hour === 12) hour = 0;
    const today = new Date();
    return new Date(today.getFullYear(), month - 1, day, hour, 0);
  }

  // 明日・明後日・来週の曜日などを含む形式
  else if ((match = input.match(/(明日|明後日|来週の[日月火水木金土]曜日)?\s*(午前|午後)?\s*(\d{1,2})時/))) {
    const [_, dayWord, ampm, hourStr] = match;
    let date = new Date();

    // 日付の解析 ("明日", "明後日", "来週の金曜日" など)
    if (dayWord === '明日') {
      date.setDate(date.getDate() + 1);
    } else if (dayWord === '明後日') {
      date.setDate(date.getDate() + 2);
    } else if (dayWord && dayWord.startsWith('来週の')) {
      const dayOfWeek = '日月火水木金土'.indexOf(dayWord[3]);
      const currentDayOfWeek = date.getDay();
      let daysToAdd = dayOfWeek - currentDayOfWeek + 7;
      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }
      date.setDate(date.getDate() + daysToAdd);
    }

    // 時間の解析
    let hour = parseInt(hourStr, 10);
    if (ampm === '午後' && hour < 12) hour += 12;
    if (ampm === '午前' && hour === 12) hour = 0;
    date.setHours(hour);
    date.setMinutes(0);

    return date;
  } 
  // 今日
  else if (input.match(/今日/)) {
    return new Date();
  } 
  // 明日
  else if (input.match(/明日/)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  } 
  // 明後日
  else if (input.match(/明後日/)) {
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    return dayAfterTomorrow;
  } 
  // 来週
  else if (input.match(/来週/)) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  } 
  // 今週
  else if (input.match(/今週/)) {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    return startOfWeek;
  } 
  // 今月
  else if (input.match(/今月/)) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    return startOfMonth;
  } 
  // 来月
  else if (input.match(/来月/)) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    return nextMonth;
  }

  // 日付が解析できなかった場合
  return null;
}

async function analyzeText(text) {
  const document = {
    content: text,
    type: 'PLAIN_TEXT',
  };

  const [result] = await client.analyzeEntities({ document });
  const entities = result.entities;

  console.log('Entities Result:');
  console.log(JSON.stringify(entities, null, 2)); // エンティティを詳細に出力

  const entitiesResult = entities.map(entity => ({
    name: entity.name,
    type: entity.type,
  }));

  const datesResult = [{ start: parseDate(text) }];

  // エンティティと日付の結果を返す
  return { entities: entitiesResult, dates: datesResult };
}

// analyzeText 関数をエクスポート
module.exports = { analyzeText };