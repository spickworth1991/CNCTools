import { getJson } from "../../../../_cf";

export const runtime = "edge";

// Default rows (A16-A31) from your sheet. You can edit these later.
const DEFAULT_CATEGORIES = [
  "HOTEL",
  "BREAKFAST:9",
  "LUNCH:16",
  "DINNER:26",
  "RAILROAD/AIR/BUS FARES",
  "LOCAL TRANSPORTATION",
  "CAR RENTAL",
  "MILEAGE REIMBURSEMENT @ $0.7",
  "AUTO REPAIRS - TIRES",
  "GAS-OIL LUBRICATION-WASH",
  "TELEPHONE and TELEGRAPH",
  "TIPS",
  "ITEMIZED EXPENDITURES",
  "AIRPORT PARKING",
  "TOLL ROADS",
  "", // spare
  "", // spare
];

const EASTERN_TZ = "America/Detroit";

function safeName(s) {
  return String(s || "expense").replace(/[^\w\-]+/g, "_").slice(0, 80);
}

function parseYMD(ymd) {
  // ymd expected "YYYY-MM-DD"
  const [y, m, d] = String(ymd || "").split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function formatMD(dateUtc) {
  const y = dateUtc.getUTCFullYear();
  const m = String(dateUtc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dateUtc.getUTCDate()).padStart(2, "0");
  return `${m}/${d}/${y}`;
}

function addDays(dateUtc, n) {
  const d = new Date(dateUtc);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function mondayOf(dateUtc) {
  // Monday = 1, Sunday = 0 in JS getUTCDay
  const dow = dateUtc.getUTCDay(); // 0..6
  const delta = (dow === 0 ? -6 : 1 - dow);
  return addDays(dateUtc, delta);
}

function ymdFromAnyDateish(s) {
  if (!s) return "";
  // If ISO string, take first 10. If already yyyy-mm-dd, ok.
  const str = String(s);
  const m = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function titleToCategoryKey(title) {
  const t = String(title || "").trim().toUpperCase();
  // normalize common cases
  if (t === "BREAKFAST") return "BREAKFAST";
  if (t === "LUNCH") return "LUNCH";
  if (t === "DINNER") return "DINNER";
  if (t === "GAS" || t === "FUEL" || t === "GASOLINE") return "GAS-OIL LUBRICATION-WASH";
  if (t === "CAR RENTAL" || t === "RENTAL CAR" || t === "RENTAL") return "CAR RENTAL";
  return t;
}

function parseDateTimeLocal(s) {
  const v = String(s || "").trim();
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  if (!y || !mo || !d) return null;
  return { y, mo, d, hh: Number.isFinite(hh) ? hh : 0, mm: Number.isFinite(mm) ? mm : 0 };
}

function shouldIncludeMealForDay(meta, dayUtc, mealKey) {
  // Heuristic: include per-diem meals for all days.
  // On the FIRST travel day, omit meals that occur before the start time.
  // If we can't parse start time, include everything.
  const start = parseDateTimeLocal(meta?.travelStartDateTime);
  if (!start) return true;

  const dayY = dayUtc.getUTCFullYear();
  const dayM = dayUtc.getUTCMonth() + 1;
  const dayD = dayUtc.getUTCDate();

  const isFirstDay = dayY === start.y && dayM === start.mo && dayD === start.d;
  if (!isFirstDay) return true;

  // Cutoffs (local-ish): breakfast 10, lunch 14, dinner 19
  const startMinutes = start.hh * 60 + start.mm;
  const cutoff = mealKey === "BREAKFAST" ? 10 * 60 : mealKey === "LUNCH" ? 14 * 60 : 19 * 60;
  return startMinutes < cutoff;
}

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const meta = await getJson(`travel/projects/${id}/meta.json`);
  if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });

  const travelStart = parseYMD(meta.travelStart);
  const travelEnd = parseYMD(meta.travelEnd);
  if (!travelStart || !travelEnd) {
    return Response.json({ error: "Project must have travelStart + travelEnd to export CSV." }, { status: 400 });
  }

  // Build inclusive list of dates
  const days = [];
  for (let d = travelStart; d <= travelEnd; d = addDays(d, 1)) {
    days.push(d);
  }

  // Group travel days by week Monday
  const weeks = new Map(); // mondayYMD -> dates[]
  for (const d of days) {
    const mon = mondayOf(d);
    const key = `${mon.getUTCFullYear()}-${String(mon.getUTCMonth() + 1).padStart(2, "0")}-${String(
      mon.getUTCDate()
    ).padStart(2, "0")}`;
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key).push(d);
  }

  // Index receipts by (weekMondayKey, dowIndex 0..6) and category
  // Columns are Monday..Sunday => dowIndex = 0..6 (Mon=0)
  const sums = new Map(); // weekKey -> Map<catKey, number[7]>
  const photos = Array.isArray(meta.photos) ? meta.photos : [];

  // Auto-fill per-diem meals (Breakfast/Lunch/Dinner) across the travel days.
  // This makes the sheet fill in even when you didn't upload meal receipts.
  const MEAL_CENTS = { BREAKFAST: 900, LUNCH: 1600, DINNER: 2600 };
  for (const day of days) {
    const mon = mondayOf(day);
    const weekKey = `${mon.getUTCFullYear()}-${String(mon.getUTCMonth() + 1).padStart(2, "0")}-${String(
      mon.getUTCDate()
    ).padStart(2, "0")}`;
    const dow = day.getUTCDay(); // Sun=0..Sat=6
    const col = dow === 0 ? 6 : dow - 1; // Mon=0..Sun=6

    if (!sums.has(weekKey)) sums.set(weekKey, new Map());
    const w = sums.get(weekKey);

    for (const mealKey of ["BREAKFAST", "LUNCH", "DINNER"]) {
      if (!shouldIncludeMealForDay(meta, day, mealKey)) continue;
      if (!w.has(mealKey)) w.set(mealKey, [0, 0, 0, 0, 0, 0, 0]);
      w.get(mealKey)[col] += MEAL_CENTS[mealKey] || 0;
    }
  }

  for (const p of photos) {
    const cents = Number(p?.amountCents);
    if (!Number.isFinite(cents) || cents <= 0) continue;

    const ymd = ymdFromAnyDateish(p?.receiptDate || p?.uploadedAt);
    const d = parseYMD(ymd);
    if (!d) continue;

    const mon = mondayOf(d);
    const weekKey = `${mon.getUTCFullYear()}-${String(mon.getUTCMonth() + 1).padStart(2, "0")}-${String(
      mon.getUTCDate()
    ).padStart(2, "0")}`;

    const dow = d.getUTCDay(); // Sun=0..Sat=6
    const col = dow === 0 ? 6 : dow - 1; // Mon=0..Sun=6

    const catKey = titleToCategoryKey(p?.title);
    if (!sums.has(weekKey)) sums.set(weekKey, new Map());
    const w = sums.get(weekKey);
    if (!w.has(catKey)) w.set(catKey, [0, 0, 0, 0, 0, 0, 0]);
    w.get(catKey)[col] += cents;
  }

  // Emit CSV
  const lines = [];
  const location = [meta.locationCity, meta.locationState].filter(Boolean).join(", ");

  for (const [weekKey, travelDates] of [...weeks.entries()].sort()) {
    const mon = parseYMD(weekKey);
    const headerDates = [0, 1, 2, 3, 4, 5, 6].map((i) => formatMD(addDays(mon, i)));

    // Fill company/city across only the travel-day columns for this week.
    const activeCols = [false, false, false, false, false, false, false];
    for (const d of travelDates) {
      const dow = d.getUTCDay();
      const col = dow === 0 ? 6 : dow - 1;
      activeCols[col] = true;
    }
    const fillAcross = (label, value) => {
      const row = [label];
      for (let i = 0; i < 7; i++) row.push(activeCols[i] ? (value || "") : "");
      return row;
    };

    lines.push(csvEscape(`WEEK OF ${formatMD(mon)}`));
    lines.push(["", "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(csvEscape).join(","));
    lines.push(fillAcross("Company", meta.customerName || "").map(csvEscape).join(","));
    lines.push(fillAcross("City/State", location || "").map(csvEscape).join(","));
    lines.push(["Category", ...headerDates].map(csvEscape).join(","));

    const weekSums = sums.get(weekKey) || new Map();

    for (const rowLabel of DEFAULT_CATEGORIES) {
      const base = String(rowLabel || "");
      const baseKey = base.split(":")[0].trim().toUpperCase();

      const arr = weekSums.get(baseKey) || [0, 0, 0, 0, 0, 0, 0];
      const dollars = arr.map((c) => (c ? (c / 100).toFixed(2) : ""));

      lines.push([rowLabel, ...dollars].map(csvEscape).join(","));
    }

    lines.push(""); // blank line between weeks
  }

  const csv = lines.join("\n");
  const filename = `${safeName(meta.serviceReportNumber || `project_${id}`)}_expense.csv`;

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store, max-age=0",
    },
  });
}
