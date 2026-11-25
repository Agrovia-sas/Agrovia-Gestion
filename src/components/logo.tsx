/** Marca provisoria: una hoja estilizada. Se reemplaza por el logo real desde Configuración. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="currentColor" opacity="0.12" />
      <path d="M9 22c0-8 6-13 14-13 0 8-5 14-13 14l-1-1Z" fill="currentColor" />
      <path d="M10 22c3-4 6-7 10-9" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
