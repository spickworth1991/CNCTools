"use client";
import React, { useEffect, useMemo, useState } from "react";


async function convertAnyImageToJpeg(file) {
  // If already jpeg, keep as-is
  const isJpeg =
    /(\.jpe?g)$/i.test(file.name || "") ||
    (file.type || "").toLowerCase().includes("jpeg");

  if (isJpeg) return file;

  // If PNG, keep as-is (we support PNG too)
  const isPng =
    /(\.png)$/i.test(file.name || "") ||
    (file.type || "").toLowerCase().includes("png");

  if (isPng) return file;

  // Otherwise: WEBP/GIF/BMP/etc -> JPEG via canvas
  // createImageBitmap works for most common formats
  const bmp = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(bmp, 0, 0);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to convert image"))),
      "image/jpeg",
      0.92
    );
  });

  const name = (file.name || "photo")
    .replace(/\.[^.]+$/, "")
    .slice(0, 80) + ".jpg";

  return new File([blob], name, { type: "image/jpeg" });
}



function fmtDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

async function fileToArrayBuffer(file) {
  return await file.arrayBuffer();
}

async function convertHeicToJpeg(file) {
  // IMPORTANT: only load heic2any in the browser
  if (typeof window === "undefined") {
    throw new Error("HEIC conversion can only run in the browser.");
  }

  const { default: heic2any } = await import("heic2any");

  const ab = await fileToArrayBuffer(file);
  const outBlob = await heic2any({
    blob: new Blob([ab], { type: file.type || "image/heic" }),
    toType: "image/jpeg",
    quality: 0.9
  });
  const blob = Array.isArray(outBlob) ? outBlob[0] : outBlob;
  const name = (file.name || "photo").replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

export default function CombineReceiptsPage() {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState("");

  // Create form
  const [serviceReportNumber, setServiceReportNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");

  // Upload form
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState(null);

  async function refreshProjects(autoSelectId) {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/travel/projects", { method: "GET" });
      const data = await res.json();
      setProjects(Array.isArray(data.projects) ? data.projects : []);
      if (autoSelectId) setSelectedId(autoSelectId);
    } finally {
      setLoadingProjects(false);
    }
  }

  async function loadProject(id) {
    if (!id) {
      setSelected(null);
      return;
    }
    const res = await fetch(`/api/travel/projects/${encodeURIComponent(id)}`, { method: "GET" });
    const data = await res.json();
    setSelected(data.project || null);
  }

  useEffect(() => {
    refreshProjects();
  }, []);

  useEffect(() => {
    loadProject(selectedId);
  }, [selectedId]);

  const openProjects = useMemo(
    () => projects.filter((p) => (p.status || "open") === "open"),
    [projects]
  );
  const closedProjects = useMemo(
    () => projects.filter((p) => (p.status || "open") === "closed"),
    [projects]
  );

  async function createProject(e) {
    e.preventDefault();
    setBusy("Creating project…");
    try {
      const res = await fetch("/api/travel/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceReportNumber: serviceReportNumber.trim(),
          customerName: customerName.trim(),
          travelStart,
          travelEnd
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create project");
      await refreshProjects(data.projectId);
      setServiceReportNumber("");
      setCustomerName("");
      setTravelStart("");
      setTravelEnd("");
    } catch (err) {
      alert(err?.message || String(err));
    } finally {
      setBusy("");
    }
  }

  async function uploadPhoto(e) {
  e.preventDefault();
  if (!selectedId) return alert("Select or create a project first.");
  if (!uploadFile) return alert("Choose a file.");
  if (!uploadTitle.trim()) return alert("Title is required.");

  setBusy("Uploading…");
  try {
    let file = uploadFile;

    // HEIC/HEIF from iPhone → convert to JPEG
    const isHeic =
      /(\.heic|\.heif)$/i.test(file.name || "") ||
      /image\/hei(c|f)/i.test(file.type || "");

    if (isHeic) {
      file = await convertHeicToJpeg(file);
    } else {
      // Any other image type → convert to JPEG if not JPG/PNG
      file = await convertAnyImageToJpeg(file);
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", uploadTitle.trim());
    fd.append("description", uploadDesc || "");

    const res = await fetch(`/api/travel/projects/${encodeURIComponent(selectedId)}/photos`, {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Upload failed");

    setUploadTitle("");
    setUploadDesc("");
    setUploadFile(null);

    await loadProject(selectedId);
    await refreshProjects();
  } catch (err) {
    alert(err?.message || String(err));
  } finally {
    setBusy("");
  }
}


  async function readJsonSafe(res) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    // Non-JSON response (common on Cloudflare when a Function throws)
    return { ok: res.ok, status: res.status, data: null, raw: text };
  }
}

async function closeProject() {
  if (!selectedId) return;
  if (!confirm("Close this project and generate the PDF?")) return;

  setBusy("Generating PDF…");
  try {
    const res = await fetch(`/api/travel/projects/${encodeURIComponent(selectedId)}/close`, {
      method: "POST",
    });

    const parsed = await readJsonSafe(res);

    if (!parsed.ok) {
      // show the Cloudflare error text instead of “Unexpected token…”
      const msg =
        parsed.data?.error ||
        parsed.raw ||
        `Close failed (HTTP ${parsed.status})`;
      throw new Error(msg);
    }

    const data = parsed.data || {};
    await loadProject(selectedId);
    await refreshProjects();

    if (data?.downloadUrl) {
      window.open(data.downloadUrl, "_blank");
    } else {
      alert("Closed. Use Download PDF button.");
    }
  } catch (err) {
    alert(err?.message || String(err));
  } finally {
    setBusy("");
  }
}


  function downloadPdf() {
    if (!selectedId) return;
    window.open(`/api/travel/projects/${encodeURIComponent(selectedId)}/pdf`, "_blank");
  }

  return (
    <div>
      <div>
        <h1>Combine Receipts</h1>
        <p>Create a project, upload receipt photos, then close it to generate a single PDF.</p>
      </div>

      {busy ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <strong>{busy}</strong>
        </div>
      ) : null}

      <div className="grid" style={{ alignItems: "start" }}>
        <div className="card">
          <h3>Create Project</h3>
          <form onSubmit={createProject}>
            <label>Service Report # (used as PDF filename)</label>
            <input
              className="input"
              value={serviceReportNumber}
              onChange={(e) => setServiceReportNumber(e.target.value)}
              placeholder="e.g. SR-12345"
              required
            />

            <label>Customer Name</label>
            <input
              className="input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. ABC Manufacturing"
              required
            />

            <label>Travel Start Date</label>
            <input
              className="input"
              type="date"
              value={travelStart}
              onChange={(e) => setTravelStart(e.target.value)}
              required
            />

            <label>Travel End Date</label>
            <input
              className="input"
              type="date"
              value={travelEnd}
              onChange={(e) => setTravelEnd(e.target.value)}
              required
            />

            <button className="button" type="submit" style={{ width: "100%" }}>
              Create Project
            </button>
          </form>

          <hr style={{ margin: "16px 0" }} />

          <h3>Select Project</h3>
          <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- Select --</option>

            {openProjects.length ? <option disabled>— Open —</option> : null}
            {openProjects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.serviceReportNumber} — {p.customerName}
              </option>
            ))}

            {closedProjects.length ? <option disabled>— Closed —</option> : null}
            {closedProjects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.serviceReportNumber} — {p.customerName} (closed)
              </option>
            ))}
          </select>

          <button className="button" style={{ width: "100%", marginTop: 10 }} onClick={() => refreshProjects()}>
            {loadingProjects ? "Refreshing…" : "Refresh List"}
          </button>
        </div>

        <div className="card">
          <h3>Project</h3>

          {!selected ? (
            <p>Select a project to begin.</p>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                <div><strong>Service Report:</strong> {selected.serviceReportNumber}</div>
                <div><strong>Customer:</strong> {selected.customerName}</div>
                <div><strong>Travel Dates:</strong> {selected.travelStart} → {selected.travelEnd}</div>
                <div><strong>Status:</strong> {selected.status}</div>
                <div><strong>Created:</strong> {fmtDate(selected.createdAt)}</div>
                {selected.closedAt ? <div><strong>Closed:</strong> {fmtDate(selected.closedAt)}</div> : null}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="button" onClick={downloadPdf} disabled={selected.status !== "closed"}>
                  Download PDF
                </button>
                <button className="button" onClick={closeProject} disabled={selected.status !== "open"}>
                  Close + Generate PDF
                </button>
              </div>

              <hr style={{ margin: "16px 0" }} />

              <h3>Add Receipt Photo</h3>
              <form onSubmit={uploadPhoto}>
                <label>Title (required)</label>
                <input
                  className="input"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Hotel, Gas, Meal, Parking"
                  required
                />

                <label>Description (optional)</label>
                <textarea
                  className="input"
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="Notes (location, reason, etc.)"
                  rows={3}
                />

                <label>File (JPG/PNG — HEIC auto-converts)</label>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />

                <button className="button" type="submit" disabled={selected.status !== "open"} style={{ width: "100%" }}>
                  Upload
                </button>
              </form>

              <hr style={{ margin: "16px 0" }} />

              <h3>Photos ({selected.photos?.length || 0})</h3>
              {selected.photos?.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #333" }}>Title</th>
                        <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #333" }}>Description</th>
                        <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #333" }}>Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.photos.map((ph) => (
                        <tr key={ph.photoId}>
                          <td style={{ padding: 6, borderBottom: "1px solid #222" }}>{ph.title}</td>
                          <td style={{ padding: 6, borderBottom: "1px solid #222" }}>{ph.description || ""}</td>
                          <td style={{ padding: 6, borderBottom: "1px solid #222" }}>{fmtDate(ph.uploadedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No photos yet.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
