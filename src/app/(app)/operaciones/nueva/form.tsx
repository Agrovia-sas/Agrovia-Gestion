"use client";

import { useState } from "react";
import { Field, inputCls } from "@/components/ui";
import { $ } from "@/lib/format";

type T = { id: string; razon_social: string };
type Opcion = { value: string; label: string };

function num(s: string) {
  const t = s.trim();
  if (!t) return 0;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : 0;
}

function Terceros({ name, principales, todos, etiqueta, requerido }: { name: string; principales: T[]; todos: T[]; etiqueta: string; requerido?: boolean }) {
  const ids = new Set(principales.map((p) => p.id));
  return (
    <select name={name} required={requerido} defaultValue="" className={inputCls}>
      <option value="">—</option>
      {principales.length > 0 && (
        <optgroup label={etiqueta}>
          {principales.map((t) => <option key={t.id} value={t.id}>{t.razon_social}</option>)}
        </optgroup>
      )}
      <optgroup label="Otros terceros">
        {todos.filter((t) => !ids.has(t.id)).map((t) => <option key={t.id} value={t.id}>{t.razon_social}</option>)}
      </optgroup>
    </select>
  );
}

export function CamposOperacion({
  hoy,
  c,
  modalidadInicial = "facturado",
}: {
  hoy: string;
  modalidadInicial?: string;
  c: {
    terceros: T[];
    productores: T[];
    compradores: T[];
    comisionistas: T[];
    marcas: { id: string; nombre: string }[];
    productos: { id: string; nombre: string }[];
    ubicaciones: Opcion[];
  };
}) {
  const [modalidad, setModalidad] = useState(modalidadInicial);
  const [v, setV] = useState({ bolsas: "", compra: "", venta: "", flete: "", iibb: "", dyc: "", otros: "", tipo: "diferencia", valor: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  const b = num(v.bolsas);
  const costos = num(v.flete) + num(v.iibb) + num(v.dyc) + num(v.otros);
  const porBolsa = num(v.venta) - num(v.compra) - costos;
  const comision =
    v.tipo === "diferencia" ? porBolsa * b
    : v.tipo === "por_bolsa" ? num(v.valor) * b
    : v.tipo === "fija" ? num(v.valor)
    : (num(v.venta) * num(v.valor) * b) / 100;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Modalidad *">
          <select name="modalidad" value={modalidad} onChange={(e) => setModalidad(e.target.value)} className={inputCls}>
            <option value="facturado">Facturado (1-xx) — intermediación</option>
            <option value="menudeo">Menudeo (2-xx) — efectivo sin factura</option>
            <option value="compraventa">Compra-venta (A-x) — con factura</option>
          </select>
        </Field>
        <Field label="Fecha de cierre *">
          <input type="date" name="fecha_cierre" defaultValue={hoy} required className={inputCls} />
        </Field>
        <Field label="Zafra">
          <input name="zafra" inputMode="numeric" defaultValue={hoy.slice(0, 4)} className={inputCls} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Vendedor *">
          <Terceros name="vendedor_id" principales={c.productores} todos={c.terceros} etiqueta="Productores" requerido />
        </Field>
        <Field label={modalidad === "facturado" ? "Comprador *" : "Comprador"} hint={modalidad !== "facturado" ? "Vacío si todavía no se vendió" : undefined}>
          <Terceros name="comprador_id" principales={c.compradores} todos={c.terceros} etiqueta="Clientes" requerido={modalidad === "facturado"} />
        </Field>
        <Field label="Comisionista" hint="Si la comisión se reparte (50% por defecto)">
          <Terceros name="comisionista_id" principales={c.comisionistas} todos={c.terceros} etiqueta="Comisionistas" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Marca (ingenio de origen)">
          <select name="marca_id" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {c.marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </Field>
        <Field label="Dónde está la mercadería">
          <select name="ubicacion" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {c.ubicaciones.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </Field>
        <Field label="Producto">
          <select name="producto_id" defaultValue={c.productos[0]?.id ?? ""} className={inputCls}>
            {c.productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Bolsas negociadas *">
          <input name="bolsas_negociadas" inputMode="numeric" required value={v.bolsas} onChange={set("bolsas")} className={inputCls} />
        </Field>
        <Field label="Kg por bolsa">
          <input name="kg_por_bolsa" inputMode="decimal" defaultValue="50" className={inputCls} />
        </Field>
        <Field label="Precio compra por bolsa *">
          <input name="precio_compra" inputMode="decimal" required value={v.compra} onChange={set("compra")} className={inputCls} />
        </Field>
        <Field label={modalidad === "facturado" ? "Precio venta por bolsa *" : "Precio venta por bolsa"}>
          <input name="precio_venta" inputMode="decimal" required={modalidad === "facturado"} value={v.venta} onChange={set("venta")} className={inputCls} />
        </Field>
      </div>

      {modalidad !== "facturado" && (
        <label className="flex items-start gap-2 rounded-lg border border-borde bg-fondo p-3 text-sm">
          <input type="checkbox" name="bolsas_en_custodia" className="mt-0.5" />
          <span>
            <strong>Las bolsas son del vendedor, en custodia</strong>
            <span className="block text-xs text-texto-2">
              Son bolsas que te dejó guardadas y usás para esta venta: cada carga se descuenta de lo que tenés de él y queda como bolsas a reponerle.
              No se genera deuda en pesos con el vendedor.
            </span>
          </span>
        </label>
      )}

      {modalidad === "compraventa" && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="precios_incluyen_iva" /> Los precios ya incluyen IVA (si no, se suma 21% en el LP y la factura)
          </label>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Flete por bolsa"><input name="costo_flete" inputMode="decimal" value={v.flete} onChange={set("flete")} className={inputCls} /></Field>
            <Field label="IIBB por bolsa"><input name="costo_iibb" inputMode="decimal" value={v.iibb} onChange={set("iibb")} className={inputCls} /></Field>
            <Field label="DyC por bolsa"><input name="costo_dyc" inputMode="decimal" value={v.dyc} onChange={set("dyc")} className={inputCls} /></Field>
            <Field label="Paletizado / otros por bolsa"><input name="costo_otros" inputMode="decimal" value={v.otros} onChange={set("otros")} className={inputCls} /></Field>
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={modalidad === "facturado" ? "Comisión" : "Utilidad"}>
          <select name="comision_tipo" value={v.tipo} onChange={set("tipo")} className={inputCls}>
            <option value="diferencia">Diferencia (venta − compra{modalidad === "compraventa" ? " − costos" : ""})</option>
            <option value="por_bolsa">Monto por bolsa</option>
            <option value="fija">Monto fijo</option>
            <option value="porcentaje">% del precio de venta</option>
          </select>
        </Field>
        {v.tipo !== "diferencia" && (
          <Field label={v.tipo === "porcentaje" ? "Porcentaje" : v.tipo === "fija" ? "Monto total" : "Monto por bolsa"}>
            <input name="comision_valor" inputMode="decimal" required value={v.valor} onChange={set("valor")} className={inputCls} />
          </Field>
        )}
        <div className="rounded-lg bg-fondo p-3">
          <p className="text-xs text-texto-2">{modalidad === "facturado" ? "Comisión estimada (neta de IVA)" : "Utilidad estimada"}</p>
          <p className="text-xl font-semibold tabular-nums">{$(comision)}</p>
          {v.tipo === "diferencia" && b > 0 && <p className="text-xs text-texto-2 tabular-nums">{$(porBolsa)} × {b.toLocaleString("es-AR")} bolsas</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Condiciones de pago">
          <input name="condiciones_pago" className={inputCls} placeholder="Ej.: eCheq a 30 días" />
        </Field>
        <Field label="Observaciones">
          <input name="observaciones" className={inputCls} />
        </Field>
      </div>
    </>
  );
}
