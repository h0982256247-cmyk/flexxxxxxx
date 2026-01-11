import { DocModel, ValidationReport, ValidationIssue, ImageSource } from "./types";
import { isHexColor, safeUrlProtocol } from "./utils";

function issue(level: "error"|"warn", code: string, message: string, path: string): ValidationIssue {
  return { level, code, message, path };
}

function imagePublishable(img: ImageSource): boolean {
  if (img.kind === "upload") return img.url.startsWith("https://");
  const check = img.lastCheck;
  if (check && check.level === "fail") return false;
  return img.url.startsWith("https://") || img.url.startsWith("/");
}

export function validateDoc(doc: DocModel): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const checkFooter = (footer: any[], base: string) => {
    if (footer.length > 3) errors.push(issue("error","E_FOOTER_TOO_MANY_BUTTONS","Footer 最多只能 3 個按鈕", base));
    footer.forEach((b, i) => {
      if (!b.label?.trim()) errors.push(issue("error","E_TEXT_REQUIRED","按鈕文字為必填", `${base}[${i}].label`));
      if (!b.action) errors.push(issue("error","E_ACTION_REQUIRED","按鈕動作為必填", `${base}[${i}].action`));
      if (b.action?.type === "uri") {
        if (!b.action.uri?.trim()) errors.push(issue("error","E_ACTION_URI_INVALID","連結格式不正確", `${base}[${i}].action.uri`));
        else if (!safeUrlProtocol(b.action.uri)) errors.push(issue("error","E_ACTION_URI_PROTOCOL","連結僅支援 https://、line://、liff://", `${base}[${i}].action.uri`));
      }
      if (b.bgColor && !isHexColor(b.bgColor)) warnings.push(issue("warn","W_COLOR_FORMAT","建議使用 #RRGGBB", `${base}[${i}].bgColor`));
      if (b.textColor && !isHexColor(b.textColor)) warnings.push(issue("warn","W_COLOR_FORMAT","建議使用 #RRGGBB", `${base}[${i}].textColor`));
    });
  };

  const checkSection = (section: any, base: string, requireHero: boolean) => {
    const bodyEnabled = section.body.filter((c: any) => c.enabled !== false);
    if (bodyEnabled.length < 1) errors.push(issue("error","E_BODY_EMPTY","Body 至少需要加入 1 個內容元件", `${base}.body`));
    if (requireHero) {
      const hero = section.hero.find((c: any) => c.enabled !== false && c.kind === "hero_image");
      if (!hero) errors.push(issue("error","E_HERO_IMAGE_REQUIRED","每張卡片都必須有 Hero 主圖", `${base}.hero`));
      else if (!imagePublishable(hero.image)) warnings.push(issue("warn","W_IMAGE_PUBLISH_BLOCK","圖片不可確認可被 LINE 讀取（可預覽但不可發布）", `${base}.hero_image`));
    } else {
      const hero = section.hero.find((c: any) => c.enabled !== false && c.kind === "hero_image");
      if (hero && !imagePublishable(hero.image)) warnings.push(issue("warn","W_IMAGE_PUBLISH_BLOCK","圖片不可確認可被 LINE 讀取（可預覽但不可發布）", `${base}.hero_image`));
    }
    checkFooter(section.footer || [], `${base}.footer`);
  };

  if (doc.type === "bubble") checkSection(doc.section, "section", false);
  else {
    if (doc.cards.length < 1) errors.push(issue("error","E_CAROUSEL_EMPTY","Carousel 至少需要 1 張卡片", "cards"));
    if (doc.cards.length > 5) errors.push(issue("error","E_CAROUSEL_TOO_MANY","Carousel 最多只能 5 張卡片", "cards"));
    doc.cards.forEach((c, i) => checkSection(c.section, `cards[${i}].section`, true));
  }

  const status: ValidationReport["status"] =
    errors.length ? "draft" : warnings.some(w => w.code === "W_IMAGE_PUBLISH_BLOCK") ? "previewable" : "publishable";
  return { status, errors, warnings };
}

export function isPublishable(doc: DocModel): { ok: boolean; errors: ValidationIssue[] } {
  const rep = validateDoc(doc);
  const errors = [...rep.errors];
  rep.warnings.filter(w => w.code === "W_IMAGE_PUBLISH_BLOCK").forEach(w => errors.push({ ...w, level: "error", code: "E_IMAGE_PUBLISH_BLOCK" }));
  return { ok: errors.length === 0, errors };
}
