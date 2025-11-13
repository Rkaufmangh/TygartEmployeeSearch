import { db } from './firebase'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { AnyUser } from '../models/tygart-user';

const userRef = collection(db, 'users');

function sanitizeForFirestore(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value
      .map((v) => sanitizeForFirestore(v))
      .filter((v) => v !== undefined);
  }
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    const out: any = {};
    Object.keys(value).forEach((k) => {
      const sv = sanitizeForFirestore((value as any)[k]);
      if (sv !== undefined) out[k] = sv;
    });
    return out;
  }
  return value;
}

export const addUser = async (user: AnyUser) => {
  const clean = sanitizeForFirestore(user);
  // Remove id if it's undefined
  if (clean && clean.id === undefined) delete clean.id;
  const userSnap = await addDoc(userRef, clean);
  return userSnap;
}

export const getUser = async (id: string) => {
  const snap = await getDoc(doc(db, 'users', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export const updateUser = async (user: AnyUser) => {
  try {
    const id = user.id || user.uid;
    if (!id) throw new Error('Missing user id/uid');
    const clean = sanitizeForFirestore(user);
    if (clean && clean.id === undefined) delete clean.id;
    const userDocRef = doc(db, 'users', id);
    await setDoc(userDocRef, clean, { merge: true });
  } catch (e: any) {
    console.log(e.message)
    throw e;
  }
}

export const deleteUser = async (id:string)=>{
	const userDocRef = doc(db, `users/${id}`.toString());
	await deleteDoc(userDocRef);
}

// Preferred one-time fetch from root 'users' collection
export const fetchUsersList = async ()=>{
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
