import { DocModel, Section, FooterButton, Action, SizeToken } from "./types";
import { isHexColor } from "./utils";

function sizeMap(s: SizeToken): string { return s; }


function actionToFlex(a: Action, docId?: string) {
  if (a.type === "uri") return { type: "uri", uri: a.uri };
  if (a.type === "message") return { type: "message", text: a.text };
  if (a.type === "share") {
    // ✅ IMPORTANT
    // Use LIFF path (/share) so React Router can directly render the Share page.
    // This also makes liff.state parsing reliable after LIFF redirects.
    // Format: https://liff.line.me/{LIFF_ID}/share?id={DOC_ID}
    const liffId = import.meta.env.VITE_LIFF_ID || "YOUR_LIFF_ID";
    const targetId = docId || "PREVIEW_MODE";
    // 加上 autoshare=1：讓使用者從 Flex 點進分享頁時「一開啟就直接跳分享選擇器」（最佳努力）
    const uri = `https://liff.line.me/${liffId}/share?id=${encodeURIComponent(targetId)}&autoshare=1`;
    return { type: "uri", uri };
  }
  return { type: "uri", uri: "https://example.com" };
}

function sectionToBubble(section: Section, docId?: string) {
  const heroImg = section.hero.find((x: any) => x.enabled && x.kind === "hero_image") as any | undefined;
  const hero = heroImg ? { type: "image", url: heroImg.image.url, aspectRatio: heroImg.ratio, aspectMode: heroImg.mode } : undefined;

  const bodyContents: any[] = [];
  for (const c of section.body) {
    if (!c.enabled) continue;
    if (c.kind === "title") bodyContents.push({ type: "text", text: c.text, weight: c.weight === "bold" ? "bold" : "regular", size: sizeMap(c.size), color: c.color, align: c.align, wrap: true });
    if (c.kind === "paragraph") bodyContents.push({ type: "text", text: c.text, size: sizeMap(c.size), color: c.color, wrap: true });
    if (c.kind === "key_value") {
      const row: any = {
        type: "box", layout: "baseline", spacing: "sm", contents: [
          { type: "text", text: c.label, size: "sm", color: "#8E8E93", flex: 2, wrap: true },
          { type: "text", text: c.value, size: "sm", color: "#111111", flex: 5, wrap: true },
        ]
      };
      if (c.action) row.contents[1].action = actionToFlex(c.action, docId);
      bodyContents.push(row);
    }
    if (c.kind === "list") bodyContents.push({ type: "box", layout: "vertical", spacing: "sm", contents: c.items.map((it: any) => ({ type: "text", text: "• " + it.text, size: "sm", color: "#111111", wrap: true })) });
    if (c.kind === "divider") bodyContents.push({ type: "separator", margin: "md" });
    if (c.kind === "spacer") bodyContents.push({ type: "spacer", size: c.size });
  }

  const footerButtons = section.footer.filter((b) => b.enabled).slice(0, 3);
  const footer = footerButtons.length ? {
    type: "box", layout: "vertical", spacing: "sm", contents: footerButtons.map((b: FooterButton) => ({
      type: "button",
      style: "primary",
      color: isHexColor(b.bgColor) ? b.bgColor : "#0A84FF",
      action: actionToFlex(b.action, docId),
      height: "sm",
    }))
  } : undefined;

  const bubble: any = { type: "bubble", body: { type: "box", layout: "vertical", spacing: "md", contents: bodyContents.length ? bodyContents : [{ type: "text", text: "（空）", size: "sm", color: "#8E8E93" }] } };
  if (hero) bubble.hero = hero;
  if (footer) bubble.footer = footer;
  return bubble;
}

export function buildFlex(doc: DocModel, docId?: string) {
  if (doc.type === "bubble") return { type: "flex", altText: doc.title || "Flex Message", contents: sectionToBubble(doc.section, docId) };
  return { type: "flex", altText: doc.title || "Flex Message", contents: { type: "carousel", contents: doc.cards.map((c) => sectionToBubble(c.section, docId)) } };
}
