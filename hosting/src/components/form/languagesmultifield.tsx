import * as React from 'react';
import { Field, FieldRenderProps } from '@progress/kendo-react-form';
import { Label, Error } from '@progress/kendo-react-labels';
import { MultiSelect, DropDownList } from '@progress/kendo-react-dropdowns';
import { ResponsiveFormBreakPoint } from '@progress/kendo-react-form';

export interface LanguageValue {
  name: string;
  proficiency: string; // Beginner | Intermediate | Advanced | Fluent
}

type LanguagesMultiFieldProps = {
  name: string;                    // e.g., "languages"
  label?: string;                  // default "Languages"
  required?: boolean;              // at least one language
  requireProficiency?: boolean;    // ensure each has proficiency
  data: string[];                  // default list of language names
  proficiencyOptions?: string[];   // default list of proficiencies
  placeholder?: string;            // MultiSelect placeholder
  colSpan?: number | ResponsiveFormBreakPoint[];            // optional grid column span
};

const defaultProficiencies = ['Beginner', 'Intermediate', 'Advanced', 'Fluent'];

const makeValidator =
  (opts: { required?: boolean; requireProficiency?: boolean }) =>
  (value?: LanguageValue[]) => {
    const { required, requireProficiency } = opts;

    if (required && (!value || value.length === 0)) {
      return 'At least one language is required.';
    }
    if (!value || value.length === 0) return undefined;

    if (requireProficiency) {
      for (const l of value) {
        if (!l.proficiency || !l.proficiency.trim()) {
          return `Select proficiency for ${l.name}.`;
        }
      }
    }
    return undefined;
  };

const LanguagesMultiEditor = (
  props: FieldRenderProps & {
    data: string[];
    placeholder?: string;
    proficiencyOptions: string[];
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
    data,
    placeholder,
    proficiencyOptions,
  } = props;

  const selected: LanguageValue[] = Array.isArray(value) ? value : [];
  const selectedNames = selected.map((l) => l.name);

  const [options, setOptions] = React.useState<string[]>(() =>
    Array.from(new Set([...(data || []), ...selectedNames]))
  );

  React.useEffect(() => {
    setOptions((prev) =>
      Array.from(new Set([...(data || []), ...selectedNames, ...prev]))
    );
  }, [data, selectedNames.join('|')]);

  const emitChange = (next: LanguageValue[]) => {
    onChange({ value: next, target: { name: fieldName } });
  };

  const updateSelection = (names: string[]) => {
    const map = new Map(selected.map((l) => [l.name, l]));
    const next: LanguageValue[] = names.map((name) => {
      const existing = map.get(name);
      return existing || { name, proficiency: '' };
    });
    emitChange(next);
  };

  const handleProficiencyChange = (name: string, prof?: string) => {
    const next = selected.map((l) =>
      l.name === name ? { ...l, proficiency: prof ?? '' } : l
    );
    emitChange(next);
  };

  return (
    <div className="k-form-field k-col-span-2">
      {label && <Label editorId={id}>{label}</Label>}

      <MultiSelect
        id={id}
        data={options}
        value={selectedNames}
        onChange={(e) => updateSelection(((e.value as unknown) as string[]) || [])}
        placeholder={placeholder || 'Select or type languages'}
        filterable
        allowCustom
        autoClose={false}
      />

      {selected.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {selected.map((l) => (
            <div
              key={l.name}
              className="k-form-field"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 200px',
                gap: 12,
                alignItems: 'center',
                marginBottom: 8
              }}
            >
              <Label>{l.name}</Label>
              <DropDownList
                data={proficiencyOptions}
                value={l.proficiency || null}
                onChange={(e) => handleProficiencyChange(l.name, e.value as string)}
              />
            </div>
          ))}
        </div>
      )}

      {touched && validationMessage && <Error>{validationMessage}</Error>}
    </div>
  );
};

export const LanguagesMultiField: React.FC<LanguagesMultiFieldProps> = ({
  name,
  label = 'Languages',
  required = false,
  requireProficiency = true,
  data,
  proficiencyOptions = defaultProficiencies,
  placeholder,
  colSpan,
}) => {
  const validator = makeValidator({ required, requireProficiency });

  return (
    <Field
      name={name}
      label={label}
      validator={validator}
      component={LanguagesMultiEditor}
      data={data}
      proficiencyOptions={proficiencyOptions}
      placeholder={placeholder}
	  colSpan={colSpan}
    />
  );
};