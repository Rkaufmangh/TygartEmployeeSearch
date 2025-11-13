import { createContext, useState, useEffect } from "react";
import { getEmployees } from "../firebase/firestore";
import { Employee } from "../models/employee";

interface EmployeeContext{
	employees: Employee[]
}

const EmployeeContext = createContext<EmployeeContext>({employees:[]});

const EmployeeProvider = ({children}:any)=>{
	const [employees, setEmployees] = useState<Employee[]>([]);
	useEffect(()=>{
		const ubsub = getEmployees(setEmployees);
		return ()=>ubsub();
	},[]);
	return <EmployeeContext.Provider value={{ employees}}>{children}</EmployeeContext.Provider>
};

export {EmployeeContext,EmployeeProvider};