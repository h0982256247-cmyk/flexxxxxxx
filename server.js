import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/check-image", async (req, res) => {
  const url = String(req.query.url || "");
  if (!url.startsWith("https://")) {
    return res.status(400).json({ ok: false, level: "fail", reasonCode: "NOT_HTTPS" });
  }
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);

    const head = await fetch(url, { method: "HEAD", signal: controller.signal });
    let r = head;
    if (!head.ok) {
      r = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1024" }, signal: controller.signal });
    }
    clearTimeout(t);

    const contentType = r.headers.get("content-type") || "";
    const contentLength = Number(r.headers.get("content-length") || "0") || undefined;
    const isImage = /^image\/(jpeg|png|webp)/i.test(contentType);

    if (!r.ok) return res.json({ ok: false, level: "fail", reasonCode: "FETCH_FAIL", status: r.status, contentType, contentLength });
    if (!isImage) return res.json({ ok: false, level: "fail", reasonCode: "CONTENT_TYPE_INVALID", status: r.status, contentType, contentLength });

    if (contentLength && contentLength > 5 * 1024 * 1024) {
      return res.json({ ok: true, level: "warn", reasonCode: "TOO_LARGE", status: r.status, contentType, contentLength });
    }
    return res.json({ ok: true, level: "pass", status: r.status, contentType, contentLength });
  } catch (_e) {
    return res.json({ ok: false, level: "fail", reasonCode: "TIMEOUT_OR_NETWORK" });
  }
});

const dist = path.join(__dirname, "dist");
app.use(express.static(dist, { index: false }));

app.get("*", (_req, res) => {
  const indexPath = path.join(dist, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) res.status(200).send("Dev mode: run `npm run dev` and open Vite dev server.");
  });
});

const port = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(port, () => console.log(`[server] listening on :${port}`));
