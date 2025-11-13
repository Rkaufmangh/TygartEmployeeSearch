import * as React from 'react';
import { Field, FieldRenderProps, ResponsiveFormBreakPoint } from '@progress/kendo-react-form';
import { Label, Error } from '@progress/kendo-react-labels';
import { MultiSelect, DropDownList } from '@progress/kendo-react-dropdowns';
import { NumericTextBox } from '@progress/kendo-react-inputs';
import { Skill } from '../../models/employee';
import { fetchSkills, fetchProficiencyLevels } from '../../firebase/firestore';

type SkillMultiFieldProps = {
  name: string;                 // e.g., "skills"
  label?: string;
  required?: boolean;
  placeholder?: string;
  minYears?: number;            // default 0
  maxYears?: number;          // optional cap, e.g., 50
  colSpan?: number | ResponsiveFormBreakPoint[];            // optional grid column span
};

const makeValidator =
  (required?: boolean, minYears: number = 0) =>
  (value?: Skill[]) => {
    if (required && (!value || value.length === 0)) {
      return 'At least one skill is required.';
    }
    if (value && value.length > 0) {
      for (const s of value) {
        if (typeof s.yearsExperience !== 'number' || isNaN(s.yearsExperience)) {
          return `Enter years of experience for ${s.skill}.`;
        }
        if (s.yearsExperience < minYears) {
          return `Years for ${s.skill} must be ≥ ${minYears}.`;
        }
      }
    }
    return undefined;
  };

const SkillMultiEditor = (
  props: FieldRenderProps & {
    placeholder?: string;
    minYears?: number;
    maxYears?: number;
	colSpan?: number | ResponsiveFormBreakPoint[];
  }
) => {
  const {
    id,
    label,
    value,
    onChange,
    touched,
    visited,
    validationMessage,
    placeholder,
    minYears = 0,
    maxYears,
  } = props;

  const rawSelected: any[] = Array.isArray(value) ? (value as any[]) : [];
  const selected: Skill[] = React.useMemo(() => {
    return rawSelected
      .filter((s) => s != null)
      .map((s: any) => {
        if (typeof s === 'string') {
          return { skill: s, yearsExperience: minYears, proficiency: '' } as Skill;
        }
        const name = typeof s.skill === 'string' ? s.skill : '';
        if (!name) return null as any;
        const years = typeof s.yearsExperience === 'number' && !isNaN(s.yearsExperience)
          ? s.yearsExperience
          : minYears;
        const prof = typeof s.proficiency === 'string' ? s.proficiency : '';
        return { skill: name, yearsExperience: years, proficiency: prof } as Skill;
      })
      .filter((s: any) => s && typeof s.skill === 'string');
  }, [rawSelected, minYears]);
  const selectedNames = React.useMemo(() => selected.map((s) => s.skill), [selected]);

  const defaultProficiencies = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  const [proficiencies, setProficiencies] = React.useState<string[]>(defaultProficiencies);
  const [options, setOptions] = React.useState<string[]>(() => Array.from(new Set<string>([...selectedNames])));

  React.useEffect(() => {
    let mounted = true;
    // Fetch skills and proficiencies in parallel
    Promise.all([fetchSkills(), fetchProficiencyLevels()])
      .then(([skills, profs]) => {
        if (!mounted) return;
        setOptions((prev) => Array.from(new Set([...(prev || []), ...(skills || []), ...selectedNames])));
        setProficiencies(Array.isArray(profs) && profs.length ? profs : defaultProficiencies);
      })
      .catch(() => {
        // keep defaults if fetch fails
      });
    return () => { mounted = false; };
  }, [selectedNames.join('|')]);

  const updateSelection = (names: string[]) => {
    const map = new Map(selected.map((s) => [s.skill, s]));
    const next: Skill[] = names.map((name) => {
      const existing = map.get(name);
      return existing ? existing : { skill: name, yearsExperience: minYears, proficiency: '' };
    });
    onChange({target:props.name, value:next});
  };

  const handleYearsChange = (name: string, years?: number) => {
    const next = selected.map((s) =>
      s.skill === name
        ? { ...s, yearsExperience: typeof years === 'number' ? years : minYears }
        : s
    );
    onChange({value:next,target:props.name});
  };

  const handleProficiencyChange = (name: string, prof?: string) => {
    const next = selected.map((s) =>
      s.skill === name
        ? { ...s, proficiency: (prof ?? '') }
        : s
    );
    onChange({ value: next, target: props.name });
  };

  return (
    <div className="k-form-field k-col-span-2">
      {label && <Label editorId={id}>{label}</Label>}

      <MultiSelect
        id={id}
        data={options}
        value={selectedNames}
        onChange={(e) => updateSelection(e.value as string[] || [])}
        placeholder={placeholder || 'Select or type skills'}
        filterable={true}
        allowCustom={true}
        autoClose={false}
        tagRender={(tagProps)=>(
          <span key={`${tagProps.text}`}
                className='k-chip k-chip-filled k-chip-solid'>
            {tagProps.text}
          </span>
        )}
      />

      {/* Per-skill years editor */}
      {selected.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {selected.map((s, idx) => (
            <div key={`${s.skill}-${idx}`} className="k-form-field" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <Label>{s.skill}</Label>
              <NumericTextBox
                min={minYears}
                max={maxYears}
                step={1}
                format="n0"
                width={120}
                value={s.yearsExperience}
                onChange={(e) => handleYearsChange(s.skill, e.value as number | undefined)}
              />
              <span style={{ color: '#6b7280' }}>Years Experience</span>
              <DropDownList
                data={proficiencies}
                value={s.proficiency || ''}
                onChange={(e) => handleProficiencyChange(s.skill, e.value as string)}
                style={{ width: 160 }}
              />
              <span style={{ color: '#6b7280' }}>Proficiency</span>
            </div>
          ))}
        </div>
      )}

      {touched && visited && validationMessage && <Error>{validationMessage}</Error>}
    </div>
  );
};

export const SkillMultiField: React.FC<SkillMultiFieldProps> = ({
  name,
  label = 'Skills',
  required = false,
  placeholder,
  minYears = 0,
  maxYears,
  colSpan,
}) => {
  const validator = makeValidator(required, minYears);
  return (
    <Field
      name={name}
      label={label}
      validator={validator}
      component={SkillMultiEditor}
      placeholder={placeholder}
      minYears={minYears}
      maxYears={maxYears}
	  colSpan={colSpan}
    />
  );
};
