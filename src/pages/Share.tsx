import React, { useEffect, useMemo, useState } from "react";
import liff from "@line/liff";

import FlexPreview from "@/components/FlexPreview";
import { resolveDocIdToToken, resolveShareToken } from "@/lib/db";
import { isLineInApp, isMobile } from "@/lib/lineEnv";
import { renderFlexFromContent } from "@/lib/flexRenderer";

type UrlParams = { token: string | null; id: string | null };

function parseUrlParams(): UrlParams {
  const sp = new URLSearchParams(window.location.search);

  let token = sp.get("token");
  let id = sp.get("id");

  // LIFF 可能會把參數包在 liff.state
  if (!token && !id) {
    const liffState = sp.get("liff.state");
    if (liffState) {
      const decoded = decodeURIComponent(liffState);

      // 只解析 query 部分，沒有 ? 就不要亂 parse，避免 "/share" 這種被當成參數
      let query = "";
      if (decoded.includes("?")) query = decoded.split("?")[1] || "";
      else if (decoded.startsWith("?")) query = decoded.slice(1);
      else query = "";

      if (query) {
        const inner = new URLSearchParams(query);
        token = inner.get("token");
        id = inner.get("id");
      }
    }
  }

  return { token, id };
}

export default function Share() {
  const [urlParams] = useState(() => parseUrlParams());
  const tokenParam = urlParams.token;
  const idParam = urlParams.id;

  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  const [liffReady, setLiffReady] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [needsSecondClick, setNeedsSecondClick] = useState(false);

  const liffId = import.meta.env.VITE_LIFF_ID as string | undefined;

  // shareTargetPicker 在「LINE in-app」最穩；桌機/一般瀏覽器即便 LIFF 初始化成功，也常遇到限制
  // 這裡保持你原本策略，但後面會加上 payload 合法性檢查與更明確的 fallback。
  const canUseShareTargetPicker = useMemo(() => {
    if (!liffId) return false;
    if (!liffReady) return false;
    try {
      // @ts-expect-error - SDK typing may not include isApiAvailable
      const ok =
        typeof liff.isApiAvailable === "function"
          ? liff.isApiAvailable("shareTargetPicker")
          : true;
      return !!ok;
    } catch {
      return true;
    }
  }, [liffId, liffReady]);

  // 自動分享（最佳努力）
  const autoShareRequested = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    const explicit = sp.get("autoshare") === "1";
    const pending = sessionStorage.getItem("PENDING_LIFF_SHARE") === "1";
    const fromLine = isLineInApp();
    return explicit || pending || fromLine;
  }, []);
  const [autoTried, setAutoTried] = useState(false);

  // === URLs for copy / redirect ===
  const shareUrl = useMemo(() => {
    const base = `${window.location.origin}${window.location.pathname}`;
    const t = tokenParam || data?.token || "";
    const id = idParam || "";
    if (t) return `${base}?token=${encodeURIComponent(t)}`;
    if (id) return `${base}?id=${encodeURIComponent(id)}`;
    return base;
  }, [tokenParam, idParam, data?.token]);

  const liffWebUrl = useMemo(() => {
    if (!liffId) return "";
    const t = tokenParam || data?.token || "";
    const id = idParam || "";
    const base = `https://liff.line.me/${liffId}`;
    if (t) return `${base}?token=${encodeURIComponent(t)}&autoshare=1`;
    if (id) return `${base}?id=${encodeURIComponent(id)}&autoshare=1`;
    return `${base}?autoshare=1`;
  }, [liffId, tokenParam, idParam, data?.token]);

  // ✅ 修正：line://app/{liffId} 不要硬加 /share（容易導不到你預期的 router）
  const lineAppUrl = useMemo(() => {
    if (!liffId) return "";
    const t = tokenParam || data?.token || "";
    const id = idParam || "";
    const base = `line://app/${liffId}`;
    if (t) return `${base}?token=${encodeURIComponent(t)}&autoshare=1`;
    if (id) return `${base}?id=${encodeURIComponent(id)}&autoshare=1`;
    return `${base}?autoshare=1`;
  }, [liffId, tokenParam, idParam, data?.token]);

  const withAutoShareParam = (url: string) => {
    try {
      const u = new URL(url);
      u.searchParams.set("autoshare", "1");
      return u.toString();
    } catch {
      return url;
    }
  };

  const primaryButtonText = useMemo(() => "LINE 分享好友", []);

  // === LIFF init ===
  useEffect(() => {
    if (!liffId) {
      setLiffReady(true);
      return;
    }

    liff
      .init({ liffId })
      .then(() => setLiffReady(true))
      .catch(() => setLiffReady(true));
  }, [liffId]);

  // 桌機在 login redirect 回來後可能擋掉自動彈窗 → 提示按第二次
  useEffect(() => {
    const pendingManual = sessionStorage.getItem("PENDING_MANUAL_SHARE") === "1";
    if (pendingManual) setNeedsSecondClick(true);
  }, []);

  // === 非 LINE 開啟：手機導流到 LINE/LIFF ===
  useEffect(() => {
    if (isLineInApp()) return;
    if (!isMobile()) return;
    if (!liffId) return;
    if (!tokenParam && !idParam) return;

    const redirected = sessionStorage.getItem("AUTO_REDIRECTED_TO_LIFF") === "1";
    if (redirected) return;
    sessionStorage.setItem("AUTO_REDIRECTED_TO_LIFF", "1");

    // 先試喚起 LINE，再 fallback 到 LIFF universal link
    if (lineAppUrl) window.location.replace(lineAppUrl);

    setTimeout(() => {
      if (liffWebUrl) window.location.replace(liffWebUrl);
    }, 800);
  }, [liffId, tokenParam, idParam, lineAppUrl, liffWebUrl]);

  // === Fetch share data ===
  useEffect(() => {
    if (!liffReady) return;

    (async () => {
      try {
        let token = tokenParam;
        const id = idParam;

        if (!token && id) {
          token = await resolveDocIdToToken(id);
          if (!token) throw new Error("無效的 ID 或文件不存在");
        }
        if (!token) throw new Error("無效的連結（缺少 token 或 id）");

        const d = await resolveShareToken(token);
        if (!d) throw new Error("連結不存在或已停用");

        setData(d);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || "讀取失敗");
      }
    })();
  }, [liffReady, tokenParam, idParam]);

  // =========================================================
  // ✅ 這裡是關鍵：用 CMS content -> 轉成 LINE Flex contents
  // =========================================================
  const altText = useMemo(() => {
    // LINE altText 限制：1~400 字元（過長可能導致送不出去）
    const raw = (data?.doc_model?.title || data?.title || "Flex Message") as string;
    const t = raw.trim() || "Flex Message";
    return t.length > 400 ? t.slice(0, 397) + "..." : t;
  }, [data]);

  const contents = useMemo(() => {
    try {
      // ✅ get_share RPC 目前回傳的是 doc_model（docs.content）與 flex_json（doc_versions.flex_json）
      // 最穩：直接用 publish 時產出的 flex_json.contents
      if (data?.flex_json?.contents) return data.flex_json.contents;

      // 兼容：若你還沒走 publish 流程、或早期資料只有 doc_model
      if (data?.doc_model?.type === "carousel") {
        return renderFlexFromContent(data.doc_model, {
          // 先用站點當 base，把 "/placeholder.svg" -> "https://xxx/placeholder.svg"
          // ⚠️ 建議你之後換成 Supabase Storage public URL 網域
          assetBaseUrl: window.location.origin,
        });
      }

      if (data?.doc_model?.type === "bubble") {
        // bubble schema 目前也可以用 buildFlex 產出，這裡 fallback 用 renderer（轉成 bubble）
        // 為了避免你還沒 publish 就不能分享
        const carousel = renderFlexFromContent(
          { type: "carousel", title: data.doc_model.title, cards: [{ id: "single", section: data.doc_model.section }] },
          { assetBaseUrl: window.location.origin }
        ) as any;
        // carousel.contents[0] 是 bubble
        return carousel?.contents?.[0] ?? null;
      }

      return null;
    } catch (e) {
      console.error("renderFlexFromContent failed:", e);
      return null;
    }
  }, [data]);

  const isReadyToShare = !!(contents && liffReady && !err);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  // =========================================================
  // LINE shareTargetPicker 限制檢查（前端 best-effort）
  // =========================================================
  const calcJsonBytes = (obj: any) => {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch {
      return 999999;
    }
  };

  const validateLineContents = (c: any) => {
    if (!c?.type) return { ok: false, reason: "contents.type 缺失" };
    if (c.type !== "bubble" && c.type !== "carousel") return { ok: false, reason: "contents.type 必須是 bubble 或 carousel" };

    // carousel bubble 數量（LINE 官方上限較高，但保守檢查）
    if (c.type === "carousel") {
      if (!Array.isArray(c.contents) || c.contents.length < 1) return { ok: false, reason: "carousel.contents 必須是陣列且至少 1 張" };
      if (c.contents.length > 10) return { ok: false, reason: "carousel.contents 建議不要超過 10 張" };
    }

    // 圖片 URL 必須 https
    const urls: string[] = [];
    const walk = (x: any) => {
      if (!x || typeof x !== "object") return;
      if (typeof x.url === "string") urls.push(x.url);
      if (Array.isArray(x)) x.forEach(walk);
      else Object.values(x).forEach(walk);
    };
    walk(c);
    const bad = urls.find((u) => u && !u.startsWith("https://"));
    if (bad) return { ok: false, reason: `圖片/資源 URL 必須是 https://（目前看到：${bad}）` };

    // payload size：LINE Flex 訊息有大小限制（保守抓 50KB）
    const bytes = calcJsonBytes(c);
    if (bytes > 50 * 1024) return { ok: false, reason: `Flex 內容過大（約 ${Math.ceil(bytes / 1024)}KB），建議精簡文字/圖片` };

    return { ok: true, reason: "ok" };
  };

  const handlePrimaryAction = async () => {
    if (isSharing) return;

    setToast(null);

    if (!contents) {
      setToast({ type: "error", msg: "資料載入中，請稍等 1 秒再試一次" });
      return;
    }

    // ✅ 內容合法性檢查（避免「彈出但好友收不到」）
    const v = validateLineContents(contents);
    if (!v.ok) {
      setToast({ type: "error", msg: `Flex 內容不符合 LINE 限制：${v.reason}` });
      console.log("BAD contents:", contents);
      return;
    }

    // Debug：你要看 payload 就看這個
    console.log("SHARE payload:", { type: "flex", altText, contents });

    // A) shareTargetPicker 流程
    if (canUseShareTargetPicker) {
      try {
        setIsSharing(true);

        if (!liff.isLoggedIn()) {
          // LINE in-app：登入回來後自動 share
          if (isLineInApp() && liff.isInClient()) {
            sessionStorage.setItem("PENDING_LIFF_SHARE", "1");
            liff.login({ redirectUri: withAutoShareParam(window.location.href) });
            return;
          }

          // 桌機/一般瀏覽器：登入回來多半擋彈窗 → 提示再按一次
          sessionStorage.setItem("PENDING_MANUAL_SHARE", "1");
          liff.login({ redirectUri: window.location.href });
          return;
        }

        // 已登入：清 pending（避免反覆自動跳）
        sessionStorage.removeItem("PENDING_LIFF_SHARE");

        const res = await liff.shareTargetPicker([{ type: "flex", altText, contents }]);

        // res = null → 使用者取消
        if (!res) {
          // ✅ 取消就清掉 pending，避免下次又自動彈
          sessionStorage.removeItem("PENDING_LIFF_SHARE");
          setToast({ type: "error", msg: "已取消分享" });
          return;
        }

        // 成功：清掉 pending
        sessionStorage.removeItem("PENDING_MANUAL_SHARE");
        setNeedsSecondClick(false);

        // ✅ 你要的是「倒回原前端畫面 + 告知成功」
        // shareTargetPicker 結束後本來就會回到這個頁面，這裡只做成功提示。
        setToast({ type: "ok", msg: "已傳送成功！" });
      } catch (e: any) {
        if (e?.code === "403" || e?.message?.includes("Forbidden")) {
          setToast({ type: "error", msg: "分享失敗：請確認 LIFF App 已啟用 Share Target Picker，且 scopes 包含 chat_message.write。" });
        } else {
          console.error(e);
          setToast({ type: "error", msg: "分享失敗，請稍後再試或改用複製連結方式。" });
        }
      } finally {
        setIsSharing(false);
      }
      return;
    }

    // B) 不支援 shareTargetPicker：走導流 / 複製連結
    if (!liffId) return;

    if (!isMobile()) {
      const ok = await copyToClipboard(shareUrl);
      if (ok) setToast({ type: "ok", msg: "已複製連結！請將連結貼到 LINE 聊天室中開啟，即可分享給好友。" });
      if (liffWebUrl) window.location.href = liffWebUrl;
      return;
    }

    if (liffWebUrl) window.location.href = liffWebUrl;
  };

  // === Auto share (best-effort) ===
  useEffect(() => {
    if (!autoShareRequested) return;
    if (autoTried) return;
    if (!isLineInApp()) return;
    if (!liffReady) return;
    if (!contents) return;
    if (err) return;

    // 只在 LINE client 內才自動觸發（避免一般瀏覽器一直跳）
    if (!liff.isInClient()) return;

    // ✅ 內容合法性檢查
    const v = validateLineContents(contents);
    if (!v.ok) return;

    setAutoTried(true);

    (async () => {
      try {
        if (!liff.isLoggedIn()) {
          sessionStorage.setItem("PENDING_LIFF_SHARE", "1");
          liff.login({ redirectUri: withAutoShareParam(window.location.href) });
          return;
        }

        sessionStorage.removeItem("PENDING_LIFF_SHARE");

        setIsSharing(true);
        const res = await liff.shareTargetPicker([{ type: "flex", altText, contents }]);

        // res = null → 使用者取消
        if (!res) {
          sessionStorage.removeItem("PENDING_LIFF_SHARE");
          setToast({ type: "error", msg: "已取消分享" });
          return;
        }

        setToast({ type: "ok", msg: "已傳送成功！" });
      } catch {
        // 自動分享失敗不彈 alert，讓使用者手動按
      } finally {
        setIsSharing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoShareRequested, autoTried, liffReady, contents, err]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
        {/* Header */}
        <div className="p-8 text-center space-y-2">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            {data?.doc_model?.title || "Flex Share"}
          </h1>
          <p className="text-gray-500 text-sm">點擊下方按鈕分享給好友</p>
        </div>

        {/* Action */}
        <div className="px-8 pb-8 space-y-6">
          {toast && (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${toast.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
            >
              {toast.msg}
            </div>
          )}

          <button
            className="w-full py-4 bg-[#06C755] hover:bg-[#05b34d] disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition-all duration-200 rounded-2xl text-white font-bold text-lg shadow-lg shadow-green-200 flex items-center justify-center gap-2"
            onClick={handlePrimaryAction}
            disabled={!isReadyToShare || isSharing}
          >
            <span>{isSharing ? "分享中..." : primaryButtonText}</span>
          </button>

          {needsSecondClick && !isLineInApp() && (
            <div className="text-center text-xs text-gray-500">
              已完成登入，請再按一次「{primaryButtonText}」開啟分享對象選擇器。
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="group relative px-6 py-2 rounded-full hover:bg-white/50 transition-all duration-300"
            >
              <div className="flex items-center gap-2 text-gray-500 group-hover:text-blue-600 transition-colors">
                {showPreview ? (
                  <svg
                    className="w-5 h-5 transition-transform duration-300 rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 transition-all duration-300 group-hover:scale-110"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
                <span className="text-sm font-medium tracking-wide">{showPreview ? "收起" : "我要預覽"}</span>
              </div>
            </button>
          </div>

          {!isLineInApp() && (
            <div className="text-center text-xs text-gray-400">
              提示：若點擊無反應，請將連結複製到 LINE 中開啟。
            </div>
          )}
        </div>

        {/* Preview */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${showPreview ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <div className="bg-gray-100/50 p-6 border-t border-gray-100">
            {data ? (
              <div className="transform scale-95 origin-top">
                {/* ✅ get_share 回傳：doc_model（CMS schema）與 flex_json（LINE payload） */}
                <FlexPreview flex={data.doc_model ?? data.flex_json} />
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">載入中...</div>
            )}
          </div>
        </div>

        {/* Error */}
        {(err || (!tokenParam && !idParam && !data)) && (
          <div className="bg-red-50 p-4 text-xs text-red-600 text-center break-all">
            {err || "無效的參數"}
            <div className="mt-1 opacity-50">{window.location.search}</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-400 text-xs">
        Powered by Flex Glass Editor
        {data && <span> · v{data.version_no}</span>}
      </div>
    </div>
  );
}
