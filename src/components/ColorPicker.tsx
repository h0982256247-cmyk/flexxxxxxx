import React, { useMemo } from "react";
import { PALETTE } from "@/lib/templates";
import { autoTextColor, isHexColor } from "@/lib/utils";

export default function ColorPicker({ label, value, onChange, allowCustom=true }:{
  label: string; value: string; onChange: (v: string) => void; allowCustom?: boolean;
}) {
  const palette = useMemo(() => PALETTE, []);
  return (
    <div>
      <div className="glass-label mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {palette.map((c) => (
          <button key={c} type="button" className="h-9 w-9 rounded-full border border-white/30" style={{ background: c }} onClick={() => onChange(c)} title={c} />
        ))}
        {allowCustom ? (
          <label className="glass-btn glass-btn--secondary px-3 py-2 text-sm">
            自訂
            <input className="ml-2" type="color" value={isHexColor(value) ? value : "#0A84FF"} onChange={(e) => onChange(e.target.value.toUpperCase())} />
          </label>
        ) : null}
      </div>
      <div className="mt-2 text-xs opacity-70">目前：{value}</div>
    </div>
  );
}

export function AutoTextColorHint({ bgColor, textColor }:{ bgColor: string; textColor: string }) {
  const auto = autoTextColor(bgColor);
  const ok = auto.toLowerCase() === textColor.toLowerCase();
  return <div className="mt-2 text-xs opacity-70">建議文字色：{auto} {ok ? "（已最佳化）" : "（可按「自動」修正）"}</div>;
}
