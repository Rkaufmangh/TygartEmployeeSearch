import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "./config";

const app = initializeApp(firebaseConfig);
//initializeFirestore(app,{
//localCache: persistentLocalCache({
//tabManager: persistentMultipleTabManager(),
//})
//});
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Match your deployed Functions region

if (location.hostname === 'localhost') {
	connectFirestoreEmulator(db, 'localhost', 8080);
	connectAuthEmulator(auth, 'http://localhost:9099');
}

interface Credentials {
	email: string,
	password: string
}


export const loginWithEmailPassword = (creds: Credentials) => {
	return signInWithEmailAndPassword(auth, creds.email, creds.password);
}

export function onAuthChange(setCurrentUser: any) {
	return onAuthStateChanged(auth, (user) => {
		console.log('Auth state changed', user);
		if (!user) {
			setCurrentUser(null, null);
			return;
		}
		//get the claims
		user?.getIdTokenResult().then((idTokenResult) => {
			setCurrentUser(user,idTokenResult.claims);
		});

	});
}

export function signOut() {
    return auth.signOut();
}

export function signInWithGoogle() {
	return signInWithPopup(auth, new GoogleAuthProvider())
	.then((result)=>{
		const user = result.user;
		user?.getIdTokenResult().then((idTokenResult)=>{
			console.log("Google sign-in successful",user,idTokenResult.claims);
		});
	}).catch((error)=>{
		console.error("Error during Google sign-in",error);
	});
}


