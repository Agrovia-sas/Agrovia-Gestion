"use client";

import { useState } from "react";
import { Field, inputCls } from "@/components/ui";

type T = { id: string; razon_social: string };
type Opcion = { value: string; label: string };

const TIPOS = [
  { v: "ingreso", l: "Ingreso: el dueño me deja bolsas", ayuda: "Suma bolsas físicas del dueño en el lugar elegido." },
  { v: "traslado", l: "Traslado: muevo bolsas de un lugar a otro", ayuda: "Siguen siendo del dueño, cambian de lugar." },
  { v: "entrega", l: "Entrega: le doy bolsas a un cliente", ayuda: "Si la venta está cargada como operación en custodia, la entrega se registra sola con la carga. Usá esto solo para entregas sin operación." },
  { v: "reposicion", l: "Reposición: le repongo bolsas al dueño", ayuda: "Baja lo que le debo y suma bolsas físicas del dueño." },
  { v: "pago_plata", l: "Pago en plata: le pago en vez de reponer", ayuda: "Baja lo que le debo en bolsas y registra cuánto le pagué." },
  { v: "retiro", l: "Retiro: el dueño se lleva o vende sus bolsas", ayuda: "Bajan las bolsas físicas del dueño." },
] as const;

export function CamposMovimiento({
  hoy,
  duenoId,
  terceros,
  compradores,
  marcas,
  ubicaciones,
}: {
  hoy: string;
  duenoId?: string;
  terceros: T[];
  compradores: T[];
  marcas: { id: string; nombre: string }[];
  ubicaciones: Opcion[];
}) {
  const [tipo, setTipo] = useState<string>("ingreso");
  const t = TIPOS.find((x) => x.v === tipo)!;
  const conDesde = ["traslado", "entrega", "retiro"].includes(tipo);
  const conHacia = ["ingreso", "traslado", "reposicion"].includes(tipo);
  const conTransporte = tipo !== "pago_plata";

  const lugares = (
    <>
      <option value="">—</option>
      {ubicaciones.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
    </>
  );

  return (
    <>
      <Field label="Movimiento *" hint={t.ayuda}>
        <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
          {TIPOS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        {duenoId ? (
          <input type="hidden" name="dueno_id" value={duenoId} />
        ) : (
          <Field label="Dueño de las bolsas *">
            <select name="dueno_id" required defaultValue="" className={inputCls}>
              <option value="">—</option>
              {terceros.map((x) => <option key={x.id} value={x.id}>{x.razon_social}</option>)}
            </select>
          </Field>
        )}
        <Field label="Bolsas *"><input name="bolsas" inputMode="numeric" required className={inputCls} /></Field>
        <Field label="Fecha"><input type="date" name="fecha" defaultValue={hoy} className={inputCls} /></Field>
        <Field label="Marca">
          <select name="marca_id" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </Field>
        {conDesde && <Field label="Salen desde *"><select name="desde" required className={inputCls}>{lugares}</select></Field>}
        {conHacia && <Field label={tipo === "traslado" ? "Van a *" : "Quedan en *"}><select name="hacia" required className={inputCls}>{lugares}</select></Field>}
        {tipo === "entrega" && (
          <Field label="Se entregaron a">
            <select name="destinatario_id" defaultValue="" className={inputCls}>
              <option value="">—</option>
              {compradores.map((x) => <option key={x.id} value={x.id}>{x.razon_social}</option>)}
            </select>
          </Field>
        )}
        {tipo === "pago_plata" && <Field label="Importe pagado *"><input name="importe" inputMode="decimal" required className={inputCls} /></Field>}
        {conTransporte && (
          <>
            <Field label="Remito"><input name="remito" className={inputCls} /></Field>
            <Field label="Chofer"><input name="chofer" className={inputCls} /></Field>
            <Field label="Patente"><input name="patente" className={inputCls} /></Field>
          </>
        )}
      </div>
      <Field label="Observaciones"><input name="observaciones" className={inputCls} /></Field>
    </>
  );
}
