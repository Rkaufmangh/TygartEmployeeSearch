import React, { createContext, useState, useEffect } from "react";
import { onAuthChange, db } from '../firebase/firebase';
import { doc, getDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { User } from "firebase/auth";

interface AuthContext{
	isAdmin: boolean;
	currentUser: User | null
	isAuthenticated: boolean;
}
const AuthContext = createContext<AuthContext | null>(null);

const AuthProvider = ({children}:any)=>{
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    async function setUser(u:any, claims:any){
        setCurrentUser(u);
        // default
        setIsAdmin(false);
        if (!u) return;

        // Prefer custom claims if present
        if (claims && claims.role === 'admin') {
            setIsAdmin(true);
            return;
        }

        try {
            // Check users/{uid} document first
            const userDocRef = doc(db, 'users', u.uid);
            const snap = await getDoc(userDocRef);
            let admin = false;
            if (snap.exists()) {
                const data: any = snap.data();
                admin = data?.role === 'admin' || data?.isAdmin === true || (Array.isArray(data?.roles) && data.roles.includes('admin'));
            } else {
                // Fallback: try to find by email if documents are keyed differently
                if (u.email) {
                    const q = query(collection(db, 'users'), where('email', '==', u.email));
                    const qs = await getDocs(q);
                    const docData = qs.docs[0]?.data() as any;
                    if (docData) {
                        admin = docData?.role === 'admin' || docData?.isAdmin === true || (Array.isArray(docData?.roles) && docData.roles.includes('admin'));
                    }
                }
            }
            setIsAdmin(admin);
        } catch (e) {
            // If Firestore check fails, keep non-admin by default
            setIsAdmin(false);
        }
    }
	useEffect(()=>{
		const unsubscribe = onAuthChange(setUser);
		setIsAdmin(false);
		return unsubscribe;
	},[]);
	return(
		<AuthContext.Provider value={{isAdmin,isAuthenticated:!!currentUser, currentUser}}>
			{children}
		</AuthContext.Provider>
	);
}
export {AuthContext,AuthProvider};
