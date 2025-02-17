"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function calculator() {
  const router = useRouter();

  return (
    <div>
      {/* Main Container */}
      <div>
        <h1>Calculators</h1>
        <p>Select a calculator to begin.</p>
      </div>

      {/* Grid for Tool Options */}
      <div>
        
        {/* Prism Calc */}
        <div 
          className="card"
          onClick={() => router.push("./tool/prism")}
        >
          <h3>Prism Calculator</h3>
          <p>If your using a prism to load your operation.</p>
        </div>

        {/* Probe Calc */}
        <div 
          className="card"
          onClick={() => router.push("./tool/exp")}
        >
          <h3>Control Cut/Probe Calculator</h3>
          <p>Calculate Experience values with ease.</p>
        </div>

        {/* New Calc */}
        <div 
          className="card"
          onClick={() => router.push("./wip")}
        >
          <h3>More to come</h3>
          <p>If yu have ideas share them.</p>
        </div>

        {/* Home */}
        <div 
          className="card"
          onClick={() => router.push("./")}
        >
          <h3>Home</h3>
          <p>Go back to Homepage.</p>
        </div>



      </div>
    </div>
  );
}
