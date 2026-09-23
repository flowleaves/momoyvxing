/**
 * 软萌原子组件
 *
 * 刻意不用 antd —— 那套视觉是企业风，跟「软萌」是反方向。
 * 全部走 CSS 变量 token，换皮肤时自动跟随。
 *
 * 注意按钮文字用 --ink 而不是白色：马卡龙色的明度都偏高，
 * 白字对比度普遍不到 3:1，深色文字才够 AA。
 */

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------- Button

type ButtonVariant = "primary" | "soft" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-ink hover:brightness-105 active:brightness-95",
  soft: "bg-brand-soft text-ink hover:brightness-[0.98]",
  ghost: "bg-transparent text-ink-soft hover:bg-brand-soft/60",
  danger: "bg-red-100 text-red-800 hover:bg-red-200",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-sm",
  md: "px-4 py-2 text-sm rounded-md",
  lg: "px-6 py-3 text-base rounded-md",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium",
        "transition-[filter,background-color] duration-150 select-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
    >
      {loading && (
        <span
          aria-hidden
          className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      )}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- Input

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className, id, ...rest }: InputProps) {
  const inputId = id || rest.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label && (
        <span className="mb-1.5 block text-sm text-ink-soft">{label}</span>
      )}
      <input
        {...rest}
        id={inputId}
        className={cn(
          "w-full rounded-md border bg-card px-3.5 py-2.5 text-sm text-ink",
          "placeholder:text-ink-soft/50",
          "transition-colors duration-150",
          error ? "border-red-300" : "border-line focus:border-brand",
          className,
        )}
      />
      {error ? (
        <span className="mt-1.5 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-ink-soft">{hint}</span>
      ) : null}
    </label>
  );
}

// ---------------------------------------------------------------- Textarea

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...rest }: TextareaProps) {
  const areaId = id || rest.name;
  return (
    <label className="block" htmlFor={areaId}>
      {label && (
        <span className="mb-1.5 block text-sm text-ink-soft">{label}</span>
      )}
      <textarea
        {...rest}
        id={areaId}
        className={cn(
          "w-full rounded-md border bg-card px-3.5 py-2.5 text-sm text-ink",
          "placeholder:text-ink-soft/50 resize-y",
          error ? "border-red-300" : "border-line focus:border-brand",
          className,
        )}
      />
      {error && (
        <span className="mt-1.5 block text-xs text-red-600">{error}</span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------- Card

export function Card({
  children,
  className,
  tape = false,
}: {
  children: ReactNode;
  className?: string;
  /** 卡片角上的纸胶带装饰 */
  tape?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-lg border border-line bg-card shadow-soft",
        className,
      )}
    >
      {tape && <span className="paper-tape -top-2 left-6 -rotate-3" />}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Badge

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5",
        "text-xs text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- EmptyState

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && <div className="text-3xl opacity-70">{icon}</div>}
      <p className="font-round text-base text-ink">{title}</p>
      {description && (
        <p className="max-w-xs text-sm text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Alert

export function Alert({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "rounded-sm px-3.5 py-2.5 text-sm",
        tone === "error"
          ? "bg-red-50 text-red-700"
          : "bg-brand-soft text-ink",
      )}
    >
      {children}
    </div>
  );
}
