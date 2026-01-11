import React from "react";
export function AccordionSection({ title, subtitle, open, onToggle, children, right }:{
  title: string; subtitle?: string; open: boolean; onToggle: () => void; children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div className="glass-panel p-4">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between">
        <div className="text-left">
          <div className="text-base font-semibold">{title}</div>
          {subtitle ? <div className="text-xs opacity-70 mt-1">{subtitle}</div> : null}
        </div>
        <div className="flex items-center gap-2">{right}<span className="text-xl">{open ? "▾" : "▸"}</span></div>
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
