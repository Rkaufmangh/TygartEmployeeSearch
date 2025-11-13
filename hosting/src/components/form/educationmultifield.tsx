import * as React from 'react';
import { Field, FieldRenderProps } from '@progress/kendo-react-form';
import { Label, Error } from '@progress/kendo-react-labels';
import { ComboBox } from '@progress/kendo-react-dropdowns';
import { Input } from '@progress/kendo-react-inputs';
import { Button } from '@progress/kendo-react-buttons';
import { ResponsiveFormBreakPoint } from '@progress/kendo-react-form';
import { getEducationLevels, getFieldOfStudies } from '../../firebase/firestore';

// Month/Year selection removed; education model no longer stores completion year

export interface EducationValue {
  degree: string;
  institution: string;
  fieldOfStudy: string;
}

type EducationMultiFieldProps = {
  name: string;                  // e.g., "education"
  label?: string;                // default "Education"
  required?: boolean;            // require at least one
  requireInstitution?: boolean;  // require institution per item
  requireFieldOfStudy?: boolean; // require field per item
  data?: string[];               // optional initial degree names
  placeholder?: string;
  colSpan?: number | ResponsiveFormBreakPoint[];            // optional grid column span
};

const makeValidator =
  (opts: {
    required?: boolean;
    requireInstitution?: boolean;
    requireFieldOfStudy?: boolean;
  }) =>
  (value?: EducationValue[]) => {
    const { required, requireInstitution, requireFieldOfStudy } = opts;

    if (required && (!value || value.length === 0)) {
      return 'At least one degree is required.';
    }
    if (!value || value.length === 0) return undefined;

    for (const e of value) {
      if (requireInstitution && !e.institution?.trim()) {
        return `Enter institution for ${e.degree}.`;
      }
      if (requireFieldOfStudy && !e.fieldOfStudy?.trim()) {
        return `Enter field of study for ${e.degree}.`;
      }
    }
    return undefined;
  };

const EducationMultiEditor = (
  props: FieldRenderProps & {
    data?: string[];
    placeholder?: string;
  }
) => {
  const {
    id,
    label,
    name: fieldName,
    value,
    onChange,
    touched,
    validationMessage,
    placeholder,
  } = props;

  const rawSelected: any[] = Array.isArray(value) ? (value as any[]) : [];
  const selected: EducationValue[] = React.useMemo(() => {
    return rawSelected
      .filter((e) => e != null)
      .map((e: any) => {
        if (typeof e === 'string') {
          return { degree: e, institution: '', fieldOfStudy: '' } as EducationValue;
        }
        const degree = typeof e.degree === 'string' ? e.degree : '';
        const institution = typeof e.institution === 'string' ? e.institution : '';
        const fieldOfStudy = typeof e.fieldOfStudy === 'string' ? e.fieldOfStudy : '';
        return { degree, institution, fieldOfStudy } as EducationValue;
      })
      .filter((e: EducationValue) => e && typeof e.degree === 'string');
  }, [rawSelected]);
  const selectedNames = React.useMemo(
    () => selected
      .map((e) => (typeof (e as any)?.degree === 'string' ? (e as any).degree as string : ''))
      .filter((v) => v != null && v !== ''),
    [selected]
  );

  const [degreeOptions, setDegreeOptions] = React.useState<string[]>([]);
  const [fieldOptions, setFieldOptions] = React.useState<string[]>([]);

  // Load lookups from Firestore
  React.useEffect(() => {
    const u1 = getEducationLevels((levels) => setDegreeOptions((prev) => Array.from(new Set([...(levels || []), ...levels, ...selectedNames, ...prev]))));
    const u2 = getFieldOfStudies((fields) => setFieldOptions((prev) => Array.from(new Set([...(fields || []), ...prev]))));
    return () => { u1 && u1(); u2 && u2(); };
  }, []);

  const emitChange = (next: EducationValue[]) => {
    onChange({ value: next, target: { name: fieldName } });
  };

  // Row helpers to support duplicate degree levels
  const addRow = () => {
    const next = [...selected, { degree: '', institution: '', fieldOfStudy: '' }];
    emitChange(next);
  };

  const removeRow = (index: number) => {
    const next = selected.filter((_, i) => i !== index);
    emitChange(next);
  };

  const setRowField = (index: number, field: keyof EducationValue, val: string) => {
    const next = selected.map((e, i) => (i === index ? { ...e, [field]: val } : e));
    emitChange(next);
  };

  const handleTextChange = (
    degreeName: string,
    which: 'institution' | 'fieldOfStudy',
    text?: string
  ) => {
    const next = selected.map((e) =>
      e.degree === degreeName ? { ...e, [which]: text ?? '' } as EducationValue : e
    );
    emitChange(next);
  };

  return (
    <div className="k-form-field k-col-span-2">
      {label && <Label editorId={id}>{label}</Label>}

      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12 }}>
          <span>Degree</span>
          <span>Institution</span>
          <span>Field of Study</span>
          <span></span>
        </div>
        <hr />
        {selected.map((d, idx) => (
          <div
            key={idx}
            className="k-form-field"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'center', marginBottom: 8 }}
          >
            <ComboBox
              data={degreeOptions}
              value={d.degree}
              onChange={(e) => setRowField(idx, 'degree', (e.value as string) ?? '')}
              allowCustom={true}
              placeholder={placeholder || 'Select degree'}
            />
            <Input
              placeholder="Institution"
              value={d.institution}
              onChange={(e) => setRowField(idx, 'institution', (e.value as string) ?? '')}
            />
            <ComboBox
              data={fieldOptions}
              value={d.fieldOfStudy}
              onChange={(e) => setRowField(idx, 'fieldOfStudy', (e.value as string) ?? '')}
              allowCustom={true}
              placeholder="Field of study"
            />
            <Button type="button" onClick={() => removeRow(idx)}>Remove</Button>
          </div>
        ))}
        <Button type="button" themeColor={'primary'} onClick={addRow}>Add Degree</Button>
      </div>

      {touched && validationMessage && <Error>{validationMessage}</Error>}
    </div>
  );
};

export const EducationMultiField: React.FC<EducationMultiFieldProps> = ({
  name,
  label = 'Education',
  required = false,
  requireInstitution = false,
  requireFieldOfStudy = false,
  data,
  placeholder,
  colSpan,
}) => {
  const validator = makeValidator({
    required,
    requireInstitution,
    requireFieldOfStudy,
  });

  return (
    <Field
      name={name}
      label={label}
      validator={validator}
      component={EducationMultiEditor}
      data={data}
      placeholder={placeholder}
      	  colSpan={colSpan}
    />
  );
};
