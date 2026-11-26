"use client";

import { useEffect, useState, useTransition } from "react";
import { ActionForm } from "@/components/action-form";
import { cx, Field, inputCls } from "@/components/ui";
import { $ } from "@/lib/format";
import { arqueo, pendientesDe, registrarCobroPago, registrarGasto, registrarOtro, saldoInicial, transferir, type Pendiente } from "./actions";

type T = { id: string; razon_social: string };

const MEDIOS = [
  ["efectivo", "Efectivo"],
  ["transferencia", "Transferencia"],
  ["echeq", "eCheq"],
  ["cheque", "Cheque físico"],
  ["debito_automatico", "Débito automático"],
  ["tarjeta", "Tarjeta"],
  ["otro", "Otro"],
] as const;

function num(s: string) {
  const t = s.trim();
  if (!t) return 0;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : 0;
}

function Comunes({ hoy, medio }: { hoy: string; medio: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Fecha"><input type="date" name="fecha" defaultValue={hoy} className={inputCls} /></Field>
      <Field label="Medio">
        <select name="medio" defaultValue={medio} className={inputCls}>
          {MEDIOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
    </div>
  );
}

/** Cobro o pago: elegís el tercero y marcás qué se cancela. */
function CobroPago({ sentido, terceros, hoy, medio, cuentaId }: { sentido: "cobrar" | "pagar"; terceros: T[]; hoy: string; medio: string; cuentaId: string }) {
  const [tercero, setTercero] = useState("");
  const [lista, setLista] = useState<Pendiente[]>([]);
  const [sel, setSel] = useState<Record<string, { on: boolean; importe: string; factura: boolean; numero: string }>>({});
  const [extra, setExtra] = useState("");
  const [cargando, start] = useTransition();

  useEffect(() => {
    setSel({});
    if (!tercero) return setLista([]);
    start(async () => setLista(await pendientesDe(tercero, sentido)));
  }, [tercero, sentido]);

  const aplic = lista
    .filter((p) => sel[p.id]?.on)
    .map((p) => {
      const imp = num(sel[p.id].importe);
      const iva = p.tipo === "comision" && sel[p.id].factura ? Math.round(imp * 0.21 * 100) / 100 : 0;
      return { obligacion_id: p.id, importe: imp, iva_facturado: iva, factura_numero: sel[p.id].numero || null };
    });
  const total = aplic.reduce((s, a) => s + a.importe + a.iva_facturado, 0) + num(extra);

  return (
    <ActionForm action={registrarCobroPago.bind(null, cuentaId)} submit={sentido === "cobrar" ? `Registrar cobro de ${$(total)}` : `Registrar pago de ${$(total)}`}>
      <input type="hidden" name="sentido" value={sentido} />
      <input type="hidden" name="aplicaciones" value={JSON.stringify(aplic)} />
      <Field label={sentido === "cobrar" ? "¿Quién te pagó? *" : "¿A quién le pagaste? *"}>
        <select name="tercero_id" value={tercero} onChange={(e) => setTercero(e.target.value)} className={inputCls}>
          <option value="">—</option>
          {terceros.map((t) => <option key={t.id} value={t.id}>{t.razon_social}</option>)}
        </select>
      </Field>
      {tercero && (
        <div className="rounded-lg border border-borde">
          <p className="border-b border-borde px-3 py-2 text-xs font-medium text-texto-2">
            {cargando ? "Buscando…" : lista.length ? (sentido === "cobrar" ? "Lo que te debe — marcá qué cancela:" : "Lo que le debés — marcá qué cancela:") : sentido === "cobrar" ? "No te debe nada registrado." : "No le debés nada registrado."}
          </p>
          <ul className="max-h-72 divide-y divide-borde overflow-y-auto">
            {lista.map((p) => {
              const s = sel[p.id] ?? { on: false, importe: String(p.pendiente), factura: false, numero: "" };
              const set = (c: Partial<typeof s>) => setSel({ ...sel, [p.id]: { ...s, ...c } });
              return (
                <li key={p.id} className={cx("px-3 py-2 text-sm", s.on && "bg-ok/5")}>
                  <label className="flex items-start gap-2">
                    <input type="checkbox" checked={s.on} onChange={(e) => set({ on: e.target.checked })} className="mt-1" />
                    <span className="flex-1">
                      <span className="font-medium">{p.numero ? `${p.numero} · ` : ""}{p.concepto}</span>
                      <span className="block text-xs text-texto-2">
                        Pendiente {$(p.pendiente)}
                        {!p.exigible && " · todavía no exigible (esperando carga)"}
                      </span>
                    </span>
                  </label>
                  {s.on && (
                    <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                      <input value={s.importe} onChange={(e) => set({ importe: e.target.value })} inputMode="decimal" className={inputCls} aria-label="Importe aplicado" />
                      {p.tipo === "comision" && sentido === "cobrar" && (
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={s.factura} onChange={(e) => set({ factura: e.target.checked })} /> Con factura (+IVA 21%)
                        </label>
                      )}
                      {p.tipo === "comision" && s.factura && (
                        <input value={s.numero} onChange={(e) => set({ numero: e.target.value })} placeholder="N° de factura" className={inputCls + " col-span-2"} />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <Field label={sentido === "cobrar" ? "Otro ingreso sin aplicar (opcional)" : "Otro importe sin aplicar (opcional)"} hint="Por ejemplo, un anticipo. Queda en la cuenta sin cancelar nada.">
        <input name="extra" value={extra} onChange={(e) => setExtra(e.target.value)} inputMode="decimal" className={inputCls} />
      </Field>
      <Comunes hoy={hoy} medio={medio} />
      <Field label="Concepto"><input name="concepto" placeholder={sentido === "cobrar" ? "Cobro comisión, cobro venta…" : "Pago a productor…"} className={inputCls} /></Field>
      <p className="rounded-lg bg-fondo px-3 py-2 text-sm">
        Total {sentido === "cobrar" ? "que entra" : "que sale"}: <strong className="tabular-nums">{$(total)}</strong>
      </p>
    </ActionForm>
  );
}

function Gasto({ cuentaId, hoy, medio, categorias, terceros }: { cuentaId: string; hoy: string; medio: string; categorias: { id: string; nombre: string }[]; terceros: T[] }) {
  const [v, setV] = useState({ neto: "", iva: "", otros: "" });
  const total = num(v.neto) + num(v.iva) + num(v.otros);
  return (
    <ActionForm action={registrarGasto.bind(null, cuentaId)} submit={`Registrar gasto de ${$(total)}`}>
      <Field label="Categoría *">
        <select name="categoria_id" required defaultValue="" className={inputCls}>
          <option value="">—</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Field>
      <Field label="Qué se pagó *"><input name="descripcion" required className={inputCls} placeholder="Alquiler oficina noviembre, contador…" /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Neto *"><input name="importe_neto" value={v.neto} onChange={(e) => setV({ ...v, neto: e.target.value })} inputMode="decimal" className={inputCls} /></Field>
        <Field label="IVA"><input name="iva" value={v.iva} onChange={(e) => setV({ ...v, iva: e.target.value })} inputMode="decimal" className={inputCls} /></Field>
        <Field label="Otros imp."><input name="otros_impuestos" value={v.otros} onChange={(e) => setV({ ...v, otros: e.target.value })} inputMode="decimal" className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Proveedor">
          <select name="proveedor_id" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {terceros.map((t) => <option key={t.id} value={t.id}>{t.razon_social}</option>)}
          </select>
        </Field>
        <Field label="N° factura"><input name="numero_factura" className={inputCls} /></Field>
      </div>
      <Comunes hoy={hoy} medio={medio} />
    </ActionForm>
  );
}

const PESTANAS = [
  ["cobro", "Cobro"],
  ["pago", "Pago"],
  ["gasto", "Gasto"],
  ["otro", "Otro"],
  ["transferencia", "Transferencia"],
  ["arqueo", "Arqueo"],
  ["inicial", "Saldo inicial"],
] as const;

export function Formularios({
  cuentaId,
  esCaja,
  hoy,
  terceros,
  categorias,
  otrasCuentas,
  saldoActual,
  inicial = "cobro",
}: {
  cuentaId: string;
  esCaja: boolean;
  hoy: string;
  terceros: T[];
  categorias: { id: string; nombre: string }[];
  otrasCuentas: { id: string; nombre: string }[];
  saldoActual: number;
  inicial?: string;
}) {
  const [tab, setTab] = useState<string>(inicial);
  const medio = esCaja ? "efectivo" : "transferencia";
  const [contado, setContado] = useState("");
  const dif = contado ? num(contado) - saldoActual : 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1">
        {PESTANAS.filter(([v]) => v !== "arqueo" || esCaja).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setTab(v)} className={cx("rounded-lg px-3 py-1.5 text-sm", tab === v ? "bg-marca text-white" : "border border-borde bg-white hover:bg-fondo")}>
            {l}
          </button>
        ))}
      </div>

      {tab === "cobro" && <CobroPago key="c" sentido="cobrar" terceros={terceros} hoy={hoy} medio={medio} cuentaId={cuentaId} />}
      {tab === "pago" && <CobroPago key="p" sentido="pagar" terceros={terceros} hoy={hoy} medio={medio} cuentaId={cuentaId} />}
      {tab === "gasto" && <Gasto cuentaId={cuentaId} hoy={hoy} medio={medio} categorias={categorias} terceros={terceros} />}

      {tab === "otro" && (
        <ActionForm action={registrarOtro.bind(null, cuentaId)} submit="Registrar">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="signo" value="ingreso" defaultChecked /> Ingreso</label>
            <label className="flex items-center gap-2"><input type="radio" name="signo" value="egreso" /> Egreso</label>
          </div>
          <Field label="Importe *"><input name="importe" inputMode="decimal" required className={inputCls} /></Field>
          <Field label="Concepto *"><input name="concepto" required className={inputCls} placeholder="Aporte, retiro, comisión bancaria…" /></Field>
          <Field label="Tercero (opcional)">
            <select name="tercero_id" defaultValue="" className={inputCls}>
              <option value="">—</option>
              {terceros.map((t) => <option key={t.id} value={t.id}>{t.razon_social}</option>)}
            </select>
          </Field>
          <Comunes hoy={hoy} medio={medio} />
        </ActionForm>
      )}

      {tab === "transferencia" && (
        <ActionForm action={transferir.bind(null, cuentaId)} submit="Registrar transferencia">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="sentido" value="sale" defaultChecked /> Sale de esta cuenta</label>
            <label className="flex items-center gap-2"><input type="radio" name="sentido" value="entra" /> Entra a esta cuenta</label>
          </div>
          <Field label="La otra cuenta *">
            <select name="destino" required defaultValue={otrasCuentas[0]?.id ?? ""} className={inputCls}>
              {otrasCuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Importe *"><input name="importe" inputMode="decimal" required className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha"><input type="date" name="fecha" defaultValue={hoy} className={inputCls} /></Field>
            <Field label="Concepto"><input name="concepto" placeholder="Depósito de efectivo…" className={inputCls} /></Field>
          </div>
          <p className="text-xs text-texto-2">No es ingreso ni gasto: la plata solo cambia de lugar.</p>
        </ActionForm>
      )}

      {tab === "arqueo" && esCaja && (
        <ActionForm action={arqueo.bind(null, cuentaId)} submit="Registrar arqueo">
          <p className="text-sm">Según el sistema hay <strong className="tabular-nums">{$(saldoActual)}</strong> en caja.</p>
          <Field label="¿Cuánto contaste? *"><input name="contado" value={contado} onChange={(e) => setContado(e.target.value)} inputMode="decimal" required className={inputCls} /></Field>
          {contado && (
            <p className={cx("rounded-lg px-3 py-2 text-sm", Math.abs(dif) < 0.01 ? "bg-ok/10 text-ok" : "bg-vencido/10 text-vencido")}>
              {Math.abs(dif) < 0.01 ? "✓ Coincide" : dif > 0 ? `Sobran ${$(dif)}` : `Faltan ${$(-dif)}`}
            </p>
          )}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ajustar" /> Ajustar la caja a lo contado (registra la diferencia como movimiento)</label>
          <Field label="Observaciones"><input name="observaciones" className={inputCls} /></Field>
          <input type="hidden" name="fecha" value={hoy} />
        </ActionForm>
      )}

      {tab === "inicial" && (
        <ActionForm action={saldoInicial.bind(null, cuentaId)} submit="Guardar saldo inicial" resetOnSuccess={false}>
          <p className="text-sm text-texto-2">El saldo con el que arranca la cuenta en el sistema. Todo lo que registres después se suma o resta a este número.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Saldo *"><input name="importe" inputMode="decimal" required className={inputCls} /></Field>
            <Field label="Al día"><input type="date" name="fecha" defaultValue={hoy} className={inputCls} /></Field>
          </div>
        </ActionForm>
      )}
    </div>
  );
}
