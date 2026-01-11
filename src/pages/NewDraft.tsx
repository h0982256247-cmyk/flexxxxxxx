import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createDoc } from "@/lib/db";
import { seedBubble, seedCarousel } from "@/lib/templates";

export default function NewDraft() {
  const nav = useNavigate();
  const [type, setType] = useState<"bubble"|"carousel">("bubble");
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      if (!u.data.user) nav("/login");
    })();
  }, [nav]);

  const create = async () => {
    setLoading(true);
    try {
      const doc = type === "bubble" ? seedBubble() : seedCarousel(count);
      const id = await createDoc(doc as any);
      nav(`/drafts/${id}/edit`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-bg">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="glass-panel p-6">
          <div className="text-xl font-semibold">選擇範本</div>
          <div className="mt-2 text-sm opacity-70">範本內含預設資料，建立後可立即預覽。</div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <button className={`glass-panel p-4 text-left ${type==="bubble" ? "ring-2 ring-blue-500/40" : ""}`} onClick={() => setType("bubble")}>
              <div className="font-semibold">Bubble</div>
              <div className="text-sm opacity-70 mt-1">單張卡片</div>
            </button>
            <button className={`glass-panel p-4 text-left ${type==="carousel" ? "ring-2 ring-blue-500/40" : ""}`} onClick={() => setType("carousel")}>
              <div className="font-semibold">Carousel</div>
              <div className="text-sm opacity-70 mt-1">多張卡片（最多 5 張）</div>
            </button>
          </div>

          {type === "carousel" ? (
            <div className="mt-6">
              <div className="glass-label mb-2">預設張數（1~5）</div>
              <select className="glass-input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} 張</option>)}
              </select>
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button className="glass-btn flex-1" onClick={create} disabled={loading}>{loading ? "建立中…" : "建立草稿"}</button>
            <button className="glass-btn glass-btn--secondary" onClick={() => nav("/drafts")}>取消</button>
          </div>
        </div>
      </div>
    </div>
  );
}
