// WordSnap — auth.js
// Thin wrapper that communicates with background.js for Firebase Auth

const auth = {
  // Login with email/password
  login(email, password) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'AUTH_LOGIN', email, password },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: 'Ошибка связи с расширением.' });
            return;
          }
          resolve(response || { success: false, error: 'Нет ответа от расширения.' });
        }
      );
    });
  },

  // Register with email/password/name
  register(email, password, name) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'AUTH_REGISTER', email, password, name },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: 'Ошибка связи с расширением.' });
            return;
          }
          resolve(response || { success: false, error: 'Нет ответа от расширения.' });
        }
      );
    });
  },

  // Get current auth status
  getStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'AUTH_STATUS' },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ loggedIn: false });
            return;
          }
          resolve(response || { loggedIn: false });
        }
      );
    });
  },

  // Logout
  logout() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'AUTH_LOGOUT' },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false });
            return;
          }
          resolve(response || { success: false });
        }
      );
    });
  },

  // Toggle translation on/off
  toggleTranslation(enabled) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'TOGGLE_TRANSLATION', enabled },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false });
            return;
          }
          resolve(response || { success: false });
        }
      );
    });
  },

  // Get current translation toggle state
  getTranslateState() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'GET_TRANSLATE_STATE' },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ enabled: true });
            return;
          }
          resolve(response || { enabled: true });
        }
      );
    });
  }
};
