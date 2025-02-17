"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function calculator() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      {/* Main Container */}
      <div className="flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Calculators</h1>
        <p className="text-lg text-gray-600 mb-8">Select a calculator to begin.</p>
      </div>

      {/* Grid for Tool Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        {/* Prism Calc */}
        <div 
          className="card cursor-pointer flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg hover:scale-105 transition"
          onClick={() => router.push("./prism")}
        >
          <h3 className="text-lg font-semibold">Prism Calculator</h3>
          <p className="text-gray-500 text-sm text-center">If your using a prism to load your operation.</p>
        </div>

        {/* Probe Calc */}
        <div 
          className="card cursor-pointer flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg hover:scale-105 transition"
          onClick={() => router.push("../wip")}
        >
          <h3 className="text-lg font-semibold">Control Cut/Probe Calculator</h3>
          <p className="text-gray-500 text-sm text-center">Generate T-List programs for Siemens CNC.</p>
        </div>

        {/* Home */}
        <div 
          className="card cursor-pointer flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg hover:scale-105 transition"
          onClick={() => router.push("../")}
        >
          <h3 className="text-lg font-semibold">Home</h3>
          <p className="text-gray-500 text-sm text-center">Go back to Homepage.</p>
        </div>



      </div>
    </div>
  );
}
