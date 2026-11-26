"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "@/components/ui";
import { Logo } from "@/components/logo";

type Item = { href: string; label: string; icon: string; pronto?: boolean };

const GRUPOS: { titulo: string; items: Item[] }[] = [
  {
    titulo: "Comercial",
    items: [
      { href: "/", label: "Panel general", icon: "▦" },
      { href: "/operaciones", label: "Operaciones", icon: "⇄" },
      { href: "/terceros?rol=comprador", label: "Clientes", icon: "◉" },
      { href: "/terceros?rol=productor", label: "Productores y proveedores", icon: "◎" },
      { href: "/cargas", label: "Stock y cargas", icon: "▤" },
      { href: "/custodia", label: "Bolsas en custodia", icon: "⌂" },
      { href: "/comisiones", label: "Comisiones", icon: "%" },
      { href: "/comisiones/pendientes", label: "Comisiones pendientes", icon: "!" },
      { href: "/pronto/reposiciones", label: "Reposiciones", icon: "↺", pronto: true },
      { href: "/pronto/rentabilidad", label: "Rentabilidad", icon: "↗", pronto: true },
    ],
  },
  {
    titulo: "Finanzas",
    items: [
      { href: "/pronto/cuentas-corrientes", label: "Cuentas corrientes", icon: "≡", pronto: true },
      { href: "/tesoreria/galicia", label: "Banco Galicia", icon: "$" },
      { href: "/tesoreria/caja", label: "Caja y efectivo", icon: "¤" },
      { href: "/pronto/echeqs", label: "Gestión de eCheqs", icon: "✎", pronto: true },
      { href: "/pronto/calendario", label: "Calendario", icon: "▣", pronto: true },
    ],
  },
  {
    titulo: "Sistema",
    items: [
      { href: "/configuracion", label: "Configuración", icon: "⚙" },
    ],
  },
];

export function Sidebar() {
  const path = usePathname();
  const [abierto, setAbierto] = useState(false);

  const activo = (href: string) => {
    const base = href.split("?")[0];
    if (base === "/") return path === "/";
    if (base === "/comisiones") return path === "/comisiones";
    return path.startsWith(base);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="fixed left-3 top-3 z-40 rounded-lg bg-marca px-3 py-2 text-white md:hidden print:hidden"
        aria-label="Abrir menú"
      >
        ☰
      </button>
      {abierto && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setAbierto(false)} />}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-marca text-white transition-transform md:translate-x-0 print:hidden",
          abierto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <Logo className="h-8 w-8 text-white" />
          <span className="text-lg font-semibold tracking-wide">AGROVIA</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {GRUPOS.map((g) => (
            <div key={g.titulo} className="mt-4">
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-white/50">{g.titulo}</p>
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setAbierto(false)}
                  className={cx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                    activo(it.href) ? "bg-white/15 font-medium" : "text-white/80 hover:bg-white/10",
                    it.pronto && "text-white/45",
                  )}
                >
                  <span className="w-4 text-center opacity-80">{it.icon}</span>
                  <span className="flex-1">{it.label}</span>
                  {it.pronto && <span className="rounded bg-white/10 px-1.5 text-[10px]">pronto</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
