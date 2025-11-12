"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function getLast3Digits(partNumber) {
  const digits = (partNumber || "").replace(/\D/g, "");
  if (!digits) return "000";
  const last3 = digits.slice(-3);
  return last3.padStart(3, "0");
}

function sanitizeToolPath(v) {
  if (!v) return "";
  const s = String(v).trim().toUpperCase();
  return s.replace(/^T/, ""); // allow "T202.6" or "202.6" → "202.6"
}

export default function FanucFeatureCorrection() {
  const router = useRouter();
  const [partNumber, setPartNumber] = useState("");
  // --- defaults for new feature entries
const defaultFeature = {
  label: "",
  inc1: "0.01",   // #103
  inc2: "0.02",   // #104
  inc3: "0.05",   // #105
  inc4: "0.075",  // #106
  inc5: "0.1",    // #107
  axis: "4",      // default to X
  toolPath: "",
};

const [features, setFeatures] = useState([{ ...defaultFeature }]);

function addFeature() {
  setFeatures((prev) => [...prev, { ...defaultFeature }]);
}

  const last3 = useMemo(() => getLast3Digits(partNumber), [partNumber]);
  const programNumber = useMemo(() => `O4${last3}`, [last3]);
  const titleLine = useMemo(() => `(${last3} FEATURE COMPENSATION SCREEN)`, [last3]);

  

  function removeFeature(i) {
    setFeatures((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateFeature(i, key, value) {
    setFeatures((prev) => prev.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }

  const programText = useMemo(() => {
    const lines = [];

    // --- Header (first 10 lines exactly as specified)
    lines.push(`%`);
    lines.push(`${programNumber} ${titleLine}`);
    lines.push(`(            - EMAG -            )`);
    lines.push(`(      COMPENSATION SCREEN       )`);
    lines.push(`(--------------------------------)`);
    lines.push(`()`);
    lines.push(`(#01:--- ${last3} COMPENSATION SCREEN  ---)`);
    lines.push(`G610(TRANSFER)`);
    lines.push(`()`);

    // --- Features
    features.forEach((f, idx) => {
      const n = (idx + 2).toString().padStart(2, "0"); // #02, #03, ...
      const label = (f.label || "").toUpperCase();
      const toolPath = sanitizeToolPath(f.toolPath);

      lines.push(`()`);
      lines.push(`(#${n}:${label})`);
      if (f.inc1 !== "") lines.push(`#103=${f.inc1}`);
      if (f.inc2 !== "") lines.push(`#104=${f.inc2}`);
      if (f.inc3 !== "") lines.push(`#105=${f.inc3}`);
      if (f.inc4 !== "") lines.push(`#106=${f.inc4}`);
      if (f.inc5 !== "") lines.push(`#107=${f.inc5}`);
      if (f.axis) lines.push(`#132=${f.axis}`);
      if (toolPath) lines.push(`#133=${toolPath}`);
      lines.push(`G610(TRANSFER)`);
    });

    // --- Footer (always appended)
    lines.push(`()`);
    lines.push(`(-------------------------------------)`);
    lines.push(`(--------------------------------)`);
    lines.push(`(#101= LINE NUMBER IN O4000)`);
    lines.push(`(#102= NOMINAL SIZE ACC. TO DRAWING)`);
    lines.push(`(#103= INCREMENT 1)`);
    lines.push(`(#104= INCREMENT 2)`);
    lines.push(`(#105= INCREMENT 3)`);
    lines.push(`(#106= INCREMENT 4)`);
    lines.push(`(#107= INCREMENT 5)`);
    lines.push(`(#131= COMPENSATION DIRECTION)`);
    lines.push(`(#132= COMPENSATION MEMORY)`);
    lines.push(`(      4=X)`);
    lines.push(`(      5=Z)`);
    lines.push(`(      9=VARIABLES)`);
    lines.push(`(#133= 1.X COMPENSATION NUMBER.CHAN)`);
    lines.push(`(#134= 2.X COMPENSATION NUMBER.CHAN)`);
    lines.push(`(#135= 3.X COMPENSATION NUMBER.CHAN)`);
    lines.push(`(#136= 4.X COMPENSATION NUMBER.CHAN)`);
    lines.push(`(#137= 5.X COMPENSATION NUMBER.CHAN)`);
    lines.push(`()`);
    lines.push(`M99`);
    lines.push(`%`);

    return lines.join("\n");
  }, [features, last3, programNumber, titleLine]);

  function copyOut() {
    navigator.clipboard.writeText(programText);
    alert("Program copied to clipboard.");
  }

  function downloadOut() {
    // Fanuc media usually wants Oxxxx filenames — we’ll keep it simple: O4072
    const filename = `O${programNumber.replace(/^O/, "")}`;
    const blob = new Blob([programText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename; // no extension by default
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div>
        <h1>Fanuc — Feature Correction Screen</h1>
        <p>Build 4000-series O-programs (e.g., O4072) from your part number and features.</p>
      </div>

      {/* Part Number */}
      <div className="grid-container" style={{ marginTop: 12 }}>
        <div className="card" style={{ cursor: "default" }}>
          <div className="h2">Part Number</div>
          <input
            className="input"
            placeholder="e.g., TR-000072 or 2072-A"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
          />
          <div className="grid" style={{ marginTop: 8 }}>
            <div className="pill">Last 3 digits: <b>{last3}</b></div>
            <div className="pill">Program: <b>{programNumber}</b></div>
            <div className="pill">File: <b>{`O${programNumber.replace(/^O/, "")}`}</b></div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid-container" style={{ marginTop: 12 }}>
        {features.map((f, i) => (
          <div className="card" key={i} style={{ textAlign: "left" }}>
            <div className="h2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Feature #{i + 1}</span>
              {features.length > 1 && (
                <button className="button danger" onClick={() => removeFeature(i)}>
                  Remove
                </button>
              )}
            </div>

            <div className="grid" style={{ marginTop: 8 }}>
              <label>
                <div className="label">Feature Label (display text)</div>
                <input
                  className="input"
                  placeholder='e.g., "ROUGH LENGTH JOURNAL 7"'
                  value={f.label}
                  onChange={(e) => updateFeature(i, "label", e.target.value)}
                />
              </label>

              <label>
                <div className="label">#133 Tool.Path</div>
                <input
                  className="input"
                  placeholder='e.g., "2.2" (T202 path 2)'
                  value={f.toolPath}
                  onChange={(e) => updateFeature(i, "toolPath", e.target.value)}
                />
              </label>

              <div className="grid" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
                {[
                  { k: "inc1", label: "Increment 1 (#103)" },
                  { k: "inc2", label: "Increment 2 (#104)" },
                  { k: "inc3", label: "Increment 3 (#105)" },
                  { k: "inc4", label: "Increment 4 (#106)" },
                  { k: "inc5", label: "Increment 5 (#107)" },
                ].map((row) => (
                  <label key={row.k}>
                    <div className="label">{row.label}</div>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={f[row.k]}
                      onChange={(e) => updateFeature(i, row.k, e.target.value)}
                    />
                  </label>
                ))}
              </div>

              <label>
                <div className="label">Axis / Memory (#132)</div>
                <select
                  className="input"
                  value={f.axis}
                  onChange={(e) => updateFeature(i, "axis", e.target.value)}
                >
                  <option value="4">4 = X</option>
                  <option value="5">5 = Z</option>
                  <option value="6">6 = R</option>
                  <option value="9">9 = VARIABLES</option>
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
        <button className="button" onClick={addFeature}>+ Next Feature</button>
        <button className="button" onClick={copyOut}>Copy Output</button>
        <button className="button" onClick={downloadOut}>
          Download ({`O${programNumber.replace(/^O/, "")}`})
        </button>
        <button className="button" onClick={() => router.push("/fanuc")}>Back to Fanuc</button>
        <button className="button" onClick={() => router.push("/")}>Home</button>
      </div>

      {/* Output */}
      <div className="grid-container" style={{ marginTop: 12 }}>
        <div className="card" style={{ textAlign: "left" }}>
          <div className="h2">Output</div>
          <textarea
            className="textarea"
            value={programText}
            readOnly
            rows={24}
            style={{ width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
          />
        </div>
      </div>
    </div>
  );
}
