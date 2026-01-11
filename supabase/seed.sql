-- =========================================
-- OPTIONAL: Seed Data
-- Run this to insert example drafts into your database.
-- IMPORTANT: Replace 'USER_ID_HERE' with your actual Supabase User UUID!
-- =========================================

-- Template 1: Bubble
INSERT INTO public.docs (owner_id, type, title, content, status)
VALUES (
  'USER_ID_HERE', -- <--- REPLACE THIS
  'bubble',
  '範本：Bubble',
  '{
    "type": "bubble",
    "title": "範本：Bubble",
    "section": {
      "hero": [{
        "id": "hero_seed1",
        "kind": "hero_image",
        "enabled": true,
        "image": { "kind": "external", "url": "/placeholder.svg", "lastCheck": { "ok": true, "level": "pass" } },
        "ratio": "16:9",
        "mode": "cover"
      }],
      "body": [
        { "id": "t_seed1", "kind": "title", "enabled": true, "text": "你的主標題", "size": "lg", "weight": "bold", "color": "#111111", "align": "start" },
        { "id": "p_seed1", "kind": "paragraph", "enabled": true, "text": "範本內容...", "size": "md", "color": "#333333", "wrap": true }
      ],
      "footer": [
        { "id": "btn_seed1", "kind": "footer_button", "enabled": true, "label": "按鈕範例", "action": { "type": "uri", "uri": "https://google.com" }, "style": "primary", "bgColor": "#0A84FF", "textColor": "#FFFFFF", "autoTextColor": true }
      ]
    }
  }'::jsonb,
  'draft'
);

-- Template 2: Carousel
INSERT INTO public.docs (owner_id, type, title, content, status)
VALUES (
  'USER_ID_HERE', -- <--- REPLACE THIS
  'carousel',
  '範本：Carousel',
  '{
    "type": "carousel",
    "title": "範本：Carousel",
    "cards": [
      {
        "id": "card_seed1",
        "section": {
          "hero": [{ "id": "h1", "kind": "hero_image", "enabled": true, "image": { "kind": "external", "url": "/placeholder.svg" }, "ratio": "16:9", "mode": "cover" }],
          "body": [{ "id": "b1", "kind": "title", "enabled": true, "text": "卡片 1", "size": "md", "weight": "bold", "color": "#000", "align": "start" }],
          "footer": []
        }
      },
      {
        "id": "card_seed2",
        "section": {
          "hero": [{ "id": "h2", "kind": "hero_image", "enabled": true, "image": { "kind": "external", "url": "/placeholder.svg" }, "ratio": "16:9", "mode": "cover" }],
          "body": [{ "id": "b2", "kind": "title", "enabled": true, "text": "卡片 2", "size": "md", "weight": "bold", "color": "#000", "align": "start" }],
          "footer": []
        }
      }
    ]
  }'::jsonb,
  'draft'
);
