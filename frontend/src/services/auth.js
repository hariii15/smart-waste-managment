import {
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function initSessionPersistence() {
  // Persist across browser restarts
  await setPersistence(auth, browserLocalPersistence);
}

async function upsertUserProfile(user) {
  if (!user?.uid) return;

  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  const base = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    providerId: user.providerData?.[0]?.providerId || null,
    lastLoginAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    await setDoc(ref, {
      ...base,
      role: 'user',
      homeId: user.uid, // default stable home id (can be replaced with a real home/house id later)
      driverCode: user.uid, // default (admins can set to e.g. DRIVER_01 for actual drivers)
      createdAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, base, { merge: true });
  }
}

export async function signInEmailPassword(email, password) {
  await initSessionPersistence();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await upsertUserProfile(cred.user);
  return cred;
}

export async function signInWithGoogle() {
  await initSessionPersistence();
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  await upsertUserProfile(cred.user);
  return cred;
}

export async function logout() {
  return signOut(auth);
}

export async function getCurrentUserRole(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data()?.role : null;
}

export async function setUserRole(uid, role) {
  const allowed = new Set(['user', 'driver', 'admin']);
  if (!allowed.has(role)) throw new Error('Invalid role');

  const ref = doc(db, 'users', uid);
  await setDoc(
    ref,
    {
      role,
      roleUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function setUserDriverCode(uid, driverCode) {
  if (!uid) throw new Error('uid is required');
  const code = String(driverCode || '').trim();
  if (!code) throw new Error('driverCode is required');

  const ref = doc(db, 'users', uid);
  await setDoc(
    ref,
    {
      driverCode: code,
      driverCodeUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
