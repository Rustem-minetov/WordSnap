// IELTS Academic Word List
const IELTS_WORDS = [
  { word: "anomalous", translation: "аномальный, нетипичный", phonetic: "/əˈnɒm.ə.ləs/", context: "The laboratory results showed anomalous readings, suggesting a calibration error.", source: "Cambridge Academic", url: "#", lang: "English" },
  { word: "substantiate", translation: "обосновывать, подтверждать", phonetic: "/səbˈstæn.ʃi.eɪt/", context: "We need more empirical evidence to substantiate this hypothesis.", source: "Nature Journal", url: "#", lang: "English" },
  { word: "capricious", translation: "капризный, изменчивый", phonetic: "/kəˈprɪʃ.əs/", context: "The administration of justice cannot be capricious or based on personal bias.", source: "Harvard Law", url: "#", lang: "English" },
  { word: "corroborate", translation: "подтверждать, подкреплять", phonetic: "/cəˈrɒb.ə.reɪt/", context: "Independent studies corroborate the findings of the primary research paper.", source: "Science Direct", url: "#", lang: "English" },
  { word: "mitigate", translation: "смягчать, уменьшать", phonetic: "/ˈmɪt.ɪ.ɡeɪt/", context: "New policies were introduced to mitigate the environmental impact of industrial waste.", source: "UN Climate Report", url: "#", lang: "English" },
  { word: "pragmatic", translation: "прагматичный", phonetic: "/præɡˈmæt.ɪk/", context: "A pragmatic approach is essential when dealing with complex socio-economic issues.", source: "The Economist", url: "#", lang: "English" },
  { word: "scrutinize", translation: "тщательно исследовать", phonetic: "/ˈscrʊt.ɪ.naɪz/", context: "Researchers must scrutinize the methodology used in the experiments.", source: "Oxford Research", url: "#", lang: "English" },
  { word: "ambivalent", translation: "двойственный, противоречивый", phonetic: "/æmˈbɪv.ə.lənt/", context: "Public opinion about the new technological advancement remains ambivalent.", source: "MIT Tech Review", url: "#", lang: "English" },
  { word: "conspicuous", translation: "бросающийся в глаза, заметный", phonetic: "/kənˈspɪk.ju.əs/", context: "The building was designed to be conspicuous, symbolizing economic power.", source: "Architectural Digest", url: "#", lang: "English" },
  { word: "diligent", translation: "прилежный, исполнительный", phonetic: "/ˈdɪl.ɪ.dʒənt/", context: "The academic progress is a direct result of diligent work and research.", source: "Academic Weekly", url: "#", lang: "English" }
];

// Initial empty history
const DEFAULT_HISTORY = [];

// App State
let state = {
  cards: [],
  history: [],
  settings: {
    deeplKey: "",
    dailyGoal: 30,
    targetLang: "English",
    theme: "default"
  },
  streak: 0,
  currentFolder: { lang: 'English', status: null }, // { lang, status }
  pendingStudyMode: null
};

// ─── INITIALIZATION ──────────────────────────────────────────────
function initApp() {
  // Load state from localStorage
  const localCards = localStorage.getItem('ws_cards');
  const localHistory = localStorage.getItem('ws_history');
  const localSettings = localStorage.getItem('ws_settings');
  const localStreak = localStorage.getItem('ws_streak');

  if (localCards) {
    state.cards = JSON.parse(localCards);
  } else {
    state.cards = [];
    saveCardsToLocal();
  }

  if (localHistory) {
    state.history = JSON.parse(localHistory);
  } else {
    state.history = [...DEFAULT_HISTORY];
    saveHistoryToLocal();
  }

  if (localSettings) {
    state.settings = JSON.parse(localSettings);
  } else {
    saveSettingsToLocal();
  }

  if (localStreak) {
    state.streak = Number(localStreak);
  } else {
    localStorage.setItem('ws_streak', state.streak);
  }

  // Bind settings values
  const inputGoal = document.getElementById('settings-daily-goal');
  if (inputGoal) {
    inputGoal.value = state.settings.dailyGoal || 30;
    inputGoal.addEventListener('change', (e) => {
      state.settings.dailyGoal = Number(e.target.value);
      saveSettingsToLocal();
      updateGoalsUI();
    });
  }

  // Theme
  updateThemeUI();

  // Modal Setup
  const addModal = document.getElementById('add-card-modal');
  const closeModalBtn = document.getElementById('modal-close-btn');

  if (closeModalBtn) closeModalBtn.addEventListener('click', () => addModal.classList.remove('open'));

  if (addModal) {
    addModal.addEventListener('click', (e) => {
      if (e.target === addModal) addModal.classList.remove('open');
    });
  }

  // Init UI Components
  renderCardsGrid();
  renderFolders();
  updateGoalsUI();
  renderStatsTab();
  updateLangsSection();

  // Tab routing listeners
  const tabs = document.querySelectorAll('.nav-link');
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      switchTab(t.dataset.tab);
    });
  });

  // Mode Selection logic
  const modeCards = document.querySelectorAll('.study-mode-card');
  modeCards.forEach(c => {
    c.addEventListener('click', () => {
      handleStudyModeClick(c.dataset.mode);
    });
  });

  // Setup Weak words repeater button
  const weakBtn = document.getElementById('repeat-weak-btn');
  if (weakBtn) {
    weakBtn.addEventListener('click', () => {
      handleStudyModeClick('weak');
    });
  }
}

