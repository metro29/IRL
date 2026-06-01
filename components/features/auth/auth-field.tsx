import type { ComponentProps } from "react";
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
  onChange?: ComponentProps<"input">["onChange"];
}

export function AuthField({
  id,
  label,
  hint,
  ...inputProps
}: AuthFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-[#f5f2eb]/80">
        {label}
      </Label>
      <input
        id={id}
        className={cn(
          "flex w-full text-sm transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          fieldClass
        )}
        {...inputProps}
      />
      {hint ? (
        <p className="text-xs text-[#f5f2eb]/40">{hint}</p>
      ) : null}
    </div>
  );
}
