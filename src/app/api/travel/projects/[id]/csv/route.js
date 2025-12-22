// src/app/api/travel/projects/[id]/csv/route.js
import { getJson } from "../../../../_cf";

export const runtime = "edge";

// These match your paper sheet A16-A31 order.
// If we can't map a receipt title into one of these, we append it at the bottom (future-proof).
const DEFAULT_CATEGORIES = [
  "HOTEL:",
  "BREAKFAST:9",
  "LUNCH:16",
  "DINNER:26",
  "RAILROAD/AIR/BUS FARES:",
  "LOCAL TRANSPORTATION:",
  "MILEAGE REIMBURSEMENT @ $0.7",
  "AUTO REPAIRS - TIRES:",
  "GAS-OIL LUBRICATION-WASH:",
  "TELEPHONE and TELEGRAPH:",
  "TIPS:",
  "ITEMIZED EXPENDITURES:",
  "AIRPORT PARKING:",
  "TOLL ROADS:",
  // Common item; kept as a default row near the bottom.
  // Note: We still map “car rental” receipts to LOCAL TRANSPORTATION automatically.
  "CAR RENTAL:",
  "", // spare
  "", // spare
];

function safeName(s) {
  return String(s || "").replace(/[^\w\-]+/g, "_").slice(0, 80);
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normalizeTitle(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

// Maps whatever the user typed (or any common variation) into a base sheet row key.
// IMPORTANT: “car rental” goes under LOCAL TRANSPORTATION.
function titleToCategoryKey(title) {
  const t = normalizeTitle(title);
  if (!t) return "";

  // Meals
  if (/\bbreakfast\b/.test(t)) return "BREAKFAST";
  if (/\blunch\b/.test(t)) return "LUNCH";
  if (/\bdinner\b/.test(t)) return "DINNER";

  // Hotel
  if (/\b(hotel|lodg|motel|inn|resort)\b/.test(t)) return "HOTEL";

  // Gas / oil / wash
  if (/\b(gas|fuel|gasoline|petrol|diesel|oil|lube|lubrication|car wash|wash)\b/.test(t)) {
    return "GAS-OIL LUBRICATION-WASH";
  }

  // Auto repairs / tires
  if (/\b(repair|service|maintenance|tire|tires|alignment|brake|brakes|mechanic)\b/.test(t)) {
    return "AUTO REPAIRS - TIRES";
  }

  // Mileage reimbursement
  if (/\b(mileage|miles|mi\.?\b|reimburse)\b/.test(t)) return "MILEAGE REIMBURSEMENT @ $0.7";

  // Phone / telecom
  if (/\b(phone|telephone|telegraph|cell|mobile|verizon|att|t[- ]mobile)\b/.test(t)) {
    return "TELEPHONE and TELEGRAPH";
  }

  // Tips
  if (/\b(tip|tips|gratuity)\b/.test(t)) return "TIPS";

  // Toll roads
  if (/\b(toll|tollway|turnpike)\b/.test(t)) return "TOLL ROADS";

  // Airport parking
  if (t.includes("airport") && /\b(parking|garage|lot)\b/.test(t)) return "AIRPORT PARKING";

  // General parking
  if (/\b(parking|garage|lot)\b/.test(t)) return "LOCAL TRANSPORTATION";

  // RAIL/AIR/BUS fares (plane/flight/train/bus)
  if (/\b(air|airfare|airline|flight|plane|ticket|rail|train|amtrak|bus|greyhound)\b/.test(t)) {
    return "RAILROAD/AIR/BUS FARES";
  }

  // Local transportation (uber/lyft/taxi/shuttle/transit)
  if (/\b(uber|lyft|taxi|cab|shuttle|transit|subway|metro|streetcar|tram)\b/.test(t)) {
    return "LOCAL TRANSPORTATION";
  }

  // Car rental: map to LOCAL TRANSPORTATION (per your requirement)
  if (
    /\b(rental)\b/.test(t) &&
    (/\bcar\b/.test(t) ||
      /\b(hertz|avis|budget|enterprise|alamo|national|sixt|thrifty|dollar)\b/.test(t))
  ) {
    return "LOCAL TRANSPORTATION";
  }

  // If nothing matched: return an uppercase label so it can be appended as a new row at the bottom.
  return String(title || "").trim().toUpperCase();
}

function centsFromAny(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v * 100);

  const s = String(v).trim();
  if (!s) return 0;

  // strip $ and commas
  const cleaned = s.replace(/[$,]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function isoToDateOnly(isoLike) {
  // accepts YYYY-MM-DD or datetime-local or ISO; returns YYYY-MM-DD if possible
  const s = String(isoLike || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildTravelDays(meta) {
  const start = isoToDateOnly(meta.travelStart);
  const end = isoToDateOnly(meta.travelEnd);
  if (!start || !end) return [];

  const ds = new Date(`${start}T00:00:00`);
  const de = new Date(`${end}T00:00:00`);
  if (Number.isNaN(ds.getTime()) || Number.isNaN(de.getTime())) return [];

  // inclusive list of dates
  const out = [];
  for (let d = new Date(ds); d <= de; d.setDate(d.getDate() + 1)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    out.push(`${yyyy}-${mm}-${dd}`);
  }
  return out;
}

// Returns an array of weeks, each week is 7 entries (Mon..Sun), each entry is {date, dayIndex} or null
function splitIntoWeeks(travelDays) {
  // build actual Date objects
  const days = travelDays.map((s) => new Date(`${s}T00:00:00`));
  if (!days.length) return [];

  // Find Monday of the first week
  const first = new Date(days[0]);
  const day = first.getDay(); // Sun=0..Sat=6
  // Convert to Mon-based index: Mon=0..Sun=6
  const monIndex = (day + 6) % 7;
  first.setDate(first.getDate() - monIndex);

  const last = new Date(days[days.length - 1]);
  const weeks = [];
  let cur = new Date(first);

  while (cur <= last) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, "0");
      const dd = String(cur.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      if (travelDays.includes(dateStr)) week.push(dateStr);
      else week.push(null);

      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function addMeals(meta, weekKey, weekSums, travelDays) {
  // We only insert meals if we have travel start/end and also have time-of-day hints.
  // For now, use date-only logic with provided fields if they exist:
  const startDT = String(meta.travelStartDateTime || "").trim();
  const endDT = String(meta.travelEndDateTime || "").trim();

  const startDate = isoToDateOnly(meta.travelStart);
  const endDate = isoToDateOnly(meta.travelEnd);

  // If no time inputs yet, still insert full meals across travel range (except your rules require times).
  // Keep current behavior conservative: only do time-based inclusion if times exist.
  const hasTimes = !!startDT && !!endDT;

  const startHour = hasTimes ? new Date(startDT).getHours() : null;
  const endHour = hasTimes ? new Date(endDT).getHours() : null;

  const firstDay = startDate;
  const lastDay = endDate;

  for (const d of travelDays) {
    // default full day meals
    let breakfast = true;
    let lunch = true;
    let dinner = true;

    // Apply your specific rules on first/last day when times are present:
    if (hasTimes) {
      if (d === firstDay) {
        // leave before 7am -> breakfast; otherwise no breakfast
        breakfast = startHour !== null ? startHour < 7 : breakfast;
      }
      if (d === lastDay) {
        // return after 7pm -> dinner; otherwise no dinner
        dinner = endHour !== null ? endHour >= 19 : dinner;
      }
    }

    // Build week day index (Mon..Sun)
    const week = weekKey;
    const weekIndex = week.findIndex((x) => x === d);
    if (weekIndex === -1) continue;

    const bump = (k, cents) => {
      if (!weekSums.has(k)) weekSums.set(k, [0, 0, 0, 0, 0, 0, 0]);
      weekSums.get(k)[weekIndex] += cents;
    };

    if (breakfast) bump("BREAKFAST", 900);
    if (lunch) bump("LUNCH", 1600);
    if (dinner) bump("DINNER", 2600);
  }
}

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const meta = await getJson(`travel/projects/${id}/meta.json`);
  if (!meta) return Response.json({ error: "Not found" }, { status: 404 });

  const travelDays = buildTravelDays(meta);
  if (!travelDays.length) {
    return Response.json({ error: "Project must have travelStart and travelEnd to export CSV." }, { status: 400 });
  }

  const weeks = splitIntoWeeks(travelDays);

  // Collect sums per week (weekKey is an array of 7 dates/nulls)
  const sumsByWeek = new Map();

  // receipts/photos -> add into week sums
  for (const p of Array.isArray(meta.photos) ? meta.photos : []) {
    const receiptDate = isoToDateOnly(p.receiptDate || p.uploadedAt || "");
    if (!receiptDate) continue;

    const categoryKey = titleToCategoryKey(p.title || "");

    const amountCents = centsFromAny(p.amount);
    if (!amountCents) continue;

    // find the week and day index where this date lands
    for (const weekKey of weeks) {
      const dayIdx = weekKey.findIndex((d) => d === receiptDate);
      if (dayIdx === -1) continue;

      if (!sumsByWeek.has(weekKey)) sumsByWeek.set(weekKey, new Map());
      const weekSums = sumsByWeek.get(weekKey);

      if (!weekSums.has(categoryKey)) weekSums.set(categoryKey, [0, 0, 0, 0, 0, 0, 0]);
      weekSums.get(categoryKey)[dayIdx] += amountCents;
      break;
    }
  }

  // Add meals (if you have date/time inputs)
  for (const weekKey of weeks) {
    if (!sumsByWeek.has(weekKey)) sumsByWeek.set(weekKey, new Map());
    const weekSums = sumsByWeek.get(weekKey);
    addMeals(meta, weekKey, weekSums, travelDays);
  }

  // Emit CSV
  const lines = [];
  const location = [meta.locationCity, meta.locationState].filter(Boolean).join(", ");

  // Base keys that are always present in the sheet (anything else will append below)
  const defaultBaseKeys = new Set(
    DEFAULT_CATEGORIES.map((rowLabel) => String(rowLabel || "").split(":")[0].trim().toUpperCase())
  );

  for (const weekKey of weeks) {
    const headerDates = weekKey.map((d) => (d ? d : ""));

    lines.push(["", "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(csvEscape).join(","));
    lines.push(["Company", ...new Array(7).fill(meta.customerName || "")].map(csvEscape).join(","));
    lines.push(["City/State", ...new Array(7).fill(location || "")].map(csvEscape).join(","));
    lines.push(["Category", ...headerDates].map(csvEscape).join(","));

    const weekSums = sumsByWeek.get(weekKey) || new Map();

    // Default sheet rows
    for (const rowLabel of DEFAULT_CATEGORIES) {
      const base = String(rowLabel || "");
      const baseKey = base.split(":")[0].trim().toUpperCase();

      const arr = weekSums.get(baseKey) || [0, 0, 0, 0, 0, 0, 0];
      const dollars = arr.map((c) => (c ? (c / 100).toFixed(2) : ""));

      lines.push([rowLabel, ...dollars].map(csvEscape).join(","));
    }

    // Future-proof: append any unmatched categories so you don't lose money in export
    const extraKeys = [...weekSums.keys()]
      .filter((k) => k && !defaultBaseKeys.has(k))
      .sort((a, b) => a.localeCompare(b));

    for (const k of extraKeys) {
      const arr = weekSums.get(k) || [0, 0, 0, 0, 0, 0, 0];
      const dollars = arr.map((c) => (c ? (c / 100).toFixed(2) : ""));
      lines.push([k, ...dollars].map(csvEscape).join(","));
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
