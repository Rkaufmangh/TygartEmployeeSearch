import * as React from 'react';
import { Field, FieldRenderProps } from '@progress/kendo-react-form';
import { Label, Error } from '@progress/kendo-react-labels';
import { MultiSelect } from '@progress/kendo-react-dropdowns';
import { Input } from '@progress/kendo-react-inputs';
import { DatePicker } from '@progress/kendo-react-dateinputs';
import { ResponsiveFormBreakPoint } from '@progress/kendo-react-form';
import { fetchCertifications } from '../../firebase/firestore';
import { Certification } from '../../models/employee';

type CertificationMultiFieldProps = {
  name: string;                 // e.g., "certifications"
  label?: string;               // default "Certifications"
  required?: boolean;           // at least one certification
  requireIssuedBy?: boolean;    // require issuer for each item
  placeholder?: string;         // MultiSelect placeholder
  minYear?: number;             // default = current year - 80
  maxYear?: number;             // default = current year + 10
  colSpan?: number | ResponsiveFormBreakPoint[];            // optional grid column span
};

const makeValidator =
  (opts: { required?: boolean; requireIssuedBy?: boolean; minYear: number; maxYear: number }) =>
  (value?: Certification[]) => {
    const { required, requireIssuedBy, minYear, maxYear } = opts;

    if (required && (!value || value.length === 0)) {
      return 'At least one certification is required.';
    }
    if (!value || value.length === 0) return undefined;

    for (const c of value) {
      if (requireIssuedBy && !c.issuedBy?.trim()) {
        return `Enter issuer for ${c.name}.`;
      }
      if (!(c.yearIssued instanceof Date) || isNaN(c.yearIssued.getTime())) {
        return `Enter month and year issued for ${c.name}.`;
      }
      // expirationYear is optional; validate only if provided
      if (c.expirationYear != null) {
        if (!(c.expirationYear instanceof Date) || isNaN(c.expirationYear.getTime())) {
          return `Enter expiration month and year for ${c.name} or leave blank.`;
        }
      }
      const yi = c.yearIssued.getFullYear();
      const ye = c.expirationYear?.getFullYear();
      if (yi < minYear || yi > maxYear) {
        return `Year issued for ${c.name} must be between ${minYear} and ${maxYear}.`;
      }
      if (c.expirationYear) {
        if (c.expirationYear < c.yearIssued || (ye as number) > maxYear) {
          return `Expiration date for ${c.name} must be after issued date and before end of ${maxYear}.`;
        }
      }
    }
    return undefined;
  };


