// WordSnap — content.js
// Работает на каждом сайте, ловит выделение и показывает пузырь

(function () {
  'use strict';

  let bubble = null;
  let currentWord = '';
  let translation = '';
  let hideTimeout = null;
  let translateEnabled = true;

  // Load initial toggle state
  chrome.storage.local.get(['ws_translate_enabled'], (result) => {
    translateEnabled = result.ws_translate_enabled !== undefined ? result.ws_translate_enabled : true;
  });

  // Listen for toggle changes in real-time
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.ws_translate_enabled) {
      translateEnabled = changes.ws_translate_enabled.newValue;
      if (!translateEnabled) {
        removeBubble();
      }
    }
  });

  // ─── Слушаем выделение ───────────────────────────────────────────
  document.addEventListener('mouseup', (e) => {
    // Если перевод отключён — не показываем bubble
    if (!translateEnabled) return;

    // Если кликнули внутри нашего пузыря — не трогаем
    if (bubble && bubble.contains(e.target)) return;

    setTimeout(() => {
      const selected = window.getSelection().toString().trim();

      // Только одно слово или короткая фраза (до 4 слов)
      const wordCount = selected.split(/\s+/).length;
      if (selected.length < 2 || wordCount > 4) {
        removeBubble();
        return;
      }

      // Только если это не просто цифры или знаки
      if (!/[a-zA-Zа-яА-ЯёЁ]/.test(selected)) {
        removeBubble();
        return;
      }

      currentWord = selected;
      showBubble(e.clientX, e.clientY, selected);
    }, 10);
  });

  // Закрываем пузырь при клике вне его
  document.addEventListener('mousedown', (e) => {
    if (bubble && !bubble.contains(e.target)) {
      removeBubble();
    }
  });

  // Закрываем при скролле
  document.addEventListener('scroll', () => {
    removeBubble();
  }, { passive: true });

  // ─── Создаём пузырь ─────────────────────────────────────────────
  function showBubble(x, y, word) {
    removeBubble();

    bubble = document.createElement('div');
    bubble.id = 'wordsnap-bubble';

    bubble.insertAdjacentHTML('beforeend', `
      <div class="ws-header">
        <span class="ws-logo">⚡ WordSnap</span>
        <button class="ws-close" id="ws-close-btn">✕</button>
      </div>
      <div class="ws-body">
        <div class="ws-word"></div>
        <div class="ws-phonetic" id="ws-phonetic"></div>
        
        <!-- Шаг 1: Кнопка "Перевести" -->
        <div id="ws-translate-step">
          <button class="ws-btn-translate" id="ws-translate-btn">🔄 Перевести</button>
        </div>

        <!-- Шаг 2: Загрузка -->
        <div class="ws-loading" id="ws-loading" style="display:none">
          <div class="ws-spinner"></div>
          Переводим...
        </div>

        <!-- Шаг 3: Результат перевода + кнопка создания карточки -->
        <div id="ws-result" style="display:none">
          <div class="ws-divider"></div>
          <div class="ws-translation" id="ws-trans"></div>
          <div class="ws-example" id="ws-example" style="display:none"></div>
          <div class="ws-actions">
            <button class="ws-btn-save" id="ws-save-btn">+ Создать карточку</button>
            <button class="ws-btn-skip" id="ws-skip-btn">Пропустить</button>
          </div>
          <div class="ws-counter" id="ws-counter"></div>
        </div>

        <!-- Шаг 4: Сохранено -->
        <div id="ws-saved" style="display:none">
          <div class="ws-saved-msg">✓ Карточка сохранена!</div>
          <div class="ws-counter" id="ws-saved-counter"></div>
        </div>
      </div>
    `);

    document.body.appendChild(bubble);
    bubble.querySelector('.ws-word').textContent = word;
    positionBubble(x, y);

    // Кнопки
    bubble.querySelector('#ws-close-btn').addEventListener('click', removeBubble);
    bubble.querySelector('#ws-translate-btn').addEventListener('click', () => {
      // Скрываем кнопку перевести, показываем загрузку
      const translateStep = bubble.querySelector('#ws-translate-step');
      const loading = bubble.querySelector('#ws-loading');
      if (translateStep) translateStep.style.display = 'none';
      if (loading) loading.style.display = 'flex';
      
      translateWord(word);
    });
  }

  // ─── Позиционируем пузырь умно ──────────────────────────────────
  function positionBubble(x, y) {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bw = 290; // ширина пузыря
    const bh = 220; // примерная высота

    let left = x + scrollX - bw / 2;
    let top = y + scrollY + 18;

    // Не выходим за правый край
    if (left + bw > scrollX + vw - 10) {
      left = scrollX + vw - bw - 10;
    }
    // Не выходим за левый край
    if (left < scrollX + 10) {
      left = scrollX + 10;
    }
    // Если снизу не влезает — показываем сверху
    if (y + bh + 18 > vh) {
      top = y + scrollY - bh - 10;
    }

    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
  }

  async function translateWord(word) {
    console.log('WordSnap: Переводим через Lingva Translate...', word);
    
    chrome.runtime.sendMessage({ 
      type: 'TRANSLATE_WORD', 
      word: word 
    }, (response) => {
      if (chrome.runtime.lastError || !response) {
        console.error('Runtime error:', chrome.runtime.lastError);
        showError('⚠️ Ошибка связи. Обновите страницу.');
        return;
      }

      if (response.success) {
        translation = response.data.translation;
        // Используем контекст страницы для примера
        const context = getPageContext(word);
        showResult(word, {
          translation: translation,
          ipa: '',
          example: context || ''
        });
      } else {
        console.error('Lingva Translate Error:', response.error);
        if (response.error && response.error.includes('403')) {
          showError('🔑 Ошибка 403: Лимит или неверный ключ.');
        } else {
          showError('⚠️ Ошибка сети. Проверьте VPN или ключ.');
        }
      }
    });
  }

  function showResult(word, data) {
    if (!bubble) return;

    const loading = bubble.querySelector('#ws-loading');
    const result = bubble.querySelector('#ws-result');
    const transEl = bubble.querySelector('#ws-trans');
    const ipaEl = bubble.querySelector('#ws-phonetic');
    const exEl = bubble.querySelector('#ws-example');

    if (loading) loading.style.display = 'none';
    if (result) result.style.display = 'block';
    
    if (transEl) transEl.textContent = data.translation;
    if (ipaEl && data.ipa) ipaEl.textContent = data.ipa;
    
    if (exEl) {
      const displayExample = data.example || getPageContext(word);
      if (displayExample) {
        exEl.textContent = displayExample.startsWith('"') ? displayExample : `"${displayExample}"`;
        exEl.style.display = 'block';
      }
    }

    // Привязываем кнопки после показа результата
    const skipBtn = bubble.querySelector('#ws-skip-btn');
    const saveBtn = bubble.querySelector('#ws-save-btn');
    if (skipBtn) skipBtn.addEventListener('click', removeBubble);
    if (saveBtn) saveBtn.addEventListener('click', saveCard);

    updateCounter();
  }

  function showError(msg) {
    if (!bubble) return;
    const loading = bubble.querySelector('#ws-loading');
    if (loading) {
      loading.textContent = '';
      const span = document.createElement('span');
      span.style.fontSize = '12px';
      span.style.lineHeight = '1.4';
      span.textContent = msg;
      loading.appendChild(span);
      loading.style.flexDirection = 'column';
      loading.style.gap = '6px';
      loading.style.color = '#e74c3c';
    }
  }

  // ─── Берём контекст с текущей страницы ──────────────────────────
  function getPageContext(word) {
    try {
      const bodyText = document.body.innerText;
      const regex = new RegExp(`[^.!?]*${word}[^.!?]*[.!?]`, 'i');
      const match = bodyText.match(regex);
      if (match) {
        let sentence = match[0].trim();
        if (sentence.length > 120) {
          sentence = sentence.substring(0, 120) + '...';
        }
        return sentence;
      }
    } catch (e) {}
    return null;
  }

  // ─── Сохраняем карточку в chrome.storage ────────────────────────
  function saveCard() {
    const saveBtn = bubble.querySelector('#ws-save-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Сохраняем...';
    }

    const card = {
      id: Date.now(),
      word: currentWord,
      translation: translation,
      source: window.location.hostname,
      url: window.location.href,
      savedAt: new Date().toISOString(),
      context: getPageContext(currentWord) || '',
      known: false,
      reviewCount: 0,
      nextReview: new Date().toISOString()
    };

    chrome.storage.local.get(['cards'], (result) => {
      const cards = result.cards || [];

      // Не дублируем одно и то же слово
      const exists = cards.find(c => c.word.toLowerCase() === currentWord.toLowerCase());
      if (exists) {
        showSaved(cards.length, true);
        return;
      }

      cards.push(card);
      chrome.storage.local.set({ cards }, () => {
        showSaved(cards.length, false);
        
        // Синхронизация с облаком (отправляем ВСЕ карточки для надежности)
        chrome.runtime.sendMessage({ 
          type: 'SYNC_CARD_FIREBASE', 
          cards: cards 
        });
      });
    });
  }

  function showSaved(total, duplicate) {
    if (!bubble) return;

    const result = bubble.querySelector('#ws-result');
    const saved = bubble.querySelector('#ws-saved');
    const counter = bubble.querySelector('#ws-saved-counter');

    if (result) result.style.display = 'none';
    if (saved) saved.style.display = 'block';
    if (counter) {
      counter.textContent = duplicate
        ? 'Это слово уже есть в коллекции'
        : `Всего в коллекции: ${total} карточек`;
    }

    // Автозакрытие через 2 секунды
    setTimeout(() => removeBubble(), 2200);
  }

  function updateCounter() {
    if (!bubble) return;
    chrome.storage.local.get(['cards'], (result) => {
      const cards = result.cards || [];
      const counter = bubble.querySelector('#ws-counter');
      if (counter && cards.length > 0) {
        counter.textContent = `В коллекции: ${cards.length} карточек`;
      }
    });
  }

  // ─── Убираем пузырь ─────────────────────────────────────────────
  function removeBubble() {
    if (bubble) {
      bubble.remove();
      bubble = null;
    }
  }

  // ─── Защита от XSS ──────────────────────────────────────────────
  function escapeHtml(text) {
    if (!text) return '';
    return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // ─── Синхронизация авторизации (SSO) ────────────────────────────
  // Method 1: window.postMessage (works in Chrome)
  window.addEventListener('message', (event) => {
    // Ensure message is from the same window and matches our type
    if (event.source !== window || !event.data || event.data.type !== 'WORDSNAP_SYNC_AUTH') return;
    
    console.log('WordSnap SSO: Got auth via postMessage');
    sendAuthToBackground(event.data);
  });

  // Method 2: DOM element polling (fallback for Firefox)
  let lastSyncTs = 0;
  setInterval(() => {
    const el = document.getElementById('ws-auth-data');
    if (el && el.dataset.payload && Number(el.dataset.ts) > lastSyncTs) {
      lastSyncTs = Number(el.dataset.ts);
      try {
        const data = JSON.parse(el.dataset.payload);
        if (data.type === 'WORDSNAP_SYNC_AUTH') {
          console.log('WordSnap SSO: Got auth via DOM element');
          sendAuthToBackground(data);
        }
      } catch (e) {}
    }
  }, 2000);

  function sendAuthToBackground(data) {
    chrome.runtime.sendMessage({
      type: 'AUTH_EXTERNAL_LOGIN',
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      refreshToken: data.refreshToken
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('WordSnap SSO error:', chrome.runtime.lastError);
      } else {
        console.log('WordSnap SSO: Auth sent to background, response:', response);
      }
    });
  }

})();
