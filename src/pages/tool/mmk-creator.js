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
  const [toolCount, setToolCount] = useState({}); // ✅ Now an object
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  const [tools, setTools] = useState([]);

  const updateTool = (property, value) => {
    setTools((prevTools) => {
        const opKey = step === 6 ? Number(op1) : Number(op2);
        const updatedTools = [...prevTools];

        if (!updatedTools[currentToolIndex]) {
            // If tool doesn't exist, create it
            updatedTools[currentToolIndex] = { op: opKey };
        }

        // Update only the specific tool property
        updatedTools[currentToolIndex] = {
            ...updatedTools[currentToolIndex],
            [property]: value
        };

        return updatedTools;
    });
};



  
  // Place this before using formatTools in setMmkHeader
  const formatTools = (tools) => {
      return tools.map(tool => 
          `[MM${tool.mmNumber}]\nTEXT="${tool.displayText}"\nChan=${flowDirection === "left-to-right" ? 
          (tool.op === Number(op1) ? 1 : 2) : (tool.op === Number(op1) ? 2 : 1)}\nT=T${tool.toolNumber}_OP${tool.op} D${tool.cuttingEdge || 1} V${tool.axis || 1}\nFAKTOR=100\n;`
      ).join("\n");
  };



  // Move to next step
  const nextStep = () => setStep(step + 1);

  // Automatically store header and move forward
  const storeHeaderAndContinue = () => {
      const op1Num = Number(op1);
      const op2Num = Number(op2);

      let mm1Text = "";
      let mm100Text = "";

      if (flowDirection === "left-to-right") {
          mm1Text = `[MM1]\nTEXT="OP${op1Num} ${workpieceNumber}"\n;\n`;
          mm100Text = operations === 2 ? `[MM100]\nTEXT="OP${op2Num} ${workpieceNumber}"\n;\n` : "";
      } else {
          mm1Text = `[MM1]\nTEXT="OP${op2Num} ${workpieceNumber}"\n;\n`;
          mm100Text = `[MM100]\nTEXT="OP${op1Num} ${workpieceNumber}"\n;\n`;
      }

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
              value={toolCount[op1] || ""}
              onChange={(e) => setToolCount((prev) => ({
                ...prev,
                [op1]: Number(e.target.value) || 1 // ✅ Default to 1 if empty
              }))}              
            className="w-full p-2 border rounded-md mb-4"
            />
            <button
            onClick={() => {
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
              value={toolCount[op2] || ""}
              onChange={(e) => {
                const count = Number(e.target.value) || 1;
                setToolCount((prev) => ({
                  ...prev,
                  [op2]: count
                }));
              }}
                        
            
            className="w-full p-2 border rounded-md mb-4"
            />
            <button
              onClick={() => {
                setCurrentToolIndex(0);
                setStep(6.2); // ✅ Move to OP2 tool entry
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              Next
            </button>

        </div>
        )}

      {/* Step 6+6.2: Tool Details Input */}
      {((step === 6 && currentToolIndex < (toolCount[op1] || 0)) || 
        (step === 6.2 && currentToolIndex < (toolCount[op2] || 0))) && (

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
                onChange={(e) => updateTool("toolNumber", e.target.value)}
            />

            </div>

            {/* Display Text Input */}
            <div className="mb-4">
            <label className="block text-lg mb-2">Display Text (Cut Type & Nominal):</label>
            <input
                type="text"
                className="w-full p-2 border rounded-md"
                onChange={(e) => updateTool("displayText", e.target.value)}
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
                onChange={(e) => updateTool("cuttingEdge", e.target.value || "1")}
            />


            </div>

            {/* Axis (V Number) Selection */}
                <div className="mb-4">
                <label className="block text-lg mb-2">Select Axis (V Number):</label>
                <select
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => updateTool("axis", e.target.value)}
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
                   // ✅ Apply MM numbers AFTER sorting based on flow direction
                   const applyMMNumbers = (tools, baseMM) => {
                    return tools
                        .filter((tool) => tool.toolNumber) // Ensure tool exists
                        .map((tool, index) => ({
                            mmNumber: baseMM + index,  // Assign MM numbers separately for OP1 and OP2
                            ...tool
                        }));
                };
                
                              
                
                // Assign MM numbers correctly based on flow direction
                const op1Tools = tools.filter(tool => tool.op === Number(op1));
                const op2Tools = tools.filter(tool => tool.op === Number(op2));
                let formattedOp1Tools, formattedOp2Tools;
                if (flowDirection === "left-to-right") {
                    formattedOp1Tools = applyMMNumbers(op1Tools, 2);
                    formattedOp2Tools = applyMMNumbers(op2Tools, 101);
                } else {
                    formattedOp1Tools = applyMMNumbers(op2Tools, 2);
                    formattedOp2Tools = applyMMNumbers(op1Tools, 101);
                }
                // Generate MMK Output
                setMmkHeader(() => {
                  let updatedHeader = `[MM0]\nTEXT="${workpieceNumber}"\n;\n`;
              
                  const op1Tools = tools.filter(t => t.op === Number(op1));
                  const op2Tools = tools.filter(t => t.op === Number(op2));
              
                  if (flowDirection === "left-to-right") {
                      updatedHeader += `[MM1]\nTEXT="OP${op1} ${workpieceNumber}"\n;\n`;
                      updatedHeader += formatTools(op1Tools); // ✅ Ensure OP1 tools are added
                      
                      if (operations === 2) {
                          updatedHeader += `[MM100]\nTEXT="OP${op2} ${workpieceNumber}"\n;\n`;
                          updatedHeader += formatTools(op2Tools); // ✅ Ensure OP2 tools are added
                      }
                  } else {
                      updatedHeader += `[MM1]\nTEXT="OP${op2} ${workpieceNumber}"\n;\n`;
                      updatedHeader += formatTools(op2Tools); // ✅ Ensure OP2 tools are added
                      updatedHeader += `[MM100]\nTEXT="OP${op1} ${workpieceNumber}"\n;\n`;
                      updatedHeader += formatTools(op1Tools); // ✅ Ensure OP1 tools are added
                  }
              
                  return updatedHeader;
              });
              
                  // Move to the next tool input step
                if (step === 6 && currentToolIndex + 1 < toolCount[op1]) {
                setCurrentToolIndex((prevIndex) => prevIndex + 1);
              } else if (step === 6 && currentToolIndex + 1 >= toolCount[op1]) {
                  if (operations === 2) {
                      setCurrentToolIndex(0); // Reset tool index for OP2, but do NOT reset tools
                      setStep(5.2); // Move to OP2 tool count input
                  } else {
                      setStep(7); // No OP2, proceed to final output
                  }
              }else if (step === 5.2) {
                setStep(6.2); // Always move to OP2 tool entry
              } else if (step === 6.2 && currentToolIndex + 1 < toolCount[op2]) {
                setCurrentToolIndex((prevIndex) => prevIndex + 1);
              } else if (step === 6.2 && currentToolIndex + 1 >= toolCount[op2]) {
                setStep(7); // Proceed to MMK output
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

