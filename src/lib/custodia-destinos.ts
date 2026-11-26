import type { createClient } from "@/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof createClient>>;

export type Destino = {
  key: string;
  duenoId: string;
  operacionId: string | null;
  numero: string | null;
  fecha: string | null;
  a: string;
  bolsas: number;
  cargadas: number;
  lugarId: string | null;
  manual: boolean;
};

/** A quién se vendieron o entregaron las bolsas en custodia (operaciones en custodia + entregas manuales). */
export async function destinosCustodia(supabase: Supa, duenoId?: string): Promise<Destino[]> {
  let qOps = supabase
    .from("operaciones")
    .select("id, numero, fecha_cierre, vendedor_id, bolsas_negociadas, bolsas_ajustes, bolsas_cargadas, ingenio_id, deposito_id, comprador:terceros!operaciones_comprador_id_fkey(razon_social)")
    .eq("bolsas_en_custodia", true)
    .eq("estado_comercial", "cerrada")
    .order("fecha_cierre");
  let qMan = supabase
    .from("custodia_movimientos")
    .select("id, fecha, dueno_id, bolsas, desde_ingenio_id, desde_deposito_id, destinatario:terceros!custodia_movimientos_destinatario_id_fkey(razon_social)")
    .eq("tipo", "entrega")
    .is("operacion_id", null)
    .order("fecha");
  if (duenoId) {
    qOps = qOps.eq("vendedor_id", duenoId);
    qMan = qMan.eq("dueno_id", duenoId);
  }
  const [{ data: ops }, { data: man }] = await Promise.all([qOps, qMan]);
  return [
    ...(ops ?? []).map((o) => ({
      key: o.id,
      duenoId: o.vendedor_id,
      operacionId: o.id,
      numero: o.numero,
      fecha: o.fecha_cierre,
      a: (o.comprador as { razon_social: string } | null)?.razon_social ?? "sin comprador",
      bolsas: o.bolsas_negociadas + o.bolsas_ajustes,
      cargadas: o.bolsas_cargadas,
      lugarId: o.ingenio_id ?? o.deposito_id,
      manual: false,
    })),
    ...(man ?? []).map((m) => ({
      key: m.id,
      duenoId: m.dueno_id,
      operacionId: null,
      numero: null,
      fecha: m.fecha,
      a: (m.destinatario as { razon_social: string } | null)?.razon_social ?? "sin indicar",
      bolsas: m.bolsas,
      cargadas: m.bolsas,
      lugarId: m.desde_ingenio_id ?? m.desde_deposito_id,
      manual: true,
    })),
  ].sort((x, y) => (x.fecha ?? "").localeCompare(y.fecha ?? ""));
}