// State savers
function saveCardsToLocal() {
  localStorage.setItem('ws_cards', JSON.stringify(state.cards));
}
function saveHistoryToLocal() {
  localStorage.setItem('ws_history', JSON.stringify(state.history));
}
function saveSettingsToLocal() {
  localStorage.setItem('ws_settings', JSON.stringify(state.settings));
}

// ─── TAB ROUTER ──────────────────────────────────────────────────
function switchTab(tabName) {
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(c => c.classList.remove('active'));

  const activeContent = document.getElementById(`${tabName}-tab`);
  if (activeContent) {
    activeContent.classList.add('active');
  }

  // Sync nav buttons
  const navBtns = document.querySelectorAll('.nav-link');
  navBtns.forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Refresh dynamic contents
  if (tabName === 'cards') {
    renderCardsGrid();
    renderFolders();
  } else if (tabName === 'stats') {
    renderStatsTab();
  } else if (tabName === 'goals') {
    updateGoalsUI();
  } else if (tabName === 'study') {
    updateSpacedCountBadge();
  }
}

// ─── THEME & AUTH ────────────────────────────────────────────────
function setTheme(theme) {
  state.settings.theme = theme;
  saveSettingsToLocal();
  updateThemeUI();
}

function updateThemeUI() {
  const theme = state.settings.theme || 'default';
  if (theme === 'bright') {
    document.body.classList.add('theme-bright');
    document.getElementById('btn-theme-bright')?.classList.add('on');
    document.getElementById('btn-theme-default')?.classList.remove('on');
  } else {
    document.body.classList.remove('theme-bright');
    document.getElementById('btn-theme-bright')?.classList.remove('on');
    document.getElementById('btn-theme-default')?.classList.add('on');
  }
}

function logout() {
  if (confirm('Вы действительно хотите выйти из аккаунта?')) {
    localStorage.removeItem('ws_user');
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().signOut().then(() => {
        location.reload();
      }).catch(err => {
        console.error('Logout error', err);
        location.reload();
      });
    } else {
      location.reload();
    }
  }
}

function openAddCardModal() {
  const modal = document.getElementById('add-card-modal');
  if (modal) modal.classList.add('open');
}

// ─── CARDS GRID & SEARCH ─────────────────────────────────────────
let currentFilter = 'all';

// Filter chips listener
const filterChips = document.querySelectorAll('.filter-chip');
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('on'));
    chip.classList.add('on');
    currentFilter = chip.dataset.filter;
    renderCardsGrid();
  });
});

document.getElementById('cards-search').addEventListener('input', renderCardsGrid);

