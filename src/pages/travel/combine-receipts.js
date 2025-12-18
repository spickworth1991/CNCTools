"use client";
import React, { useEffect, useMemo, useState } from "react";
import heic2any from "heic2any";

function fmtDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function fileToArrayBuffer(file) {
  return await file.arrayBuffer();
}

async function convertHeicToJpeg(file) {
  const ab = await fileToArrayBuffer(file);
  const outBlob = await heic2any({
    blob: new Blob([ab], { type: file.type || "image/heic" }),
    toType: "image/jpeg",
    quality: 0.9,
  });
  const blob = Array.isArray(outBlob) ? outBlob[0] : outBlob;
  const name = (file.name || "photo").replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

async function convertAnyImageToJpeg(file) {
  // For things like WEBP, GIF, BMP, etc. (anything the browser can decode)
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = blobUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9)
    );

    if (!blob) throw new Error("Conversion failed.");

    const base = (file.name || "photo").replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
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

  // Close form
  const [travelEndClose, setTravelEndClose] = useState(todayYYYYMMDD());

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

    // Keep the close-date input synced
    const proj = data.project || null;
    if (proj?.travelEnd) setTravelEndClose(proj.travelEnd);
    else setTravelEndClose(todayYYYYMMDD());
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create project");
      await refreshProjects(data.projectId);
      setServiceReportNumber("");
      setCustomerName("");
      setTravelStart("");
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

      // HEIC/HEIF → convert to JPEG
      const isHeic =
        /(\.heic|\.heif)$/i.test(file.name || "") ||
        /image\/hei(c|f)/i.test(file.type || "");
      if (isHeic) {
        file = await convertHeicToJpeg(file);
      }

      // If it’s not JPG/PNG, try converting to JPG via canvas
      const lowerName = (file.name || "").toLowerCase();
      const isJpgPng =
        lowerName.endsWith(".jpg") ||
        lowerName.endsWith(".jpeg") ||
        lowerName.endsWith(".png") ||
        file.type === "image/jpeg" ||
        file.type === "image/png";

      if (!isJpgPng) {
        file = await convertAnyImageToJpeg(file);
      }

      // Final allowlist for server-side PDF embedding
      const ext = (file.name || "").toLowerCase();
      const ok =
        ext.endsWith(".jpg") ||
        ext.endsWith(".jpeg") ||
        ext.endsWith(".png") ||
        file.type === "image/jpeg" ||
        file.type === "image/png";

      if (!ok) {
        alert("Please upload an image file your browser can convert (or use JPG/PNG/HEIC).");
        return;
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", uploadTitle.trim());
      fd.append("description", uploadDesc || "");

      const res = await fetch(`/api/travel/projects/${encodeURIComponent(selectedId)}/photos`, {
        method: "POST",
        body: fd,
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

  async function closeProject() {
    if (!selectedId) return;
    if (!travelEndClose) return alert("Pick a Travel End date.");
    if (!confirm("Close this project and generate the PDF?")) return;

    setBusy("Generating PDF…");
    try {
      const res = await fetch(`/api/travel/projects/${encodeURIComponent(selectedId)}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ travelEnd: travelEndClose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Close failed");

      await loadProject(selectedId);
      await refreshProjects();

      if (data?.downloadUrl) window.open(data.downloadUrl, "_blank");
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
        {/* LEFT: Create + Select */}
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

        {/* RIGHT: Project Detail */}
        <div className="card">
          <h3>Project</h3>

          {!selected ? (
            <p>Select a project to begin.</p>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                <div>
                  <strong>Service Report:</strong> {selected.serviceReportNumber}
                </div>
                <div>
                  <strong>Customer:</strong> {selected.customerName}
                </div>
                <div>
                  <strong>Travel Dates:</strong> {selected.travelStart}{" "}
                  {selected.travelEnd ? `to ${selected.travelEnd}` : "(end date picked at close)"}
                </div>
                <div>
                  <strong>Status:</strong> {selected.status}
                </div>
                <div>
                  <strong>Created:</strong> {fmtDate(selected.createdAt)}
                </div>
                {selected.closedAt ? (
                  <div>
                    <strong>Closed:</strong> {fmtDate(selected.closedAt)}
                  </div>
                ) : null}
              </div>

              {selected.status === "open" ? (
                <div style={{ marginBottom: 10 }}>
                  <label>Travel End Date (selected when closing)</label>
                  <input
                    className="input"
                    type="date"
                    value={travelEndClose}
                    onChange={(e) => setTravelEndClose(e.target.value)}
                  />
                </div>
              ) : null}

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

                <label>File (most images OK — HEIC auto-converts)</label>
                <input className="input" type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />

                <button className="button" type="submit" disabled={selected.status !== "open"} style={{ width: "100%" }}>
                  Upload
                </button>
              </form>

              <hr style={{ margin: "16px 0" }} />

              <h3>Receipts ({selected.photos?.length || 0})</h3>
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
                <p>No receipts yet.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
