import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";

import { fieldClass, FieldLabel } from "./AuthLayout";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function PasswordField({ label, id, ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <div className="relative">
        <input id={fieldId} {...props} type={visible ? "text" : "password"} className={`${fieldClass} pr-12`} />
        <button
          type="button"
          className="absolute inset-y-0 right-2 my-auto grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white hover:text-ink"
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
        </button>
      </div>
    </div>
  );
}

export const PASSWORD_RULES = [
  "At least 8 characters.",
  "Not a commonly used password.",
  "Not made only of numbers.",
  "Not too similar to your name or email.",
];
