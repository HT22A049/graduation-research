import React, { useState, useEffect } from 'react'; // useEffectをインポート
import './TodoList.css'; // スタイルシートをインポート
import axios from 'axios'; // axios を使用してサーバーと通信
import Modal from 'react-modal'; // モーダルライブラリをインポート

// タスクのIDを一意にするための変数
let maxId = 0;

// Todoリストコンポーネント
export default function TodoList() {
  const [title, setTitle] = useState(''); // 入力フィールドの内容を管理
  const [todo, setTodo] = useState([]); // Todoリストの状態を管理
  const [modalIsOpen, setModalIsOpen] = useState(false); // モーダルの開閉状態を管理
  const [originalText, setOriginalText] = useState(''); // モーダルで表示する元の文章を保持

  // モーダルのアクセシビリティ設定（初回マウント時に実行）
  useEffect(() => {
    Modal.setAppElement('#root');
  }, []);

  // 入力フィールドが変更されたときに実行
  const handleChangeTitle = e => {
    setTitle(e.target.value);
  };

  // テキストエリアの高さを自動調整
  const autoResizeTextarea = (event) => {
    const textarea = event.target;
    textarea.style.height = 'auto'; // 高さを一度リセット
    textarea.style.height = textarea.scrollHeight + 'px'; // 内容に応じて高さを調整
  };

  // タスクを追加する関数
  const handleClick = async () => {
    try {
      // 改行でタスクを分割し、空行を除外
      const tasks = title.split(/\n/).filter(task => task.trim() !== '');
      if (tasks.length === 0) return; // 空の場合は処理を終了

      const newTasks = []; // 新しいタスクを格納する配列

      // 各タスクを処理
      for (const task of tasks) {
        // 文単位でタスクを分割し、空の文を除外
        const sentences = task.split(/。|！？/).filter(sentence => sentence.trim() !== '');
        if (sentences.length === 0) continue;

        let mainTask = sentences[0].trim(); // 最初の文をタスク名として使用
        let details = sentences.slice(1).join(' '); // 2文目以降を詳細情報に結合

        // サーバーにテキストを送信し、エンティティを取得
        const response = await axios.post('/analyzeText', { text: task });
        const entities = response.data.entities;

        let newTitle = mainTask; // タスク名
        let events = []; // イベント情報を格納
        let dueDate = null; // 締切日
        let time = ''; // 時間情報
        let detailText = details; // 詳細情報

        // 解析結果のエンティティを処理
        entities.forEach(entity => {
          if (entity.type !== 'OTHER') {
            if (entity.type === 'EVENT' || entity.type === 'WORK_OF_ART') {
              events.push(entity.name);
            }
            if (entity.type === 'PERSON') {
              detailText += ` 人物: ${entity.name} `;
            }
            if (entity.type === 'LOCATION') {
              detailText += ` 場所: ${entity.name} `;
            }
            if (entity.type === 'ORGANIZATION') {
              detailText += ` 組織: ${entity.name} `;
            }
            if (entity.type === 'NUMBER') {
              time += entity.name;
            }
            if (entity.type === 'DATE') {
              dueDate = new Date(entity.name);
            }
            if (entity.type === 'MONEY') {
              detailText += ` 金額: ${entity.name} `;
            }
            if (entity.type === 'PERCENT') {
              detailText += ` 割合: ${entity.name} `;
            }
          } else {
            if (['レポート', '課題', 'プログラミング', '宿題', '研究'].some(keyword => entity.name.includes(keyword))) {
              newTitle = entity.name;
            } else {
              if (!['取引先', 'プレゼン', '質問', '予定'].includes(entity.name)) {
                detailText += `${entity.name} `;
              }
            }
          }
        });

        // イベント名がある場合はタスク名として設定
        if (events.length > 0) {
          newTitle = events.join(' ');
        }

        // 解析された日付情報があれば締切日として設定
        if (response.data.dates.length > 0) {
          dueDate = new Date(response.data.dates[0].start);

          // 時間情報が4桁の場合（例: 1300）、時刻を設定
          if (time.length === 4) {
            dueDate.setHours(parseInt(time.substring(0, 2)));
            dueDate.setMinutes(parseInt(time.substring(2)));
          }
        }

        // 新しいタスクオブジェクトを作成し、リストに追加
        newTasks.push({
          id: ++maxId,
          title: newTitle,
          created: new Date(),
          isDone: false,
          dueDate: dueDate,
          details: detailText.trim(),
          originalText: task,
        });
      }

      // 新しいタスクを既存のリストに追加し、締切日順または作成日順にソート
      setTodo((prevTodo) =>
        [...prevTodo, ...newTasks].sort((a, b) => {
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate); // 締切日で比較
          }
          return a.created - b.created; // 作成日で比較
        })
      );

      setTitle(''); // 入力フィールドをリセット
    } catch (error) {
      console.error('Error:', error); // エラーが発生した場合にログを出力
    }
  };

  // モーダルを開く
  const openModal = (text) => {
    setOriginalText(text);
    setModalIsOpen(true);
  };

  // モーダルを閉じる
  const closeModal = () => {
    setModalIsOpen(false);
  };

  // タスクを「済」にする
  const handleDone = e => {
    setTodo(todo.map(item => {
      if (item.id === Number(e.target.dataset.id)) {
        return {
          ...item,
          isDone: true
        };
      } else {
        return item;
      }
    }));
  };

  // タスクを削除する
  const handleRemove = e => {
    setTodo(todo.filter(item =>
      item.id !== Number(e.target.dataset.id)
    ));
  };

  return (
    <div className="container">
      <div className="input-group">
        <div className="left-buttons">
          <label>
            やること：
            <textarea
              name="title"
              value={title}
              onChange={handleChangeTitle}
              onInput={autoResizeTextarea}
              rows="1"
              style={{ width: '100%', overflow: 'hidden', resize: 'none' }}
            />
          </label>
          <button type="button" onClick={handleClick}>追加</button>
        </div>
      </div>
      <hr />
      <div className="todo-list-container">
        <ul>
          {todo.map(item => (
            <li key={item.id} className={item.isDone ? 'done' : ''}>
              <span onClick={() => openModal(item.originalText)}>{item.title}</span>
              {item.details && <div className="details">詳細: {item.details}</div>}
              {item.dueDate && ` (締切: ${new Date(item.dueDate).toLocaleString()})`}
              <button
                type="button"
                onClick={handleDone}
                data-id={item.id}
              > 済
              </button>
              <button
                type="button"
                onClick={handleRemove}
                data-id={item.id}
              > 削除
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* モーダルの設定 */}
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal}>
        <h2>元の文章</h2>
        <div>{originalText}</div>
        <button onClick={closeModal}>閉じる</button>
      </Modal>
    </div>
  );
}