function renderCardsGrid() {
  const grid = document.getElementById('cards-grid');
  const searchVal = document.getElementById('cards-search').value.toLowerCase();

  let filtered = [...state.cards];

  // Apply Folder Filter (Language + Status)
  if (state.currentFolder) {
    const { lang, status } = state.currentFolder;
    filtered = filtered.filter(c => (c.lang || 'English') === lang);
    if (status === 'learned') {
      filtered = filtered.filter(c => c.known);
    } else if (status === 'learning') {
      filtered = filtered.filter(c => !c.known);
    }
  }

  // Apply Tab Filter
  if (currentFilter === 'new') {
    filtered = filtered.filter(c => c.reviewCount === 0);
  } else if (currentFilter === 'review') {
    filtered = filtered.filter(c => !c.known && c.reviewCount > 0);
  } else if (currentFilter === 'learned') {
    filtered = filtered.filter(c => c.known);
  }

  // Apply Search
  if (searchVal) {
    filtered = filtered.filter(c =>
      c.word.toLowerCase().includes(searchVal) ||
      c.translation.toLowerCase().includes(searchVal) ||
      (c.source && c.source.toLowerCase().includes(searchVal))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-soft)">
        <h3>Карточки не найдены</h3>
        <p style="font-size: 13px; margin-top: 5px;">Попробуйте изменить условия поиска или фильтр.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(card => {
    let fillClass = 'fill-low';
    let progress = Math.max(0, 100 - (card.errorCount * 25));
    if (card.known) progress = 100;
    if (card.reviewCount === 0) progress = 0;

    if (progress >= 80) fillClass = 'fill-high';
    else if (progress >= 40) fillClass = 'fill-mid';

    const sourceHTML = card.source
      ? `<div class="card-details-box">Источник: <a class="card-details-source" href="${card.url || '#'}" target="_blank">${escHtml(card.source)}</a></div>`
      : '';

    return `
      <div class="vocab-card" onclick="toggleCardDetail(this)">
        <div class="vc-lang">${escHtml(card.lang || 'English')} → Русский</div>
        <div class="vc-word">${escHtml(card.word)}</div>
        <div class="vc-trans">${escHtml(card.translation)}</div>
        <div class="vc-bar"><div class="vc-fill ${fillClass}" style="width:${progress}%"></div></div>
        <div class="details-section" style="display:none; margin-top: 10px; border-top: 1px solid #EEF3FF; padding-top: 10px; position: relative; z-index: 2;">
          <p style="font-size: 11.5px; font-style: italic; color: var(--text-mid); line-height: 1.4; margin-bottom: 6px;">"${escHtml(card.context || 'Нет контекста')}"</p>
          ${sourceHTML}
          <div style="display: flex; justify-content: space-between; margin-top: 8px;">
             <span style="font-size: 10px; color: var(--text-soft);">Повторений: ${card.reviewCount}</span>
             <button style="border:none; background:none; color:var(--red); font-size:11px; font-weight:600; cursor:pointer;" onclick="deleteCard(${card.id}, event)">Удалить</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleCardDetail(element) {
  const details = element.querySelector('.details-section');
  if (details) {
    const isHidden = details.style.display === 'none';
    details.style.display = isHidden ? 'block' : 'none';
  }
}

function deleteCard(id, event) {
  if (event) event.stopPropagation();
  if (confirm('Вы уверены, что хотите удалить эту карточку?')) {
    state.cards = state.cards.filter(c => c.id !== id);
    saveCardsToLocal();
    renderCardsGrid();
    renderSidebarStats();
    updateGoalsUI();
    renderStatsTab();
    updateLangsSection();
  }
}

// ─── FOLDERS & SIDEBAR ──────────────────────────────────────────
function renderFolders() {
  const container = document.getElementById('folders-container');
  if (!container) return;

  const lang = 'English'; // Full focus on English folder
  const engCards = state.cards.filter(c => (c.lang || 'English') === lang);
  const learned = engCards.filter(c => c.known).length;
  const learning = engCards.length - learned;

  const isAll = state.currentFolder === null || (state.currentFolder.lang === lang && !state.currentFolder.status);
  const isLearning = state.currentFolder && state.currentFolder.status === 'learning';
  const isLearned = state.currentFolder && state.currentFolder.status === 'learned';

  let html = `
    <div class="folder-tree">
      <div class="folder-item ${isAll ? 'active' : ''}" onclick="selectFolder('${lang}', null)">
        <div class="folder-icon">📁</div>
        <div class="folder-label">English</div>
        <div class="folder-count">${engCards.length}</div>
      </div>
      
      <div class="folder-children">
        <div class="folder-item ${isLearned ? 'active' : ''}" onclick="selectFolder('${lang}', 'learned')">
          <div class="folder-icon">✅</div>
          <div class="folder-label">Выучено</div>
          <div class="folder-count">${learned}</div>
        </div>
        
        <div class="folder-item ${isLearning ? 'active' : ''}" onclick="selectFolder('${lang}', 'learning')">
          <div class="folder-icon">⏳</div>
          <div class="folder-label">Невыучено</div>
          <div class="folder-count">${learning}</div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Update hero stats
  document.getElementById('total-cards-hero').textContent = state.cards.length;
  const languages = [...new Set(state.cards.map(c => c.lang || 'English'))];
  document.getElementById('langs-hero').textContent = languages.length;
}

function selectFolder(lang, status) {
  state.currentFolder = { lang, status };
  if (!status) {
    document.getElementById('current-folder-title').textContent = `${lang || 'Все карточки'}`;
  } else {
    document.getElementById('current-folder-title').textContent = `${lang} — ${status === 'learned' ? 'Выучено' : 'Невыучено'}`;
  }
  renderFolders();
  renderCardsGrid();
}

function renderSidebarStats() {
  renderFolders();

  // Calculate overall accuracy
  let totalReviews = 0;
  let totalErrors = 0;
  state.cards.forEach(c => {
    totalReviews += c.reviewCount || 0;
    totalErrors += c.errorCount || 0;
  });
  let accuracy = 100;
  if (totalReviews > 0) {
    accuracy = Math.max(0, Math.round(((totalReviews - totalErrors) / totalReviews) * 100));
  }
  document.getElementById('accuracy-hero').textContent = `${accuracy}%`;

  // Streak
  document.getElementById('streak-hero').textContent = state.streak;
}

// ─── MANUAL CARD SAVING ──────────────────────────────────────────
function saveManualCard() {
  const word = document.getElementById('modal-word-input').value.trim();
  const translation = document.getElementById('modal-trans-input').value.trim();
  const phonetic = document.getElementById('modal-phonetic-input').value.trim();
  const context = document.getElementById('modal-context-input').value.trim();
  const source = document.getElementById('modal-source-input').value.trim();
  const url = document.getElementById('modal-url-input').value.trim();

  if (!word || !translation) {
    alert('Пожалуйста, заполните Word и перевод');
    return;
  }

  const newCard = {
    id: Date.now(),
    word: word,
    translation: translation,
    phonetic: phonetic || `/ ${word.toLowerCase()} /`,
    source: source || "",
    url: url || "",
    savedAt: new Date().toISOString(),
    context: context || `Study sentence for ${word}.`,
    known: false,
    errorCount: 0,
    reviewCount: 0,
    nextReview: new Date().toISOString(),
    lang: state.settings.targetLang || "English"
  };

  state.cards.push(newCard);
  saveCardsToLocal();

  // Reset inputs
  document.getElementById('modal-word-input').value = '';
  document.getElementById('modal-trans-input').value = '';
  document.getElementById('modal-phonetic-input').value = '';
  document.getElementById('modal-context-input').value = '';
  document.getElementById('modal-source-input').value = '';
  document.getElementById('modal-url-input').value = '';

  // Close modal
  document.getElementById('add-card-modal').classList.remove('open');

  // Refresh views
  renderCardsGrid();
  renderSidebarStats();
  updateGoalsUI();
  updateLangsSection();

  // Increment Today's goal
  incrementTodayProgress();
}

// Goals UI
function updateGoalsUI() {
  // Calculate today repeats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayHistory = state.history.find(h => h.date === todayStr);
  const todayProgressCount = todayHistory ? todayHistory.count : 0;
  const goalTotal = state.settings.dailyGoal || 30;
  const percentToday = Math.min(100, Math.round((todayProgressCount / goalTotal) * 100));

  // Sidebar Goal Ring
  const goalCircle = document.getElementById('goal-progress-circle');
  if (goalCircle) {
    const radius = 30;
    const circumference = 2 * Math.PI * radius; // ~188.4
    const offset = circumference - (percentToday / 100) * circumference;
    goalCircle.style.strokeDashoffset = offset;
  }

  const dailyText = document.getElementById('daily-goal-text');
  if (dailyText) {
    dailyText.textContent = `${todayProgressCount}/${goalTotal}`;
  }

  const wordsLeft = Math.max(0, goalTotal - todayProgressCount);
  const dailySub = document.getElementById('daily-goal-sub');
  if (dailySub) {
    dailySub.textContent = wordsLeft === 0
      ? 'Цель выполнена!'
      : `Осталось ${wordsLeft} слов`;
  }

  // Goal Tab Progress
  const goalTodayText = document.getElementById('goal-today-text');
  if (goalTodayText) goalTodayText.textContent = `${todayProgressCount} / ${goalTotal} слов (${percentToday}%)`;
  const goalTodayBar = document.getElementById('goal-today-bar');
  if (goalTodayBar) goalTodayBar.style.width = `${percentToday}%`;

  // Week Progress
  let weekTotalProgress = 0;
  state.history.forEach(h => weekTotalProgress += h.count);
  const weekGoalTotal = goalTotal * 7;
  const percentWeek = Math.min(100, Math.round((weekTotalProgress / weekGoalTotal) * 100));

  const goalWeekText = document.getElementById('goal-week-text');
  if (goalWeekText) goalWeekText.textContent = `${weekTotalProgress} / ${weekGoalTotal} повторений (${percentWeek}%)`;
  const goalWeekBar = document.getElementById('goal-week-bar');
  if (goalWeekBar) goalWeekBar.style.width = `${percentWeek}%`;

  document.getElementById('goal-streak-num').textContent = state.streak;

  // Achievements unlocking
  updateAchievements(todayProgressCount, weekTotalProgress);
}

function incrementTodayProgress() {
  const todayStr = new Date().toISOString().split('T')[0];
  let todayHistory = state.history.find(h => h.date === todayStr);
  if (!todayHistory) {
    todayHistory = { date: todayStr, count: 0 };
    state.history.push(todayHistory);
  }
  todayHistory.count += 1;
  saveHistoryToLocal();
  updateGoalsUI();
}

function updateAchievements(todayCount, weekTotal) {
  // Ach 1: First 100 cards
  const ach100 = document.getElementById('ach-100');
  if (state.cards.length >= 100) {
    ach100.classList.add('unlocked');
  } else {
    ach100.classList.remove('unlocked');
  }

  // Ach 2: Streak >= 7
  const achWeek = document.getElementById('ach-week');
  if (state.streak >= 7) {
    achWeek.classList.add('unlocked');
  } else {
    achWeek.classList.remove('unlocked');
  }

  // Ach 3: 1000 reviews total
  let totalCompletedReviews = 0;
  state.cards.forEach(c => totalCompletedReviews += c.reviewCount);
  const ach1000 = document.getElementById('ach-1000');
  if (totalCompletedReviews >= 1000) {
    ach1000.classList.add('unlocked');
  } else {
    ach1000.classList.remove('unlocked');
  }

  // Ach 4: IELTS Champion
  const achIelts = document.getElementById('ach-ielts');
  const unlockedIelts = localStorage.getItem('ws_ach_ielts_unlocked') === 'true';
  if (unlockedIelts) {
    achIelts.classList.add('unlocked');
  } else {
    achIelts.classList.remove('unlocked');
  }
}

// ─── ACTIVE STUDY SESSIONS LOGIC ─────────────────────────────────
let activeSession = {
  mode: null,
  cards: [],
  currentIndex: 0,
  score: 0,
  isFlipped: false
};

function updateSpacedCountBadge() {
  const now = new Date();
  const spacedCards = state.cards.filter(c => new Date(c.nextReview) <= now && !c.known);
  const badge = document.getElementById('spaced-badge-count');
  if (badge) {
    badge.textContent = `${spacedCards.length} слов готово`;
  }
}

function handleStudyModeClick(mode) {
  if (mode === 'ielts') {
    startStudySession('ielts', 'English');
    return;
  }

  if (state.cards.length === 0) {
    alert('Сначала добавьте хотя бы одну карточку!');
    return;
  }

  const languages = [...new Set(state.cards.map(c => c.lang || 'English'))];

  if (languages.length > 1) {
    state.pendingStudyMode = mode;
    const btnContainer = document.getElementById('select-lang-buttons');
    btnContainer.innerHTML = languages.map(lang => {
      let flag = '🌐';
      if (lang === 'English') flag = '🇬🇧';
      else if (lang === 'German') flag = '🇩🇪';
      else if (lang === 'Japanese') flag = '🇯🇵';
      return `<button class="btn-secondary" style="width:100%; padding:10px; margin-bottom:5px;" onclick="confirmStudyLanguage('${escHtml(lang)}')">${flag} ${escHtml(lang)}</button>`;
    }).join('') + `<button class="btn-primary" style="width:100%; padding:10px; margin-top:5px;" onclick="confirmStudyLanguage('all')">🌐 Все языки</button>`;

    document.getElementById('select-lang-modal').classList.add('open');
  } else {
    startStudySession(mode, languages[0]);
  }
}

function confirmStudyLanguage(lang) {
  document.getElementById('select-lang-modal').classList.remove('open');
  if (state.pendingStudyMode) {
    startStudySession(state.pendingStudyMode, lang);
    state.pendingStudyMode = null;
  }
}

function closeSelectLangModal() {
  document.getElementById('select-lang-modal').classList.remove('open');
  state.pendingStudyMode = null;
}

function startStudySession(mode, langFilter) {
  let selectedCards = [];
  const now = new Date();

  // If we have a folder selected, we prioritize it
  let sourceCards = state.cards;
  if (state.currentFolder) {
    const { lang, status } = state.currentFolder;
    sourceCards = sourceCards.filter(c => (c.lang || 'English') === lang);
    if (status === 'learned') {
      sourceCards = sourceCards.filter(c => c.known);
    } else {
      sourceCards = sourceCards.filter(c => !c.known);
    }
  } else if (langFilter && langFilter !== 'all') {
    sourceCards = state.cards.filter(c => (c.lang || 'English') === langFilter);
  }

  if (mode === 'quick') {
    selectedCards = shuffle([...sourceCards]).slice(0, 10);
  } else if (mode === 'spaced') {
    selectedCards = sourceCards.filter(c => new Date(c.nextReview) <= now && !c.known);
    if (selectedCards.length === 0) {
      alert('Нет слов, требующих интервального повторения на сегодня! Запустите Быстрый повтор.');
      return;
    }
  } else if (mode === 'ielts') {
    selectedCards = shuffle([...IELTS_WORDS]).slice(0, 8);
  } else if (mode === 'context') {
    selectedCards = shuffle(sourceCards.filter(c => c.context && c.context.length > 5)).slice(0, 8);
    if (selectedCards.length < 4) {
      alert('Недостаточно карточек с контекстом (минимум 4)! Добавьте больше предложений.');
      return;
    }
  } else if (mode === 'audio') {
    selectedCards = shuffle(sourceCards.filter(c => c.word)).slice(0, 6);
    if (selectedCards.length === 0) {
      alert('Нет карточек для аудирования!');
      return;
    }
  } else if (mode === 'type') {
    selectedCards = shuffle([...sourceCards]).slice(0, 8);
    if (selectedCards.length === 0) {
      alert('Добавьте карточки перед запуском этого режима!');
      return;
    }
  } else if (mode === 'weak') {
    selectedCards = [...sourceCards]
      .filter(c => c.errorCount > 0)
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 8);
    if (selectedCards.length === 0) {
      alert('У вас нет проблемных слов!');
      return;
    }
    mode = 'quick';
  }

  activeSession = {
    mode: mode,
    cards: selectedCards,
    currentIndex: 0,
    score: 0,
    isFlipped: false
  };

  // Switch display
  document.getElementById('study-selection').style.display = 'none';
  document.getElementById('study-session').style.display = 'block';

  // Session header
  const titleMap = {
    'quick': '⚡ Быстрый повтор',
    'spaced': '📅 Spaced Repetition',
    'ielts': '🎓 IELTS Mode (Academic List)',
    'context': '📖 Контекстный режим',
    'audio': '🎧 Режим аудирования',
    'type': '✍️ Режим печати'
  };
  document.getElementById('session-title-text').textContent = titleMap[mode] || 'Учёба';

  renderSessionStep();
}

function exitSession() {
  document.getElementById('study-session').style.display = 'none';
  document.getElementById('study-selection').style.display = 'block';
  updateSpacedCountBadge();
  renderSidebarStats();
}

function renderSessionStep() {
  const ws = document.getElementById('session-workspace');
  const total = activeSession.cards.length;
  const index = activeSession.currentIndex;

  if (index >= total) {
    // Finished Session
    let finishMessage = `Вы успешно завершили сессию и повторили ${total} слов! 🎉`;
    if (activeSession.mode === 'ielts') {
      localStorage.setItem('ws_ach_ielts_unlocked', 'true');
      finishMessage = `Вы завершили сессию IELTS Mode! Получено достижение "IELTS Champion"! 🏆`;
    }

    ws.innerHTML = `
      <div style="text-align: center; padding: 30px;">
        <div style="font-size: 54px; margin-bottom: 15px;">🏁</div>
        <h3 style="font-size: 20px; color: var(--text-dark); margin-bottom: 10px;">Сессия завершена!</h3>
        <p style="color: var(--text-mid); font-size: 14px; margin-bottom: 24px;">${finishMessage}</p>
        <button class="btn-primary" onclick="exitSession()">Вернуться</button>
      </div>
    `;

    // Update progress tracker in goals
    updateGoalsUI();
    return;
  }

  // Update ProgressBar
  const progressPercent = Math.round((index / total) * 100);
  document.getElementById('session-progress-fill').style.width = `${progressPercent}%`;
  document.getElementById('session-progress-text').textContent = `${index + 1} из ${total}`;

  const current = activeSession.cards[index];

  // Render workspace based on mode
  if (activeSession.mode === 'quick' || activeSession.mode === 'spaced') {
    ws.innerHTML = `
      <div class="session-card-box">
        <div class="s-card" id="session-flippable-card" onclick="flipSessionCard()">
          <div class="s-card-front">
            <div class="sc-word">${escHtml(current.word)}</div>
            <div class="sc-phonetic">${escHtml(current.phonetic || '')}</div>
            <div class="sc-hint">Нажми, чтобы перевернуть</div>
          </div>
          <div class="s-card-back">
            <div class="sc-trans">${escHtml(current.translation)}</div>
            <div class="sc-example">"${escHtml(current.context || '')}"</div>
          </div>
        </div>
      </div>
      <div class="session-actions" id="session-quick-actions" style="display: none;">
        <button class="btn-forgot" onclick="handleQuickReviewResult(false)">✗ Не знал</button>
        <button class="btn-knew" onclick="handleQuickReviewResult(true)">✓ Знал</button>
      </div>
      <p style="text-align:center; font-size:12px; color:var(--text-soft)" id="flip-reminder-text">Кликните на карточку для просмотра перевода</p>
    `;
  }
  else if (activeSession.mode === 'ielts') {
    // Similar to Quick but IELTS vocabulary, auto-flips academic context
    ws.innerHTML = `
      <div class="session-card-box">
        <div class="s-card" id="session-flippable-card" onclick="flipSessionCard()">
          <div class="s-card-front">
            <span style="font-size:10px; font-weight:700; color:var(--text-soft)">ACADEMIC WORD</span>
            <div class="sc-word" style="color: var(--blue1); font-size: 28px; margin-top: 5px;">${escHtml(current.word)}</div>
            <div class="sc-phonetic">${escHtml(current.phonetic || '')}</div>
            <div style="font-size:12.5px; color:var(--text-mid); line-height:1.55; margin-top: 10px; font-style: italic;">"${escHtml(current.context)}"</div>
            <div class="sc-hint" style="margin-top: 12px;">Нажми, чтобы перевернуть</div>
          </div>
          <div class="s-card-back">
            <div class="sc-trans">${escHtml(current.translation)}</div>
            <p style="font-size: 11px; color: var(--text-soft)">Уровень IELTS: B2-C2</p>
          </div>
        </div>
      </div>
      <div class="session-actions" id="session-quick-actions" style="display: none;">
        <button class="btn-forgot" onclick="handleQuickReviewResult(false)">✗ Не знал</button>
        <button class="btn-knew" onclick="handleQuickReviewResult(true)">✓ Знал</button>
      </div>
      <p style="text-align:center; font-size:12px; color:var(--text-soft)" id="flip-reminder-text">Кликните на карточку для просмотра перевода</p>
    `;
  }
  else if (activeSession.mode === 'context') {
    // Question with choices
    // Replace word with gap in the sentence
    const gapSentence = current.context.replace(new RegExp(current.word, 'gi'), '_______');

    // Choose 3 random wrong options from other cards (using word, not translation)
    let wrongOptions = state.cards
      .filter(c => c.word.toLowerCase() !== current.word.toLowerCase())
      .map(c => c.word);
    wrongOptions = shuffle(wrongOptions).slice(0, 3);

    // Fallbacks if not enough options
    while (wrongOptions.length < 3) {
      wrongOptions.push("Option " + (wrongOptions.length + 1));
    }

    const allOptions = shuffle([current.word, ...wrongOptions]);

    ws.innerHTML = `
      <div style="text-align: center; margin-bottom: 24px; padding: 20px; background:var(--blue-light); border-radius:var(--radius-sm)">
        <p style="font-size: 15px; line-height: 1.6; color: var(--text-dark); font-weight: 500;">"${escHtml(gapSentence)}"</p>
      </div>
      <div class="quiz-options">
        ${allOptions.map((opt, i) => `
          <button class="quiz-option-btn" onclick="submitQuizOption(this, '${escHtml(opt)}', '${escHtml(current.word)}')">${escHtml(opt)}</button>
        `).join('')}
      </div>
    `;
  }
  else if (activeSession.mode === 'audio') {
    // Web Speech synthesis triggers
    ws.innerHTML = `
      <button class="audio-play-btn" onclick="speakCurrentWord('${escHtml(current.word)}')">🔊</button>
      <p style="text-align: center; color: var(--text-soft); font-size: 12px; margin-bottom: 20px;">Нажмите кнопку, чтобы прослушать слово</p>
      <div class="session-input-wrapper">
        <input type="text" class="session-input" id="audio-session-input" placeholder="Напишите услышанное слово" autofocus autocomplete="off">
      </div>
      <button class="btn-primary" style="width: 100%" onclick="submitAudioAnswer('${escHtml(current.word)}')">Проверить</button>
    `;

    // Autoplay voice
    setTimeout(() => speakCurrentWord(current.word), 300);
  }
  else if (activeSession.mode === 'type') {
    ws.innerHTML = `
      <div style="text-align: center; margin-bottom: 24px; padding: 20px; background:var(--blue-light); border-radius:var(--radius-sm)">
        <p style="font-size: 11px; font-weight: 700; color: var(--text-soft); text-transform: uppercase;">Переведите на английский</p>
        <h3 style="font-size: 24px; color: var(--text-dark); margin-top: 6px;">${escHtml(current.translation)}</h3>
      </div>
      <div class="session-input-wrapper">
        <input type="text" class="session-input" id="type-session-input" placeholder="Введите английское слово" autofocus autocomplete="off">
      </div>
      <button class="btn-primary" style="width: 100%" onclick="submitTypeAnswer('${escHtml(current.word)}')">Проверить</button>
    `;
  }
}

// 3D Card flipper
function flipSessionCard() {
  const card = document.getElementById('session-flippable-card');
  if (card && !activeSession.isFlipped) {
    card.classList.add('flipped');
    activeSession.isFlipped = true;

    // Show knows / forgot buttons
    const actions = document.getElementById('session-quick-actions');
    if (actions) actions.style.display = 'flex';
    const reminder = document.getElementById('flip-reminder-text');
    if (reminder) reminder.style.display = 'none';
  }
}

// ─── ACTION HANDLING DURING TRAINING ─────────────────────────────
function handleQuickReviewResult(isKnown) {
  const index = activeSession.currentIndex;
  const card = activeSession.cards[index];

  // Update card state in our main list
  const realCard = state.cards.find(c => c.id === card.id);
  if (realCard) {
    realCard.reviewCount += 1;
    if (isKnown) {
      realCard.known = true;
      // Spaced repetition schedule (SuperMemo-like progression)
      const days = realCard.reviewCount * 3;
      realCard.nextReview = new Date(Date.now() + days * 24 * 3600000).toISOString();
    } else {
      realCard.known = false;
      realCard.errorCount += 1;
      realCard.nextReview = new Date().toISOString(); // Review immediately later
    }
    saveCardsToLocal();
  }

  incrementTodayProgress();

  // Next Step
  activeSession.currentIndex += 1;
  activeSession.isFlipped = false;
  renderSessionStep();
}

function submitQuizOption(btn, selected, correct) {
  const buttons = document.querySelectorAll('.quiz-option-btn');
  buttons.forEach(b => {
    b.disabled = true; // disable all
    if (b.textContent === correct) {
      b.classList.add('correct');
    }
  });

  const isCorrect = (selected === correct);

  if (!isCorrect) {
    btn.classList.add('wrong');
  }

  // Update card state
  const current = activeSession.cards[activeSession.currentIndex];
  const realCard = state.cards.find(c => c.id === current.id);
  if (realCard) {
    realCard.reviewCount += 1;
    if (isCorrect) {
      realCard.known = true;
      realCard.nextReview = new Date(Date.now() + 4 * 24 * 3600000).toISOString();
    } else {
      realCard.known = false;
      realCard.errorCount += 1;
    }
    saveCardsToLocal();
  }

  incrementTodayProgress();

  // Proceed to next card after a small delay
  setTimeout(() => {
    activeSession.currentIndex += 1;
    renderSessionStep();
  }, 1200);
}

function speakCurrentWord(word) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  } else {
    alert('Синтез речи не поддерживается вашим браузером.');
  }
}

