// Vercel serverless function — מקבל HTML ומחזיר PDF
// נתיב: /api/pdf   (הקובץ חייב לשבת בתיקיית api/ בשורש הריפו)

const CHROMIUM_VERSION = process.env.CHROMIUM_VERSION || "133.0.0";
const PACK_URL = `https://github.com/Sparticuz/chromium/releases/download/v${CHROMIUM_VERSION}/chromium-v${CHROMIUM_VERSION}-pack.tar`;

const SUPABASE_URL = process.env.SUPABASE_URL || "https://lbqscxwfttiduofjjmyt.supabase.co";
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || "";

// מוודא שהבקשה הגיעה ממשתמש מחובר, כדי שהנקודה לא תהיה פתוחה לכל העולם
async function verifyUser(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  if (!SUPABASE_ANON) return true; // לא הוגדר מפתח — מדלגים על הבדיקה
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` },
    });
    return r.ok;
  } catch (e) { return false; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  if (!(await verifyUser(req))) {
    res.status(401).json({ error: "unauthorized" });
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
