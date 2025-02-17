"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="">
      {/* Main Container */}
      <div className="">
        <h1 className="">CNC Tool Generator</h1>
        <p className="">Select a tool to begin.</p>
      </div>

      {/* Grid for Tool Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        {/* MMK Creator */}
        <div 
          className="card cursor-pointer flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg hover:scale-105 transition"
          onClick={() => router.push("tool/mmk-creator")}
        >
          <h3 className="text-lg font-semibold">MMK Creator</h3>
          <p className="text-gray-500 text-sm text-center">Generate standard MMK programs for tool correction.</p>
        </div>

        {/* T_List Creator */}
        <div 
          className="card cursor-pointer flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg hover:scale-105 transition"
          onClick={() => router.push("tool/t-list-creator")}
        >
          <h3 className="text-lg font-semibold">T_List Creator</h3>
          <p className="text-gray-500 text-sm text-center">Generate T-List programs for Siemens CNC.</p>
        </div>

        {/* Calculators */}
        <div 
          className="card cursor-pointer flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg hover:scale-105 transition"
          onClick={() => router.push("tool/calculators")}
        >
          <h3 className="text-lg font-semibold">Calculators</h3>
          <p className="text-gray-500 text-sm text-center">Calculators for specific things.</p>
        </div>

        {/* NC Viewer */}
        <div 
          className="card cursor-pointer flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg hover:scale-105 transition"
          onClick={() => window.location.href = "https://ncviewer.com"}
        >
          <h3 className="text-lg font-semibold">NC Viewer</h3>
          <p className="text-gray-500 text-sm text-center">Simulate tool paths with NCViewer.com</p>
        </div>

      </div>
    </div>
  );
}
