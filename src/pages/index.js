"use client";
import React from "react";
import { useRouter } from "next/router";

export default function HomePage() {
  const router = useRouter();

  return (
    <div>
      <div>
        <h1>CNC Tool Generator</h1>
        <p>Select a tool to begin.</p>
      </div>

      <div className="grid">
        <div className="card" onClick={() => router.push("/fanuc")}>
          <h3>Fanuc Tools</h3>
          <p>Programs & utilities for Fanuc controls.</p>
        </div>

        <div className="card" onClick={() => router.push("/siemens")}>
          <h3>Siemens Tools</h3>
          <p>Programs & utilities for Siemens controls.</p>
        </div>

        <div className="card" onClick={() => router.push("/calculators")}>
          <h3>Calculators</h3>
          <p>Quick shop calculators.</p>
        </div>

        {/* NEW: Travel */}
        <div className="card" onClick={() => router.push("/travel")}>
          <h3>Travel</h3>
          <p>Combine receipts, build expense reports, and more.</p>
        </div>

        <div
          className="card"
          onClick={() => (window.location.href = "https://ncviewer.com")}
        >
          <h3>NC Viewer</h3>
          <p>Simulate tool paths with NCViewer.com</p>
        </div>
      </div>
    </div>
  );
}
