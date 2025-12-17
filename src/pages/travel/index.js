"use client";
import React from "react";
import { useRouter } from "next/router";

export default function TravelHome() {
  const router = useRouter();

  return (
    <div>
      <div>
        <h1>Travel</h1>
        <p>Select a tool.</p>
      </div>

      <div className="grid">
        <div className="card" onClick={() => router.push("/travel/combine-receipts")}>
          <h3>Combine Receipts</h3>
          <p>Create projects, upload photos, and export a single PDF.</p>
        </div>

        <div className="card" onClick={() => alert("Expense Report: coming next.")}>
          <h3>Create Expense Report</h3>
          <p>Coming soon.</p>
        </div>

        <div className="card" onClick={() => router.push("/")}>
          <h3>Back</h3>
          <p>Return to main menu.</p>
        </div>
      </div>
    </div>
  );
}
