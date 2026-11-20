import React from "react";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  tone?: "navy" | "emerald" | "crimson" | "amber" | "sky";
  badge?: string;
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<KpiCardProps["tone"]>, { iconBg: string; iconText: string; badge: string }> = {
  navy: {
    iconBg: "bg-navy-900/10",
    iconText: "text-navy-900",
    badge: "bg-slate-100 text-slate-700",
  },
  emerald: {
    iconBg: "bg-emerald-500/15",
    iconText: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  crimson: {
    iconBg: "bg-crimson-500/15",
    iconText: "text-crimson-600",
    badge: "bg-red-50 text-crimson-600 border border-red-200",
  },
  amber: {
    iconBg: "bg-amber-500/15",
    iconText: "text-amber-600",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  sky: {
    iconBg: "bg-sky-500/15",
    iconText: "text-sky-600",
    badge: "bg-sky-50 text-sky-700 border border-sky-200",
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "navy",
  badge,
  className = "",
}) => {
  const cls = TONE_CLASSES[tone];
  return (
    <div className={`group relative rounded-xl border border-slate-200/90 bg-white p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-elevated ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-navy-900 tabular-nums">
            {value}
          </p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cls.iconBg} ${cls.iconText}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {(subtitle || badge) && (
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
          {subtitle && <span className="text-xs text-slate-500 truncate">{subtitle}</span>}
          {badge && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls.badge}`}>
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
