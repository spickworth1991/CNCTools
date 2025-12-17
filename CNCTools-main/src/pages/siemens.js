"use client";
import React from "react";
import { useRouter } from "next/router";

export default function programs() {
  const router = useRouter();

  return (
    <div>
      {/* Main Container */}
      <div>
        <h1>Siemens NC Programs</h1>
        <p>Select a program type to begin.</p>
      </div>

      {/* Grid for Tool Options */}
      <div>
        
        {/* MMK Creator */}
        <div 
          className="card"
          onClick={() => router.push("./tool/mmk-creator")}
        >
          <h3>MMK Creator</h3>
          <p>Generate standard MMK programs for tool correction.</p>
        </div>

        {/* T_List Creator */}
        <div 
          className="card"
          onClick={() => router.push("./tool/t-list-creator")}
        >
          <h3>T_List Creator</h3>
          <p>Generate T-List programs for Siemens CNC.</p>
        </div>

        {/* New Program */}
        <div 
          className="card"
          onClick={() => router.push("./wip")}
        >
          <h3>More to come</h3>
          <p>If you have ideas share them.</p>
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
