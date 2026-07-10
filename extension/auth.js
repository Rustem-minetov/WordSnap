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
          resolve(response);
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
          resolve(response);
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
          resolve(response);
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
          resolve(response);
        }
      );
    });
  }
};