const CertificationMultiEditor = (
  props: FieldRenderProps & {
    placeholder?: string;
    minYear: number;
    maxYear: number;
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
    minYear,
    maxYear,
  } = props;

  const currentYear = new Date().getFullYear();
  const selected: Certification[] = Array.isArray(value) ? value : [];
  const selectedNames = React.useMemo(
    () => selected
      .map((c) => (typeof (c as any)?.name === 'string' ? (c as any).name as string : ''))
      .filter((v) => v != null && v !== ''),
    [selected]
  );

  const [options, setOptions] = React.useState<string[]>([]);
  React.useEffect(() => {
    let mounted = true;
    fetchCertifications()
      .then((certs) => { if (mounted) setOptions(certs); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const emitChange = (next: Certification[]) => {
    onChange({ value: next, target: { name: fieldName } });
  };

  const updateSelection = (names: string[]) => {
    const map = new Map(selected.map((c) => [c.name, c]));
    const next: Certification[] = names.map((name) => {
      const existing = map.get(name);
      return (
        existing || {
          name,
          issuedBy: '',
          yearIssued: new Date(currentYear, 0, 1),
          // expiration optional by default
          expirationYear: undefined,
        }
      );
    });
    emitChange(next);
  };

  const handleIssuedByChange = (name: string, issuedBy: string) => {
    const next = selected.map((c) => (c.name === name ? { ...c, issuedBy } : c));
    emitChange(next);
  };

  const handleMonthYearChange = (
    name: string,
    which: 'yearIssued' | 'expirationYear',
    date: Date
  ) => {
    const next = selected.map((c) =>
      c.name === name ? { ...c, [which]: date } as Certification : c
    );
    emitChange(next);
  };

  // Safely normalize unknown legacy shapes to Date or null
  const toDate = (v: any): Date | null => {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v;
    // Firestore Timestamp support
    if (typeof v === 'object' && typeof v.toDate === 'function') {
      const d = v.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
    // Plain Timestamp-like object { seconds, nanoseconds }
    if (typeof v === 'object' && typeof v.seconds === 'number') {
      const d = new Date(v.seconds * 1000);
      return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), 1);
    }
    if (typeof v === 'number' && !isNaN(v)) return new Date(v, 0, 1);
    if (typeof v === 'string') {
      // Try parsing common patterns: MM/YYYY, YYYY-MM, YYYY-MM-DD, YYYY
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
      return d instanceof Date && !isNaN(d.getTime()) ? new Date(d.getFullYear(), d.getMonth(), 1) : null;
    }
    return null;
  };

  // Normalize underlying value once if needed so DatePickers always receive Date
  React.useEffect(() => {
    if (!Array.isArray(selected) || selected.length === 0) return;
    let changed = false;
    const normalized = selected.map((c) => {
      const yi = toDate((c as any).yearIssued ?? c.yearIssued);
      const ey = (c as any).expirationYear === undefined || (c as any).expirationYear === null
        ? undefined
        : toDate((c as any).expirationYear ?? c.expirationYear) || undefined;
      if ((yi && yi !== c.yearIssued) || (ey !== (c as any).expirationYear && ey !== c.expirationYear)) {
        changed = true;
        return { ...c, yearIssued: yi || new Date(new Date().getFullYear(), 0, 1), expirationYear: ey } as CertificationValue;
      }
      return c;
    });
    if (changed) emitChange(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Memoize derived row values to avoid repeated conversions on every render
  const rows = React.useMemo(() => {
    return selected.map((c) => {
      const issuedDate = toDate((c as any).yearIssued ?? c.yearIssued);
      const expDate = toDate((c as any).expirationYear ?? c.expirationYear);
      const expMin = issuedDate ?? new Date(minYear, 0, 1);
      return { c, issuedDate, expDate, expMin };
    });
  }, [selected, minYear]);

  return (
    <div className="k-form-field k-col-span-2">
      {label && <Label editorId={id}>{label}</Label>}

      <MultiSelect
        id={id}
        data={options}
        value={selectedNames}
        onChange={(e) => updateSelection(((e.value as unknown) as string[]) || [])}
        placeholder={placeholder || 'Select or type certifications'}
        filterable
        allowCustom
        autoClose={false}
      />

      {selected.length > 0 && (
        <div style={{ marginTop: 8 }}>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 140px', gap: 12, fontWeight: 'bold', marginBottom: 8 }}>
				<span>Certification</span>
				<span>Issued By</span>
				<span>Year Issued</span>
				<span>Expiration Year</span>
			</div>
			<hr/>
          {rows.map(({ c, issuedDate, expDate, expMin }, idx) => (
            <div
              key={`${c.name}-${idx}`}
              className="k-form-field"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 120px 140px',
                gap: 12,
                alignItems: 'center',
                marginBottom: 8
              }}
            >
              <Label>{c.name}</Label>

              <Input
                placeholder="Issued by"
                value={c.issuedBy}
                onChange={(e) => handleIssuedByChange(c.name, e.value as string)}
              />

              <DatePicker
                format="MM/yyyy"
                value={issuedDate}
                min={new Date(minYear, 0, 1)}
                max={new Date(maxYear, 11, 1)}
                onChange={(e) => {
                  const d = e.value as Date | null;
                  if (d) handleMonthYearChange(c.name, 'yearIssued', new Date(d.getFullYear(), d.getMonth(), 1));
                }}
              />

              <DatePicker
                format="MM/yyyy"
                value={expDate}
                min={expMin}
                max={new Date(maxYear, 11, 1)}
                onChange={(e) => {
                  const d = e.value as Date | null;
                  if (d) {
                    handleMonthYearChange(c.name, 'expirationYear', new Date(d.getFullYear(), d.getMonth(), 1));
                  } else {
                    // cleared: set expirationYear to undefined
                    const next = selected.map((row) =>
                      row.name === c.name ? { ...row, expirationYear: undefined } : row
                    );
                    emitChange(next);
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}

      {touched && validationMessage && <Error>{validationMessage}</Error>}
    </div>
  );
};

export const CertificationMultiField: React.FC<CertificationMultiFieldProps> = ({
  name,
  label = 'Certifications',
  required = false,
  requireIssuedBy = false,
  data,
  placeholder,
  minYear,
  maxYear,
  colSpan,
}) => {
  const currentYear = new Date().getFullYear();
  const computedMin = typeof minYear === 'number' ? minYear : currentYear - 80;
  const computedMax = typeof maxYear === 'number' ? maxYear : currentYear + 10;

  const validator = makeValidator({
    required,
    requireIssuedBy,
    minYear: computedMin,
    maxYear: computedMax,
  });

  return (
    <Field
      name={name}
      label={label}
      validator={validator}
      component={CertificationMultiEditor}
      data={data}
      placeholder={placeholder}
      minYear={computedMin}
      maxYear={computedMax}
	  colSpan={colSpan}
    />
  );
};
