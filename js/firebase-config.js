// ========================================================
// Firebase 資料庫管理與即時同步模組
// ========================================================

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.isConnected = false;
    this.config = null;
    this.listeners = [];
    this.channel = null;

    // 建立跨頁籤 BroadcastChannel 同步通道
    if (window.BroadcastChannel) {
      this.channel = new BroadcastChannel('twexam_realtime_sync');
      this.channel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATE') {
          console.log('[BroadcastChannel] 收到其他頁籤更新');
          this.notifySubscribers(event.data.state, false);
        }
      };
    }

    this.loadSavedConfig();
  }

  loadSavedConfig() {
    try {
      const saved = localStorage.getItem('TW_EXAM_FIREBASE_CONFIG');
      if (saved) {
        this.config = JSON.parse(saved);
        this.initFirebase(this.config);
      }
    } catch (e) {
      console.warn("載入 Firebase 設定失敗:", e);
    }
  }

  async initFirebase(cfg) {
    if (!cfg || !cfg.apiKey || !cfg.projectId) {
      this.isConnected = false;
      return false;
    }

    try {
      // 確保 Firebase SDK 載入
      if (!window.firebase) {
        await this.loadFirebaseSdk();
      }

      if (window.firebase) {
        // 避免重複初始化
        if (firebase.apps && firebase.apps.length > 0) {
          this.app = firebase.apps[0];
        } else {
          this.app = firebase.initializeApp(cfg);
        }
        this.db = firebase.firestore();
        this.config = cfg;
        this.isConnected = true;
        this.setupRealtimeListener();
        console.log("Firebase 初始化成功，專案 ID:", cfg.projectId);
        return true;
      }
    } catch (err) {
      console.error("Firebase 初始化失敗:", err);
      this.isConnected = false;
      return false;
    }
    return false;
  }

  loadFirebaseSdk() {
    return new Promise((resolve, reject) => {
      if (window.firebase) return resolve();
      
      const appScript = document.createElement('script');
      appScript.src = "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js";
      appScript.onload = () => {
        const firestoreScript = document.createElement('script');
        firestoreScript.src = "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js";
        firestoreScript.onload = () => resolve();
        firestoreScript.onerror = reject;
        document.head.appendChild(firestoreScript);
      };
      appScript.onerror = reject;
      document.head.appendChild(appScript);
    });
  }

  setupRealtimeListener() {
    if (!this.db) return;
    try {
      const docRef = this.db.collection('exam_systems').doc('current_exam');
      docRef.onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          console.log("[Firestore] 收到雲端即時同步資料");
          this.notifySubscribers(data, false);
        }
      }, (err) => {
        console.warn("[Firestore] 即時監聽中斷:", err);
      });
    } catch (e) {
      console.error("設置即時監聽失敗:", e);
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifySubscribers(state, broadcast = true) {
    this.listeners.forEach(cb => {
      try { cb(state); } catch (e) { console.error(e); }
    });
    if (broadcast && this.channel) {
      this.channel.postMessage({ type: 'STATE_UPDATE', state });
    }
  }

  async syncState(state) {
    // 1. 本地 localStorage 儲存
    try {
      localStorage.setItem('TW_EXAM_LOCAL_STATE', JSON.stringify(state));
    } catch (e) {
      console.warn("無法寫入 localStorage:", e);
    }

    // 2. 廣播至所有同源頁籤
    this.notifySubscribers(state, true);

    // 3. 若有連線 Firebase，寫入 Firestore
    if (this.isConnected && this.db) {
      try {
        const docRef = this.db.collection('exam_systems').doc('current_exam');
        await docRef.set(state, { merge: true });
        console.log("[Firestore] 成功寫入雲端");
        return { success: true, mode: 'firebase' };
      } catch (err) {
        console.error("[Firestore] 寫入失敗:", err);
        return { success: false, error: err.message, mode: 'local' };
      }
    }

    return { success: true, mode: 'local' };
  }

  saveConfig(cfg) {
    try {
      localStorage.setItem('TW_EXAM_FIREBASE_CONFIG', JSON.stringify(cfg));
      this.config = cfg;
      return this.initFirebase(cfg);
    } catch (e) {
      return false;
    }
  }

  clearConfig() {
    localStorage.removeItem('TW_EXAM_FIREBASE_CONFIG');
    this.config = null;
    this.isConnected = false;
    this.db = null;
    this.app = null;
  }
}

window.firebaseService = new FirebaseService();
