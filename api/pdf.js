// Vercel serverless function — מקבל HTML ומחזיר PDF
// נתיב: /api/pdf   (הקובץ חייב לשבת בתיקיית api/ בשורש הריפו)

const CHROMIUM_VERSION = process.env.CHROMIUM_VERSION || "133.0.0";
const PACK_URL = `https://github.com/Sparticuz/chromium/releases/download/v${CHROMIUM_VERSION}/chromium-v${CHROMIUM_VERSION}-pack.tar`;

const SUPABASE_URL = process.env.SUPABASE_URL || "https://lbqscxwfttiduofjjmyt.supabase.co";
// המפתח האנונימי ציבורי (מוטמע גם באפליקציה). משתנה הסביבה קודם; אם Supabase דוחה אותו, משתמשים במובנה
const BUILTIN_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicXNjeHdmdHRpZHVvZmpqbXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzUwNTksImV4cCI6MjA5NDAxMTA1OX0.pPFtxoO5UhRt_UFxJxFOy8zbwLK4OXnk6lxRUGhZack";
const SUPABASE_ANONS = [...new Set([(process.env.SUPABASE_ANON_KEY || "").trim().replace(/^['"]|['"]$/g, ""), BUILTIN_ANON].filter(Boolean))];

// מוודא שהבקשה הגיעה ממשתמש מחובר, כדי שהנקודה לא תהיה פתוחה לכל העולם
// מחזיר null כשהבקשה מורשית, אחרת סיבת הדחייה
async function verifyUser(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return "missing token";
  const token = auth.slice(7);
  let reason = "supabase unreachable";
  for (const apikey of SUPABASE_ANONS) {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey, Authorization: `Bearer ${token}` },
      });
      if (r.ok) return null;
      reason = `supabase ${r.status}`;
      if (r.status !== 401) return reason; // טוקן משתמש לא תקין — אין טעם לנסות מפתח אחר
    } catch (e) { reason = "supabase unreachable"; }
  }
  return reason;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const denied = await verifyUser(req);
  if (denied) {
    res.status(401).json({ error: "unauthorized (" + denied + ")" });
    return;
  }

  const { html, filename } = req.body || {};
  if (!html || typeof html !== "string") {
    res.status(400).json({ error: "missing html" });
    return;
  }

  let browser;
  try {
    const chromium = (await import("@sparticuz/chromium-min")).default;
    const puppeteer = (await import("puppeteer-core")).default;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1240, height: 1754 },
      executablePath: await chromium.executablePath(PACK_URL),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    // נותן לפונט מגוגל להיטען לפני הרינדור
    try { await page.evaluateHandle("document.fonts.ready"); } catch (e) {}

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename || "document")}.pdf"`
    );
    res.status(200).send(Buffer.from(pdf));
  } catch (err) {
    console.error("pdf error:", err);
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
  }
}