function submitAudioAnswer(correctWord) {
  const inputEl = document.getElementById('audio-session-input');
  const answer = inputEl.value.trim().toLowerCase();
  const correctClean = correctWord.toLowerCase().replace(/[^a-z0-9]/g, '');
  const answerClean = answer.replace(/[^a-z0-9]/g, '');

  const isCorrect = (answerClean === correctClean);

  // Styling inputs
  if (isCorrect) {
    inputEl.style.borderColor = varCss('--green');
    inputEl.style.backgroundColor = '#D4F4E2';
  } else {
    inputEl.style.borderColor = varCss('--red');
    inputEl.style.backgroundColor = '#FFE4E4';
    inputEl.value = `${answer} (Правильно: ${correctWord})`;
  }

  const current = activeSession.cards[activeSession.currentIndex];
  const realCard = state.cards.find(c => c.id === current.id);
  if (realCard) {
    realCard.reviewCount += 1;
    if (isCorrect) {
      realCard.known = true;
      realCard.nextReview = new Date(Date.now() + 5 * 24 * 3600000).toISOString();
    } else {
      realCard.known = false;
      realCard.errorCount += 1;
    }
    saveCardsToLocal();
  }

  incrementTodayProgress();

  setTimeout(() => {
    activeSession.currentIndex += 1;
    renderSessionStep();
  }, 1500);
}

