
importScripts('config.js');

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// ★★★ 修正点: 自動リトライ機能を追加 ★★★
async function sendRequestToGemini(prompt, tabId, retries = 3, delay = 1000) {
  // APIキーが設定されているかチェックする
  if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    const errorMessage = "エラー: Gemini APIキーが設定されていません。background.jsファイルを編集してください。";
    console.error(errorMessage);
    chrome.tabs.sendMessage(tabId, { type: "SHOW_RESULT", text: errorMessage });
    return;
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    // 503エラーの場合、リトライ処理を行う
    if (response.status === 503 && retries > 0) {
      console.log(`Model is overloaded. Retrying in ${delay / 1000}s... (${retries} retries left)`);
      // 少し待ってから再帰的にもう一度呼び出す
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendRequestToGemini(prompt, tabId, retries - 1, delay * 2); // 次の遅延は2倍にする
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`APIエラー: ${response.status} - ${errorData.error.message}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0].content) {
        throw new Error("APIからの応答が予期した形式ではありません。");
    }
    const text = data.candidates[0].content.parts[0].text;
    
    chrome.tabs.sendMessage(tabId, { type: "SHOW_RESULT", text: text.trim() });

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // リトライをすべて使い切った場合のエラー表示
    if (error.message.includes("503")) {
         chrome.tabs.sendMessage(tabId, { type: "SHOW_RESULT", text: `エラーが発生しました: AIモデルが大変混み合っています。しばらくしてからもう一度お試しください。` });
    } else {
         chrome.tabs.sendMessage(tabId, { type: "SHOW_RESULT", text: `エラーが発生しました: ${error.message}` });
    }
  }
}


// 拡張機能がインストールされたとき、または更新されたときに右クリックメニューを再作成する
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    // 親メニューを作成
    chrome.contextMenus.create({
      id: "aiAssistantParent",
      title: "AIアシスタント",
      contexts: ["all"]
    });

    // --- テキスト選択時に表示されるメニュー ---
    chrome.contextMenus.create({
      id: "summarize",
      parentId: "aiAssistantParent",
      title: "選択範囲を要約する",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "bulletPoints",
      parentId: "aiAssistantParent",
      title: "選択範囲を箇条書きに",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "translateAuto",
      parentId: "aiAssistantParent",
      title: "翻訳する",
      contexts: ["selection"]
    });
    
    chrome.contextMenus.create({
      id: "separator1",
      parentId: "aiAssistantParent",
      type: "separator",
      contexts: ["selection"]
    });

    // トーン変更のサブメニュー
    chrome.contextMenus.create({
      id: "toneChangeParent",
      parentId: "aiAssistantParent",
      title: "文章のトーンを変更",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "tonePolite",
      parentId: "toneChangeParent",
      title: "より丁寧な表現に",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "toneFriendly",
      parentId: "toneChangeParent",
      title: "フレンドリーな口調に",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "toneProfessional",
      parentId: "toneChangeParent",
      title: "専門的な文章に",
      contexts: ["selection"]
    });

    // --- 常に表示されるメニュー ---
    chrome.contextMenus.create({
      id: "generateQRCode",
      parentId: "aiAssistantParent",
      title: "このページのQRコードを生成",
      contexts: ["all"]
    });
  });
});

// 右クリックメニューがクリックされたときの処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // APIキーチェックをここでも行う
  if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY" && info.menuItemId !== 'generateQRCode') {
    const errorMessage = "エラー: Gemini APIキーが設定されていません。background.jsファイルを編集してください。";
    chrome.tabs.sendMessage(tab.id, { type: "SHOW_RESULT", text: errorMessage });
    return;
  }
  
  chrome.tabs.sendMessage(tab.id, { type: "SHOW_LOADING", text: "AIが応答を生成中..." });

  let prompt = "";
  switch (info.menuItemId) {
    case "summarize":
      prompt = `以下のテキストを簡潔に要約してください:\n\n"${info.selectionText}"`;
      sendRequestToGemini(prompt, tab.id);
      break;
    case "bulletPoints":
      prompt = `以下のテキストを箇条書きでまとめてください:\n\n"${info.selectionText}"`;
      sendRequestToGemini(prompt, tab.id);
      break;
    case "translateAuto":
      prompt = `以下のテキストを翻訳してください。もし日本語の文章なら英語に、英語の文章なら日本語にしてください。翻訳結果のテキストだけを返してください。\n\n"${info.selectionText}"`;
      sendRequestToGemini(prompt, tab.id);
      break;
    case "tonePolite":
      prompt = `以下の文章を、より丁寧でビジネスに適した表現に書き換えてください:\n\n"${info.selectionText}"`;
      sendRequestToGemini(prompt, tab.id);
      break;
    case "toneFriendly":
      prompt = `以下の文章を、より親しみやすくフレンドリーな口調に書き換えてください:\n\n"${info.selectionText}"`;
      sendRequestToGemini(prompt, tab.id);
      break;
    case "toneProfessional":
      prompt = `以下の文章を、より専門的で学術的なトーンに書き換えてください:\n\n"${info.selectionText}"`;
      sendRequestToGemini(prompt, tab.id);
      break;
    case "generateQRCode":
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tab.url)}`;
      chrome.tabs.sendMessage(tab.id, { 
        type: "SHOW_IMAGE", 
        url: qrCodeUrl,
        title: "ページのQRコード" 
      });
      break;
  }
});

