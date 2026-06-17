import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/25 hover:bg-[var(--color-primary-dark)] focus-visible:ring-[var(--color-primary)]",
  secondary:
    "bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)] shadow-sm hover:bg-[var(--color-surface-strong)] focus-visible:ring-[var(--color-primary)]",
  outline:
    "border-2 border-[var(--color-primary)] bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 focus-visible:ring-[var(--color-primary)]",
  ghost:
    "text-[var(--color-text-soft)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)] focus-visible:ring-[var(--color-primary)]",
  danger:
    "bg-[var(--color-accent)] text-white shadow-md shadow-[var(--color-accent)]/25 hover:bg-[var(--color-accent-dark)] focus-visible:ring-[var(--color-accent)]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-11 gap-2 rounded-xl px-5 text-sm",
  icon: "h-10 w-10 rounded-xl p-0",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button(
  { variant = "primary", size = "md", className = "", children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
