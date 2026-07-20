// ─── UI Navigation ──────────────────────────────────────────────
document.getElementById('account-btn').addEventListener('click', () => {
  document.getElementById('main-view').style.display = 'none';
  document.getElementById('account-view').style.display = 'block';
  updateAccountUI();
});

document.getElementById('acc-back-btn').addEventListener('click', () => {
  document.getElementById('account-view').style.display = 'none';
  document.getElementById('main-view').style.display = 'block';
});

// Toggle login / register
document.getElementById('show-register-link').addEventListener('click', () => {
  document.getElementById('auth-login-view').style.display = 'none';
  document.getElementById('auth-register-view').style.display = 'block';
  hideError('reg-error');
});

document.getElementById('show-login-link').addEventListener('click', () => {
  document.getElementById('auth-register-view').style.display = 'none';
  document.getElementById('auth-login-view').style.display = 'block';
  hideError('login-error');
});

// ─── Auth UI ────────────────────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (loading) {
    btn.disabled = true;
    btn.dataset.text = btn.textContent;
    btn.textContent = 'Загрузка...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.text || btn.textContent;
  }
}

async function updateAccountUI() {
  const status = await auth.getStatus();

  const loginView = document.getElementById('auth-login-view');
  const registerView = document.getElementById('auth-register-view');
  const profileView = document.getElementById('auth-profile-view');

  if (status.loggedIn) {
    loginView.style.display = 'none';
    registerView.style.display = 'none';
    profileView.style.display = 'block';

    const user = status.user;
    document.getElementById('user-name').textContent = user.displayName || user.email.split('@')[0];
    document.getElementById('user-email-display').textContent = user.email;
    document.getElementById('user-avatar').textContent = (user.displayName || user.email)[0].toUpperCase();
  } else {
    loginView.style.display = 'block';
    registerView.style.display = 'none';
    profileView.style.display = 'none';
  }
}

// Update sync tip on main page
async function updateSyncTip() {
  const status = await auth.getStatus();
  const tip = document.getElementById('sync-tip');
    tip.textContent = '';
    const strong = document.createElement('strong');
    if (status.loggedIn) {
      strong.textContent = '☁️ Синхронизация активна';
      tip.appendChild(strong);
      tip.appendChild(document.createTextNode(' — карточки сохраняются в облако и на платформу.'));
    } else {
      strong.textContent = '⚠️ Войдите в аккаунт';
      tip.appendChild(strong);
      tip.appendChild(document.createTextNode(' (👤) чтобы карточки появлялись в WordSnap платформе.'));
    }
}

// ─── Login Handler ──────────────────────────────────────────────
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;

  hideError('login-error');

  if (!email || !pass) {
    showError('login-error', 'Заполните все поля.');
    return;
  }

  setLoading('login-btn', true);
  const result = await auth.login(email, pass);
  setLoading('login-btn', false);

  if (result.success) {
    updateAccountUI();
    updateSyncTip();
  } else {
    showError('login-error', result.error || 'Ошибка входа.');
  }
});

// Enter key on password field
document.getElementById('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});
document.getElementById('login-email').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('login-password').focus();
});

// ─── Register Handler ───────────────────────────────────────────
document.getElementById('register-btn').addEventListener('click', async () => {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-password').value;

  hideError('reg-error');

  if (!name || !email || !pass) {
    showError('reg-error', 'Заполните все поля.');
    return;
  }
  if (pass.length < 6) {
    showError('reg-error', 'Пароль должен быть не менее 6 символов.');
    return;
  }

  setLoading('register-btn', true);
  const result = await auth.register(email, pass, name);
  setLoading('register-btn', false);

  if (result.success) {
    updateAccountUI();
    updateSyncTip();
  } else {
    showError('reg-error', result.error || 'Ошибка регистрации.');
  }
});

// Enter key on register password
document.getElementById('reg-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('register-btn').click();
});

// ─── Logout Handler ─────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', async () => {
  await auth.logout();
  updateAccountUI();
  updateSyncTip();
});

// ─── Cards Management ───────────────────────────────────────────
function loadCards() {
  chrome.storage.local.get(['cards'], (result) => {
    const cards = result.cards || [];
    renderCards(cards);
  });
}

function renderCards(cards) {
  const list = document.getElementById('cards-list');
  const stats = document.getElementById('header-stats');
  stats.textContent = `${cards.length} карточек`;

  if (cards.length === 0) {
    list.textContent = '';
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-icon';
    emptyIcon.textContent = '📚';
    const emptyText = document.createElement('div');
    emptyText.className = 'empty-text';
    emptyText.textContent = 'Карточек пока нет.';
    emptyText.appendChild(document.createElement('br'));
    emptyText.appendChild(document.createTextNode('Выдели слово на любом сайте!'));
    emptyState.appendChild(emptyIcon);
    emptyState.appendChild(emptyText);
    list.appendChild(emptyState);
    return;
  }

  // Показываем последние 5
  const recent = cards.slice(-5).reverse();
  list.textContent = '';
  recent.forEach(card => {
    const item = document.createElement('div');
    item.className = 'card-item';

    const info = document.createElement('div');
    const wordDiv = document.createElement('div');
    wordDiv.className = 'card-word';
    wordDiv.textContent = card.word;
    const transDiv = document.createElement('div');
    transDiv.className = 'card-trans';
    transDiv.textContent = card.translation;
    const sourceDiv = document.createElement('div');
    sourceDiv.className = 'card-source';
    sourceDiv.textContent = 'с сайта ' + card.source;
    info.appendChild(wordDiv);
    info.appendChild(transDiv);
    info.appendChild(sourceDiv);

    const btn = document.createElement('button');
    btn.className = 'card-del';
    btn.dataset.id = card.id;
    btn.title = 'Удалить';
    btn.textContent = '✕';

    item.appendChild(info);
    item.appendChild(btn);
    list.appendChild(item);
  });

  // Удаление
  list.querySelectorAll('.card-del').forEach(btn => {
    btn.addEventListener('click', () => deleteCard(Number(btn.dataset.id)));
  });
}

