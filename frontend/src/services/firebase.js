import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBkw18RZjt_4MSmeAsyKbfrnsbj-wn67KQ",
  authDomain: "smart-waste-managment-253c9.firebaseapp.com",
  projectId: "smart-waste-managment-253c9",
  storageBucket: "smart-waste-managment-253c9.firebasestorage.app",
  messagingSenderId: "818038319021",
  appId: "1:818038319021:web:7436c8f58617a9310b6324",
  measurementId: "G-Y53H9WXP22"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
