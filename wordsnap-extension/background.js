// WordSnap — background.js
// Перевод теперь выполняется через наш собственный бэкенд

// Базовый URL бэкенда (в продакшн заменить на реальный домен)
const BACKEND_URL = 'http://localhost:3000';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRANSLATE_WORD') {
    handleTranslation(request.word)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => {
        console.error('Backend Error:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; 
  }
});

async function handleTranslation(word) {
  const isEn = /^[a-zA-Z\s'-]+$/.test(word);
  const target = isEn ? 'RU' : 'EN-US';

  try {
    const response = await fetch(`${BACKEND_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: word,
        targetLang: target
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    return {
      translation: result.translation,
      ipa: '', 
      example: '' 
    };
  } catch (err) {
    console.error('Fetch Error:', err);
    throw err;
  }
}