function deleteCard(id) {
  chrome.storage.local.get(['cards'], (result) => {
    const cards = (result.cards || []).filter(c => c.id !== id);
    chrome.storage.local.set({ cards }, loadCards);
  });
}

document.getElementById('clear-btn').addEventListener('click', () => {
  if (confirm('Удалить все карточки?')) {
    chrome.storage.local.set({ cards: [] }, loadCards);
  }
});

// ─── Study Mode ─────────────────────────────────────────────────
let studyCards = [];
let studyIndex = 0;
let revealed = false;

document.getElementById('study-btn').addEventListener('click', () => {
  chrome.storage.local.get(['cards'], (result) => {
    const cards = result.cards || [];
    if (cards.length === 0) return;

    studyCards = shuffle([...cards]);
    studyIndex = 0;
    revealed = false;

    document.getElementById('main-view').style.display = 'none';
    document.getElementById('study-view').style.display = 'block';
    showStudyCard();
  });
});

document.getElementById('back-btn').addEventListener('click', () => {
  document.getElementById('study-view').style.display = 'none';
  document.getElementById('main-view').style.display = 'block';
});

document.getElementById('study-card').addEventListener('click', () => {
  if (!revealed) {
    document.getElementById('study-trans').style.display = 'block';
    document.querySelector('.study-hint').style.display = 'none';
    revealed = true;
  }
});

document.getElementById('btn-knew').addEventListener('click', () => nextCard(true));
document.getElementById('btn-forgot').addEventListener('click', () => nextCard(false));

function showStudyCard() {
  if (studyIndex >= studyCards.length) {
    const studyCard = document.getElementById('study-card');
    studyCard.textContent = '';
    const wordDiv = document.createElement('div');
    wordDiv.className = 'study-word';
    wordDiv.textContent = '🎉';
    const hintDiv = document.createElement('div');
    hintDiv.className = 'study-hint';
    hintDiv.textContent = 'Все карточки пройдены!';
    studyCard.appendChild(wordDiv);
    studyCard.appendChild(hintDiv);
    document.querySelector('.study-actions').style.display = 'none';
    return;
  }

  const card = studyCards[studyIndex];
  document.getElementById('study-word').textContent = card.word;
  document.getElementById('study-trans').textContent = card.translation;
  document.getElementById('study-trans').style.display = 'none';
  document.querySelector('.study-hint').style.display = 'block';
  document.getElementById('study-progress').textContent =
    `${studyIndex + 1} из ${studyCards.length}`;
  revealed = false;
}

function nextCard(knew) {
  if (!revealed) return;
  studyIndex++;
  showStudyCard();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escHtml(text) {
  // Unused now, keeping for compatibility
  return text;
}

// ─── Init ────────────────────────────────────────────────────────
loadCards();
updateSyncTip();

// ─── SSO Listeners ──────────────────────────────────────────────
document.getElementById('sso-login-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://word-snap-seven.vercel.app/platform/' });
});
document.getElementById('sso-register-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://word-snap-seven.vercel.app/platform/' });
});

// ─── Paste Link Code ────────────────────────────────────────────
document.getElementById('show-paste-code').addEventListener('click', () => {
  const area = document.getElementById('paste-code-area');
  area.style.display = area.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('paste-code-btn').addEventListener('click', () => {
  const code = document.getElementById('paste-code-input').value.trim();
  const errorEl = document.getElementById('paste-code-error');
  
  if (!code) {
    errorEl.textContent = 'Вставьте код с платформы.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const json = decodeURIComponent(escape(atob(code)));
    const data = JSON.parse(json);
    
    if (!data.refreshToken || !data.uid) {
      throw new Error('Invalid code');
    }

    chrome.runtime.sendMessage({
      type: 'AUTH_EXTERNAL_LOGIN',
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      refreshToken: data.refreshToken
    }, (response) => {
      if (response && response.success) {
        errorEl.style.display = 'none';
        // Wait a moment for token refresh, then update UI
        setTimeout(() => {
          updateAccountUI();
          updateSyncTip();
        }, 1500);
      } else {
        errorEl.textContent = 'Ошибка привязки. Попробуйте сгенерировать новый код.';
        errorEl.style.display = 'block';
      }
    });
  } catch (e) {
    errorEl.textContent = 'Неверный код. Скопируйте код заново с платформы.';
    errorEl.style.display = 'block';
  }
});