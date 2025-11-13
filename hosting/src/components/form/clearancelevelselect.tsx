import * as React from 'react';
import { Field, FieldRenderProps, ResponsiveFormBreakPoint } from '@progress/kendo-react-form';
import { Label, Error } from '@progress/kendo-react-labels';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { fetchClearanceLevels } from '../../firebase/firestore';

type ClearanceLevelSelectProps = {
  name: string;
  label?: string;
  placeholder?: string;
  data?: string[]; // optional preset list; if omitted, component fetches
  colSpan?: number | ResponsiveFormBreakPoint[];
};

const ClearanceEditor = (
  props: FieldRenderProps & { data?: string[]; placeholder?: string }
) => {
  const { id, label, name, value, onChange, touched, validationMessage, data, placeholder } = props;

  const [options, setOptions] = React.useState<string[]>(() => Array.from(new Set([...(data || [])])));

  React.useEffect(() => {
    setOptions((prev) => Array.from(new Set([...(data || []), ...prev])));
  }, [data?.join('|')]);

  React.useEffect(() => {
    if (data && data.length) return; // parent provided
    let mounted = true;
    fetchClearanceLevels()
      .then((levels) => {
        if (!mounted) return;
        if (Array.isArray(levels) && levels.length) {
          setOptions((prev) => Array.from(new Set([...(prev || []), ...levels])));
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [data]);

  const handleChange = (val?: string) => {
    onChange({ value: val ?? '', target: { name } });
  };

  return (
    <div className="k-form-field k-col-span-2">
      {label && <Label editorId={id}>{label}</Label>}
      <DropDownList
        id={id}
        data={options}
        value={(typeof value === 'string' ? value : '') as any}
        onChange={(e) => handleChange(e.value as string)}
        placeholder={placeholder || 'Select clearance level'}
        style={{ width: '100%' }}
      />
      {touched && validationMessage && <Error>{validationMessage}</Error>}
    </div>
  );
};

export const ClearanceLevelSelect: React.FC<ClearanceLevelSelectProps> = ({
  name,
  label = 'Clearance Level',
  placeholder,
  data,
  colSpan,
}) => {
  return (
    <Field
      name={name}
      label={label}
      component={ClearanceEditor}
      data={data}
      placeholder={placeholder}
      colSpan={colSpan}
    />
  );
};

