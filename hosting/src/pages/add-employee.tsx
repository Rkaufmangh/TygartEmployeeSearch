import * as React from 'react';
import { Form, Field, FormElement, FormRenderProps, FieldWrapper, FormFieldSet, FieldRenderProps } from '@progress/kendo-react-form';
import { Error, Label, Hint } from '@progress/kendo-react-labels';
import { TextBox } from '@progress/kendo-react-inputs';
import { Button } from '@progress/kendo-react-buttons';
import { addEmployee, editEmployee } from '../firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../logic/AuthContext';
import { SkillMultiField } from '../components/form/skillmultifield';
import { CertificationMultiField } from '../components/form/certificationsmultifield';
import { EducationMultiField } from '../components/form/educationmultifield';
import { OtherTrainingsMultiField } from '../components/form/othertrainingsmultifield';
import { ClearanceLevelSelect } from '../components/form/clearancelevelselect';


const FormInput = (fieldRenderProps: FieldRenderProps) => {
    const {
        validationMessage,
        touched,
        label,
        id,
        valid,
        disabled,
        hint,
        type,
        optional,
        colSpan,
        autoComplete,
        ...others
    } = fieldRenderProps;
    const showValidationMessage = touched && validationMessage;
    const showHint = !showValidationMessage && hint;
    const hintId = showHint ? `${id}_hint` : '';
    const errorId = showValidationMessage ? `${id}_error` : '';

    
    return (
        <FieldWrapper colSpan={colSpan}>
            <Label
                editorId={id}
                editorValid={valid}
                editorDisabled={disabled}
                className="k-form-label"
            >
                {label}
            </Label>
            <div className={'k-form-field-wrap'}>
                <TextBox
                    valid={valid}
                    type={'text'}
                    id={id}
                    disabled={disabled}
                    aria-describedby={`${hintId} ${errorId}`}
                    autoComplete={autoComplete}
                    required
                    {...others}
                />
                {showHint && <Hint id={hintId}>{hint}</Hint>}
                {showValidationMessage && <Error id={errorId}>{validationMessage}</Error>}
            </div>
        </FieldWrapper>
    );
};


const nameValidator = (value: string) =>
    !value ? 'Name is required' : value.length < 3 ? 'Name should be at least 3 characters long.' : '';

const responsiveBreakpoints = [
    { minWidth: 0, maxWidth: 499, value: 1 },
    { minWidth: 500, value: 2 }
];