function submitTypeAnswer(correctWord) {
  const inputEl = document.getElementById('type-session-input');
  const answer = inputEl.value.trim().toLowerCase();
  const correctClean = correctWord.toLowerCase().replace(/[^a-z0-9]/g, '');
  const answerClean = answer.replace(/[^a-z0-9]/g, '');

  const isCorrect = (answerClean === correctClean);

  if (isCorrect) {
    inputEl.style.borderColor = varCss('--green');
    inputEl.style.backgroundColor = '#D4F4E2';
  } else {
    inputEl.style.borderColor = varCss('--red');
    inputEl.style.backgroundColor = '#FFE4E4';
    inputEl.value = `${answer} (Правильно: ${correctWord})`;
  }

  const current = activeSession.cards[activeSession.currentIndex];
  const realCard = state.cards.find(c => c.id === current.id);
  if (realCard) {
    realCard.reviewCount += 1;
    if (isCorrect) {
      realCard.known = true;
      realCard.nextReview = new Date(Date.now() + 6 * 24 * 3600000).toISOString();
    } else {
      realCard.known = false;
      realCard.errorCount += 1;
    }
    saveCardsToLocal();
  }

  incrementTodayProgress();

  setTimeout(() => {
    activeSession.currentIndex += 1;
    renderSessionStep();
  }, 1600);
}

