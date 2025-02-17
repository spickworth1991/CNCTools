"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function ExperienceCalculator() {
  const router = useRouter();
  const [controlCut, setControlCut] = useState("");
  const [finishPart, setFinishPart] = useState("");
  const [cmmMeasurement, setCmmMeasurement] = useState("");
  const [results, setResults] = useState(null);

  const calculateExperienceValue = () => {
    if (!controlCut && !finishPart) {
      alert("Please enter at least one measurement to calculate.");
      return;
    }

    if (!cmmMeasurement) {
      alert("Please enter the CMM/Gauge measurement.");
      return;
    }

    const cmmValue = Math.abs(Number(cmmMeasurement));
    let newResults = {};

    if (controlCut) {
      const controlCutDiff = (cmmValue - Number(controlCut)).toFixed(3);
      newResults.controlCutDiff = controlCutDiff;
      newResults.controlCutAction = controlCutDiff > 0 ? "add" : "subtract";
    }

    if (finishPart) {
      const finishPartDiff = (cmmValue - Number(finishPart)).toFixed(3);
      newResults.finishPartDiff = finishPartDiff;
      newResults.finishPartAction = finishPartDiff > 0 ? "add" : "subtract";
    }

    setResults(newResults);
  };

  return (
    <div>
      <h1 className="h1">Experience Value Calculator</h1>

      <div>
        <label className="question">What does the control cut measurement read?</label>
        <input
          type="number"
          className="input"
          value={controlCut}
          onChange={(e) => setControlCut(e.target.value)}
          placeholder="Enter control cut measurement"
        />
      </div>

      <div>
        <label className="question">What does the finish part measurement read?</label>
        <input
          type="number"
          className="input"
          value={finishPart}
          onChange={(e) => setFinishPart(e.target.value)}
          placeholder="Enter finish part measurement"
        />
      </div>

      <div>
        <label className="question">What does the CMM/Gauge read?</label>
        <input
          type="number"
          className="input"
          value={cmmMeasurement}
          onChange={(e) => setCmmMeasurement(e.target.value)}
          placeholder="Enter CMM/Gauge measurement"
        />
      </div>

      <button className="button" onClick={calculateExperienceValue}>
        Calculate Experience Value
      </button>

      <button className="button" onClick={() => router.push(`/`)}>
        Home
      </button>

      {results && (
        <div className="output">
          {results.controlCutDiff !== undefined && (
            <h2 className="h2">
              You need to {results.controlCutAction} {Math.abs(results.controlCutDiff)} to the experience value for the control cut.
            </h2>
          )}

          {results.finishPartDiff !== undefined && (
            <h2 className="h2">
              You need to {results.finishPartAction} {Math.abs(results.finishPartDiff)} to the experience value for the finish part.
            </h2>
          )}
        </div>
      )}
    </div>
  );
}
