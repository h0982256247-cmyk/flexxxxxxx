export type LayoutAlign = "start" | "center" | "end";
export type SizeToken = "xs" | "sm" | "md" | "lg" | "xl";
export type ImgRatio = "1:1" | "16:9" | "4:3";
export type ImgMode = "cover" | "contain";

export type ImageCheckResult = { ok: boolean; level: "pass" | "warn" | "fail"; reasonCode?: string; checkedAt?: string };
export type ImageSource =
  | { kind: "upload"; assetId: string; url: string }
  | { kind: "external"; url: string; lastCheck?: ImageCheckResult };

export type Action = { type: "uri"; uri: string } | { type: "message"; text: string } | { type: "share"; uri?: string };

export type ComponentBase = { id: string; kind: string; enabled: boolean };

export type HeroImage = ComponentBase & { kind: "hero_image"; image: ImageSource; ratio: ImgRatio; mode: ImgMode };

export type TitleText = ComponentBase & { kind: "title"; text: string; size: SizeToken; weight: "regular" | "bold"; color: string; align: LayoutAlign };
export type ParagraphText = ComponentBase & { kind: "paragraph"; text: string; size: SizeToken; color: string; wrap: true };
export type KeyValueRow = ComponentBase & { kind: "key_value"; label: string; value: string; action?: Action };
export type ListBlock = ComponentBase & { kind: "list"; items: { id: string; text: string }[] };
export type Divider = ComponentBase & { kind: "divider" };
export type Spacer = ComponentBase & { kind: "spacer"; size: "sm" | "md" | "lg" };

export type FooterButton = ComponentBase & { kind: "footer_button"; label: string; action: Action; style: "primary" | "secondary"; bgColor: string; textColor: string; autoTextColor: boolean };

export type Section = { hero: HeroImage[]; body: (TitleText | ParagraphText | KeyValueRow | ListBlock | Divider | Spacer)[]; footer: FooterButton[] };
export type BubbleDoc = { type: "bubble"; title: string; section: Section };
export type CarouselDoc = { type: "carousel"; title: string; cards: { id: string; section: Section }[] };
export type DocModel = BubbleDoc | CarouselDoc;

export type ValidationIssue = { code: string; level: "error" | "warn"; message: string; path: string };
export type ValidationReport = { status: "draft" | "previewable" | "publishable"; errors: ValidationIssue[]; warnings: ValidationIssue[] };
