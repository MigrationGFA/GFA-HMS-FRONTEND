import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { ApiTemplateField, ApiLabResultValues } from '@/lib/api/laboratory';

export function isCriticalValue(field: ApiTemplateField, value: unknown): boolean {
  if (!field.critical?.length || value == null || value === '') return false;
  const values = Array.isArray(value) ? value.map(String) : [String(value)];
  return values.some((v) =>
    field.critical!.some((c) => {
      if (c.startsWith('<') || c.startsWith('>')) {
        const num = Number(v);
        const bound = Number(c.slice(1));
        if (Number.isNaN(num) || Number.isNaN(bound)) return false;
        return c.startsWith('<') ? num < bound : num > bound;
      }
      return v === c;
    }),
  );
}

/** Editable inputs for a template's fields keyed by field.key. */
export function TemplateFieldInputs({
  fields,
  values,
  onChange,
}: {
  fields: ApiTemplateField[];
  values: ApiLabResultValues;
  onChange: (key: string, value: string | number | string[] | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {fields.map((f) => {
        const value = values[f.key];
        const critical = isCriticalValue(f, value);
        const labelRow = (
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs">
              {f.label}
              {f.required && <span className="text-rose-600"> *</span>}
              {f.unit && <span className="text-muted-foreground"> ({f.unit})</span>}
            </Label>
            {f.ref && <span className="text-[10px] text-muted-foreground">Ref: {f.ref}</span>}
            {critical && (
              <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">
                CRITICAL
              </Badge>
            )}
          </div>
        );
        if (f.type === 'select') {
          return (
            <div key={f.key} className="space-y-1">
              {labelRow}
              <Select
                value={value != null && value !== '' ? String(value) : undefined}
                onValueChange={(v) => onChange(f.key, v)}
              >
                <SelectTrigger className={critical ? 'border-rose-400' : undefined}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {(f.options ?? []).map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }
        if (f.type === 'multiselect') {
          const selected = Array.isArray(value) ? value : [];
          return (
            <div key={f.key} className="space-y-1 md:col-span-2">
              {labelRow}
              <div className="flex flex-wrap gap-3 rounded-md border p-2">
                {(f.options ?? []).map((o) => (
                  <label key={o} className="flex items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={selected.includes(o)}
                      onCheckedChange={(c) =>
                        onChange(
                          f.key,
                          c === true ? [...selected, o] : selected.filter((s) => s !== o),
                        )
                      }
                    />
                    {o}
                  </label>
                ))}
              </div>
            </div>
          );
        }
        if (f.type === 'textarea') {
          return (
            <div key={f.key} className="space-y-1 md:col-span-2">
              {labelRow}
              <Textarea
                rows={2}
                value={value != null ? String(value) : ''}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            </div>
          );
        }
        return (
          <div key={f.key} className="space-y-1">
            {labelRow}
            <Input
              type={f.type === 'number' ? 'number' : 'text'}
              className={critical ? 'border-rose-400' : undefined}
              value={value != null ? String(value) : ''}
              onChange={(e) =>
                onChange(f.key, f.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)
              }
            />
          </div>
        );
      })}
    </div>
  );
}

/** Read-only rendering of result values against the template fields (validation / history). */
export function ResultValuesView({
  fields,
  values,
}: {
  fields: ApiTemplateField[] | null;
  values: ApiLabResultValues;
}) {
  const known = fields ?? [];
  const knownKeys = new Set(known.map((f) => f.key));
  const extraKeys = Object.keys(values ?? {}).filter((k) => !knownKeys.has(k));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {known.map((f) => {
        const value = values?.[f.key];
        const critical = isCriticalValue(f, value);
        const display = Array.isArray(value) ? value.join(', ') : value != null && value !== '' ? String(value) : '—';
        return (
          <div key={f.key} className={`rounded-md border p-2 ${critical ? 'border-rose-300 bg-rose-50' : ''}`}>
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              {f.label}{f.unit ? ` (${f.unit})` : ''}
              {f.ref && <span>· Ref: {f.ref}</span>}
              {critical && <span className="text-rose-600 font-semibold">CRITICAL</span>}
            </div>
            <div className={`text-sm font-medium ${critical ? 'text-rose-700' : ''}`}>{display}</div>
          </div>
        );
      })}
      {extraKeys.map((k) => (
        <div key={k} className="rounded-md border p-2">
          <div className="text-[11px] text-muted-foreground font-mono">{k}</div>
          <div className="text-sm font-medium">
            {Array.isArray(values[k]) ? (values[k] as string[]).join(', ') : String(values[k] ?? '—')}
          </div>
        </div>
      ))}
    </div>
  );
}
