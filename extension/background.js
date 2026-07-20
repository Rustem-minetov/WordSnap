// WordSnap — background.js
// Перевод через Lingva Translate + Firebase Auth REST API + Firestore Sync

// ─── Constants ───────────────────────────────────────────────────
const FIREBASE_API_KEY = 'AIzaSyASuAj0c9uLQygZRk1ePdigRGakgYPa9j0';
const FIREBASE_PROJECT_ID = 'wordsnap-791f2';

const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://lingva.pussthecat.org',
  'https://translate.plausibility.cloud'
];

// ─── Auth State ──────────────────────────────────────────────────
let authState = {
  idToken: null,
  refreshToken: null,
  uid: null,
  email: null,
  displayName: null,
  expiresAt: 0
};

// Load saved auth on startup
chrome.storage.local.get(['ws_auth'], (result) => {
  if (result.ws_auth) {
    authState = result.ws_auth;
    console.log('WordSnap: Auth state loaded, uid:', authState.uid);
  }
});

function saveAuthState() {
  chrome.storage.local.set({ 
    ws_auth: authState, 
    ws_uid: authState.uid 
  });
}

function clearAuthState() {
  authState = { 
    idToken: null, refreshToken: null, uid: null, 
    email: null, displayName: null, expiresAt: 0 
  };
  chrome.storage.local.remove(['ws_auth', 'ws_uid']);
}

// ─── Token Management ────────────────────────────────────────────
async function getValidToken() {
  if (!authState.refreshToken) return null;

  // Refresh if expired (1 min buffer)
  if (Date.now() >= authState.expiresAt - 60000) {
    try {
      const response = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: authState.refreshToken
          })
        }
      );

      if (!response.ok) {
        console.warn('WordSnap: Token refresh failed, clearing auth');
        clearAuthState();
        return null;
      }

      const data = await response.json();
      authState.idToken = data.id_token;
      authState.refreshToken = data.refresh_token;
      authState.uid = data.user_id;
      authState.expiresAt = Date.now() + (parseInt(data.expires_in) * 1000);
      saveAuthState();
    } catch (e) {
      console.error('WordSnap: Token refresh error:', e);
      return null;
    }
  }

  return authState.idToken;
}

// ─── Firebase Auth REST API ──────────────────────────────────────
function translateFirebaseError(message) {
  const map = {
    'EMAIL_NOT_FOUND':       'Пользователь с таким email не найден.',
    'INVALID_PASSWORD':      'Неверный пароль.',
    'INVALID_LOGIN_CREDENTIALS': 'Неверный email или пароль.',
    'EMAIL_EXISTS':          'Этот email уже зарегистрирован.',
    'WEAK_PASSWORD':         'Пароль слишком слабый. Минимум 6 символов.',
    'TOO_MANY_ATTEMPTS_TRY_LATER': 'Слишком много попыток. Подождите.',
    'INVALID_EMAIL':         'Некорректный email.',
    'USER_DISABLED':         'Аккаунт заблокирован.',
    'OPERATION_NOT_ALLOWED': 'Вход через email отключён.',
    'MISSING_PASSWORD':      'Введите пароль.',
    'MISSING_EMAIL':         'Введите email.'
  };
  // Firebase REST errors often have format "ERROR_CODE : description"
  const code = (message || '').split(' ')[0].split(':')[0].trim();
  return map[code] || message || 'Неизвестная ошибка.';
}

async function loginWithEmail(email, password) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  );

  const data = await response.json();
  if (data.error) {
    throw new Error(translateFirebaseError(data.error.message));
  }

  authState = {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    uid: data.localId,
    email: data.email,
    displayName: data.displayName || email.split('@')[0],
    expiresAt: Date.now() + (parseInt(data.expiresIn) * 1000)
  };
  saveAuthState();
  console.log('WordSnap: Logged in as', authState.email);

  return { uid: authState.uid, email: authState.email, displayName: authState.displayName };
}

