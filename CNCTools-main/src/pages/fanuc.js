"use client";
import React from "react";
import { useRouter } from "next/router";

export default function FanucPrograms() {
  const router = useRouter();

  return (
    <div>
      {/* Main Container */}
      <div>
        <h1>Fanuc NC Programs</h1>
        <p>Select a program type to begin.</p>
      </div>

      {/* Grid for Tool Options */}
      <div className="grid-container">
        {/* Feature Correction Screen */}
        <div
          className="card"
          onClick={() => router.push("./tool/fanuc-feature-correction")}
        >
          <h3>Feature Correction Screen</h3>
          <p>Create O4xxx compensation screen programs from a part number.</p>
        </div>

        {/* Back Home */}
        <div className="card" onClick={() => router.push("/")}>
          <h3>Back to Home</h3>
          <p>Return to the main menu.</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{ marginTop: 20 }}>
        <button onClick={() => router.push("/")} className="button">
          Home
        </button>
      </div>
    </div>
  );
}
