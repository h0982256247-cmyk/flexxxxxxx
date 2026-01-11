import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProgressBar from "@/components/ProgressBar";
import { supabase } from "@/lib/supabase";
import { AccordionSection } from "@/components/Accordion";
import FlexPreview from "@/components/FlexPreview";
import ColorPicker, { AutoTextColorHint } from "@/components/ColorPicker";
import { getDoc, saveDoc } from "@/lib/db";
import { DocModel, FooterButton, ImageSource } from "@/lib/types";
import { uid, autoTextColor } from "@/lib/utils";
import { validateDoc } from "@/lib/validate";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function EditDraft() {
  const { id } = useParams();
  const nav = useNavigate();
  const [doc, setDoc] = useState<DocModel | null>(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState(0);
  const [open, setOpen] = useState<"hero" | "body" | "footer">("hero");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const row = await getDoc(id);
      setDoc(row.content);
    })();
  }, [id]);

  const scheduleSave = (next: DocModel) => {
    setDoc(next);
    setSaveState("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        if (!id) return;
        await saveDoc(id, next);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 800);
  };

  const flushSave = async () => {
    if (!doc || !id) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveState("saving");
    try { await saveDoc(id, doc); setSaveState("saved"); } catch { setSaveState("error"); }
  };

  if (!doc || !id) {
    return <div className="glass-bg"><div className="mx-auto max-w-5xl px-4 py-10"><div className="glass-panel p-6">載入中…</div></div></div>;
  }

  // Safe access for carousel cards
  const currentCardIdx = doc.type === "carousel" ? Math.min(selectedCardIdx, doc.cards.length - 1) : 0;
  const section = doc.type === "bubble" ? doc.section : doc.cards[currentCardIdx].section;
  const report = validateDoc(doc);

  const setSection = (next: any) => {
    if (doc.type === "bubble") {
      scheduleSave({ ...doc, section: next });
    } else {
      const nextCards = [...doc.cards];
      nextCards[currentCardIdx] = { ...nextCards[currentCardIdx], section: next };
      scheduleSave({ ...doc, cards: nextCards });
    }
  };

  const checkExternalImage = async (url: string) => {
    const res = await fetch(`/api/check-image?url=${encodeURIComponent(url)}`);
    return await res.json();
  };

  const updateHeroImageSource = async (img: ImageSource) => {
    const hero = section.hero.map((c: any) => (c.kind === "hero_image" ? { ...c, image: img } : c));
    setSection({ ...section, hero });
  };

  return (
    <div className="glass-bg">
      <ProgressBar docId={id} />

      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">編輯草稿</div>
            <div className="text-sm opacity-70">同頁 Accordion · 儲存：{saveState === "saving" ? "●" : "✓"}</div>
          </div>
          <div className="flex gap-2">
            <button className="glass-btn glass-btn--secondary" onClick={() => nav("/drafts")}>回草稿</button>
          </div>
        </div>

        {doc.type === "carousel" && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {doc.cards.map((c, idx) => (
              <button
                key={c.id}
                className={`glass-btn text-sm whitespace-nowrap ${selectedCardIdx === idx ? "bg-blue-50 border-blue-200 text-blue-700" : "glass-btn--secondary"}`}
                onClick={() => setSelectedCardIdx(idx)}
              >
                卡片 {idx + 1}
              </button>
            ))}
            <button className="glass-btn glass-btn--secondary text-sm" onClick={() => {
              // Add new card with default template (clone current or fresh)
              // For simplicity, we seed a fresh section structure or clone the structure of the first one but empty
              // Let's use a fresh empty section structure based on seedBubble logic or just empty.
              // Actually, reusing the section structure is safer.
              const newCard = {
                id: uid("card_"),
                section: {
                  hero: [{
                    id: uid("hero_"), kind: "hero_image", enabled: true,
                    image: { kind: "external", url: "https://placehold.co/600x400/png", lastCheck: { ok: true, level: "pass" } },
                    ratio: "16:9", mode: "cover"
                  }],
                  body: [],
                  footer: []
                } as any // Cast to avoid strict type checks on deep structure creation here
              };
              scheduleSave({ ...doc, cards: [...doc.cards, newCard] });
              setSelectedCardIdx(doc.cards.length); // Switch to new card
            }}>＋ 新增卡片</button>

            {doc.cards.length > 1 && (
              <button className="glass-btn glass-btn--secondary text-sm text-red-600" onClick={() => {
                if (!confirm("確定刪除此卡片？")) return;
                const nextCards = doc.cards.filter((_, i) => i !== selectedCardIdx);
                scheduleSave({ ...doc, cards: nextCards });
                setSelectedCardIdx(Math.max(0, selectedCardIdx - 1));
              }}>刪除當前</button>
            )}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <AccordionSection
            title="Hero（主圖）"
            subtitle="Carousel 每張卡必填；外部圖 fail：可預覽不可發布"
            open={open === "hero"}
            onToggle={() => setOpen(open === "hero" ? "body" : "hero")}
            right={<span className="glass-badge">{report.status === "publishable" ? "✅" : report.status === "previewable" ? "⚠️" : "📝"}</span>}
          >
            <div className="space-y-3">
              <button className="glass-btn glass-btn--secondary w-full" onClick={async () => {
                const url = prompt("貼上 https 圖片連結：");
                if (!url) return;
                const check = url.startsWith("https://") ? await checkExternalImage(url) : { ok: false, level: "fail", reasonCode: "NOT_HTTPS" };
                await updateHeroImageSource({ kind: "external", url, lastCheck: { ...check, checkedAt: new Date().toISOString() } });
              }}>
                貼上圖片連結（含檢查）
              </button>

              <label className="glass-btn glass-btn--secondary w-full justify-center">
                上傳圖片（Supabase Storage）
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  // Simple verification
                  if (file.size > 5 * 1024 * 1024) return alert("檔案過大，請小於 5MB");

                  try {
                    const ext = file.name.split(".").pop();
                    const path = `${uid("img_")}.${ext}`;
                    const { data, error } = await supabase.storage.from("flex-assets").upload(path, file);

                    if (error) {
                      console.error(error);
                      return alert("上傳失敗：" + error.message);
                    }

                    const { data: { publicUrl } } = supabase.storage.from("flex-assets").getPublicUrl(path);

                    await updateHeroImageSource({
                      kind: "upload",
                      assetId: path,
                      url: publicUrl
                    });
                  } catch (err: any) {
                    alert("上傳錯誤：" + err.message);
                  }
                }} />
              </label>

              <div className="text-xs opacity-70">（你已選 bucket：flex-assets。storage.sql 已附。）</div>
            </div>
          </AccordionSection>

          <AccordionSection
            title="Body（內容）"
            subtitle="至少 1 個元件"
            open={open === "body"}
            onToggle={() => setOpen(open === "body" ? "footer" : "body")}
            right={<span className="glass-badge">{section.body.filter((c: any) => c.enabled).length} 個</span>}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button className="glass-btn text-xs py-2" onClick={() => {
                  const next = [...section.body, { id: uid("t_"), kind: "title", enabled: true, text: "新標題", size: "lg", weight: "bold", color: "#111111", align: "start" }];
                  setSection({ ...section, body: next });
                }}>＋ 標題</button>
                <button className="glass-btn text-xs py-2" onClick={() => {
                  const next = [...section.body, { id: uid("p_"), kind: "paragraph", enabled: true, text: "新段落…", size: "md", color: "#333333", wrap: true }];
                  setSection({ ...section, body: next });
                }}>＋ 段落</button>
                <button className="glass-btn text-xs py-2" onClick={() => {
                  const next = [...section.body, { id: uid("kv_"), kind: "key_value", enabled: true, label: "標籤", value: "內容", action: { type: "uri", uri: "https://example.com" } }];
                  setSection({ ...section, body: next });
                }}>＋ 標籤數值</button>
                <button className="glass-btn text-xs py-2" onClick={() => {
                  const next = [...section.body, { id: uid("l_"), kind: "list", enabled: true, items: [{ id: uid("i_"), text: "清單項目" }] }];
                  setSection({ ...section, body: next });
                }}>＋ 列表</button>
                <button className="glass-btn text-xs py-2" onClick={() => {
                  const next = [...section.body, { id: uid("d_"), kind: "divider", enabled: true }];
                  setSection({ ...section, body: next });
                }}>＋ 分隔線</button>
                <button className="glass-btn text-xs py-2" onClick={() => {
                  const next = [...section.body, { id: uid("s_"), kind: "spacer", enabled: true, size: "md" }];
                  setSection({ ...section, body: next });
                }}>＋ 留白</button>
              </div>

              {section.body.map((c: any, idx: number) => (
                <div key={c.id} className="glass-panel p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{idx + 1}. {c.kind}</div>
                    <button className="glass-btn glass-btn--secondary px-3 py-2 text-xs" onClick={() => {
                      const next = [...section.body]; next.splice(idx, 1);
                      setSection({ ...section, body: next.length ? next : section.body });
                    }}>刪除</button>
                  </div>

                  {(c.kind === "title" || c.kind === "paragraph") ? (
                    <div className="mt-3">
                      <div className="glass-label mb-2">文字</div>
                      <textarea className="glass-input" rows={c.kind === "title" ? 2 : 3} value={c.text} onChange={(e) => {
                        const next = [...section.body]; next[idx] = { ...c, text: e.target.value };
                        setSection({ ...section, body: next });
                      }} />
                    </div>
                  ) : null}

                  {c.kind === "key_value" ? (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><div className="glass-label mb-2">Label</div><input className="glass-input" value={c.label} onChange={(e) => {
                          const next = [...section.body]; next[idx] = { ...c, label: e.target.value }; setSection({ ...section, body: next });
                        }} /></div>
                        <div><div className="glass-label mb-2">Value</div><input className="glass-input" value={c.value} onChange={(e) => {
                          const next = [...section.body]; next[idx] = { ...c, value: e.target.value }; setSection({ ...section, body: next });
                        }} /></div>
                      </div>
                      <div><div className="glass-label mb-2">URL</div><input className="glass-input" value={c.action?.uri || ""} onChange={(e) => {
                        const next = [...section.body]; next[idx] = { ...c, action: { type: "uri", uri: e.target.value } }; setSection({ ...section, body: next });
                      }} /></div>
                    </div>
                  ) : null}

                  {c.kind === "list" ? (
                    <div className="mt-3 space-y-2">
                      {c.items.map((it: any, j: number) => (
                        <input key={it.id} className="glass-input" value={it.text} onChange={(e) => {
                          const next = [...section.body];
                          const items = [...c.items]; items[j] = { ...it, text: e.target.value };
                          next[idx] = { ...c, items }; setSection({ ...section, body: next });
                        }} />
                      ))}
                      <button className="glass-btn glass-btn--secondary w-full" onClick={() => {
                        const next = [...section.body]; next[idx] = { ...c, items: [...c.items, { id: uid("i_"), text: "新項目" }] };
                        setSection({ ...section, body: next });
                      }}>+ 新增項目</button>
                    </div>
                  ) : null}

                  {c.kind === "spacer" ? (
                    <div className="mt-3">
                      <div className="glass-label mb-2">留白大小</div>
                      <select className="glass-input" value={c.size} onChange={(e) => {
                        const next = [...section.body]; next[idx] = { ...c, size: e.target.value }; setSection({ ...section, body: next });
                      }}>
                        <option value="sm">sm</option><option value="md">md</option><option value="lg">lg</option>
                      </select>
                    </div>
                  ) : null}

                  {c.kind === "divider" ? <div className="mt-3 text-xs opacity-70">（分隔線無需設定）</div> : null}
                </div>
              ))}
            </div>
          </AccordionSection>

          <AccordionSection
            title="Footer（按鈕）"
            subtitle="最多 3 顆；直向滿版"
            open={open === "footer"}
            onToggle={() => setOpen(open === "footer" ? "hero" : "footer")}
            right={<span className="glass-badge">{section.footer.length}/3</span>}
          >
            <div className="space-y-3">
              <button className="glass-btn w-full" disabled={section.footer.length >= 3} onClick={() => {
                const bg = "#0A84FF";
                const btn: FooterButton = { id: uid("btn_"), kind: "footer_button", enabled: true, label: "新按鈕", action: { type: "uri", uri: "https://example.com" }, style: "primary", bgColor: bg, textColor: autoTextColor(bg), autoTextColor: true };
                setSection({ ...section, footer: [...section.footer, btn].slice(0, 3) });
              }}>+ 新增按鈕</button>

              {section.footer.map((b: any, idx: number) => (
                <div key={b.id} className="glass-panel p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">按鈕 {idx + 1}</div>
                    <button className="glass-btn glass-btn--secondary px-3 py-2 text-xs" onClick={() => {
                      const next = section.footer.filter((_: any, i: number) => i !== idx);
                      setSection({ ...section, footer: next });
                    }}>刪除</button>
                  </div>

                  <div>
                    <div>
                      <div className="flex gap-4 mb-2">
                        <div className="flex-1">
                          <div className="glass-label mb-1">按鈕文字</div>
                          <input className="glass-input w-full" value={b.label} onChange={(e) => {
                            const next = [...section.footer]; next[idx] = { ...b, label: e.target.value }; setSection({ ...section, footer: next });
                          }} />
                        </div>
                        <div className="w-1/3">
                          <div className="glass-label mb-1">動作類型</div>
                          <select className="glass-input w-full py-1.5" value={b.action.type} onChange={(e) => {
                            const type = e.target.value as any;
                            const next = [...section.footer];
                            if (type === "uri") next[idx] = { ...b, action: { type, uri: "" } };
                            else if (type === "message") next[idx] = { ...b, action: { type, text: "" } };
                            else if (type === "share") next[idx] = { ...b, action: { type, uri: "" } };
                            setSection({ ...section, footer: next });
                          }}>
                            <option value="uri">開啟網址</option>
                            <option value="message">傳送文字</option>
                            <option value="share">分享好友</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <div className="glass-label mb-2">
                          {b.action.type === "uri" ? "URL連結" : b.action.type === "message" ? "訊息文字" : "分享連結（自動填入）"}
                        </div>
                        <input
                          className={`glass-input w-full ${b.action.type === "share" ? "bg-gray-100 opacity-60 cursor-not-allowed" : ""}`}
                          disabled={b.action.type === "share"}
                          value={b.action.type === "uri" ? b.action.uri : b.action.type === "message" ? b.action.text : "發布後自動產生 LIFF 分享連結"}
                          onChange={(e) => {
                            if (b.action.type === "share") return;
                            const next = [...section.footer];
                            if (b.action.type === "uri") next[idx] = { ...b, action: { ...b.action, uri: e.target.value } };
                            else if (b.action.type === "message") next[idx] = { ...b, action: { ...b.action, text: e.target.value } };
                            setSection({ ...section, footer: next });
                          }}
                        />
                        {b.action.type === "uri" ? <div className="mt-1 text-xs opacity-70">僅支援 https://、line://、liff://</div> : null}
                      </div>
                    </div>
                  </div>

                  <details className="glass-panel p-3">
                    <summary className="cursor-pointer font-semibold text-sm">顏色設定</summary>
                    <div className="mt-3 space-y-4">
                      <ColorPicker label="背景色" value={b.bgColor} onChange={(v) => {
                        const next = [...section.footer];
                        next[idx] = { ...b, bgColor: v.toUpperCase(), textColor: b.autoTextColor ? autoTextColor(v) : b.textColor };
                        setSection({ ...section, footer: next });
                      }} />
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs opacity-70">文字色：{b.textColor}</div>
                        <button className="glass-btn glass-btn--secondary px-3 py-2 text-xs" onClick={() => {
                          const next = [...section.footer]; next[idx] = { ...b, textColor: autoTextColor(b.bgColor), autoTextColor: true }; setSection({ ...section, footer: next });
                        }}>自動</button>
                      </div>
                      <ColorPicker label="文字色（手動）" value={b.textColor} onChange={(v) => {
                        const next = [...section.footer]; next[idx] = { ...b, textColor: v.toUpperCase(), autoTextColor: false }; setSection({ ...section, footer: next });
                      }} />
                      <AutoTextColorHint bgColor={b.bgColor} textColor={b.textColor} />
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </AccordionSection>

          <div className="sticky bottom-4">
            <div className="glass-panel p-3 flex gap-2">
              <button className="glass-btn glass-btn--secondary flex-1" onClick={async () => { await flushSave(); nav(`/drafts/${id}/preview`); }}>預覽</button>
              <button className="glass-btn flex-1" onClick={async () => { await flushSave(); nav(`/drafts/${id}/preview`); }}>下一步</button>
            </div>
            <div className="mt-2 text-xs opacity-70">{report.errors.length ? `❌ 有 ${report.errors.length} 個錯誤` : report.warnings.length ? `⚠️ 有 ${report.warnings.length} 個警告` : "✅ 可發布"}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">即時預覽</div>
              <span className="glass-badge">{report.errors.length ? `❌ ${report.errors.length}` : report.warnings.length ? `⚠️ ${report.warnings.length}` : "✅ OK"}</span>
            </div>
            <div className="mt-4"><FlexPreview doc={doc} /></div>
          </div>

          <div className="glass-panel p-4">
            <div className="font-semibold">驗證清單</div>
            <div className="mt-2 space-y-2 text-sm">
              {report.errors.map((e: any, i: number) => <div key={i} className="text-red-600">❌ {e.message}</div>)}
              {report.warnings.map((w: any, i: number) => <div key={i} className="text-amber-700">⚠️ {w.message}</div>)}
              {report.errors.length === 0 && report.warnings.length === 0 ? <div className="opacity-70">沒有問題。</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
