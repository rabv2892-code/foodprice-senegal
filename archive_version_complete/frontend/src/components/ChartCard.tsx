import React from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  rightSlot,
  children,
  className = "",
}) => {
  return (
    <section
      className={`flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-card animate-fade-up ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-navy-900 tracking-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
};
