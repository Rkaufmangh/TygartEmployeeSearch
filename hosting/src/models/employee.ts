export class Name{
	first:string = '';
	last: string = '';
}
export class Skill{
	skill: string = '';
	yearsExperience: number = 0;
	proficiency: string = ''; //e.g., Beginner, Intermediate, Advanced, Expert
}
export class Education{
	degree: string = '';
	institution: string = '';
	fieldOfStudy: string  = '';
}

export class Certification{
	name: string = '';
	issuedBy: string = '';
	yearIssued: Date = new Date();
	expirationYear?: Date = new Date();
}
export class Employee {
	id?:string
	name:Name = new Name();
	education?: Education[] = [];
	skills?: Skill[] = [];
	otherTraining?: string[] = [];
	certifications?: Certification[] = [];
	fullname: string = '';
	clearanceLevel?: string = '';
}