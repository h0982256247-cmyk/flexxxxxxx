import React, { useMemo } from "react";
import { DocModel } from "@/lib/types";
import { buildFlex } from "@/lib/buildFlex";

export default function FlexPreview({ doc, flex }: { doc?: DocModel; flex?: any }) {
  const content = useMemo(() => {
    if (flex) return flex;
    if (doc) return buildFlex(doc);
    return null;
  }, [doc, flex]);

  if (!content) return null;

  // Handle Flex Message Wrapper
  const root = content.type === "flex" ? content.contents : content;

  if (root.type === "carousel") {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
        {root.contents.map((bubble: any, i: number) => (
          <div key={i} className="min-w-[300px] max-w-[300px] snap-center">
            <FlexBubble bubble={bubble} />
          </div>
        ))}
      </div>
    );
  }

  if (root.type === "bubble") {
    return <FlexBubble bubble={root} />;
  }

  return <div>Unsupported Flex Type</div>;
}

function FlexBubble({ bubble }: { bubble: any }) {
  return (
    <div className="bg-white rounded-t-[20px] rounded-b-[20px] overflow-hidden border border-gray-200 shadow-sm font-sans">
      {/* Hero */}
      {bubble.hero && <FlexImage node={bubble.hero} className="w-full" />}

      {/* Body */}
      {bubble.body && (
        <div className="p-4">
          <FlexBox box={bubble.body} />
        </div>
      )}

      {/* Footer */}
      {bubble.footer && (
        <div className="p-4 pt-0">
          <FlexBox box={bubble.footer} />
        </div>
      )}
    </div>
  );
}

function FlexBox({ box }: { box: any }) {
  if (!box.contents || !Array.isArray(box.contents)) return null;

  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: box.layout === "vertical" ? "column" : "row",
    gap: getSize(box.spacing),
    alignItems: box.layout === "baseline" ? "baseline" : "stretch",
  };

  return (
    <div style={style}>
      {box.contents.map((node: any, i: number) => (
        <FlexNode key={i} node={node} />
      ))}
    </div>
  );
}

function FlexNode({ node }: { node: any }) {
  if (node.type === "box") return <FlexBox box={node} />;
  if (node.type === "text") return <FlexText node={node} />;
  if (node.type === "button") return <FlexButton node={node} />;
  if (node.type === "image") return <FlexImage node={node} />;
  if (node.type === "separator") return <div className="h-px bg-gray-200" style={{ marginTop: getSize(node.margin), marginBottom: getSize(node.margin) }} />;
  if (node.type === "spacer") return <div style={{ height: getSize(node.size) }} />;
  return null;
}

function FlexText({ node }: { node: any }) {
  const style: React.CSSProperties = {
    flex: node.flex,
    fontSize: getSize(node.size) || "14px",
    fontWeight: node.weight === "bold" ? 700 : 400,
    color: node.color || "#000000",
    textAlign: node.align || "left",
    whiteSpace: node.wrap ? "pre-wrap" : "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  return <div style={style}>{node.text}</div>;
}

function FlexButton({ node }: { node: any }) {
  const handleClick = () => {
    if (node.action) {
      if (node.action.type === "uri") window.open(node.action.uri, "_blank");
      if (node.action.type === "message") alert(`[模擬訊息] ${node.action.text}`);
    }
  };

  const style: React.CSSProperties = {
    height: node.height === "sm" ? "40px" : "48px",
    backgroundColor: node.style === "primary" ? (node.color || "#000000") : "transparent",
    color: node.style === "primary" ? "#FFFFFF" : (node.color || "#000000"),
    borderRadius: "4px",
    fontWeight: 700,
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };

  return <button style={style} onClick={handleClick}>{node.action?.label || node.action?.text || "按鈕"}</button>;
}

function FlexImage({ node, className }: { node: any; className?: string }) {
  const style: React.CSSProperties = {
    width: "100%",
    aspectRatio: node.aspectRatio?.replace(":", "/") || "auto",
    objectFit: node.aspectMode || "cover",
  };
  return <img src={node.url} style={style} className={className} alt="" />;
}

function getSize(token: string) {
  const map: any = {
    xs: "0.75rem", sm: "0.875rem", md: "1rem", lg: "1.125rem", xl: "1.25rem",
    xxl: "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem", "5xl": "3rem"
  };
  // Handle pixel sizes if necessary, but standard tokens are usually mapped
  // Spacing box
  const spaceMap: any = {
    xs: "2px", sm: "4px", md: "8px", lg: "12px", xl: "16px", xxl: "24px"
  };
  return spaceMap[token] || map[token] || token;
}
