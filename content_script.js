let modal = null;
let showButton = null;
let lastModalState = { top: '', left: '', width: '', height: '' };

// 簡単なMarkdownをHTMLに変換する関数
function simpleMarkdownToHtml(text) {
  let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^\s*[\*\-]\s+(.+)/gm, '<li>$1</li>');
  html = html.replace(/<\/li>\n<li>/g, '</li><li>');
  if (/<li>/.test(html)) {
     html = '<ul>' + html.replace(/<\/li>(?![\s\S]*<\/li>)/, '</li></ul>');
  }
  return html;
}

// モーダル（ポップアップ）を作成して表示する関数
function showModal(options) {
  const { 
    type = 'text',
    content = '',
    title = 'AI Assistant'
  } = options;

  if (modal) modal.remove();
  if (showButton) showButton.remove();

  modal = document.createElement('div');
  modal.id = 'ai-assistant-modal';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'ai-assistant-modal-content';
  
  if(lastModalState.top) { // Restore previous position and size
      modalContent.style.top = lastModalState.top;
      modalContent.style.left = lastModalState.left;
      modalContent.style.width = lastModalState.width;
      modalContent.style.height = lastModalState.height;
  }

  // --- Draggable Header ---
  const header = document.createElement('div');
  header.className = 'ai-assistant-modal-header';

  const titleElement = document.createElement('div');
  titleElement.className = 'ai-assistant-title';
  titleElement.textContent = title;

  // ★ 「隠すボタン」を作成 (旧最小化ボタン)
  const hideButton = document.createElement('button');
  hideButton.className = 'ai-assistant-header-btn ai-assistant-hide-btn';
  hideButton.innerHTML = '&#8213;'; 
  hideButton.onclick = () => { 
    // Save current state before hiding
    lastModalState.top = modalContent.style.top || `${(window.innerHeight - modalContent.offsetHeight) / 2}px`;
    lastModalState.left = modalContent.style.left || `${(window.innerWidth - modalContent.offsetWidth) / 2}px`;
    lastModalState.width = modalContent.style.width;
    lastModalState.height = modalContent.style.height;

    modal.style.display = 'none';
    showButton.style.display = 'flex';
  };

  const closeButton = document.createElement('button');
  closeButton.className = 'ai-assistant-header-btn ai-assistant-close-btn';
  closeButton.innerHTML = '&times;';
  closeButton.onclick = () => { 
      modal.remove(); 
      modal = null;
      if(showButton) {
          showButton.remove();
          showButton = null;
      }
      lastModalState = { top: '', left: '', width: '', height: '' }; // Reset state on close
  };

  header.appendChild(titleElement);
  header.appendChild(hideButton); 
  header.appendChild(closeButton);
  modalContent.appendChild(header);
  
  // --- Content Body ---
  const body = document.createElement('div');
  body.className = 'ai-assistant-body';

  const resultContainer = document.createElement('div');
  resultContainer.className = 'ai-assistant-result';

  if (type === 'loading') {
    const loader = document.createElement('div');
    loader.className = 'ai-assistant-loader';
    resultContainer.appendChild(loader);
    const loadingText = document.createElement('p');
    loadingText.className = 'ai-assistant-loading-text';
    loadingText.textContent = content;
    resultContainer.appendChild(loadingText);
  } else if (type === 'image') {
    titleElement.textContent = title;
    const image = document.createElement('img');
    image.src = content;
    image.className = 'ai-assistant-image';
    resultContainer.appendChild(image);
  } else { // text
    resultContainer.innerHTML = simpleMarkdownToHtml(content);
  }
  
  body.appendChild(resultContainer);
  
  if (type === 'text' && content) {
    const copyButton = document.createElement('button');
    copyButton.className = 'ai-assistant-copy-btn';
    copyButton.textContent = '結果をコピー';
    copyButton.onclick = () => {
      navigator.clipboard.writeText(content).then(() => {
        copyButton.textContent = 'コピーしました！';
        setTimeout(() => { copyButton.textContent = '結果をコピー'; }, 2000);
      });
    };
    body.appendChild(copyButton);
  }
  
  modalContent.appendChild(body);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // --- 再表示ボタンを作成 ---
  showButton = document.createElement('button');
  showButton.id = 'ai-assistant-show-btn';
  // A simple icon for "AI" or a speech bubble
  showButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>`;
  showButton.style.display = 'none'; // Initially hidden
  showButton.onclick = () => {
    showButton.style.display = 'none';
    modal.style.display = 'flex';
  };
  document.body.appendChild(showButton);


  // --- Make the modal draggable ---
  dragElement(modalContent, header);
}

// ドラッグ機能を有効にする関数
function dragElement(elmnt, header) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// background.jsからのメッセージを受け取るリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SHOW_LOADING") {
    showModal({ type: 'loading', content: request.text });
  } else if (request.type === "SHOW_RESULT") {
    // ★★★ ここからが修正部分 ★★★
    if (!modal) {
      // もしモーダルが存在しない場合は、結果と共に新規作成する
      showModal({ type: 'text', content: request.text });
      return;
    }
    
    // モーダルが既に存在する場合（隠れている場合も含む）、
    // 再作成せずに中身だけを更新する
    const resultContainer = modal.querySelector('.ai-assistant-result');
    const body = modal.querySelector('.ai-assistant-body');

    if (resultContainer && body) {
        // ローディング表示などをクリア
        resultContainer.innerHTML = '';
        resultContainer.innerHTML = simpleMarkdownToHtml(request.text);

        // 古いコピーボタンがあれば削除
        const oldCopyButton = body.querySelector('.ai-assistant-copy-btn');
        if (oldCopyButton) {
            oldCopyButton.remove();
        }

        // 新しいコピーボタンを追加
        if (request.text) {
            const copyButton = document.createElement('button');
            copyButton.className = 'ai-assistant-copy-btn';
            copyButton.textContent = '結果をコピー';
            copyButton.onclick = () => {
                navigator.clipboard.writeText(request.text).then(() => {
                    copyButton.textContent = 'コピーしました！';
                    setTimeout(() => { copyButton.textContent = '結果をコピー'; }, 2000);
                });
            };
            body.appendChild(copyButton);
        }
    }
    // ★★★ 修正部分ここまで ★★★
  } else if (request.type === "SHOW_IMAGE") {
    showModal({ type: 'image', content: request.url, title: request.title });
  }
});

