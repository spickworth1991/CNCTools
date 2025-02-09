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

  // ✅ Local state to hold tool input before saving
  const [toolInput, setToolInput] = useState({
    toolNumber: "",
    displayText: "",
    cuttingEdge: "1",
    axis: "1"
  });

  // Place this before using formatTools in setMmkHeader
  const formatTools = (tools) => {
      return tools.map((tool, index) => 
          `[MM${tool.mmNumber || index + 2}]\nTEXT="${tool.displayText}"\nChan=${flowDirection === "left-to-right" ? 
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
                      value={toolInput.toolNumber}
                      onChange={(e) => setToolInput({ ...toolInput, toolNumber: e.target.value })}
                  />
              </div>

              {/* Display Text Input */}
              <div className="mb-4">
                  <label className="block text-lg mb-2">Display Text (Cut Type & Nominal):</label>
                  <input
                      type="text"
                      className="w-full p-2 border rounded-md"
                      value={toolInput.displayText}
                      onChange={(e) => setToolInput({ ...toolInput, displayText: e.target.value })}
                  />
              </div>

              {/* Cutting Edge (D Number) */}
              <div className="mb-4">
                  <label className="block text-lg mb-2">Cutting Edge (D Number, Default: 1):</label>
                  <input
                      type="number"
                      min="1"
                      className="w-full p-2 border rounded-md"
                      value={toolInput.cuttingEdge}
                      onChange={(e) => setToolInput({ ...toolInput, cuttingEdge: e.target.value })}
                  />
              </div>

              {/* Axis (V Number) Selection */}
              <div className="mb-4">
                  <label className="block text-lg mb-2">Select Axis (V Number):</label>
                  <select
                      className="w-full p-2 border rounded-md"
                      value={toolInput.axis}
                      onChange={(e) => setToolInput({ ...toolInput, axis: e.target.value })}
                  >
                      <option value="1">X / 1</option>
                      <option value="2">Z / 2</option>
                      <option value="3">Y / 3</option>
                  </select>
              </div>

            {/* Next Tool Button */}
            <button
              onClick={() => {
                  if (!toolInput.toolNumber) {
                      alert("Please enter a tool number before proceeding.");
                      return;
                  }

                  setTools((prevTools) => {
                    const newTool = { op: step === 6 ? Number(op1) : Number(op2), ...toolInput };
                    const updatedTools = [...prevTools, newTool];
                
                    console.log("📌 Saved Tool:", newTool);
                
                    // ✅ Assign MM numbers only AFTER updating state
                    const applyMMNumbers = (tools, baseMM) => {
                        return tools.map((tool, index) => ({
                            ...tool,
                            mmNumber: baseMM + index, // Sequential MM numbers
                        }));
                    };
                
                    // ✅ Filter tools based on OP
                    const op1Tools = updatedTools.filter(tool => tool.op === Number(op1));
                    const op2Tools = updatedTools.filter(tool => tool.op === Number(op2));
                
                    let formattedOp1Tools, formattedOp2Tools;
                    if (flowDirection === "left-to-right") {
                        formattedOp1Tools = applyMMNumbers(op1Tools, 2);
                        formattedOp2Tools = applyMMNumbers(op2Tools, 101);
                    } else {
                        formattedOp1Tools = applyMMNumbers(op2Tools, 2);
                        formattedOp2Tools = applyMMNumbers(op1Tools, 101);
                    }
                
                    // ✅ Update MMK Header
                    setMmkHeader(() => {
                      let updatedHeader = `[MM0]\nTEXT="${workpieceNumber}"\n;\n`;
                      // ✅ Sort MM numbers numerically
                      formattedOp1Tools.sort((a, b) => a.mmNumber - b.mmNumber);
                      formattedOp2Tools.sort((a, b) => a.mmNumber - b.mmNumber);
                      console.log("✅ OP1 Tools (After MM Assignment):", formattedOp1Tools);
                      console.log("✅ OP2 Tools (After MM Assignment):", formattedOp2Tools);
                  
                      if (flowDirection === "left-to-right") {

                          updatedHeader = `[MM0]\nTEXT="${workpieceNumber}"\n;\n`;
                          updatedHeader += `[MM1]\nTEXT="OP${op1} ${workpieceNumber}"\n;\n`;
                          updatedHeader += formatTools(formattedOp1Tools);
                          if (operations === 2) {
                              updatedHeader += `\n;\n[MM100]\nTEXT="OP${op2} ${workpieceNumber}"\n;\n`;
                              updatedHeader += formatTools(formattedOp2Tools);
                          }
                      } else {

                          updatedHeader = `[MM0]\nTEXT="${workpieceNumber}"\n;\n`;
                          updatedHeader += `[MM1]\nTEXT="OP${op2} ${workpieceNumber}"\n;\n`;
                          updatedHeader += formatTools(formattedOp1Tools);
                          updatedHeader += `\n;\n[MM100]\nTEXT="OP${op2} ${workpieceNumber}"\n;\n`;
                          updatedHeader += formatTools(formattedOp2Tools);
                      }
                      updatedHeader +=`\n;\n;\n
;<-----------------LEGEND----------------->\n
;[MMx]             ;//Header of the feature x
;Text              ;//Feature name, displayed text
;AL=               ;//Protection level for this feature (1 ... 7)
;                  ;//default = 7 - everybody
;Link="xx"         ;//Specification of the variable that should be corrected
;                  ;//Caution: Channel spec. must be added to link!
;                  ;//Simple variable example: CI_TEST[u2] - u2 == channel 2 (no spec. == channel 1)
;                  ;//1-dim. field example: CI_FELD[u2,1] - u2 == channel 2 (no spec. == channel 1)
;                  ;//2-dim. field example: CI_2FELD[u2,1,1] - u2 == channel 2 (no spec. == channel 1)
;                  ;//NC notation: CI_2FELD[1,1]
;                  ;//Example R parameter R100,1 (no spec. after , == channel 1)
;Link2=            ;//Specification for second variable
;Faktor=           ;//Factor for the 1st tool or the 1st link that was defined (manual input) (caution: note sign) no specification == 100%x
;                  ;//-999 < value < 999
;Faktor2=          ;//Factor for the 2nd tool or the 2nd link that was defined (manual input) (caution: pay attention to sign) no specification == 100%
;Chan=             ;//Assignment of the trigger channel (command for correction), no specification == 1
;extM=             ;//Allocation of a feature from external measuring station no specification == no allocation
;extMFaktor=       ;//Factor for the defined external feature (caution: pay attention to sign! Default value +100)
;extMFaktor2=      ;//Factor for the defined external feature to be applied to the 2nd link of the feature
;altM=             ;//Allocation of a channel-specific correction (alternative measurement) e.g. altM="1,2"(altM="x,y" =>_CORR_AMEAS1[X]=>variable number Y=>channel number) e.g. standstill compensation
;altMFaktor=       ;//Factor for the channel-specific correction (alternative measurement) (caution: pay attention to sign! Default value +100)
;intM=             ;//Allocation of a channel-specific correction (internal measurement) e.g. intM="1,2"(intM="x,y" =>_CORR_IMEAS1[X]=>variable number Y=>channel number) e.g. standstill compensation
;intMFaktor=       ;//Factor for the channel-specific correction (internal measurement) (caution: pay attention to sign! Default value +100)
;T="Name Dx Vx"    ;//Tool name cutting edge wear
;                  ;//Tool name is not allowed to contain spaces!
;T="Name Dx Vx DL2"    ;//Tool name, cutting edge, wear, loc.-dep. correction
;T2="xx"           ;//Unique 2nd tool name that is corrected
;D=                ;//CUTTING EDGE, if not specified directly with the tool
;V=1               ;//Wear length 1, if not specified directly with the tool
;T2=               ;//2nd tool
;Trend=            ;//Specification trend per feature
;Limit=            ;//Restriction or extension of correction value per feature
;Limit+=            ;//Restriction or extension of correction value per feature in pos. direction
;Limit-=            ;//Restriction or extension of correction value per feature in neg. direction
;CLEARLINK=1        ;//If a variable, e.g. _CORR1[1], that is used as a link,
;                   ;//is to reactivate all tools with the function and delete wear,
;                   ;//then this variable is to be set to 1.
;LINKED_TOOL=MUSTER ;//Links the variable used in the feature to the tool.
;                   ;//Reactivate the tool and delete the wear, and activate the sister tool.
`
                      console.log("📝 Final Generated MMK Header:\n", updatedHeader);
                      return updatedHeader;
                  });
                  
                
                    return updatedTools; // ✅ Return updated tools list to state
                });
                
                // ✅ Reset form inputs for the next tool
                setToolInput({
                    toolNumber: "",
                    displayText: "",
                    cuttingEdge: "1",
                    axis: "1"
                });
                
                  // ✅ Move to the next tool input step
                setTimeout(() => {
                  if (step === 6 && currentToolIndex + 1 < toolCount[op1]) {
                      setCurrentToolIndex((prevIndex) => prevIndex + 1);
                  } else if (step === 6 && currentToolIndex + 1 >= toolCount[op1]) {
                      if (operations === 2) {
                          setCurrentToolIndex(0);
                          setStep(5.2); // Move to OP2 tool count input
                      } else {
                          setStep(7); // No OP2, proceed to final output
                      }
                  } else if (step === 5.2) {
                      setCurrentToolIndex(0);
                      setStep(6.2); // Move to OP2 tool entry
                  } else if (step === 6.2 && currentToolIndex + 1 < toolCount[op2]) {
                      setCurrentToolIndex((prevIndex) => prevIndex + 1);
                  } else if (step === 6.2 && currentToolIndex + 1 >= toolCount[op2]) {
                      setStep(7); // Proceed to MMK output
                  }
                }, 100); // Small delay ensures state updates properly
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
              Save & Next Tool
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
            value={`${mmkHeader.trim()}`}
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

