"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div>
      {/* Main Container */}
      <div>
        <h1>CNC Tool Generator</h1>
        <p>Select a tool to begin.</p>
      </div>

      {/* Grid for Tool Options */}
      <div>
        
        {/* MMK Creator */}
        <div 
          className="card"
          onClick={() => router.push("tool/mmk-creator")}
        >
          <h3>MMK Creator</h3>
          <p>Generate standard MMK programs for tool correction.</p>
        </div>

        {/* T_List Creator */}
        <div 
          className="card"
          onClick={() => router.push("tool/t-list-creator")}
        >
          <h3>T_List Creator</h3>
          <p>Generate T-List programs for Siemens CNC.</p>
        </div>

        {/* Calculators */}
        <div 
          className="card"
          onClick={() => router.push("../calculators")}
        >
          <h3>Calculators</h3>
          <p>Calculators for specific things.</p>
        </div>

        {/* NC Viewer */}
        <div 
          className="card"
          onClick={() => window.location.href = "https://ncviewer.com"}
        >
          <h3>NC Viewer</h3>
          <p>Simulate tool paths with NCViewer.com</p>
        </div>

      </div>
    </div>
  );
}
