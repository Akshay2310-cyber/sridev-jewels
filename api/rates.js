// Today's Coimbatore / Chennai retail gold and silver rate, per gram, in rupees.
// Tamil Nadu jewellers price off the Chennai rate, which runs higher than the IBJA bullion benchmark,
// so these are the numbers a Coimbatore customer sees in a showroom (before GST and making charges).
// Primary: Goodreturns, Coimbatore pages. Fallback for gold: LiveChennai's daily Chennai table.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const GOLD = "https://www.goodreturns.in/gold-rates/coimbatore.html";
const SILVER = "https://www.goodreturns.in/silver-rates/coimbatore.html";
const CHENNAI = "https://www.livechennai.com/gold_silverrate.asp";

const num = s => {
  const n = Number(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(url + " responded " + r.status);
  return r.text();
}

function byId(html, id) {
  const m = html.match(new RegExp('id="' + id + '"[^>]*>\\s*(?:&#x20b9;|₹)?\\s*([0-9,]+)'));
  return m ? num(m[1]) : null;
}

function pageDate(html) {
  const m = html.match(/id="metal-price-date"[^>]*>\s*([^<]+)/);
  if (!m) return null;
  const d = new Date(m[1].trim() + " UTC");
  return isNaN(d) ? null : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

async function goodreturns() {
  const [g, s] = await Promise.allSettled([get(GOLD), get(SILVER)]);
  if (g.status !== "fulfilled") throw g.reason;
  const html = g.value;
  const gold24 = byId(html, "24K-price"), gold22 = byId(html, "22K-price"), gold18 = byId(html, "18K-price");
  const date = pageDate(html);
  if (!gold22 || !gold24 || !date) throw new Error("Goodreturns page format changed");
  const silver = s.status === "fulfilled" ? byId(s.value, "silver-1g-price") : null;
  return { date, gold24, gold22, gold18, silver, city: "Coimbatore", source: "Goodreturns" };
}

// first row of the daily table: 30/Oct/2026 14,225 113,800 13,040 104,320 (24K 1g, 8g, 22K 1g, 8g)
async function liveChennai() {
  const text = (await get(CHENNAI)).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const m = text.match(/(\d{2})\/([A-Za-z]{3})\/(\d{4}) ([\d,]+) [\d,]+ ([\d,]+) [\d,]+/);
  if (!m) throw new Error("LiveChennai page format changed");
  const d = new Date(`${m[1]} ${m[2]} ${m[3]} UTC`);
  const gold24 = num(m[4]), gold22 = num(m[5]);
  if (!gold22 || !gold24 || isNaN(d)) throw new Error("LiveChennai page format changed");
  const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return { date, gold24, gold22, gold18: null, silver: null, city: "Chennai", source: "LiveChennai" };
}

export default async function handler(req, res) {
  let out, err;
  for (const src of [goodreturns, liveChennai]) {
    try { out = await src(); break; } catch (e) { err = e; }
  }
  if (!out) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: String(err && err.message || err) });
  }
  res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
  res.status(200).json(out);
}
