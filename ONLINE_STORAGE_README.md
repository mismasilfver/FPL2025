# FPL App: Online Storage Implementation Guide

This guide outlines how to implement Firebase-based cloud storage and authentication for the Fantasy Premier League app, enabling multi-device access to your data.

## Overview

This implementation uses:
- **Firebase Firestore**: For cloud database storage
- **Firebase Authentication**: For secure user authentication
- **Firebase Hosting**: For optional web hosting

## Benefits

- Access your FPL team data from any device
- Secure authentication with Google account or email/password
- Real-time data synchronization
- Free tier with generous limits for single-user apps

## Prerequisites

- [Firebase account](https://firebase.google.com/) (free tier)
- Node.js and npm installed

## Implementation Steps

### 1. Set Up Firebase Project

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project directory
firebase init
# Select Firestore, Hosting (optional), and Authentication
```

### 2. Configure Firebase in Your App

Create `firebase-config.js` in your project root:

```javascript
// firebase-config.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
```

### 3. Add Authentication Component

Create a simple login form component:

```javascript
// auth.js
import { auth } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';

// Login with email/password
export async function loginWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

// Register new user
export async function registerUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

// Login with Google
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Google login error:", error);
    throw error;
  }
}

// Logout
export async function logout() {
  return signOut(auth);
}

// Auth state observer
export function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}
```

### 4. Modify Data Storage Logic

Replace localStorage with Firestore:

```javascript
// data-service.js
import { db, auth } from './firebase-config.js';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';

// Get current user ID
function getUserId() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return user.uid;
}

// Save players data
export async function savePlayers(players) {
  const userId = getUserId();
  await setDoc(doc(db, "users", userId), {
    players: players
  }, { merge: true });
}

// Set captain
export async function setCaptain(captainId) {
  const userId = getUserId();
  await updateDoc(doc(db, "users", userId), {
    captain: captainId
  });
}

// Set vice captain
export async function setViceCaptain(viceCaptainId) {
  const userId = getUserId();
  await updateDoc(doc(db, "users", userId), {
    viceCaptain: viceCaptainId
  });
}

// Load all user data
export async function loadUserData() {
  const userId = getUserId();
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    // Initialize with empty data
    const initialData = { 
      players: [],
      captain: null,
      viceCaptain: null
    };
    await setDoc(docRef, initialData);
    return initialData;
  }
}
```

### 5. Integrate with Your App

Modify your FPL Manager class:

```javascript
// In script.js, replace localStorage with Firebase calls
import { 
  savePlayers, 
  setCaptain, 
  setViceCaptain,
  loadUserData 
} from './data-service.js';
import { onAuthStateChanged } from './auth.js';

class FPLManager {
  // ...existing code...
  
  // Replace saveData method
  async saveData() {
    try {
      await savePlayers(this.players);
      if (this.captain) await setCaptain(this.captain);
      if (this.viceCaptain) await setViceCaptain(this.viceCaptain);
    } catch (error) {
      console.error("Error saving data:", error);
      // Fallback to localStorage if offline
      localStorage.setItem('fplData', JSON.stringify({
        players: this.players,
        captain: this.captain,
        viceCaptain: this.viceCaptain
      }));
    }
  }
  
  // Replace loadData method
  async loadData() {
    try {
      const data = await loadUserData();
      this.players = data.players || [];
      this.captain = data.captain || null;
      this.viceCaptain = data.viceCaptain || null;
    } catch (error) {
      console.error("Error loading data:", error);
      // Fallback to localStorage if offline
      const savedData = localStorage.getItem('fplData');
      if (savedData) {
        const data = JSON.parse(savedData);
        this.players = data.players || [];
        this.captain = data.captain || null;
        this.viceCaptain = data.viceCaptain || null;
      }
    }
    this.updateDisplay();
  }
}

// Initialize app after authentication
onAuthStateChanged((user) => {
  if (user) {
    // User is signed in
    window.fplManager = new FPLManager();
    window.fplManager.loadData();
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
  } else {
    // User is signed out
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('app-container').style.display = 'none';
  }
});
```

### 6. Add Login UI to HTML

Add a login section to your HTML:

```html
<!-- Add this before your app container -->
<div id="login-section" class="login-container">
  <h2>FPL Team Manager</h2>
  <div class="login-form">
    <h3>Login</h3>
    <input type="email" id="login-email" placeholder="Email">
    <input type="password" id="login-password" placeholder="Password">
    <button id="login-button">Login</button>
    <button id="google-login-button">Login with Google</button>
    <p>New user? <a href="#" id="register-link">Register</a></p>
  </div>
  <div class="register-form" style="display: none;">
    <h3>Register</h3>
    <input type="email" id="register-email" placeholder="Email">
    <input type="password" id="register-password" placeholder="Password">
    <button id="register-button">Register</button>
    <p>Already have an account? <a href="#" id="login-link">Login</a></p>
  </div>
</div>
```

Add login/register functionality:
- register functionality would not be needed if purely private implementation

```javascript
// auth-ui.js
import { loginWithEmail, loginWithGoogle, registerUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  // Login form elements
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginButton = document.getElementById('login-button');
  const googleLoginButton = document.getElementById('google-login-button');
  
  // Register form elements
  const registerEmail = document.getElementById('register-email');
  const registerPassword = document.getElementById('register-password');
  const registerButton = document.getElementById('register-button');
  
  // Form switching
  const registerLink = document.getElementById('register-link');
  const loginLink = document.getElementById('login-link');
  const loginForm = document.querySelector('.login-form');
  const registerForm = document.querySelector('.register-form');
  
  // Login with email
  loginButton.addEventListener('click', async () => {
    try {
      await loginWithEmail(loginEmail.value, loginPassword.value);
      // Success handled by auth state observer
    } catch (error) {
      alert(`Login failed: ${error.message}`);
    }
  });
  
  // Login with Google
  googleLoginButton.addEventListener('click', async () => {
    try {
      await loginWithGoogle();
      // Success handled by auth state observer
    } catch (error) {
      alert(`Google login failed: ${error.message}`);
    }
  });
  
  // Register new user
  registerButton.addEventListener('click', async () => {
    try {
      await registerUser(registerEmail.value, registerPassword.value);
      alert('Registration successful! You are now logged in.');
      // Success handled by auth state observer
    } catch (error) {
      alert(`Registration failed: ${error.message}`);
    }
  });
  
  // Switch to register form
  registerLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  });
  
  // Switch to login form
  loginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
  });
});
```

### 7. Add CSS for Login UI

Add to your styles.css:

```css
.login-container {
  max-width: 400px;
  margin: 100px auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.login-form, .register-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
}

.login-container input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.login-container button {
  padding: 12px;
  background-color: #38003c;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.login-container button:hover {
  background-color: #520456;
}

#google-login-button {
  background-color: #4285F4;
}

#google-login-button:hover {
  background-color: #3367D6;
}
```

## Deployment

To deploy your app:

```bash
# Build your app (if needed)
# npm run build

# Deploy to Firebase Hosting
firebase deploy
```

## Security Rules

Set Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures each user can only access their own data.
