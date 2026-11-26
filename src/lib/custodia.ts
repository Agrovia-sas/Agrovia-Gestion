export const TIPO_CUSTODIA: Record<string, string> = {
  ingreso: "Ingreso",
  traslado: "Traslado",
  entrega: "Entrega",
  reposicion: "Reposición",
  pago_plata: "Pago en plata",
  retiro: "Retiro del dueño",
};

/** Efecto de un movimiento sobre las bolsas físicas y sobre lo que se le debe al dueño. */
export function efectoCustodia(tipo: string, bolsas: number) {
  return {
    fisicas: tipo === "ingreso" || tipo === "reposicion" ? bolsas : tipo === "entrega" || tipo === "retiro" ? -bolsas : 0,
    deuda: tipo === "entrega" ? bolsas : tipo === "reposicion" || tipo === "pago_plata" ? -bolsas : 0,
  };
}