function varCss(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ─── STATS VISUALIZATION ─────────────────────────────────────────
function renderStatsTab() {
  document.getElementById('stat-total-cards').textContent = state.cards.length;

  const fullyLearned = state.cards.filter(c => c.known).length;
  const newCards = state.cards.filter(c => c.reviewCount === 0).length;
  const inProgress = state.cards.length - fullyLearned - newCards;

  document.getElementById('stat-fully-learned').textContent = fullyLearned;
  document.getElementById('stat-new').textContent = newCards;
  document.getElementById('stat-in-progress').textContent = inProgress;

  // Activity chart rendering (Past 7 days)
  const chartContainer = document.getElementById('activity-chart');
  if (chartContainer) {
    // Generate dates list
    let colsHTML = '';
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    // Find max repeats to scale
    let maxRepeats = 5;
    state.history.forEach(h => { if (h.count > maxRepeats) maxRepeats = h.count; });

    for (let i = 6; i >= 0; i--) {
      const dateObj = new Date(Date.now() - i * 24 * 3600000);
      const dateStr = dateObj.toISOString().split('T')[0];
      const dayName = dayNames[dateObj.getDay()];

      const histItem = state.history.find(h => h.date === dateStr);
      const repeats = histItem ? histItem.count : 0;
      const heightPercent = maxRepeats > 0 ? Math.round((repeats / maxRepeats) * 100) : 0;

      colsHTML += `
        <div class="chart-col">
          <div class="chart-bar" title="${repeats} повторений">
            <div class="chart-fill" style="height: ${heightPercent}%"></div>
          </div>
          <span class="chart-label">${dayName}</span>
        </div>
      `;
    }
    chartContainer.innerHTML = colsHTML;
  }

  // Render weak words list
  const weakWordsCont = document.getElementById('weak-words-container');
  if (weakWordsCont) {
    const weakList = [...state.cards]
      .filter(c => c.errorCount > 0)
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 3);

    if (weakList.length === 0) {
      weakWordsCont.innerHTML = `<p style="font-size: 13px; color: var(--text-soft); text-align: center; padding: 20px;">Пока нет слабых слов! ✨</p>`;
    } else {
      weakWordsCont.innerHTML = weakList.map(w => `
        <div class="weak-word-item">
          <div>
            <span class="wwi-word">${escHtml(w.word)}</span>
            <div style="font-size:11px; color:var(--text-soft); margin-top:2px;">"${escHtml(w.context || '')}"</div>
          </div>
          <span class="wwi-stats">Ошибок: <span>${w.errorCount}</span></span>
        </div>
      `).join('');
    }
  }
}

