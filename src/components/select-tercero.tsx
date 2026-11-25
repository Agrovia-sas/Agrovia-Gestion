import { inputCls } from "@/components/ui";

type T = { id: string; razon_social: string };

/** Select de terceros: primero los que tienen el rol, después el resto. */
export function SelectTercero({
  name,
  principales,
  todos,
  etiqueta,
  requerido,
  defaultValue,
  vacio = "—",
}: {
  name: string;
  principales: T[];
  todos: T[];
  etiqueta: string;
  requerido?: boolean;
  defaultValue?: string | null;
  vacio?: string;
}) {
  const ids = new Set(principales.map((p) => p.id));
  const otros = todos.filter((t) => !ids.has(t.id));
  return (
    <select name={name} required={requerido} defaultValue={defaultValue ?? ""} className={inputCls}>
      <option value="">{vacio}</option>
      {principales.length > 0 && (
        <optgroup label={etiqueta}>
          {principales.map((t) => (
            <option key={t.id} value={t.id}>{t.razon_social}</option>
          ))}
        </optgroup>
      )}
      {otros.length > 0 && (
        <optgroup label="Otros terceros">
          {otros.map((t) => (
            <option key={t.id} value={t.id}>{t.razon_social}</option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
