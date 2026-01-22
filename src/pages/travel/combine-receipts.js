// src/pages/travel/combine-receipts.js
"use client";
import React, { useEffect, useMemo, useState } from "react";


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

function displayAmountFromPhoto(ph) {
  // Be resilient to old/new meta shapes.
  if (!ph) return "";
  const direct = ph.amount;
  if (direct != null && String(direct).trim() !== "") return String(direct);

  const cents = Number(ph.amountCents);
  if (Number.isFinite(cents)) return (cents / 100).toFixed(2);

  return "";
}

async function convertHeicToJpeg(file) {
  const mod = await import("heic2any");
  const heic2any = mod.default || mod;

  const ab = await file.arrayBuffer();
  const outBlob = await heic2any({
    blob: new Blob([ab], { type: file.type || "image/heic" }),
    toType: "image/jpeg",
    quality: 0.9,
  });

  const blob = Array.isArray(outBlob) ? outBlob[0] : outBlob;
  const name = (file.name || "photo").replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

async function convertAnyImageToJpeg(file, opts = {}) {
  // Converts ANY browser-decodable image to a resized JPEG for smaller uploads + smaller PDFs.
  // Also flattens EXIF orientation using createImageBitmap({ imageOrientation: "from-image" }).
  const maxDim = Number(opts.maxDim) || 2200; // downscale large phone photos
  const quality = Number.isFinite(Number(opts.quality)) ? Number(opts.quality) : 0.78;

  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const w0 = bmp.width || 0;
    const h0 = bmp.height || 0;
    if (!w0 || !h0) throw new Error("Could not read image dimensions.");

    // Downscale only (never upscale)
    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported.");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);

    const blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
    if (!blob) throw new Error("Conversion failed.");

    const base = (file.name || "photo").replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } finally {
    try { bmp.close(); } catch {}
  }
}


