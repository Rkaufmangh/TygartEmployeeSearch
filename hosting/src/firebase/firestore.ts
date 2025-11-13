import { onSnapshot, collection, where, orderBy, query, collectionGroup, addDoc, setDoc, doc, updateDoc, getDocs, deleteDoc } from "firebase/firestore";
import {db} from "./firebase";
import { Employee } from "../models/employee";
const EMPLOYEES_COLLECTION = 'employees';
// Recursively remove undefined values; filter undefined from arrays
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
function convertMapToList(allEmployees:any){
	let employeeList:Employee[] = [];
	Object.keys(allEmployees).forEach((id:string)=>{
		let emp = allEmployees[id];
		emp.id = id;
		emp.fullname = `${emp.name.last}, ${emp.name.first}`;
		if(!emp.hasOwnProperty("education")){
			emp.eduation = []
		} else {
			emp.educationNames = emp.education.map((e:any)=>{if(e != null)return e.fieldOfStudy}).join(", ");
		}
		if(!emp.hasOwnProperty("certifications")){
			emp.certifications = []
		} else {
			emp.certificationNames = emp.certifications.map((c:any)=>{if(c != null) return c.name}).join(", ");
		}
		if(!emp.hasOwnProperty("skills")){
			emp.skills = [];
		} else {
			emp.skillNames = emp.skills.map((s:any)=>{ if(s != null) return s.skill;}).join(", ");
		}
		if(!emp.hasOwnProperty("otherTrainings")){
			emp.otherTrainings = [];
		} else {
			emp.otherTrainingNames = emp.otherTrainings.join(", ");
		}
		
		employeeList.push(emp);
	});
	return employeeList;
}
interface employeeQuery{
	field: string,
	operator: string,
	value: any
}
export function getEmployees(setEmployees:any){
	const unsubscribe = onSnapshot(collection(db,EMPLOYEES_COLLECTION), (snapshot)=>{
		let employees:any = {};
		snapshot.docs.forEach((docSnapshot)=>{
			const emp = docSnapshot.data();
			const employee_id = docSnapshot.id;
			employees[employee_id] = emp;
		});
		const employeeList = convertMapToList(employees);
		//console.log(employeeList);
		setEmployees(employeeList);
	});
	return unsubscribe;
}

