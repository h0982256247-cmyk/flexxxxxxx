import { DocModel, FooterButton } from "./types";
import { uid, autoTextColor } from "./utils";

const PLACEHOLDER_URL = "/placeholder.svg";

function defaultButton(label: string, uri: string, bgColor: string): FooterButton {
  return {
    id: uid("btn_"),
    kind: "footer_button",
    enabled: true,
    label,
    action: { type: "uri", uri },
    style: "primary",
    bgColor,
    textColor: autoTextColor(bgColor),
    autoTextColor: true,
  };
}

export function seedBubble(title = "新草稿（Bubble）"): DocModel {
  return {
    type: "bubble",
    title,
    section: {
      hero: [{
        id: uid("hero_"),
        kind: "hero_image",
        enabled: true,
        image: { kind: "external", url: PLACEHOLDER_URL, lastCheck: { ok: true, level: "pass", checkedAt: new Date().toISOString() } },
        ratio: "16:9",
        mode: "cover",
      }],
      body: [
        { id: uid("t_"), kind: "title", enabled: true, text: "你的主標題", size: "lg", weight: "bold", color: "#111111", align: "start" },
        { id: uid("p_"), kind: "paragraph", enabled: true, text: "在這裡輸入簡短介紹（可換行）", size: "md", color: "#333333", wrap: true },
        { id: uid("kv_"), kind: "key_value", enabled: true, label: "電話", value: "0912-345-678", action: { type: "uri", uri: "https://example.com" } },
      ],
      footer: [
        defaultButton("立即了解", "https://example.com", "#0A84FF"),
        { ...defaultButton("分享給好友", "https://example.com", "#34C759"), style: "secondary" },
      ],
    },
  };
}

export function seedCarousel(cardCount = 3, title = "新草稿（Carousel）"): DocModel {
  const count = Math.max(1, Math.min(5, cardCount));
  return {
    type: "carousel",
    title,
    cards: Array.from({ length: count }).map((_, i) => ({
      id: uid("card_"),
      section: {
        hero: [{
          id: uid("hero_"),
          kind: "hero_image",
          enabled: true,
          image: { kind: "external", url: PLACEHOLDER_URL, lastCheck: { ok: true, level: "pass", checkedAt: new Date().toISOString() } },
          ratio: "16:9",
          mode: "cover",
        }],
        body: [
          { id: uid("t_"), kind: "title", enabled: true, text: `方案 ${String.fromCharCode(65+i)}｜最受歡迎`, size: "lg", weight: "bold", color: "#111111", align: "start" },
          { id: uid("p_"), kind: "paragraph", enabled: true, text: "簡短描述內容…", size: "md", color: "#333333", wrap: true },
        ],
        footer: [defaultButton("查看詳情", "https://example.com", "#0A84FF")],
      },
    })),
  };
}

export const PALETTE = ["#0A84FF","#34C759","#FF9F0A","#FF453A","#AF52DE","#111111","#FFFFFF","#8E8E93"];
