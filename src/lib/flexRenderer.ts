// src/lib/flexRenderer.ts
type CmsContent = {
    type: "carousel";
    title?: string;
    cards: CmsCard[];
};

type CmsCard = {
    id: string;
    section: {
        hero?: CmsHeroItem[];
        body?: CmsBodyItem[];
        footer?: CmsFooterItem[];
    };
};

type CmsHeroItem = {
    kind: "hero_image";
    enabled?: boolean;
    mode?: "cover" | "fit";
    ratio?: string; // "16:9"
    image?: { url?: string };
};

type CmsBodyItem =
    | {
        kind: "title";
        enabled?: boolean;
        text?: string;
        size?: "sm" | "md" | "lg" | "xl";
        align?: "start" | "center" | "end";
        color?: string;
        weight?: "regular" | "bold";
        wrap?: boolean;
    }
    | {
        kind: "paragraph";
        enabled?: boolean;
        text?: string;
        size?: "sm" | "md" | "lg" | "xl";
        align?: "start" | "center" | "end";
        color?: string;
        wrap?: boolean;
    };

type CmsFooterItem = {
    kind: "footer_button";
    enabled?: boolean;
    label?: string;
    style?: "primary" | "secondary" | "link";
    bgColor?: string;
    textColor?: string;
    action?: { type: "uri"; uri: string };
};

type LineFlexContents =
    | { type: "bubble"; hero?: any; body?: any; footer?: any; styles?: any }
    | { type: "carousel"; contents: any[] };

function toAbsUrl(url: string, assetBaseUrl?: string) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (/^\/\//.test(url)) return `https:${url}`;
    if (assetBaseUrl) {
        const base = assetBaseUrl.replace(/\/$/, "");
        const path = url.startsWith("/") ? url : `/${url}`;
        return `${base}${path}`;
    }
    return url;
}

function mapTextSize(size?: string) {
    switch (size) {
        case "sm":
            return "sm";
        case "md":
            return "md";
        case "lg":
            return "lg";
        case "xl":
            return "xl";
        default:
            return "md";
    }
}

function mapAlign(align?: string) {
    if (align === "center" || align === "end" || align === "start") return align;
    return "start";
}

function isEnabled(v: any) {
    return v?.enabled !== false;
}

export function renderFlexFromContent(
    content: CmsContent,
    opts?: { assetBaseUrl?: string }
): LineFlexContents {
    if (!content || content.type !== "carousel" || !Array.isArray(content.cards)) {
        throw new Error("Invalid CMS content schema");
    }

    const bubbles = content.cards.map((card) => {
        const heroItems = (card.section.hero || []).filter(isEnabled);
        const bodyItems = (card.section.body || []).filter(isEnabled);
        const footerItems = (card.section.footer || []).filter(isEnabled);

        const heroImage = heroItems.find((x) => x.kind === "hero_image") as CmsHeroItem | undefined;
        const hero =
            heroImage?.image?.url
                ? {
                    type: "image",
                    url: toAbsUrl(heroImage.image.url, opts?.assetBaseUrl),
                    size: "full",
                    aspectRatio: heroImage.ratio || "16:9",
                    aspectMode: heroImage.mode === "fit" ? "fit" : "cover",
                }
                : undefined;

        const bodyContents: any[] = [];
        for (const item of bodyItems) {
            if (item.kind === "title") {
                bodyContents.push({
                    type: "text",
                    text: item.text || "",
                    weight: item.weight === "bold" ? "bold" : "bold",
                    size: mapTextSize(item.size || "lg"),
                    color: item.color || "#111111",
                    align: mapAlign(item.align),
                    wrap: item.wrap !== false,
                });
            }
            if (item.kind === "paragraph") {
                bodyContents.push({
                    type: "text",
                    text: item.text || "",
                    size: mapTextSize(item.size || "md"),
                    color: item.color || "#333333",
                    align: mapAlign(item.align),
                    wrap: item.wrap !== false,
                    margin: "md",
                });
            }
        }

        const body = {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: bodyContents.length ? bodyContents : [{ type: "text", text: " ", size: "xs" }],
        };

        const btn = footerItems.find((x) => x.kind === "footer_button") as CmsFooterItem | undefined;
        const footer =
            btn?.action?.uri
                ? {
                    type: "box",
                    layout: "vertical",
                    spacing: "sm",
                    contents: [
                        {
                            type: "button",
                            style: btn.style === "secondary" ? "secondary" : "primary",
                            color: btn.bgColor || undefined,
                            action: {
                                type: "uri",
                                label: (btn.label || "查看").slice(0, 20),
                                uri: btn.action.uri,
                            },
                        },
                    ],
                    flex: 0,
                }
                : undefined;

        return {
            type: "bubble",
            hero,
            body,
            footer,
            styles: {
                body: { backgroundColor: "#FFFFFF" },
                footer: { backgroundColor: "#FFFFFF" },
            },
        };
    });

    return { type: "carousel", contents: bubbles };
}
