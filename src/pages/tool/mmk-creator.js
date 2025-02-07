"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MMKCreator() {
  const router = useRouter();
  const [workpieceNumber, setWorkpieceNumber] = useState("");
  const [operations, setOperations] = useState(1);
  const [op1, setOp1] = useState("");
  const [op2, setOp2] = useState("");
  const [flowDirection, setFlowDirection] = useState("left-to-right");
  const [mmkHeader, setMmkHeader] = useState("");
  const [step, setStep] = useState(1); // Controls which part of the form is visible
  const [toolCount, setToolCount] = useState(0);
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  const [tools, setTools] = useState([]);
  const [mm100Text, setMm100Text] = useState(""); // ✅ Add this line

  // Move to next step
  const nextStep = () => setStep(step + 1);

  // Automatically store header and move forward
  const storeHeaderAndContinue = () => {
    const lowerOp = Number(op1);
    const higherOp = operations === 2 ? Number(op2) : null;

    let mm1Text, mm100Text;

    if (flowDirection === "left-to-right") {
        mm1Text = `[MM1]\nTEXT="OP${lowerOp} ${workpieceNumber}"\n;\n`;
        mm100Text = operations === 2 ? `[MM100]\nTEXT="OP${higherOp} ${workpieceNumber}"\n;\n` : "";
    } else {
        mm1Text = `[MM1]\nTEXT="OP${higherOp} ${workpieceNumber}"\n;\n`;
        mm100Text = `[MM100]\nTEXT="OP${lowerOp} ${workpieceNumber}"\n;\n`;
    }

    setMm100Text(mm100Text);
    setMmkHeader(`[MM0]\nTEXT="${workpieceNumber}"\n;\n` + mm1Text);
    nextStep();
};

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">MMK Creator</h1>

      {/* Step 1: Ask for Workpiece Number */}
      {step === 1 && (
        <div className="w-full max-w-md">
          <label className="block text-lg mb-2">Enter Workpiece Number:</label>
          <input
            type="text"
            value={workpieceNumber}
            onChange={(e) => setWorkpieceNumber(e.target.value)}
            className="w-full p-2 border rounded-md mb-4"
          />
          <button onClick={nextStep} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            Next
          </button>
        </div>
      )}

      {/* Step 2: Ask if 1 or 2 Operations */}
      {step === 2 && (
        <div className="w-full max-w-md">
          <label className="block text-lg mb-2">How many operations?</label>
          <select
            value={operations}
            onChange={(e) => setOperations(Number(e.target.value))}
            className="w-full p-2 border rounded-md mb-4"
          >
            <option value={1}>1 Operation</option>
            <option value={2}>2 Operations</option>
          </select>
          <button onClick={nextStep} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            Next
          </button>
        </div>
      )}

      {/* Step 3: Ask for Operation Numbers */}
      {step === 3 && (
        <div className="w-full max-w-md">
          <label className="block text-lg mb-2">Enter First Operation Number:</label>
          <input
            type="text"
            value={op1}
            onChange={(e) => setOp1(e.target.value)}
            className="w-full p-2 border rounded-md mb-4"
          />

          {operations === 2 && (
            <>
              <label className="block text-lg mb-2">Enter Second Operation Number:</label>
              <input
                type="text"
                value={op2}
                onChange={(e) => setOp2(e.target.value)}
                className="w-full p-2 border rounded-md mb-4"
              />
            </>
          )}

          <button onClick={nextStep} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            Next
          </button>
        </div>
      )}

      {/* Step 4: Ask for Machining Flow */}
      {step === 4 && (
        <div className="w-full max-w-md">
          <label className="block text-lg mb-2">Machining Flow:</label>
          <select
            value={flowDirection}
            onChange={(e) => setFlowDirection(e.target.value)}
            className="w-full p-2 border rounded-md mb-4"
          >
            <option value="left-to-right">Left to Right</option>
            <option value="right-to-left">Right to Left</option>
          </select>
          <button onClick={storeHeaderAndContinue} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            Next
          </button>
        </div>
      )}

      {/* Step 5: Ask how many tools for the lower operation */}
      {step === 5 && (
        <div className="w-full max-w-md">
            <label className="block text-lg mb-2">
            How many tools are used for OP{op1}?
            </label>
            <input
            type="number"
            min="1"
            value={toolCount}
            onChange={(e) => setToolCount(Number(e.target.value))}
            className="w-full p-2 border rounded-md mb-4"
            />
            <button
            onClick={() => {
                setTools([]);
                nextStep(); // Move to OP1 Tool Input (Step 7)
                
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
            >
            Next
            </button>
        </div>
        )}

        {step === 5.2 && (
        <div className="w-full max-w-md">
            <label className="block text-lg mb-2">
            How many tools are used for OP{op2}?
            </label>
            <input
            type="number"
            min="1"
            value={toolCount}
            onChange={(e) => {
                setToolCount(Number(e.target.value));
            }}            
            
            className="w-full p-2 border rounded-md mb-4"
            />
            <button
            onClick={() => {
                setTools([...tools]); // Keep OP1 tools
                setCurrentToolIndex(0); // Reset index for OP2 tools
                setStep(6.2); // Move to OP2 Tool Input

            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
            >
            Next
            </button>
        </div>
        )}

      {/* Step 6+6.2: Tool Details Input */}
      {((step === 6 && currentToolIndex < toolCount) || (step === 6.2 && currentToolIndex < toolCount)) && (
        <div className="w-full max-w-md">

            <h2 className="text-xl font-semibold mb-4">
                Tool {currentToolIndex + 1} for OP{step === 6 ? op1 : op2}
            </h2>


            {/* Tool Number Input */}
            <div className="mb-4">
            <label className="block text-lg mb-2">Tool Number:</label>
            <input
                type="text"
                className="w-full p-2 border rounded-md"
                onChange={(e) => {
                const updatedTools = [...tools];
                updatedTools[currentToolIndex] = { ...updatedTools[currentToolIndex], toolNumber: e.target.value };
                setTools(updatedTools);
                }}
            />
            </div>

            {/* Display Text Input */}
            <div className="mb-4">
            <label className="block text-lg mb-2">Display Text (Cut Type & Nominal):</label>
            <input
                type="text"
                className="w-full p-2 border rounded-md"
                onChange={(e) => {
                const updatedTools = [...tools];
                updatedTools[currentToolIndex] = { ...updatedTools[currentToolIndex], displayText: e.target.value };
                setTools(updatedTools);
                }}
            />
            </div>

            {/* Cutting Edge (D Number) */}
            <div className="mb-4">
            <label className="block text-lg mb-2">Cutting Edge (D Number, Default: 1):</label>
            <input
                type="number"
                min="1"
                defaultValue="1"
                className="w-full p-2 border rounded-md"
                onChange={(e) => {
                const updatedTools = [...tools];
                updatedTools[currentToolIndex] = {
                    ...updatedTools[currentToolIndex],
                    cuttingEdge: e.target.value || "1" // Default to 1 if empty
                };
                setTools(updatedTools);
                }}
            />
            </div>

            {/* Axis (V Number) Selection */}
                <div className="mb-4">
                <label className="block text-lg mb-2">Select Axis (V Number):</label>
                <select
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => {
                    const updatedTools = [...tools];
                    updatedTools[currentToolIndex] = { 
                        ...updatedTools[currentToolIndex], 
                        axis: e.target.value // Stores only 1, 2, or 3
                    };
                    setTools(updatedTools);
                    }}
                >   
                    <option value="">Select Axis</option>
                    <option value="1">X / 1</option>
                    <option value="2">Z / 2</option>
                    <option value="3">Y / 3</option>
                </select>
                </div>


            {/* Next Tool Button */}
            <button
            onClick={() => {
                // ✅ Separate tools for OP1 and OP2
                let op1Tools = tools.filter(tool => tool.op === op1);
                let op2Tools = tools.filter(tool => tool.op === op2);

                // ✅ Swap OP1 and OP2 tool groups when machining is Right-to-Left
                if (flowDirection === "right-to-left") {
                    [op1Tools, op2Tools] = [op2Tools, op1Tools];
                }

                // ✅ Function to format tools into MM sections
                const formatTools = (tools, op, toolOffset, chanValue) => {
                    return tools.map((tool, index) => {
                        return `[MM${index + toolOffset}]\nTEXT="${tool.displayText || ""}"\nChan=${chanValue}\nT=T${tool.toolNumber || "?"}_OP${op} D${tool.cuttingEdge || 1} V${tool.axis || "?"}\nFAKTOR=100\n;`;
                    }).join("\n");
                };

                // ✅ Assign correct Chan values based on flow direction
                const op1Chan = flowDirection === "left-to-right" ? 1 : 2;
                const op2Chan = flowDirection === "left-to-right" ? 2 : 1;

                // ✅ Generate formatted tool sections
                const formattedOp1Tools = formatTools(op1Tools, op1, 2, op1Chan);
                const formattedOp2Tools = formatTools(op2Tools, op2, 101, op2Chan);

                // ✅ Ensure MM100 is inserted **AFTER** OP1 tools, **BEFORE** OP2 tools
                setMmkHeader((prevHeader) => {
                    let updatedHeader = prevHeader + formattedOp1Tools;
                    
                    // ✅ Only add MM100 once in the correct position
                    if (operations === 2) {
                        updatedHeader += `\n${mm100Text}\n`;
                    }
                    
                    updatedHeader += formattedOp2Tools;
                    
                    return updatedHeader;
                });

                // ✅ Move to OP2 tool count or MMK display
                if (operations === 2 && step === 6) {
                    setStep(5.2); // Move to OP2 Tool Count
                } else {
                    setStep(7); // Move to MMK Display
                }

                
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
            >
            Next Tool
            </button>
        </div>
        )}

    {/* Step 7: Show MMK with Proper Notepad++ Formatting */}
    {step === 7 && (
        <div className="w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">MMK Program ✅</h2>
            <textarea
            className="w-full p-4 border rounded-md font-mono text-sm"
            rows="15"
            readOnly
            value={`${mmkHeader.trim()}\n\n; Standard MMK Section\n;`}
            ></textarea>
            <button
            onClick={() => navigator.clipboard.writeText(mmkHeader)}
            className="bg-green-500 text-white px-4 py-2 mt-4 rounded-md"
            >
            Copy MMK Program
            </button>
            <button
            onClick={() => router.push(`/`)}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-600 transition"
          >
            Home
          </button>
            

        </div>
        )}

    </div>
  );
}

