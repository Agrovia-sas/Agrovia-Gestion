import { ActionForm } from "@/components/action-form";
import { Field, inputCls } from "@/components/ui";
import { Logo } from "@/components/logo";
import { ingresar } from "./actions";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-marca px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center gap-2 text-marca">
          <Logo className="h-10 w-10" />
          <p className="text-xl font-semibold tracking-wide">AGROVIA</p>
          <p className="text-sm text-texto-2">Sistema de gestión</p>
        </div>
        <ActionForm action={ingresar} submit="Ingresar" resetOnSuccess={false}>
          <Field label="Email">
            <input name="email" type="email" autoComplete="email" required className={inputCls} />
          </Field>
          <Field label="Contraseña">
            <input name="password" type="password" autoComplete="current-password" required className={inputCls} />
          </Field>
        </ActionForm>
      </div>
    </main>
  );
}
