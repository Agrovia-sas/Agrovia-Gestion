import Link from "next/link";
import type { ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-texto-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, actions }: { children: ReactNode; className?: string; title?: string; actions?: ReactNode }) {
  return (
    <section className={cx("rounded-xl border border-borde bg-white", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-borde px-5 py-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, href, tone = "neutral" }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "neutral" | "ok" | "pendiente" | "vencido" | "proceso" }) {
  const bar = { neutral: "bg-marca", ok: "bg-ok", pendiente: "bg-pendiente", vencido: "bg-vencido", proceso: "bg-proceso" }[tone];
  const inner = (
    <div className="relative h-full overflow-hidden rounded-xl border border-borde bg-white p-5 transition hover:border-marca-medio">
      <span className={cx("absolute inset-y-0 left-0 w-1", bar)} />
      <p className="text-sm text-texto-2">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-texto-2">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

const tonos = {
  ok: "bg-ok/10 text-ok ring-ok/30",
  pendiente: "bg-pendiente/10 text-[#9a7210] ring-pendiente/40",
  vencido: "bg-vencido/10 text-vencido ring-vencido/30",
  proceso: "bg-proceso/10 text-proceso ring-proceso/30",
  neutral: "bg-fondo text-texto-2 ring-borde",
};
export type Tono = keyof typeof tonos;

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tono }) {
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tonos[tone])}>{children}</span>;
}

export function tonoLogistico(e: string): Tono {
  return e === "carga_completada" ? "ok" : e === "carga_parcial" ? "proceso" : "pendiente";
}
export function tonoComision(e: string): Tono {
  return e === "cobrada" ? "ok" : e === "pendiente_cobro" ? "pendiente" : e === "anulada" || e === "sin_comision" ? "neutral" : "proceso";
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((100 * value) / max)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-fondo ring-1 ring-borde">
      <div className={cx("h-full rounded-full", pct >= 100 ? "bg-ok" : "bg-proceso")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link href={href} className={btn(variant)}>
      {children}
    </Link>
  );
}

export function btn(variant: "primary" | "secondary" | "danger" = "primary") {
  return cx(
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50",
    variant === "primary" && "bg-marca text-white hover:bg-marca-medio",
    variant === "secondary" && "border border-borde bg-white text-texto hover:bg-fondo",
    variant === "danger" && "border border-vencido/40 bg-white text-vencido hover:bg-vencido/5",
  );
}

export const inputCls =
  "w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-medio focus:ring-2 focus:ring-marca-medio/20";

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-texto-2">{hint}</span>}
    </label>
  );
}

export function Table({ head, children, empty }: { head: ReactNode; children: ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-borde text-left text-xs uppercase tracking-wide text-texto-2">{head}</thead>
        <tbody className="divide-y divide-borde">{children}</tbody>
      </table>
      {empty && <p className="py-8 text-center text-sm text-texto-2">{empty}</p>}
    </div>
  );
}

export const th = "px-3 py-2 font-medium";
export const td = "px-3 py-2.5";

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-texto-2">{children}</p>;
}

/** Estado de carga: cuánto está cargado y cuánto falta, por separado. */
export function EstadoCarga({ cargadas, totales }: { cargadas: number | null; totales: number | null }) {
  const c = cargadas ?? 0;
  const t = totales ?? 0;
  const faltan = Math.max(0, t - c);
  const fmt = (n: number) => n.toLocaleString("es-AR");
  if (t > 0 && faltan === 0) {
    return (
      <div className="min-w-36">
        <ProgressBar value={c} max={t} />
        <p className="mt-1 text-xs font-medium text-ok">✓ Cargadas {fmt(c)} (completa)</p>
      </div>
    );
  }
  return (
    <div className="min-w-36">
      <ProgressBar value={c} max={t} />
      <p className="mt-1 flex flex-wrap gap-x-2 text-xs tabular-nums">
        <span className="text-ok">Cargadas {fmt(c)}</span>
        <span className="font-medium text-[#9a7210]">Pendientes {fmt(faltan)}</span>
      </p>
    </div>
  );
}
