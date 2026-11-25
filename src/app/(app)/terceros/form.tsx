import { Field, inputCls } from "@/components/ui";
import { ROLES_TERCERO } from "@/lib/format";
import type { Database } from "@/lib/database.types";

type Tercero = Database["public"]["Tables"]["terceros"]["Row"];

/** Campos del formulario de terceros (se usa en el alta y en la edición). */
export function CamposTercero({ t, roles = [] }: { t?: Partial<Tercero>; roles?: string[] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Razón social *">
          <input name="razon_social" required defaultValue={t?.razon_social ?? ""} className={inputCls} />
        </Field>
        <Field label="Nombre comercial">
          <input name="nombre_comercial" defaultValue={t?.nombre_comercial ?? ""} className={inputCls} />
        </Field>
        <Field label="CUIT" hint="11 números, con o sin guiones">
          <input name="cuit" inputMode="numeric" defaultValue={t?.cuit ?? ""} className={inputCls} />
        </Field>
        <Field label="Condición fiscal">
          <select name="condicion_fiscal" defaultValue={t?.condicion_fiscal ?? ""} className={inputCls}>
            <option value="">—</option>
            <option>Responsable inscripto</option>
            <option>Monotributista</option>
            <option>Exento</option>
            <option>Consumidor final</option>
          </select>
        </Field>
        <Field label="Domicilio">
          <input name="domicilio" defaultValue={t?.domicilio ?? ""} className={inputCls} />
        </Field>
        <Field label="Provincia">
          <input name="provincia" defaultValue={t?.provincia ?? ""} className={inputCls} />
        </Field>
        <Field label="Contacto">
          <input name="contacto" defaultValue={t?.contacto ?? ""} className={inputCls} />
        </Field>
        <Field label="Teléfono">
          <input name="telefono" defaultValue={t?.telefono ?? ""} className={inputCls} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={t?.email ?? ""} className={inputCls} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Roles *</legend>
        <div className="flex flex-wrap gap-3">
          {Object.entries(ROLES_TERCERO).map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 rounded-lg border border-borde px-3 py-1.5 text-sm">
              <input type="checkbox" name="roles" value={v} defaultChecked={roles.includes(v)} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Observaciones">
        <textarea name="observaciones" rows={2} defaultValue={t?.observaciones ?? ""} className={inputCls} />
      </Field>
    </>
  );
}
