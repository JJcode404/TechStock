import type { ReactNode } from 'react';

export type Option = { id: string; name: string };

export const fieldClass =
  'w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-xs font-medium text-content-secondary">{children}</span>;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className={`${fieldClass} resize-y`}
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
