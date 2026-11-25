"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { btn, cx } from "@/components/ui";
import type { Resultado } from "@/lib/acciones";

type Accion = (prev: Resultado, formData: FormData) => Promise<Resultado>;

/** Formulario que llama a una acción del servidor y muestra el resultado. */
export function ActionForm({
  action,
  children,
  submit = "Guardar",
  className,
  resetOnSuccess = true,
  variant = "primary",
  confirm,
}: {
  action: Accion;
  children?: ReactNode;
  submit?: string;
  className?: string;
  resetOnSuccess?: boolean;
  variant?: "primary" | "secondary" | "danger";
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={cx("space-y-4", className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state.error && (
        <p role="alert" className="rounded-lg border border-vencido/30 bg-vencido/5 px-3 py-2 text-sm text-vencido">
          {state.error}
        </p>
      )}
      {state.ok && <p className="rounded-lg border border-ok/30 bg-ok/5 px-3 py-2 text-sm text-ok">{state.ok}</p>}
      <SubmitButton label={submit} variant={variant} />
    </form>
  );
}

function SubmitButton({ label, variant }: { label: string; variant: "primary" | "secondary" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btn(variant)}>
      {pending ? "Guardando…" : label}
    </button>
  );
}
