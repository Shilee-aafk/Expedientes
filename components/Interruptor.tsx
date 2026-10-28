"use client";

type Props = {
  name?: string;
  label: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (activo: boolean) => void;
  /** Guarda el formulario contenedor al cambiar. */
  enviarAlCambiar?: boolean;
  disabled?: boolean;
};

/** Botón "activar": se presiona sobre el texto; gris apagado, dorado encendido. */
export function Interruptor({ name, label, checked, defaultChecked, onChange, enviarAlCambiar, disabled }: Props) {
  return (
    <label className="boton-activar">
      <input
        type="checkbox"
        role="switch"
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          onChange?.(e.target.checked);
          if (enviarAlCambiar) e.target.form?.requestSubmit();
        }}
      />
      {label}
    </label>
  );
}
