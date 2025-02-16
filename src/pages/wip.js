"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function homePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      {/* Main Container */}
      <div className="flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">WORK IN PROGRESS</h1>
        <p className="text-lg text-gray-600 mb-8">Sorry im still working on this section.</p>
      </div>

      {/* Grid for Tool Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        {/* WIP */}
        <div 
          className="card cursor-pointer flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg hover:scale-105 transition"
          onClick={() => router.push("../")}
        >
          <h3 className="text-lg font-semibold">Work in Progress</h3>
          <p className="text-gray-500 text-sm text-center">Click to return home.</p>
        </div>

      </div>
    </div>
  );
}
