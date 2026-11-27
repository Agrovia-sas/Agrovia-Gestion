"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const CLAVE = "agrovia_ultima_actividad";
const PAUSA_MS = 20 * 60 * 1000; // después de 20 minutos sin usarlo, se vuelve a abrir en el panel

/**
 * Al abrir el sistema de nuevo (el navegador suele recuperar la última pestaña),
 * empieza siempre en el Panel general. Mientras se usa, no interfiere.
 */
export function InicioEnPanel() {
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    let ultima = 0;
    try {
      ultima = Number(localStorage.getItem(CLAVE) ?? 0);
    } catch {}
    const vieneDeAdentro = document.referrer.startsWith(location.origin);
    if (path !== "/" && !vieneDeAdentro && Date.now() - ultima > PAUSA_MS) {
      router.replace("/");
    }
    const marcar = () => {
      try {
        localStorage.setItem(CLAVE, String(Date.now()));
      } catch {}
    };
    marcar();
    const intervalo = setInterval(() => document.visibilityState === "visible" && marcar(), 60_000);
    document.addEventListener("visibilitychange", marcar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", marcar);
    };
    // Solo al cargar la aplicación: la navegación interna no vuelve a evaluar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, String(Date.now()));
    } catch {}
  }, [path]);

  return null;
}
