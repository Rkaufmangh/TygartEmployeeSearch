import * as React from 'react';
import { Field, FieldRenderProps, ResponsiveFormBreakPoint } from '@progress/kendo-react-form';
import { Label, Error } from '@progress/kendo-react-labels';
import { MultiSelect } from '@progress/kendo-react-dropdowns';
import { fetchOtherTrainings } from '../../firebase/firestore';

type OtherTrainingsMultiFieldProps = {
  name: string;
  label?: string;
  placeholder?: string;
  colSpan?: number | ResponsiveFormBreakPoint[];
};

const OtherTrainingsEditor = (
  props: FieldRenderProps & {
    placeholder?: string;
  }
) => {
  const { id, label, name, value, onChange, touched, validationMessage, placeholder } = props;

  const raw: any[] = Array.isArray(value) ? (value as any[]) : [];
  const selected: string[] = React.useMemo(
    () => raw.filter((s): s is string => typeof s === 'string' && s.trim().length > 0),
    [raw]
  );
  const [options, setOptions] = React.useState<string[]>([]);

  // Load suggestions from Firestore once and merge into options
  React.useEffect(() => {
    fetchOtherTrainings()
      .then((list) => {
		console.log(list);
        if (Array.isArray(list) && list.length) {
          setOptions((prev) => Array.from(new Set([...(prev || []), ...list])));
        }
      })
      .catch(() => {});
  }, []);

  const updateSelection = (names: string[]) => {
    const cleaned = (names || []).filter((s) => typeof s === 'string' && s.trim().length > 0);
    onChange({ value: cleaned, target: { name } });
  };

  return (
    <div className="k-form-field k-col-span-2">
      {label && <Label editorId={id}>{label}</Label>}

      <MultiSelect
        id={id}
        data={options}
        value={selected}
        onChange={(e) => updateSelection(((e.value as unknown) as string[]) || [])}
        placeholder={placeholder || 'Add other trainings'}
        filterable
        allowCustom
        autoClose={false}
      />

      {touched && validationMessage && <Error>{validationMessage}</Error>}
    </div>
  );
};

export const OtherTrainingsMultiField: React.FC<OtherTrainingsMultiFieldProps> = ({
  name,
  label = 'Other Training',
  placeholder,
  colSpan,
}) => {
  return (
    <Field
      name={name}
      label={label}
      component={OtherTrainingsEditor}
      placeholder={placeholder}
      colSpan={colSpan}
    />
  );
};