export function filterBySkill(setEmployees:any, filter:string[], order:string, limit: number){
	if(filter.length ===0){
		return getEmployees(setEmployees);
	}
	let q = query(collectionGroup(db,'employees'),
	where('skillNames', 'array-contains-any', filter),
	orderBy(order, 'asc'));
	let employees:any = {};
	const unsubscribe = onSnapshot(q, (snapshot)=>{
		snapshot.docs.forEach((doc)=>{
			employees[doc.id]= doc.data();
		});
		const allEmployees = convertMapToList(employees);
		//console.log(allEmployees[0]);
		setEmployees(allEmployees);
	});
	return unsubscribe;
}
export async function addEmployee(emp:Employee){
	const empRef = collection(db,EMPLOYEES_COLLECTION);
	const sanitized:any = sanitizeForFirestore(emp);
	const skillNames = (sanitized?.skills || []).map((s:any)=> s?.skill).filter((s:any)=>!!s);
	await addDoc(empRef,{ ...sanitized, skillNames });
}
export async function editEmployee(emp:Employee){
	const empRef = doc(db,EMPLOYEES_COLLECTION,emp.id!);
	const sanitized:any = sanitizeForFirestore(emp);
	const skillNames = (sanitized?.skills || []).map((s:any)=> s?.skill).filter((s:any)=>!!s);
	await setDoc(empRef,{ ...sanitized, skillNames });
}
export async function deleteEmployee(id: string) {
	const empRef = doc(db, EMPLOYEES_COLLECTION, id);
	await deleteDoc(empRef);
}
export function getCertifications(setCertifications:(c:string[])=>void){
	const unsubscribe = onSnapshot(collection(db,'certifications'), (snapshot)=>{
		const certs: string[] = snapshot.docs.map((d)=>{
			const cert:any = d.data();
			return cert?.name;
		}).filter((v)=>!!v);
		setCertifications(certs);
	});
	return unsubscribe;
}
export function getSkills(setSkills:(s:string[])=>void){
	const unsubscribe = onSnapshot(collection(db,'skills'), (snapshot)=>{
		const skills: string[] = snapshot.docs.map((d)=>{
			const skill:any = d.data();
			return skill?.skill;
		}).filter((v)=>!!v);
		setSkills(skills);
	});
	return unsubscribe;
}
export function getEducationLevels(setEducationLevels:(l:string[])=>void){
	const unsubscribe = onSnapshot(collection(db,'educationLevels'), (snapshot)=>{
		const levels: string[] = snapshot.docs.map((d)=>{
			const level:any = d.data();
			return level?.level;
		}).filter((v)=>!!v);
		setEducationLevels(levels);
	});
	return unsubscribe;
}
export function getFieldOfStudies(setFieldsOfStudy:(f:string[])=>void){
	const unsubscribe = onSnapshot(collection(db,'fieldsOfStudy'), (snapshot)=>{
		const fields: string[] = snapshot.docs.map((d)=>{
			const field:any = d.data();
			return field.field;
		}).filter((v)=>!!v);
		setFieldsOfStudy(fields);
	});
	return unsubscribe;
}
export function getClearanceLevels(setClearanceLevels:(l:string[])=>void){
	const unsubscribe = onSnapshot(collection(db,'clearanceLevels'), (snapshot)=>{
		const levels: string[] = snapshot.docs.map((d)=>{
			const level:any = d.data();
			return level?.level;
		}).filter((v)=>!!v);
		setClearanceLevels(levels);
	});
	return unsubscribe;
}

// One-time lookup fetchers (avoid live subscriptions when not needed)
export async function fetchSkills(): Promise<string[]> {
    const snap = await getDocs(collection(db, 'skills'));
    return snap.docs.map(d => {
        const s: any = d.data();
        return s?.skill;
    }).filter((v): v is string => !!v);
}

export async function fetchCertifications(): Promise<string[]> {
    const snap = await getDocs(collection(db, 'certifications'));
    return snap.docs.map(d => {
        const c: any = d.data();
        return c?.name;
    }).filter((v): v is string => !!v);
}

export async function fetchEducationLevels(): Promise<string[]> {
    const snap = await getDocs(collection(db, 'educationLevels'));
    return snap.docs.map(d => {
        const lvl: any = d.data();
        return lvl?.level;
    }).filter((v): v is string => !!v);
}

export async function fetchFieldOfStudies(): Promise<string[]> {
    const snap = await getDocs(collection(db, 'fieldsOfStudy'));
    return snap.docs.map(d => {
        const f: any = d.data();
        return f?.name;
    }).filter((v): v is string => !!v);
}

// Optional: fetch proficiency levels for skills
export async function fetchProficiencyLevels(): Promise<string[]> {
    const snap = await getDocs(collection(db, 'proficiencyLevels'));
    const levels = snap.docs.map(d => {
        const v: any = d.data();
        return v?.name ?? v?.level ?? v?.value;
    }).filter((v): v is string => !!v);
    return levels.length > 0 ? levels : ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
}

// One-time suggestions for other trainings
export async function fetchOtherTrainings(): Promise<string[]> {
    const snap = await getDocs(collection(db, 'otherTraining'));
    const vals = snap.docs.map(d => {
        const v: any = d.data();
        return v?.topic ?? v?.title ?? v?.value;
    }).filter((v): v is string => !!v);
    return vals;
}

// One-time fetch for clearance levels (single-select use-case)
export async function fetchClearanceLevels(): Promise<string[]> {
    const snap = await getDocs(collection(db, 'clearanceLevels'));
    return snap.docs
        .map(d => {
            const v: any = d.data();
            return v?.level ?? v?.name ?? v?.value;
        })
        .filter((v): v is string => !!v);
}