const AddEmployee = () => {
    const navigate = useNavigate();
    const auth = useContext<AuthContext | null>(AuthContext);
    const location = useLocation() as { state?: { employee?: any } };
    const initialEmployee = location.state?.employee;
    const normalizeMonthDate = (v: any): Date | undefined => {
        if (!v) return undefined;
        if (v instanceof Date && !isNaN(v.getTime())) return new Date(v.getFullYear(), v.getMonth(), 1);
        if (typeof v === 'object' && typeof v.toDate === 'function') {
            const d = v.toDate();
            return d instanceof Date && !isNaN(d.getTime()) ? new Date(d.getFullYear(), d.getMonth(), 1) : undefined;
        }
        if (typeof v === 'object' && typeof v.seconds === 'number') {
            const d = new Date(v.seconds * 1000);
            return isNaN(d.getTime()) ? undefined : new Date(d.getFullYear(), d.getMonth(), 1);
        }
        if (typeof v === 'number' && !isNaN(v)) return new Date(v, 0, 1);
        if (typeof v === 'string') {
            const mmYYYY = v.match(/^\s*(\d{1,2})\/(\d{4})\s*$/);
            if (mmYYYY) {
                const m = Math.max(1, Math.min(12, parseInt(mmYYYY[1], 10))) - 1;
                const y = parseInt(mmYYYY[2], 10);
                return new Date(y, m, 1);
            }
            const ymd = v.match(/^\s*(\d{4})(?:[-\/](\d{1,2})(?:[-\/](\d{1,2}))?)?\s*$/);
            if (ymd) {
                const y = parseInt(ymd[1], 10);
                const m = ymd[2] ? Math.max(1, Math.min(12, parseInt(ymd[2], 10))) - 1 : 0;
                return new Date(y, m, 1);
            }
            const d = new Date(v);
            return d instanceof Date && !isNaN(d.getTime()) ? new Date(d.getFullYear(), d.getMonth(), 1) : undefined;
        }
        return undefined;
    };
    const normalizedCertifications = Array.isArray(initialEmployee?.certifications)
        ? initialEmployee.certifications.map((c: any) => ({
            ...c,
            yearIssued: normalizeMonthDate(c?.yearIssued),
            expirationYear: normalizeMonthDate(c?.expirationYear)
        }))
        : [];

    // Non-admins may edit only their own record; allow when flagged by profile
    React.useEffect(() => {
        if (auth && !auth.isAdmin) {
            const allowSelfEdit = (location as any)?.state?.allowSelfEdit === true;
            if (!allowSelfEdit) {
                navigate('/profile');
            }
        }
    }, [auth?.isAdmin, location, navigate]);
    const isEdit = Boolean(initialEmployee?.id);
    	
    console.log(initialEmployee);
    const handleSubmit = (dataItem: { [name: string]: any }) => {
        const base = {
            name: { first: dataItem.firstName, last: dataItem.lastName },
            skills: dataItem.skills || [],
            certifications: dataItem.certifications || [],
            education: dataItem.education || [],
            languages: dataItem.languages || [],
            otherTrainings: dataItem.otherTrainings || [],
            clearanceLevel: dataItem.clearanceLevel || '',
            fullname: `${dataItem.firstName} ${dataItem.lastName}`
        };

        if (isEdit) {
            const updated = { ...initialEmployee, ...base, id: initialEmployee.id };
            editEmployee(updated)
                .then(() => navigate('/employees'))
                .catch((error) => console.error('Error updating employee: ', error));
        } else {
            addEmployee(base)
                .then(() => navigate('/employees'))
                .catch((error) => console.error('Error adding employee: ', error));
        }
        return null;
    };

    return (
        <>
            <Form
                onSubmit={handleSubmit}
                initialValues={{
                    firstName: initialEmployee?.name?.first ?? '',
                    lastName: initialEmployee?.name?.last ?? '',
                    skills: initialEmployee?.skills ?? [],
                    certifications: normalizedCertifications,
                    education: initialEmployee?.education ?? [],
                    languages: initialEmployee?.languages ?? [],
                    otherTrainings: initialEmployee?.otherTrainings ?? [],
                    clearanceLevel: initialEmployee?.clearanceLevel ?? ''
                }}
                render={(formRenderProps: FormRenderProps) => (
                    <FormElement style={{ maxWidth: 670, margin: '0 auto' }}>
                        <FormFieldSet legend="Your Account" cols={responsiveBreakpoints}>
                            <Field
                                colSpan={1}
                                name={'firstName'}
                                component={FormInput}
                                label={'First name'}
                                validator={nameValidator}
                                autoComplete="username"
                            />

                            <Field
                                colSpan={1}
                                name={'lastName'}
                                component={FormInput}
                                label={'Last name'}
                                validator={nameValidator}
                                autoComplete="username"
                            />

                            <SkillMultiField
                                colSpan={responsiveBreakpoints}
                                name='skills'
                                label='Skills'
                                minYears={0}
                                maxYears={50}
                                placeholder='Select or type skill'/>

                            <CertificationMultiField
                                colSpan={responsiveBreakpoints}
                                name='certifications'
                                label='Certifications'
                                placeholder='Select or type certification'/>
                            <OtherTrainingsMultiField
                                colSpan={responsiveBreakpoints}
                                name='otherTrainings'
                                label='Other Training'
                                placeholder='Add other trainings'
                            />
                            <EducationMultiField
                                colSpan={responsiveBreakpoints}
                                name='education'
                                label='Education'
                                placeholder='Select or type degree'/>
                            <ClearanceLevelSelect
                                colSpan={responsiveBreakpoints}
                                name='clearanceLevel'
                                label='Clearance Level'
                                placeholder='Select clearance level'
                            />
                            
                                
                        </FormFieldSet>
                        <div className="k-form-buttons">
                            <Button themeColor={'primary'} type={'submit'} disabled={!formRenderProps.allowSubmit}>
                                {isEdit ? 'Save' : 'Create'}
                            </Button>
                            <Button onClick={formRenderProps.onFormReset}>Reset</Button>
                        </div>
                    </FormElement>
                )}
            />
        </>
    );
};

export default AddEmployee;
    // Load lookups from Firestore
    