export default function CombineReceiptsPage() {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState("");
  const [pdfQuality, setPdfQuality] = useState("email"); // "email" | "max"


  // Create form
  const [serviceReportNumber, setServiceReportNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [travelStartDateTime, setTravelStartDateTime] = useState(""); // ✅ single input

  // Close form
  // Optional date chosen at close time. If blank, the server will default to "today".
  const [travelEndClose, setTravelEndClose] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Upload form
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadAmount, setUploadAmount] = useState(""); // ✅ required by server
  const [uploadCompanyCharged, setUploadCompanyCharged] = useState(false); // ✅ required by server
  const [uploadReceiptDate, setUploadReceiptDate] = useState(""); // optional YYYY-MM-DD

  // Edit photo modal
  const [showEditPhotoModal, setShowEditPhotoModal] = useState(false);
  const [editPhotoId, setEditPhotoId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCompanyCharged, setEditCompanyCharged] = useState(false);
  const [editReceiptDate, setEditReceiptDate] = useState("");

  // Image modal (tap thumbnail -> zoom/pan)
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState("");
  const [imageModalTitle, setImageModalTitle] = useState("");
  const [imgScale, setImgScale] = useState(1);
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const pointersRef = React.useRef(new Map());
  const gestureRef = React.useRef({ startDist: 0, startScale: 1, startOffset: { x: 0, y: 0 }, startPt: null });

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

  async function reopenProject() {
    if (!selectedId || !selected) return;
    if (selected.status !== "closed") return alert("Only CLOSED projects can be reopened.");

    const ok = confirm(
      `Reopen this project?\n\n${selected.serviceReportNumber} — ${selected.customerName}\n\nYou can upload more receipts and generate a new PDF.`
    );
    if (!ok) return;

    setBusy("Reopening project…");
    try {
      const res = await fetch(`/api/travel/projects/${encodeURIComponent(selectedId)}/reopen`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Reopen failed");

      await loadProject(selectedId);
      await refreshProjects();
    } catch (err) {
      alert(err?.message || String(err));
    } finally {
      setBusy("");
    }
  }


  async function deletePhoto(photoId) {
    if (!selectedId || !selected) return;
    if (!photoId) return;

    const ok = confirm("Delete this photo? This cannot be undone.");
    if (!ok) return;

    setBusy("Deleting photo…");
    try {
      const res = await fetch(
        `/api/travel/projects/${encodeURIComponent(selectedId)}/photos/${encodeURIComponent(photoId)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");

      // reload project + list so UI updates immediately
      await loadProject(selectedId);
      await refreshProjects();
    } catch (err) {
      alert(err?.message || String(err));
    } finally {
      setBusy("");
    }
  }

  function openEditPhoto(ph) {
    if (!ph?.photoId) return;
    setEditPhotoId(ph.photoId);
    setEditTitle(String(ph.title || ""));
    setEditDesc(String(ph.description || ""));
    setEditAmount(displayAmountFromPhoto(ph));
    setEditCompanyCharged(Boolean(ph.companyCharged));
    setEditReceiptDate(String(ph.receiptDate || ""));
    setShowEditPhotoModal(true);
  }

  function openImageModal(ph) {
    if (!ph?.photoId) return;
    const url = `/api/travel/projects/${encodeURIComponent(selectedId)}/photos/${encodeURIComponent(ph.photoId)}`;
    setImageModalUrl(url);
    setImageModalTitle(ph.title || "Receipt");
    setImgScale(1);
    setImgOffset({ x: 0, y: 0 });
    pointersRef.current = new Map();
    setShowImageModal(true);
  }

  function clampScale(next) {
    const s = Number(next);
    if (!Number.isFinite(s)) return 1;
    return Math.max(1, Math.min(6, s));
  }

  function zoomBy(delta) {
    setImgScale((s) => clampScale(s + delta));
  }

  function resetImageView() {
    setImgScale(1);
    setImgOffset({ x: 0, y: 0 });
  }

  function onImgPointerDown(e) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const m = pointersRef.current;
    m.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pointersRef.current = m;

    // start gesture
    const pts = [...m.values()];
    if (pts.length === 1) {
      gestureRef.current = {
        startDist: 0,
        startScale: imgScale,
        startOffset: { ...imgOffset },
        startPt: { ...pts[0] },
      };
    } else if (pts.length >= 2) {
      const a = pts[0], b = pts[1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      gestureRef.current = {
        startDist: dist,
        startScale: imgScale,
        startOffset: { ...imgOffset },
        startPt: null,
      };
    }
  }

  function onImgPointerMove(e) {
    if (!showImageModal) return;
    const m = pointersRef.current;
    if (!m.has(e.pointerId)) return;
    m.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pointersRef.current = m;

    const pts = [...m.values()];
    if (pts.length >= 2) {
      const a = pts[0], b = pts[1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const g = gestureRef.current;
      const nextScale = clampScale((g.startScale || 1) * (dist / (g.startDist || 1)));
      setImgScale(nextScale);
      return;
    }

    // pan
    const g = gestureRef.current;
    if (!g.startPt) return;
    const cur = pts[0];
    const dx = cur.x - g.startPt.x;
    const dy = cur.y - g.startPt.y;
    setImgOffset({ x: g.startOffset.x + dx, y: g.startOffset.y + dy });
  }

  function onImgPointerUp(e) {
    const m = pointersRef.current;
    m.delete(e.pointerId);
    pointersRef.current = m;
  }

  async function saveEditPhoto() {
    if (!selectedId || !editPhotoId) return;
    if (!String(editTitle).trim()) return alert("Title is required.");
    if (!String(editAmount).trim()) return alert("Amount is required.");

    setBusy("Saving changes…");
    try {
      const res = await fetch(
        `/api/travel/projects/${encodeURIComponent(selectedId)}/photos/${encodeURIComponent(editPhotoId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: String(editTitle || "").trim(),
            description: String(editDesc || ""),
            amount: String(editAmount || "").trim(),
            companyCharged: Boolean(editCompanyCharged),
            receiptDate: String(editReceiptDate || "").trim(),
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");

      setShowEditPhotoModal(false);
      setEditPhotoId("");
      await loadProject(selectedId);
      await refreshProjects();
    } catch (err) {
      alert(err?.message || String(err));
    } finally {
      setBusy("");
    }
  }


   async function loadProject(id) {
    if (!id) {
      setSelected(null);
      return;
    }

    const res = await fetch(`/api/travel/projects/${encodeURIComponent(id)}`, { method: "GET" });
    const data = await res.json();
    const proj = data.project || null;
    setSelected(proj);

    // Keep whatever was last typed unless project has an explicit end.
    if (proj?.travelEnd) setTravelEndClose(proj.travelEnd);

    // ✅ Make receipt date default to something that will actually land inside the CSV week:
    // - If project is closed (travelEnd exists), clamp “today” into [travelStart..travelEnd]
    // - Otherwise default to today
    try {
      const today = todayYYYYMMDD();

      const start = String(proj?.travelStart || "").slice(0, 10);
      const end = String(proj?.travelEnd || "").slice(0, 10);

      if (start && end) {
        // closed: clamp
        if (today < start) setUploadReceiptDate(start);
        else if (today > end) setUploadReceiptDate(end);
        else setUploadReceiptDate(today);
      } else {
        // open: default to today
        setUploadReceiptDate(today);
      }
    } catch {
      setUploadReceiptDate(todayYYYYMMDD());
    }
  }


  useEffect(() => {
    refreshProjects();
  }, []);

  useEffect(() => {
    loadProject(selectedId);
  }, [selectedId]);

  const openProjects = useMemo(() => projects.filter((p) => (p.status || "open") === "open"), [projects]);
  const closedProjects = useMemo(() => projects.filter((p) => (p.status || "open") === "closed"), [projects]);

  const editingPhoto = useMemo(() => {
    const arr = Array.isArray(selected?.photos) ? selected.photos : [];
    return arr.find((p) => String(p?.photoId || "") === String(editPhotoId || "")) || null;
  }, [selected, editPhotoId]);

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
          locationCity: locationCity.trim(),
          locationState: locationState.trim(),
          travelStartDateTime: travelStartDateTime,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create project");
      await refreshProjects(data.projectId);

      setServiceReportNumber("");
      setCustomerName("");
      setLocationCity("");
      setLocationState("");
      setTravelStartDateTime("");
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
    if (!String(uploadAmount).trim()) return alert("Amount is required.");

    setBusy("Uploading…");
    try {
      let file = uploadFile;

      const isHeic = /(\.heic|\.heif)$/i.test(file.name || "") || /image\/hei(c|f)/i.test(file.type || "");
      if (isHeic) file = await convertHeicToJpeg(file);

      // Normalize + compress for upload (downscale + force JPEG + fix orientation)
      file = await convertAnyImageToJpeg(file, { maxDim: 2200, quality: 0.78 });

      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", uploadTitle.trim());
      fd.append("description", uploadDesc || "");
      fd.append("amount", String(uploadAmount).trim());
      fd.append("companyCharged", uploadCompanyCharged ? "true" : "false");
      if (uploadReceiptDate) fd.append("receiptDate", uploadReceiptDate);

      const res = await fetch(`/api/travel/projects/${encodeURIComponent(selectedId)}/photos`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      setUploadTitle("");
      setUploadDesc("");
      setUploadFile(null);
      setUploadAmount("");
      setUploadCompanyCharged(false);
      setUploadReceiptDate("");

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
    setShowCloseModal(true);
  }

  async function confirmCloseProject() {
    if (!selectedId) return;

    setBusy("Generating PDF…");
    try {
      const res = await fetch(`/api/travel/projects/${encodeURIComponent(selectedId)}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // travelEnd is OPTIONAL. If blank, server defaults to today's date.
        body: JSON.stringify({
        travelEnd: String(travelEndClose || "").trim(),
        pdfQuality, // ✅ new
      }),

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
      setShowCloseModal(false);
    }
  }
  function downloadPdf() {
    if (!selectedId) return;
    window.open(`/api/travel/projects/${encodeURIComponent(selectedId)}/pdf`, "_blank");
  }

  function downloadCsv() {
    if (!selectedId) return;
    window.open(`/api/travel/projects/${encodeURIComponent(selectedId)}/csv`, "_blank");
  }

  async function rebuildPdf(mode) {
    if (!selectedId) return;

    setBusy(`Rebuilding PDF (${mode})…`);
    try {
      const res = await fetch(`/api/travel/projects/${encodeURIComponent(selectedId)}/rebuild-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfQuality: mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Rebuild failed");

      await loadProject(selectedId);
      await refreshProjects();

      if (data?.downloadUrl) window.open(data.downloadUrl, "_blank");
    } catch (err) {
      alert(err?.message || String(err));
    } finally {
      setBusy("");
    }
  }


  async function deleteClosedProject() {
    if (!selectedId || !selected) return;
    const looksClosed =
      String(selected.status || "").toLowerCase() === "closed" ||
      Boolean(selected.closedAt) ||
      Boolean(selected.pdfKey) ||
      Boolean(selected.travelEnd);
    if (!looksClosed) return alert("Only CLOSED projects can be deleted.");

    const ok = confirm(
      `DELETE this closed project?\n\n${selected.serviceReportNumber} — ${selected.customerName}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    setBusy("Deleting project…");
    try {
      const res = await fetch(`/api/travel/projects/${encodeURIComponent(selectedId)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");

      setSelectedId("");
      setSelected(null);
      await refreshProjects();
    } catch (err) {
      alert(err?.message || String(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="container">
      <div style={{ marginBottom: 10 }}>
        <h1>Combine Receipts</h1>
        <p className="small">Create a project, upload receipt photos, then close it to generate a single PDF.</p>
      </div>

      {busy ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <strong>{busy}</strong>
        </div>
      ) : null}

      <div className="grid" style={{ alignItems: "start" }}>
        {/* LEFT */}
        <div className="card">
          <h3>Create Project</h3>
          <form onSubmit={createProject}>
            <label>Service Report # (PDF filename)</label>
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

            <label>Location City</label>
            <input className="input" value={locationCity} onChange={(e) => setLocationCity(e.target.value)} required />

            <label>Location State</label>
            <input className="input" value={locationState} onChange={(e) => setLocationState(e.target.value)} required />

            <label>Travel Start (date + time)</label>
            <input
              className="input"
              type="datetime-local"
              value={travelStartDateTime}
              onChange={(e) => setTravelStartDateTime(e.target.value)}
              required
            />

            <button className="button" type="submit">
              Create Project
            </button>
          </form>

          <div className="hr" />

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

          <button className="button secondary" style={{ marginTop: 10 }} onClick={() => refreshProjects()}>
            {loadingProjects ? "Refreshing…" : "Refresh List"}
          </button>
        </div>

        {/* RIGHT */}
        <div className="card">
          <h3>Project</h3>

          {!selected ? (
            <p className="small">Select a project to begin.</p>
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
                <div className="small">Created: {fmtDate(selected.createdAt)}</div>
                {selected.closedAt ? <div className="small">Closed: {fmtDate(selected.closedAt)}</div> : null}
              </div>
              <label>PDF Quality</label>
                <select
                  className="input"
                  value={pdfQuality}
                  onChange={(e) => setPdfQuality(e.target.value)}
                >
                  <option value="email">Email quality (smaller file)</option>
                  <option value="max">Max quality (larger file)</option>
                </select>
                <div className="small" style={{ marginTop: -6, marginBottom: 10, opacity: 0.9 }}>
                  Tip: use Email quality first, then rebuild Max later if you need it.
                </div>


              {selected.status === "open" ? (
                <div className="small" style={{ marginBottom: 10, opacity: 0.9 }}>
                  Travel End date is chosen when you click <strong>Close + Generate PDF</strong>.
                </div>
              ) : null}

              <div className="row">
                <button className="button" onClick={downloadPdf} disabled={selected.status !== "closed"}>
                  Download PDF
                </button>
                <button className="button" onClick={closeProject} disabled={selected.status !== "open"}>
                  Close + Generate PDF
                </button>
                <button className="button secondary" onClick={downloadCsv}>
                  Download CSV
                </button>
              </div>

              {selected.status === "closed" ? (
                <div style={{ marginTop: 10 }}>
                  <button className="button danger" onClick={deleteClosedProject}>
                    Delete Closed Project
                  </button>
                  <button className="button" onClick={reopenProject}>
                    Reopen Project
                  </button>
                </div>


              ) : null}
              {selected.status === "closed" ? (
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="button secondary" type="button" onClick={() => rebuildPdf("email")}>
                  Rebuild PDF (Email)
                </button>
                <button className="button" type="button" onClick={() => rebuildPdf("max")}>
                  Rebuild PDF (Max)
                </button>
              </div>
            ) : null}

              

              <div className="hr" />

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

                <label>Amount (required)</label>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="e.g. 23.45"
                  value={uploadAmount}
                  onChange={(e) => setUploadAmount(e.target.value)}
                  required
                />

                <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={uploadCompanyCharged}
                    onChange={(e) => setUploadCompanyCharged(e.target.checked)}
                  />
                  Company Charged?
                </label>

                <label>File (any normal phone image; HEIC auto-converts)</label>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />

                <label>Receipt Date (optional)</label>
                <input
                  className="input"
                  type="date"
                  value={uploadReceiptDate}
                  onChange={(e) => setUploadReceiptDate(e.target.value)}
                />
                <div className="small" style={{ marginTop: -6, marginBottom: 10, opacity: 0.9 }}>
                  If you don’t choose a date, it defaults to the upload date.
                </div>
                <button className="button" type="submit" disabled={selected.status !== "open"}>
                  Upload
                </button>
              </form>

              <div className="hr" />

              <h3>Receipts ({selected.photos?.length || 0})</h3>

              {selected.photos?.length ? (
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #333" }}>Preview</th>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Filename</th>
                        <th>Receipt Date</th>
                        <th>Uploaded</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.photos.map((ph) => (
                        <tr key={ph.photoId}>
                          <td style={{ padding: 6, borderBottom: "1px solid #222", width: 84 }}>
                            <img
                              src={`/api/travel/projects/${encodeURIComponent(selectedId)}/photos/${ph.photoId}`}
                              alt={ph.title || "Receipt"}
                              style={{
                                width: 72,
                                height: 72,
                                objectFit: "cover",
                                borderRadius: 8,
                                display: "block",
                                background: "#111",
                                border: "1px solid rgba(255,255,255,0.12)",
                                cursor: "zoom-in",
                              }}
                              loading="lazy"
                              onClick={() => openImageModal(ph)}
                            />
                          </td>
                          <td>{ph.title}</td>
                          <td className="small">{ph.description || ""}</td>
                          <td className="small">{ph.originalName || "(unknown)"}</td>
                          <td className="small">{ph.receiptDate || ""}</td>
                          <td className="small">{fmtDate(ph.uploadedAt)}</td>
                          <td>
                            <button
                              type="button"
                              className="button secondary"
                              onClick={() => openEditPhoto(ph)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="button danger"
                              onClick={() => deletePhoto(ph.photoId)}
                              disabled={selected?.status !== "open"}   // optional: only allow delete while open
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="small">No receipts yet.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Close modal */}
      {showCloseModal ? (
        <div
          className="modalOverlay"
          onMouseDown={(e) => {
            // click outside closes
            if (e.target === e.currentTarget) setShowCloseModal(false);
          }}
        >
          <div className="card modalCard" style={{ width: "min(560px, 100%)" }}>
            <h3 style={{ marginTop: 0 }}>Close Project</h3>
            <div className="small" style={{ marginBottom: 10, opacity: 0.9 }}>
              Optional: choose a <strong>Travel End</strong> date. If you don’t choose a date, it defaults to the current
              date.
            </div>

            <label>Travel End Date (optional)</label>
            <input
              className="input"
              type="date"
              value={travelEndClose}
              onChange={(e) => setTravelEndClose(e.target.value)}
              placeholder={todayYYYYMMDD()}
            />

            <div className="row" style={{ marginTop: 12 }}>
              <button className="button" onClick={confirmCloseProject}>
                Close + Generate PDF
              </button>
              <button className="button secondary" onClick={() => setShowCloseModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit photo modal */}
      {showEditPhotoModal ? (
        <div
          className="modalOverlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowEditPhotoModal(false);
          }}
        >
          <div className="card modalCard" style={{ width: "min(560px, 100%)" }}>
            <h3 style={{ marginTop: 0 }}>Edit Receipt</h3>
            {editingPhoto ? (
              <div className="small" style={{ marginBottom: 10, opacity: 0.9 }}>
                <div>
                  <strong>Filename:</strong> {editingPhoto.originalName || "(unknown)"}
                </div>
                {editingPhoto.uploadedAt ? (
                  <div>
                    <strong>Uploaded:</strong> {fmtDate(editingPhoto.uploadedAt)}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="small" style={{ opacity: 0.9, marginTop: -4, marginBottom: 10 }}>
              Editing: <strong>{editTitle || "(untitled)"}</strong>
            </div>

            <label>Title</label>
            <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />

            <label>Description</label>
            <textarea
              className="input"
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />

            <label>Amount</label>
            <input
              className="input"
              inputMode="decimal"
              placeholder="e.g. 23.45"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />

            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                checked={editCompanyCharged}
                onChange={(e) => setEditCompanyCharged(e.target.checked)}
              />
              Company Charged?
            </label>

            <label>Receipt Date (YYYY-MM-DD)</label>
            <input
              className="input"
              type="date"
              value={editReceiptDate}
              onChange={(e) => setEditReceiptDate(e.target.value)}
            />

            <div className="row" style={{ marginTop: 12 }}>
              <button className="button" onClick={saveEditPhoto}>Save</button>
              <button className="button secondary" onClick={() => setShowEditPhotoModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Image preview modal */}
      {showImageModal && imageModalUrl ? (
        <div
          className="modalOverlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowImageModal(false);
          }}
        >
          <div className="card modalCard">
            <div className="modalToolbar">
              <div>
                <strong>{imageModalTitle || "Receipt"}</strong>
                <div className="small" style={{ opacity: 0.85 }}>
                  Drag to pan. Use +/- to zoom.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button type="button" className="button secondary" onClick={() => setImgScale((s) => Math.min(5, (Number(s) || 1) + 0.25))}>
                  +
                </button>
                <button type="button" className="button secondary" onClick={() => setImgScale((s) => Math.max(1, (Number(s) || 1) - 0.25))}>
                  -
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setImgScale(1);
                    setImgOffset({ x: 0, y: 0 });
                  }}
                >
                  Reset
                </button>
                <button type="button" className="button" onClick={() => setShowImageModal(false)}>
                  Close
                </button>
              </div>
            </div>

            <div
              className="imgModalStage"
              onPointerDown={onImgPointerDown}
              onPointerMove={onImgPointerMove}
              onPointerUp={onImgPointerUp}
              onPointerCancel={onImgPointerUp}
            >
              <img
                src={imageModalUrl}
                alt={imageModalTitle || "Receipt"}
                className="imgModalImg"
                style={{ transform: `translate(-50%, -50%) translate(${imgOffset.x}px, ${imgOffset.y}px) scale(${imgScale})` }}
                draggable={false}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
