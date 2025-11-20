import { createContext, useState, useEffect } from "react";
import { AnyUser } from "../models/tygart-user";
import { getUsers } from "../firebase/users";

interface UserContext{
	users: AnyUser[]
}

const UserContext = createContext<UserContext>({users:[]});

const UserProvider = ({children}:any)=>{
	const [users, setUsers] = useState<AnyUser[]>([]);
	useEffect(()=>{
		const ubsub = getUsers(setUsers);
		return ()=>ubsub();
	},[]);
	return <UserContext.Provider value={{ users}}>{children}</UserContext.Provider>
};

export {UserContext,UserProvider};