async function registerWithEmail(email, password, name) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  );

  const data = await response.json();
  if (data.error) {
    throw new Error(translateFirebaseError(data.error.message));
  }

  authState = {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    uid: data.localId,
    email: data.email,
    displayName: name,
    expiresAt: Date.now() + (parseInt(data.expiresIn) * 1000)
  };
  saveAuthState();

  // Set display name in Firebase Auth profile
  try {
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: authState.idToken,
          displayName: name,
          returnSecureToken: false
        })
      }
    );
  } catch (e) {
    console.warn('Failed to update displayName:', e);
  }

  // Create user doc in Firestore
  try {
    await firestoreWrite(`users/${authState.uid}`, {
      name: { stringValue: name },
      email: { stringValue: email }
    });
  } catch (e) {
    console.warn('Failed to create user doc:', e);
  }

  console.log('WordSnap: Registered as', authState.email);
  return { uid: authState.uid, email: authState.email, displayName: name };
}

// ─── Firestore REST API ──────────────────────────────────────────
async function firestoreRead(path) {
  const token = await getValidToken();
  if (!token) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Firestore read error: ${response.status}`);
  }

  return await response.json();
}

async function firestoreWrite(path, fields) {
  const token = await getValidToken();
  if (!token) throw new Error('Not authenticated');

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}?updateMask.fieldPaths=cards&updateMask.fieldPaths=updatedAt`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Firestore write error: ${response.status}`);
  }

  return await response.json();
}

// ─── Card Sync (correct format matching web app) ─────────────────
async function syncCardToFirestore(cardsToSync) {
  try {
    const token = await getValidToken();
    if (!token || !authState.uid) {
      console.log('WordSnap: Пользователь не авторизован. Карточка сохранена только локально.');
      return;
    }

    const path = `users/${authState.uid}/cardsData/main`;

    // 1. Read existing cards from Firestore
    let existingCards = [];
    try {
      const doc = await firestoreRead(path);
      if (doc && doc.fields && doc.fields.cards) {
        existingCards = JSON.parse(doc.fields.cards.stringValue || '[]');
      }
    } catch (e) {
      console.warn('WordSnap: Could not read existing cards, creating new document');
    }

    // 2. Merge logic (same as bulk sync)
    let changed = false;
    cardsToSync.forEach(localCard => {
      const exists = existingCards.find(c => c.word && localCard.word && c.word.toLowerCase() === localCard.word.toLowerCase());
      if (!exists) {
        existingCards.push(localCard);
        changed = true;
      }
    });

    // 3. Write back in the SAME format as the web app
    if (changed) {
      await firestoreWrite(path, {
        cards: { stringValue: JSON.stringify(existingCards) },
        updatedAt: { timestampValue: new Date().toISOString() }
      });
      console.log('WordSnap: Карточки успешно синхронизированы ✓');
    }
  } catch (e) {
    console.error('WordSnap: Ошибка синхронизации:', e);
    throw e; // RETHROW so the content script gets success: false
  }
}

// ─── Bulk Card Sync (on login) ───────────────────────────────────
async function bulkSyncLocalCards(localCards) {
  try {
    const token = await getValidToken();
    if (!token || !authState.uid) return;

    const path = `users/${authState.uid}/cardsData/main`;
    
    // Read existing
    let existingCards = [];
    try {
      const doc = await firestoreRead(path);
      if (doc && doc.fields && doc.fields.cards) {
        existingCards = JSON.parse(doc.fields.cards.stringValue || '[]');
      }
    } catch (e) {}

    // Merge logic
    let changed = false;
    localCards.forEach(localCard => {
      const exists = existingCards.find(c => c.word && localCard.word && c.word.toLowerCase() === localCard.word.toLowerCase());
      if (!exists) {
        existingCards.push(localCard);
        changed = true;
      }
    });

    if (changed) {
      await firestoreWrite(path, {
        cards: { stringValue: JSON.stringify(existingCards) },
        updatedAt: { timestampValue: new Date().toISOString() }
      });
      console.log('WordSnap: Bulk sync completed ✓');
    }
  } catch (e) {
    console.error('WordSnap: Bulk sync error:', e);
  }
}

// ─── Message Handler ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Translation
  if (request.type === 'TRANSLATE_WORD') {
    handleTranslation(request.word)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => {
        console.error('Lingva Translate Error:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  // Card sync to Firestore
  if (request.type === 'SYNC_CARD_FIREBASE') {
    syncCardToFirestore(request.cards || [])
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Auth: Email Login
  if (request.type === 'AUTH_LOGIN') {
    loginWithEmail(request.email, request.password)
      .then(user => sendResponse({ success: true, user }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Auth: Email Register
  if (request.type === 'AUTH_REGISTER') {
    registerWithEmail(request.email, request.password, request.name)
      .then(user => sendResponse({ success: true, user }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Auth: Get current user status
  if (request.type === 'AUTH_STATUS') {
    getValidToken().then(token => {
      if (token && authState.uid) {
        sendResponse({
          loggedIn: true,
          user: {
            uid: authState.uid,
            email: authState.email,
            displayName: authState.displayName
          }
        });
      } else {
        sendResponse({ loggedIn: false });
      }
    });
    return true;
  }

  // Auth: Logout
  if (request.type === 'AUTH_LOGOUT') {
    clearAuthState();
    sendResponse({ success: true });
    return false;
  }

  // Auth: SSO from Web Platform
  if (request.type === 'AUTH_EXTERNAL_LOGIN') {
    if (request.refreshToken && request.uid) {
      authState.uid = request.uid;
      authState.email = request.email;
      authState.displayName = request.displayName;
      authState.refreshToken = request.refreshToken;
      authState.expiresAt = 0; // Force immediate refresh
      saveAuthState();
      
      // Attempt to get a valid token immediately
      getValidToken().then(token => {
        if (token) {
          console.log('WordSnap: Successfully logged in via Web Platform SSO!');
          // Bulk sync any locally saved cards to the cloud
          chrome.storage.local.get(['cards'], (result) => {
            const localCards = result.cards || [];
            if (localCards.length > 0) {
              console.log(`WordSnap: Bulk syncing ${localCards.length} local cards to cloud...`);
              bulkSyncLocalCards(localCards);
            }
          });
        }
      });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Invalid SSO payload' });
    }
    return true;
  }

  // Toggle translation on/off
  if (request.type === 'TOGGLE_TRANSLATION') {
    const enabled = !!request.enabled;
    chrome.storage.local.set({ ws_translate_enabled: enabled }, () => {
      console.log('WordSnap: Translation', enabled ? 'enabled' : 'disabled');
      sendResponse({ success: true, enabled });
    });
    return true;
  }

  // Get translation toggle state
  if (request.type === 'GET_TRANSLATE_STATE') {
    chrome.storage.local.get(['ws_translate_enabled'], (result) => {
      // Default to enabled if not set
      const enabled = result.ws_translate_enabled !== undefined ? result.ws_translate_enabled : true;
      sendResponse({ enabled });
    });
    return true;
  }
});

// ─── Translation via Google Translate Unofficial API ───────────────
async function handleTranslation(word) {
  const isEn = /^[a-zA-Z\s'\-]+$/.test(word);
  const sourceLang = isEn ? 'en' : 'ru';
  const targetLang = isEn ? 'ru' : 'en';
  const encodedWord = encodeURIComponent(word.trim());

  try {
    console.log(`WordSnap: Переводим через Google Translate...`, word);
    
    // Используем неофициальный (free) эндпоинт Google Translate
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodedWord}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    
    // Парсинг ответа Google: [[[ "привет", "hello", ... ]]]
    let translation = '';
    if (result && result[0]) {
      result[0].forEach(item => {
        if (item[0]) translation += item[0];
      });
    }

    if (!translation) throw new Error('Пустой ответ от Google Translate');

    return { translation, ipa: '', example: '' };
  } catch (err) {
    console.error('Google Translate failed:', err.message);
    throw new Error('Не удалось получить перевод. ' + err.message);
  }
}
