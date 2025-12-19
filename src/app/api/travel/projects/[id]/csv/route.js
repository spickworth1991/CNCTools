// src/app/api/travel/projects/[id]/csv/route.js
import { getJson } from "../../../../_cf";

export const runtime = "edge";

function safeName(s) {
  return String(s || "expense").replace(/[^\w\-]+/g, "_").slice(0, 80);
}

function parseYMD(ymd) {
  const [y, m, d] = String(ymd || "").split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function ymdFromDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function mondayOf(dateUtcNoon) {
  const day = dateUtcNoon.getUTCDay(); // 0 Sun..6 Sat
  const diffToMon = (day + 6) % 7; // Mon->0, Tue->1, ... Sun->6
  const mon = new Date(dateUtcNoon);
  mon.setUTCDate(mon.getUTCDate() - diffToMon);
  return mon;
}

function addDaysUtcNoon(d, days) {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function inRange(d, start, end) {
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function dayIndexMon0(dUtcNoon) {
  const day = dUtcNoon.getUTCDay(); // 0 Sun..6 Sat
  return (day + 6) % 7; // Mon=0..Sun=6
}

function parseReceiptDate(photo) {
  if (photo?.receiptDate) {
    const d = parseYMD(photo.receiptDate);
    if (d) return d;
  }
  if (photo?.uploadedAt) {
    const dd = new Date(photo.uploadedAt);
    if (!Number.isNaN(dd.getTime())) {
      return new Date(Date.UTC(dd.getFullYear(), dd.getMonth(), dd.getDate(), 12, 0, 0));
    }
  }
  return null;
}

function sumCell(grid, rowKey, colIdx, amount) {
  if (!amount || Number.isNaN(amount)) return;
  if (!grid[rowKey]) grid[rowKey] = Array(7).fill(0);
  grid[rowKey][colIdx] = (grid[rowKey][colIdx] || 0) + amount;
}

function categorize(title) {
  const t = String(title || "").toLowerCase();

  if (t.includes("hotel") || t.includes("motel") || t.includes("inn")) return "HOTEL:";

  // GAS row label (exact)
  if (
    t.includes("gas") ||
    t.includes("fuel") ||
    t.includes("shell") ||
    t.includes("bp") ||
    t.includes("chevron") ||
    t.includes("exxon")
  ) {
    return "GAS-OIL LUBRICATION-WASH:";
  }

  // Rental car -> Local transportation
  if (
    t.includes("rental") ||
    t.includes("rent a car") ||
    t.includes("enterprise") ||
    t.includes("hertz") ||
    t.includes("avis") ||
    t.includes("budget")
  ) {
    return "LOCAL TRANSPORTATION:";
  }

  if (t.includes("parking")) return "AIRPORT PARKING:";
  if (t.includes("toll")) return "TOLL ROADS:";

  if (t.includes("breakfast")) return "BREAKFAST:9";
  if (t.includes("lunch")) return "LUNCH:16";
  if (t.includes("dinner")) return "DINNER:26";

  return "";
}

function baseRows() {
  return [
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
    "", // custom 1
    "", // custom 2
  ];
}

function fmtMoney(n) {
  if (!n) return "";
  return (Math.round(n * 100) / 100).toFixed(2);
}

function parseTimeFromDateTimeLocal(dtLocal) {
  // "YYYY-MM-DDTHH:mm"
  const m = String(dtLocal || "").match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  return { hh: Number(m[1]), mm: Number(m[2]) };
}

function blankRow() {
  return Array(8).fill("");
}

function csvEscape(cell) {
  const s = String(cell ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildWeekBlock({
  weekMon,
  start,
  end,
  meta,
  photos,
}) {
  const rows = [];

  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysUtcNoon(weekMon, i));
  const company = String(meta.customerName || "").trim();
  const cityState = `${String(meta.locationCity || "").trim()}${meta.locationState ? ", " + String(meta.locationState).trim() : ""}`.trim();

  const companyRow = weekDays.map((d) => (inRange(d, start, end) ? company : ""));
  const cityRow = weekDays.map((d) => (inRange(d, start, end) ? cityState : ""));

  // Build grid for this week only
  const grid = {};
  const ROWS = baseRows();

  // Meal logic for days in THIS week
  const startTime = parseTimeFromDateTimeLocal(meta.travelStartDateTime);
  const endTime = parseTimeFromDateTimeLocal(meta.travelEndDateTime);

  for (const d of weekDays) {
    if (!inRange(d, start, end)) continue;

    const idx = dayIndexMon0(d);
    const dYmd = ymdFromDate(d);

    const isStartDay = dYmd === meta.travelStart;
    const isEndDay = dYmd === meta.travelEnd;
    const isMiddleDay = !isStartDay && !isEndDay;

    if (isMiddleDay) {
      sumCell(grid, "BREAKFAST:9", idx, 9);
      sumCell(grid, "LUNCH:16", idx, 16);
      sumCell(grid, "DINNER:26", idx, 26);
      continue;
    }

    if (isStartDay) {
      if (startTime && (startTime.hh < 7 || (startTime.hh === 6 && startTime.mm >= 0))) {
        sumCell(grid, "BREAKFAST:9", idx, 9);
      }
      sumCell(grid, "LUNCH:16", idx, 16);

      // Same-day trip dinner rule:
      if (isEndDay && endTime && (endTime.hh > 19 || (endTime.hh === 19 && endTime.mm >= 0))) {
        sumCell(grid, "DINNER:26", idx, 26);
      }
    }

    if (isEndDay && !isStartDay) {
      sumCell(grid, "LUNCH:16", idx, 16);
      if (endTime && (endTime.hh > 19 || (endTime.hh === 19 && endTime.mm >= 0))) {
        sumCell(grid, "DINNER:26", idx, 26);
      }
    }
  }

  // Receipts → this week block only
  const customSlotsIdx = [14, 15]; // indices in ROWS for custom lines

  for (const ph of photos) {
    const d = parseReceiptDate(ph);
    if (!d) continue;
    if (!inRange(d, start, end)) continue;

    // Must fall in THIS week (Mon..Sun)
    const phWeekMon = mondayOf(d);
    if (phWeekMon.getTime() !== weekMon.getTime()) continue;

    const idx = dayIndexMon0(d);
    const amt = Number(ph.amount);
    if (!amt || Number.isNaN(amt)) continue;

    let rowLabel = categorize(ph.title);

    if (!rowLabel) {
      const label = String(ph.title || "OTHER").trim().toUpperCase() + ":";

      // Try to assign to one of the two custom blank rows first
      const slot = customSlotsIdx.find((i) => !ROWS[i]);
      if (slot !== undefined) {
        ROWS[slot] = label;
        rowLabel = label;
      } else {
        rowLabel = "ITEMIZED EXPENDITURES:";
      }
    }

    sumCell(grid, rowLabel, idx, amt);
  }

  // BLOCK HEADER ROW (helps visually when importing)
  // Not counted in the original template — it's an extra single row before each block.
  {
    const r = blankRow();
    const weekEnd = addDaysUtcNoon(weekMon, 6);
    r[0] = `WEEK OF ${ymdFromDate(weekMon)} - ${ymdFromDate(weekEnd)}`;
    rows.push(r);
  }

  // rows 2-12 empty (to keep spacing; then "company" becomes the same relative area each time)
  // If you want *exactly* the old positions, keep 11 blanks like before.
  for (let i = 0; i < 11; i++) rows.push(blankRow());

  // row: company across B-H
  {
    const r = blankRow();
    for (let i = 0; i < 7; i++) r[i + 1] = companyRow[i] || "";
    rows.push(r);
  }

  // row: city/state across B-H
  {
    const r = blankRow();
    for (let i = 0; i < 7; i++) r[i + 1] = cityRow[i] || "";
    rows.push(r);
  }

  // 2 blank rows so A16 starts correctly relative to each block
  rows.push(blankRow());
  rows.push(blankRow());

  // A16-A31 + B-H values
  for (const label of ROWS) {
    const r = blankRow();
    r[0] = label || "";
    const vals = grid[label] || Array(7).fill(0);
    for (let i = 0; i < 7; i++) r[i + 1] = fmtMoney(vals[i]);
    rows.push(r);
  }

  // spacer row between blocks
  rows.push(blankRow());

  return rows;
}

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const meta = await getJson(`travel/projects/${id}/meta.json`);
  if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });

  const start = parseYMD(meta.travelStart);
  const end = parseYMD(meta.travelEnd);
  if (!start || !end) {
    return Response.json({ error: "Project needs travelStart and travelEnd to export CSV." }, { status: 400 });
  }

  const photos = Array.isArray(meta.photos) ? meta.photos : [];

  // Walk from the Monday of the start week to the Monday of the end week (inclusive)
  const firstWeekMon = mondayOf(start);
  const lastWeekMon = mondayOf(end);

  const allRows = [];
  for (let w = new Date(firstWeekMon); w.getTime() <= lastWeekMon.getTime(); w = addDaysUtcNoon(w, 7)) {
    const blockRows = buildWeekBlock({ weekMon: w, start, end, meta, photos });
    allRows.push(...blockRows);
  }

  const csv = allRows.map((r) => r.map(csvEscape).join(",")).join("\n");

  const filename = `${safeName(meta.serviceReportNumber)}_expense.csv`;

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store, max-age=0",
    },
  });
}
