"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-12 rounded-lg border border-[#f5f2eb]/12 bg-[#f5f2eb]/[0.04] px-4 text-[#f5f2eb] shadow-none placeholder:text-[#f5f2eb]/30 focus-visible:border-[#ff7a45]/50 focus-visible:ring-2 focus-visible:ring-[#ff7a45]/25";

interface AuthFieldProps {
  id: string;
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  title?: string;
  hint?: string;
  disabled?: boolean;
  onChange?: ComponentProps<"input">["onChange"];
}

export function AuthField({
  id,
  label,
  hint,
  type = "text",
  ...inputProps
}: AuthFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && visible ? "text" : type;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-[#f5f2eb]/80">
        {label}
      </Label>
      <div className={cn(isPassword && "relative")}>
        <input
          id={id}
          type={inputType}
          className={cn(
            "flex w-full text-sm transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            fieldClass,
            isPassword && "pr-12"
          )}
          {...inputProps}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#f5f2eb]/45 transition-colors hover:text-[#f5f2eb]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a45]/40"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-[#f5f2eb]/40">{hint}</p> : null}
    </div>
  );
}
