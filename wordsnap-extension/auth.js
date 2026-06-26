// WordSnap — auth.js
// Firebase Authentication Logic for Extension

// IMPORTANT: In a real build, you'd bundle Firebase SDK.
// For this preparation, we assume firebase is available or use REST API.

class AuthService {
  constructor() {
    this.user = null;
    this.onAuthStateChanged = null;
  }

  async login(email, password) {
    console.log('Login attempt with email:', email);
    // Placeholder for firebase.auth().signInWithEmailAndPassword
    return { success: true, user: { email, uid: 'fake-uid-' + Date.now() } };
  }

  async loginWithGoogle() {
    console.log('Google login attempt');
    // Placeholder for firebase.auth().signInWithPopup(provider)
    return { success: true, user: { email: 'user@google.com', uid: 'google-uid' } };
  }

  async logout() {
    console.log('Logout attempt');
    this.user = null;
    if (this.onAuthStateChanged) this.onAuthStateChanged(null);
  }

  async getCurrentUser() {
    return this.user;
  }
}

const auth = new AuthService();
