import React from "react";
import { Employee } from "../../models/employee";
import { Field, FieldWrapper, Form, FormElement, FieldRenderProps } from "@progress/kendo-react-form";
import { Dialog, DialogActionsBar } from "@progress/kendo-react-dialogs";
import { TextBox } from "@progress/kendo-react-inputs";
import { Label } from "@progress/kendo-react-labels";
import { Button } from "@progress/kendo-react-buttons";
import { saveIcon, cancelIcon } from "@progress/kendo-svg-icons";

interface EmployeeEditProps {
	employee: Employee | null;
	onClose: () => void;
	onSave: (emp: Employee) => void;
}
const TextBoxField = (fieldRenderProps: FieldRenderProps) => {
    const { validationMessage, visited, label, id, valid, ...others } = fieldRenderProps;
    return (
        <>
            <Label editorId={id} className={'k-form-label'}>
                {label}
            </Label>
            <div className={'k-form-field-wrap'}>
                <TextBox {...others} />
            </div>
        </>
    );
};

const EmployeeEdit: React.FC<EmployeeEditProps> = ({ employee, onClose, onSave }) => {
	if (!employee) {
		return null;
	}
	return (
			<Form initialValues={employee}
				onSubmit={(dataItem) => onSave(dataItem as Employee)}
				render={(renderProps)=>(
					<Dialog title={`Edit ${employee.fullname}`} onClose={onClose} style={{maxWidth:'650px'}}>
						<FormElement>
							<FieldWrapper>
								<Field name="first" component={TextBoxField} label="First Name" />
								<Field name="last" component={TextBoxField} label="Last Name" />
								<Field name="email" component="input" label="Email" />
								<Field name="phone" component="input" label="Phone" />
							</FieldWrapper>
						</FormElement>
						<DialogActionsBar layout="start">
                        <Button
                            type={'submit'}
                            themeColor={'primary'}
                            disabled={!renderProps.allowSubmit}
                            onClick={renderProps.onSubmit}
                            icon="save"
                            svgIcon={saveIcon}
                        >
                            Update
                        </Button>
                        <Button onClick={onClose} icon="cancel" svgIcon={cancelIcon}>
                            Cancel
                        </Button>
                    </DialogActionsBar>
					</Dialog>
				)} />
				
	);
};

export default EmployeeEdit;