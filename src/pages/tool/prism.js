"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";


export default function QCalculator() {
  const [diameter, setDiameter] = useState("");
  const [prismAngle, setPrismAngle] = useState("");
  const [qPosition, setQPosition] = useState("");
  const [calculatedQ, setCalculatedQ] = useState(null);
  const router = useRouter();

  const calculateQValue = () => {
    if (!diameter || !prismAngle || !qPosition) {
      alert("Please fill in all fields.");
      return;
    }

    const radius = Number(diameter) / 2;
    const angleInRadians = (Number(prismAngle) / 2) * (Math.PI / 180); // Convert to radians
    const calculatedOffset = radius / Math.sin(angleInRadians);
    const totalQ = Number(qPosition) + calculatedOffset;

    setCalculatedQ({ offset: calculatedOffset.toFixed(3), total: totalQ.toFixed(3) });
  };

  return (
    <div>
      <h1 className="h1">Prism Offset Calculator</h1>

      <div>
        <label className="question">What is the diameter of the part?</label>
        <input
          type="number"
          className="input"
          value={diameter}
          onChange={(e) => setDiameter(e.target.value)}
          placeholder="Enter diameter"
        />
      </div>

      <div>
        <label className="question">What is the angle of the prism?</label>
        <input
          type="number"
          className="input"
          value={prismAngle}
          onChange={(e) => setPrismAngle(e.target.value)}
          placeholder="Enter angle"
        />
      </div>

      <div>
        <label className="question">What is the Q position of the centered part?</label>
        <input
          type="number"
          className="input"
          value={qPosition}
          onChange={(e) => setQPosition(e.target.value)}
          placeholder="Enter Q position"
        />
      </div>

      <button className="button" onClick={calculateQValue}>
        Calculate Q Value
      </button>
      <button
        onClick={() => router.push(`/`)}
        className="button"
        >
        Home
        </button>

      {calculatedQ && (
        <div className="output">
          <h2 className="h2">The Q value you need is {calculatedQ.total}</h2>
          <p className="p">
            You can write it as {qPosition} + {calculatedQ.offset} (as separate values)
          </p>
          <p className="p">Or just enter it as {calculatedQ.total}</p>
        </div>
      )}
    </div>
  );
}
