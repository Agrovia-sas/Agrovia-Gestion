"use client";

import { btn } from "@/components/ui";

export function BotonImprimir({ label = "Imprimir / PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={btn("secondary") + " print:hidden"}>
      {label}
    </button>
  );
}
