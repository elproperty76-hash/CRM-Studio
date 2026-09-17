import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: "orbital-hybrid-bknl3",
  appId: "1:474355275276:web:f918bbd425747c92d48029",
  apiKey: "AIzaSyCvftXtaqDypVn-gEMfE9rTnT5R2abEvv4",
  authDomain: "orbital-hybrid-bknl3.firebaseapp.com",
  storageBucket: "orbital-hybrid-bknl3.firebasestorage.app",
  messagingSenderId: "474355275276"
};

const DATABASE_ID = "ai-studio-2cc8cde9-7331-4bc3-917c-51d919b4b4f2";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let db: Firestore;
try {
  // Aktifkan cache IndexedDB lokal persisten untuk multi-tab browser
  // Memastikan data tersimpan di browser dan langsung muncul tanpa jeda
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, DATABASE_ID);
} catch {
  db = getFirestore(app, DATABASE_ID);
}

export { db, app, auth, DATABASE_ID };
