import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function matchStep(pathname: string): "drafts" | "edit" | "preview" {
  if (pathname.startsWith("/drafts/") && pathname.endsWith("/preview")) return "preview";
  if (pathname.startsWith("/drafts/") && pathname.includes("/edit")) return "edit";
  return "drafts";
}

export default function ProgressBar({ docId }: { docId?: string }) {
  const loc = useLocation();
  const nav = useNavigate();
  const current = matchStep(loc.pathname);

  const go = (key: string) => {
    if (key === "drafts") nav("/drafts");
    if (key === "edit" && docId) nav(`/drafts/${docId}/edit`);
    if (key === "preview" && docId) nav(`/drafts/${docId}/preview`);
  };

  const pill = (key: string, label: string) => {
    const isCurrent = current === key;
    const done = (current === "edit" && key === "drafts") || (current === "preview" && (key === "drafts" || key === "edit"));
    return (
      <button key={key} className={`glass-btn ${isCurrent ? "" : "glass-btn--secondary"} text-sm px-4 py-2`} onClick={() => go(key)} type="button">
        <span>{done ? "✓" : ""}</span><span>{label}</span>
      </button>
    );
  };

  return (
    <div className="sticky top-0 z-20">
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div className="glass-panel p-3 flex gap-2 justify-center">
          {pill("drafts","草稿")}
          {pill("edit","編輯")}
          {pill("preview","預覽")}
        </div>
      </div>
    </div>
  );
}
