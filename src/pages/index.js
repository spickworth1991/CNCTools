"use client";
import React from "react";
import { useRouter } from "next/navigation";


export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">CNC Tool Generator</h1>
      <p className="text-lg text-gray-600 mb-8">Select a tool to begin creating your CNC programs.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        <div className="card cursor-pointer" onClick={() => router.push("tool/mmk-creator")}>
          <div className="p-6 flex flex-col items-center">
            
            <h3 className="text-lg font-semibold">MMK Creator</h3>
            <p className="text-gray-500 text-sm text-center">Generate standard MMK programs for tool correction.</p>
          </div>
        </div>

        <div className="card cursor-pointer" onClick={() => router.push("tool/t-list-creator")}>
          <div className="p-6 flex flex-col items-center">
            
            <h3 className="text-lg font-semibold">T_List Creator</h3>
            <p className="text-gray-500 text-sm text-center">Generate T-List programs for Siemens CNC.</p>
          </div>
        </div>

      </div>
    </div>
  );
}

