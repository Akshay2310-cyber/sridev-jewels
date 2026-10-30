// Today's gold and silver benchmark from IBJA (ibjarates.com), per gram, in rupees.
// IBJA publishes an AM and a PM rate on trading days; the PM rate is used once it is out.
// Gold rates are quoted per 10 g and silver per kg, so they are converted here.

const SOURCE = "https://ibjarates.com/";

function pick(html, id) {
  const m = html.match(new RegExp('id="' + id + '"[^>]*>\\s*([0-9.,]+)'));
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function session(html, key) {
  const pm = pick(html, "lbl" + key + "_PM");
  if (pm) return { value: pm, session: "PM" };
  const am = pick(html, "lbl" + key + "_AM");
  return am ? { value: am, session: "AM" } : null;
}

// the silver chart holds the latest published silver rates (per kg) with their dates (dd/mm/yyyy)
function silverSeries(html) {
  const m = html.match(/id="HdnSilver"\s+value="([^"]+)"/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1].replace(/&quot;/g, '"'));
    const last = data.labels[data.labels.length - 1];
    const [d, mo, y] = last.split("/").map(Number);
    const date = new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    return { date, silver: Number(data.silverRate[data.silverRate.length - 1]) };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const r = await fetch(SOURCE, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; SriDevJewels/1.0; +https://sridevjewels.in)" },
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) throw new Error("IBJA responded " + r.status);
    const html = await r.text();

    const series = silverSeries(html);
    if (!series) throw new Error("IBJA page format changed");
    let out;
    const g999 = session(html, "Gold999"), g916 = session(html, "Gold916"), g750 = session(html, "Gold750"), s999 = session(html, "Silver999");
    if (g999 && g916 && g750 && s999) {
      // today's AM or PM rate is out. The history tables only run to the previous published day, so if
      // today's AM 999 differs from the newest history row, these rates belong to today (IST).
      const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      const hist = text.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{5,7})/);
      const am999 = pick(html, "lblGold999_AM");
      let date = series.date;
      if (hist && am999 && Number(hist[4]) !== am999) {
        date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
      } else if (hist) {
        date = new Date(Date.UTC(+hist[3], +hist[2] - 1, +hist[1])).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
      }
      out = { date, session: g916.session, gold24: g999.value / 10, gold22: g916.value / 10, gold18: g750.value / 10, silver: s999.value / 1000 };
    } else {
      // before today's first publish the session fields are blank; use the last published rates and their date
      const c999 = pick(html, "GoldRatesCompare999"), c916 = pick(html, "GoldRatesCompare916"), c750 = pick(html, "GoldRatesCompare750");
      if (!c999 || !c916 || !c750 || !series.silver) throw new Error("IBJA page format changed");
      out = { date: series.date, session: "PM", gold24: c999, gold22: c916, gold18: c750, silver: series.silver / 1000 };
    }

    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
    res.status(200).json({ ...out, source: "IBJA" });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: String(e && e.message || e) });
  }
}
