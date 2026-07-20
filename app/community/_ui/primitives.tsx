import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { DynamicIcon } from "@/lib/community/icon";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-5 py-2.5 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm",
    secondary: "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50",
    ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
    danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
  };
  return <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement> & { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "emerald" | "amber" }) {
  const tones: Record<string, string> = {
    neutral: "bg-zinc-100 text-zinc-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-8 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white">
        <DynamicIcon name={icon} size={24} />
      </div>
      <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-zinc-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function IconTile({ icon, tone = "zinc" }: { icon: string; tone?: "zinc" | "emerald" }) {
  const tones: Record<string, string> = {
    zinc: "bg-zinc-100 text-zinc-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
      <DynamicIcon name={icon} size={18} />
    </div>
  );
}