// Update Active Languages badges on home screen
function updateLangsSection() {
  const container = document.getElementById('langs-badges-row');
  if (!container) return;

  const languages = [...new Set(state.cards.map(c => c.lang || 'English'))];

  const classes = {
    'English': 'badge-en',
    'German': 'badge-de',
    'Japanese': 'badge-jp'
  };

  container.innerHTML = languages.map(l => {
    const count = state.cards.filter(c => (c.lang || 'English') === l).length;
    const badgeClass = classes[l] || 'badge-en';
    return `<span class="badge ${badgeClass}">${escHtml(l)} · ${count}</span>`;
  }).join('');
}

// ─── IMPORT / EXPORT / RESET SETTINGS ─────────────────────────────
function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "wordsnap_backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.cards && Array.isArray(parsed.cards)) {
        state.cards = parsed.cards;
        if (parsed.history) state.history = parsed.history;
        if (parsed.settings) state.settings = parsed.settings;
        if (parsed.streak !== undefined) state.streak = parsed.streak;

        saveCardsToLocal();
        saveHistoryToLocal();
        saveSettingsToLocal();
        localStorage.setItem('ws_streak', state.streak);

        alert('Данные успешно импортированы!');
        initApp();
      } else {
        alert('Некорректный формат файла резервной копии.');
      }
    } catch (err) {
      alert('Ошибка при чтении файла.');
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (confirm('Внимание! Все ваши карточки, статистика и прогресс будут навсегда удалены. Вы действительно хотите сбросить все данные?')) {
    localStorage.clear();
    state.cards = [];
    state.history = [...DEFAULT_HISTORY];
    state.settings = {
      deeplKey: "",
      dailyGoal: 30,
      targetLang: "English",
      theme: "default"
    };
    state.streak = 0;

    saveCardsToLocal();
    saveHistoryToLocal();
    saveSettingsToLocal();
    localStorage.setItem('ws_streak', state.streak);
    localStorage.removeItem('ws_ach_ielts_unlocked');

    alert('Данные сброшены к начальным.');
    location.reload();
  }
}

// Helper Shuffle array
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

function escHtml(text) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(text || ''));
  return d.innerHTML;
}
