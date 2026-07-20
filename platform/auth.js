    // ─── FIREBASE INTEGRATION (Production-Ready) ─────────────────────
    const firebaseConfig = {
      apiKey: "AIzaSyASuAj0c9uLQygZRk1ePdigRGakgYPa9j0",
      authDomain: "wordsnap-791f2.firebaseapp.com",
      projectId: "wordsnap-791f2",
      storageBucket: "wordsnap-791f2.firebasestorage.app",
      messagingSenderId: "992172335798",
      appId: "1:992172335798:web:4777c947927d430b967c17",
      measurementId: "G-X57CKJ25B9"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Persistence — keep user logged in across browser restarts
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
      console.warn('Auth persistence error:', err);
    });

    let currentUser = null;
    let appInitialized = false;

    // ─── Локализация ошибок Firebase ──────────────────────────────────
    function getFirebaseErrorMessage(error) {
      const code = error.code || '';
      const map = {
        'auth/user-not-found':          'Пользователь с таким email не найден.',
        'auth/wrong-password':          'Неверный пароль. Попробуйте ещё раз.',
        'auth/invalid-credential':      'Неверный email или пароль.',
        'auth/invalid-email':           'Некорректный формат email.',
        'auth/email-already-in-use':    'Этот email уже зарегистрирован. Попробуйте войти.',
        'auth/weak-password':           'Пароль слишком слабый. Минимум 6 символов.',
        'auth/too-many-requests':       'Слишком много попыток. Подождите немного и попробуйте снова.',
        'auth/network-request-failed':  'Ошибка сети. Проверьте подключение к интернету.',
        'auth/popup-closed-by-user':    'Окно авторизации было закрыто. Попробуйте ещё раз.',
        'auth/popup-blocked':           'Браузер заблокировал всплывающее окно. Разрешите попапы для этого сайта.',
        'auth/cancelled-popup-request': 'Предыдущий запрос авторизации был отменён.',
        'auth/account-exists-with-different-credential': 'Аккаунт с таким email уже существует с другим способом входа.',
        'auth/operation-not-allowed':   'Этот способ входа отключён. Обратитесь в поддержку.',
        'auth/user-disabled':           'Этот аккаунт заблокирован. Обратитесь в поддержку.',
        'auth/requires-recent-login':   'Необходимо повторно войти в аккаунт.',
        'auth/missing-password':        'Введите пароль.',
        'auth/missing-email':           'Введите email.'
      };
      return map[code] || error.message || 'Произошла неизвестная ошибка. Попробуйте позже.';
    }

    // ─── Показ ошибки ─────────────────────────────────────────────────
    function showAuthError(boxId, message) {
      const box = document.getElementById(boxId);
      if (box) {
        box.textContent = message;
        box.style.display = 'block';
        // Auto-hide after 8 seconds
        clearTimeout(box._hideTimer);
        box._hideTimer = setTimeout(() => { box.style.display = 'none'; }, 8000);
      }
    }

    function hideAuthError(boxId) {
      const box = document.getElementById(boxId);
      if (box) box.style.display = 'none';
    }

    // ─── Loading-состояния кнопок ─────────────────────────────────────
    function setButtonLoading(btnId, loading, originalText) {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.disabled = loading;
      if (loading) {
        btn.dataset.originalText = btn.textContent;
        btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" style="animation:authSpin 0.8s linear infinite;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31" stroke-linecap="round"/></svg>Загрузка...</span>';
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';
      } else {
        btn.innerHTML = originalText || btn.dataset.originalText || '';
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    }

    // Add spinner animation
    if (!document.getElementById('auth-spin-style')) {
      const spinStyle = document.createElement('style');
      spinStyle.id = 'auth-spin-style';
      spinStyle.textContent = '@keyframes authSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
      document.head.appendChild(spinStyle);
    }

    // ─── Валидация email ──────────────────────────────────────────────
    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // ─── Auth State Observer ─────────────────────────────────────────
    auth.onAuthStateChanged(user => {
      if (user) {
        currentUser = user;
        const overlay = document.getElementById('auth-overlay');
        const appContainer = document.getElementById('app-container');

        // Broadcast auth info to the extension's content script
        // Method 1: window.postMessage
        const authPayload = {
          type: 'WORDSNAP_SYNC_AUTH',
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          refreshToken: user.refreshToken || user.stsTokenManager?.refreshToken || ''
        };
        
        const broadcastAuth = () => {
          window.postMessage(authPayload, '*');
          // Method 2: Hidden DOM element (fallback for Firefox)
          let el = document.getElementById('ws-auth-data');
          if (!el) {
            el = document.createElement('div');
            el.id = 'ws-auth-data';
            el.style.display = 'none';
            document.body.appendChild(el);
          }
          el.dataset.payload = JSON.stringify(authPayload);
          el.dataset.ts = Date.now();
        };
        broadcastAuth();
        if (window.syncAuthInterval) clearInterval(window.syncAuthInterval);
        window.syncAuthInterval = setInterval(broadcastAuth, 3000);
        
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        setTimeout(() => {
          overlay.style.display = 'none';
          appContainer.style.display = 'block';
          
          // Init app FIRST, then load cloud data to merge properly
          if (!appInitialized) {
            initApp();
            appInitialized = true;
          }
          // Then load Firestore cards (will merge/overwrite)
          loadCardsFromFirestore();
        }, 400);
      } else {
        currentUser = null;
        appInitialized = false;
        const overlay = document.getElementById('auth-overlay');
        const appContainer = document.getElementById('app-container');
        overlay.style.display = 'flex';
        // force reflow
        void overlay.offsetWidth;
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
        appContainer.style.display = 'none';
      }
    });

    // Redirect-based login removed (causes 'missing initial state' in Firefox/partitioned storage)

    // ─── Toggle Login / Register / Reset ──────────────────────────────
    function toggleAuthMode(mode) {
      const loginArea = document.getElementById('login-form-area');
      const registerArea = document.getElementById('register-form-area');
      const resetArea = document.getElementById('reset-form-area');
      
      hideAuthError('auth-error');
      hideAuthError('reg-error');
      hideAuthError('reset-error');
      const resetSuccess = document.getElementById('reset-success');
      if (resetSuccess) resetSuccess.style.display = 'none';

      loginArea.style.display = 'none';
      registerArea.style.display = 'none';
      resetArea.style.display = 'none';

      if (mode === 'login') {
        loginArea.style.display = 'block';
      } else if (mode === 'register') {
        registerArea.style.display = 'block';
      } else if (mode === 'reset') {
        resetArea.style.display = 'block';
      }
    }

    function showResetPassword() {
      toggleAuthMode('reset');
    }

    // ─── Email Login ─────────────────────────────────────────────────
    function firebaseLogin() {
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-password').value;
      
      hideAuthError('auth-error');

      // Validation
      if (!email || !pass) {
        showAuthError('auth-error', 'Заполните все поля.');
        return;
      }
      if (!isValidEmail(email)) {
        showAuthError('auth-error', 'Введите корректный email.');
        return;
      }

      setButtonLoading('login-submit-btn', true);
      
      auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
          // onAuthStateChanged handles the rest
        })
        .catch(error => {
          showAuthError('auth-error', getFirebaseErrorMessage(error));
        })
        .finally(() => {
          setButtonLoading('login-submit-btn', false, 'Войти в аккаунт');
        });
    }

    // ─── Email Register ──────────────────────────────────────────────
    function firebaseRegister() {
      const email = document.getElementById('reg-email').value.trim();
      const pass = document.getElementById('reg-password').value;
      const name = document.getElementById('reg-name').value.trim();
      
      hideAuthError('reg-error');

      // Validation
      if (!email || !pass || !name) {
        showAuthError('reg-error', 'Заполните все поля.');
        return;
      }
      if (!isValidEmail(email)) {
        showAuthError('reg-error', 'Введите корректный email.');
        return;
      }
      if (name.length < 2) {
        showAuthError('reg-error', 'Имя должно быть не короче 2 символов.');
        return;
      }
      if (pass.length < 6) {
        showAuthError('reg-error', 'Пароль должен быть не менее 6 символов.');
        return;
      }

      setButtonLoading('reg-submit-btn', true);
      
      auth.createUserWithEmailAndPassword(email, pass)
        .then(cred => {
          // Update displayName in Firebase Auth profile
          return cred.user.updateProfile({ displayName: name }).then(() => {
            // Save user doc in Firestore
            return db.collection('users').doc(cred.user.uid).set({
              name: name,
              email: email,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          });
        })
        .catch(error => {
          showAuthError('reg-error', getFirebaseErrorMessage(error));
        })
        .finally(() => {
          setButtonLoading('reg-submit-btn', false, 'Создать аккаунт');
        });
    }

    // ─── Google Login (popup only, no redirect) ──────────────────────
    function firebaseGoogleLogin() {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // Disable all google buttons to prevent double-click
      setButtonLoading('login-google-btn', true);
      setButtonLoading('reg-google-btn', true);

      auth.signInWithPopup(provider)
        .then(cred => {
          // Save/update user doc
          return db.collection('users').doc(cred.user.uid).set({
            name: cred.user.displayName || '',
            email: cred.user.email || '',
            photoURL: cred.user.photoURL || '',
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        })
        .catch(error => {
          if (error.code === 'auth/popup-blocked') {
            showAuthError('auth-error', 'Браузер заблокировал окно авторизации. Разрешите всплывающие окна для этого сайта и попробуйте снова.');
          } else if (error.code !== 'auth/popup-closed-by-user' && 
                     error.code !== 'auth/cancelled-popup-request') {
            showAuthError('auth-error', getFirebaseErrorMessage(error));
          }
        })
        .finally(() => {
          setButtonLoading('login-google-btn', false, 'Продолжить с Google');
          setButtonLoading('reg-google-btn', false, 'Зарегистрироваться с Google');
        });
    }

    // ─── Password Reset ──────────────────────────────────────────────
    function firebaseResetPassword() {
      const email = document.getElementById('reset-email').value.trim();
      
      hideAuthError('reset-error');
      const successBox = document.getElementById('reset-success');
      if (successBox) successBox.style.display = 'none';

      if (!email) {
        showAuthError('reset-error', 'Введите email.');
        return;
      }
      if (!isValidEmail(email)) {
        showAuthError('reset-error', 'Введите корректный email.');
        return;
      }

      setButtonLoading('reset-submit-btn', true);
      
      auth.sendPasswordResetEmail(email)
        .then(() => {
          if (successBox) {
            successBox.textContent = '✓ Ссылка для сброса пароля отправлена на ' + email;
            successBox.style.display = 'block';
          }
          hideAuthError('reset-error');
        })
        .catch(error => {
          showAuthError('reset-error', getFirebaseErrorMessage(error));
        })
        .finally(() => {
          setButtonLoading('reset-submit-btn', false, 'Отправить ссылку');
        });
    }

    // ─── Enter key support for forms ─────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
      // Login form: enter on password -> submit
      const loginPass = document.getElementById('login-password');
      if (loginPass) loginPass.addEventListener('keydown', e => { if (e.key === 'Enter') firebaseLogin(); });
      
      const loginEmail = document.getElementById('login-email');
      if (loginEmail) loginEmail.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-password').focus(); });

      // Register form: enter on password -> submit
      const regPass = document.getElementById('reg-password');
      if (regPass) regPass.addEventListener('keydown', e => { if (e.key === 'Enter') firebaseRegister(); });

      // Reset form: enter on email -> submit
      const resetEmail = document.getElementById('reset-email');
      if (resetEmail) resetEmail.addEventListener('keydown', e => { if (e.key === 'Enter') firebaseResetPassword(); });
    });

    // ─── Firestore Sync ──────────────────────────────────────────────
    // Wrap saveCardsToLocal to also push to Firestore
    const originalSaveCardsToLocal = saveCardsToLocal;
    saveCardsToLocal = function() {
      originalSaveCardsToLocal(); // Saves to localStorage
      
      // Also push to Firestore if logged in
      if (currentUser && state.cards) {
        db.collection('users').doc(currentUser.uid).collection('cardsData').doc('main').set({
          cards: JSON.stringify(state.cards),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.error('Error saving to Firestore:', err));
      }
    };

    function loadCardsFromFirestore() {
      if (!currentUser) return;
      db.collection('users').doc(currentUser.uid).collection('cardsData').doc('main').get()
        .then(doc => {
          if (doc.exists) {
            try {
              const cloudCards = JSON.parse(doc.data().cards || '[]');
              if (cloudCards.length > 0) {
                // Merge: combine local + cloud, dedup by word
                const localCards = state.cards || [];
                const merged = [...cloudCards];
                localCards.forEach(localCard => {
                  const exists = merged.find(c => c.word && localCard.word && c.word.toLowerCase() === localCard.word.toLowerCase());
                  if (!exists) merged.push(localCard);
                });
                state.cards = merged;
                originalSaveCardsToLocal();
                if (typeof renderCardsGrid === 'function') renderCardsGrid();
                if (typeof renderStatsTab === 'function') renderStatsTab();
                if (typeof updateLangsSection === 'function') updateLangsSection();
                if (typeof renderFolders === 'function') renderFolders();
              }
            } catch (e) {
              console.error('Error parsing cloud cards:', e);
            }
          }
        })
        .catch(err => {
          console.error('Error loading from Firestore:', err);
        });
    }

    // Background animation delay
    window.addEventListener('load', () => {
      document.body.classList.add('loaded');
    });