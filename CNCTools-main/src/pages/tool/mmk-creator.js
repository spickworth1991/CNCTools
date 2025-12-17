"use client";
import React, { useRef, useEffect, useState } from "react";
import { useRouter } from "next/router";


export default function MMKCreator() {
  const router = useRouter();
  const [workpieceNumber, setWorkpieceNumber] = useState("");
  const [operations, setOperations] = useState(1);
  const [op1, setOp1] = useState("");
  const [op2, setOp2] = useState("");
  const [flowDirection, setFlowDirection] = useState("left-to-right");
  const [mmkHeader, setMmkHeader] = useState("");
  const [step, setStep] = useState(1);
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  const [_tools, setTools] = useState([]);
  const [selectedPostsOp1, setSelectedPostsOp1] = useState([]);
  const [selectedPostsOp2, setSelectedPostsOp2] = useState([]);
  const currentPost = step === 5 ? selectedPostsOp1[currentToolIndex] : selectedPostsOp2[currentToolIndex];
  const [toolInput, setToolInput] = useState({
    displayText: "",
    cuttingEdge: "1",
    axis: "1"
  });

  const nextButtonRef = useRef(null);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "Enter" && nextButtonRef.current) {
        nextButtonRef.current.click();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [step]);

  const togglePostSelection = (post, operation) => {
    if (operation === 1) {
      setSelectedPostsOp1((prev) => {
        const updated = prev.includes(post) ? prev.filter((p) => p !== post) : [...prev, post];
        return [...updated]; // Ensure a new array reference for state update
      });
    } else {
      setSelectedPostsOp2((prev) => {
        const updated = prev.includes(post) ? prev.filter((p) => p !== post) : [...prev, post];
        return [...updated]; // Ensure a new array reference for state update
      });
    }
  };
  
    const handleOpChange = (e, setOp) => {
      const value = e.target.value;
      if (!isNaN(value)) {
        setOp(value);
      } else {
        alert("Please enter a numerical value.");
      }
    };

    const handleOpName = () => {
      if (workpieceNumber !== "") {
        setStep(2);
      } else {
        alert("This field cannot be blank. Please enter workpiece name/number.");
      }
    };
  
  

  const formatTools = (tools) => {
      return tools.map((tool, index) => 
          `[MM${tool.mmNumber || index + 2}]
TEXT="${tool.displayText}"
Chan=${flowDirection === "left-to-right" ? 
    (tool.op === Number(op1) ? 1 : 2) : (tool.op === Number(op1) ? 2 : 1)}
T=T${tool.post || tool.toolNumber}_OP${tool.op} D${tool.cuttingEdge || 1} V${tool.axis || 1}
FAKTOR=100
;
`
      ).join("\n");
  };


  const nextStep = () => setStep(step + 1);

  const storeHeaderAndContinue = () => {
    const op1Num = Number(op1);
    const op2Num = Number(op2);
  
    if (op1 === "") {
      alert("Please enter a numerical value for Operation 1.");
      return;
    }
  
    if (operations === 2 &&  op2 === "") {
      alert("Please enter a numerical value for Operation 2.");
      return;
    }
  
    let mm1Text = "";
  
    if (flowDirection === "left-to-right") {
      mm1Text = `[MM1]\nTEXT="OP${op1Num} ${workpieceNumber}"\n;\n`;
    } else {
      mm1Text = `[MM1]\nTEXT="OP${op2Num} ${workpieceNumber}"\n;\n`;
    }
  
    setMmkHeader(`[MM0]\nTEXT="${workpieceNumber}"\n;\n` + mm1Text);
    nextStep();
  };


  return (
    <div>
      <h1 className="h1">MMK Creator</h1>

      {/* Step 1: Ask for Workpiece Number */}
      {step === 1 && (
        <div>
          <h2 className="h2">Enter Workpiece Number:</h2>
          <div>
          <input
            type="text"
            className="input"
            placeholder="Enter workpiece number"
            value={workpieceNumber}
            onChange={(e) => setWorkpieceNumber(e.target.value)}
          />
          </div>
          <button onClick={handleOpName} className="button" ref={nextButtonRef}>
            Next
          </button>
          <button
                onClick={() => router.push(`/`)}
                className="button"
              >
                Home
              </button>
        </div>
      )}

      {/* Step 2: Ask if 1 or 2 Operations */}
      {step === 2 && (
        <div>
          <h2 className="h2">How many operations?</h2>
          <select
            value={operations}
            onChange={(e) => setOperations(Number(e.target.value))}
            className="dropdown"
          >
            <option value={1}>1 Operation</option>
            <option value={2}>2 Operations</option>
          </select>
          {operations === 2 && (
            <>
              <label className="question">Machining Flow:</label>
              <select
                value={flowDirection}
                onChange={(e) => setFlowDirection(e.target.value)}
                className="dropdown"
              >
                <option value="left-to-right">Left to Right</option>
                <option value="right-to-left">Right to Left</option>
              </select>
            </>
          )}
          <button onClick={nextStep} className="button" ref={nextButtonRef}>
            Next
          </button>
          <button
                onClick={() => router.push(`/`)}
                className="button"
              >
                Home
              </button>
        </div>
      )}

      {/* Step 3: Ask for Operation Numbers */}
      {step === 3 && (
        <div>
          <div>
          <h2 className="h2">Enter Operation Number(s):</h2>
          </div>
          <div>
        <input
          type="text"
          value={op1}
          onChange={(e) => handleOpChange(e, setOp1)}
          className="input"
          placeholder="Operation 1"
        /></div>
        <div>
        {operations === 2 && (
          <input
            type="text"
            value={op2}
            onChange={(e) => handleOpChange(e, setOp2)}
            className="input"
            placeholder="Operation 2"
          />
        )}
        </div>
        <div>
        <button onClick={storeHeaderAndContinue} className="button" ref={nextButtonRef}>
          Next
        </button>
        <button
        onClick={() => router.push(`/`)}
        className="button"
      >
        Home
      </button>
        </div>
      </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="h2">Select Tool Posts</h2>
          <h3 className="h3">Operation {op1}</h3>
          <div>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((post) => (
              <button
                key={`op1-${post}`}
                onClick={() => togglePostSelection(post, 1)}
                className={`button ${selectedPostsOp1.includes(post) ? "selected" : ""}`}
                ref={nextButtonRef}
              >
                Post {post} {selectedPostsOp1.includes(post) ? "✔" : ""}
              </button>
            ))}
          </div>
          {operations === 2 && (
            <>
              <h3 className="h3">Operation {op2}</h3>
              <div>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((post) => (
                  <button
                    key={`op2-${post}`}
                    onClick={() => togglePostSelection(post, 2)}
                    className={`button ${selectedPostsOp2.includes(post) ? "selected" : ""}`}
                    ref={nextButtonRef}
                  >
                    Post {post} {selectedPostsOp2.includes(post) ? "✔" : ""}
                  </button>
                ))}
              </div>
            </>
          )}
          <button
            ref={nextButtonRef}
            className="button"
            onClick={() => {
              if (selectedPostsOp1.length === 0) {
                alert("Please select a tool post for turret 1.");
              } else if (operations === 2 && selectedPostsOp2.length === 0) {
                alert("Please select a tool post for turret 2.");
              } else {
                setStep(5);
              }
            }}
          >
            Next
          </button>
          <button
          onClick={() => router.push(`/`)}
          className="button"
        >
          Home
        </button>
        </div>
      )}


      {/* Step 5+5.2: Tool Details Input */}
      {((step === 5 && currentToolIndex < selectedPostsOp1.length) || 
        (step === 5.2 && currentToolIndex < selectedPostsOp2.length)) && (

          <div>
          <h2 className="h2">
              Tool for Post {currentPost} (OP{step === 5 ? op1 : op2})
            </h2>


              {/* Display Text Input */}
              <div>
                  <label className="question">Display Text (Cut Type & Nominal):</label>
                  <input
                      type="text"
                      className="input"
                      value={toolInput.displayText}
                      onChange={(e) => setToolInput({ ...toolInput, displayText: e.target.value })}
                  />
              </div>

              {/* Cutting Edge (D Number) */}
              <div>
                  <label className="question">Cutting Edge (D Number, Default: 1):</label>
                  <input
                      type="number"
                      min="1"
                      className="input"
                      value={toolInput.cuttingEdge}
                      onChange={(e) => setToolInput({ ...toolInput, cuttingEdge: e.target.value })}
                  />
              </div>

              {/* Axis (V Number) Selection */}
              <div>
                  <label className="question">Select Axis (V Number):</label>
                  <select
                      className="dropdown"
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
              ref={nextButtonRef}
              className="button"
              onClick={() => {
                if (toolInput.displayText !== "" && toolInput.cuttingEdge !== "" && toolInput.axis !== "") {
                  setTools((prevTools) => {
                    const newTool = {
                      toolNumber: currentPost, // Auto-assign tool number
                      post: currentPost, // Auto-assign post number
                      op: step === 5 ? Number(op1) : Number(op2),
                      displayText: toolInput.displayText,
                      cuttingEdge: toolInput.cuttingEdge,
                      axis: toolInput.axis,
                    };
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
                        updatedHeader += `[MM1]\nTEXT="OP${op1} ${workpieceNumber}"\n;\n`;
                        updatedHeader += formatTools(formattedOp1Tools);
                        if (operations === 2) {
                          updatedHeader += `\n;\n[MM100]\nTEXT="OP${op2} ${workpieceNumber}"\n;\n`;
                          updatedHeader += formatTools(formattedOp2Tools);
                        }
                      } else {
                        updatedHeader += `[MM1]\nTEXT="OP${op2} ${workpieceNumber}"\n;\n`;
                        updatedHeader += formatTools(formattedOp1Tools);
                        updatedHeader += `\n;\n[MM100]\nTEXT="OP${op1} ${workpieceNumber}"\n;\n`;
                        updatedHeader += formatTools(formattedOp2Tools);
                      }
                      updatedHeader += `\n;\n;
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
                    if (step === 5 && currentToolIndex + 1 < selectedPostsOp1.length) {
                      setCurrentToolIndex((prevIndex) => prevIndex + 1);
                    } else if (step === 5 && currentToolIndex + 1 >= selectedPostsOp1.length) {
                      if (operations === 2) {
                        setCurrentToolIndex(0);
                        setStep(5.2); // Move to OP2 tool count input
                      } else {
                        setStep(6); // No OP2, proceed to final output
                      }
                    } else if (step === 4.2) {
                      setCurrentToolIndex(0);
                      setStep(5.2); // Move to OP2 tool entry
                    } else if (step === 5.2 && currentToolIndex + 1 < selectedPostsOp2.length) {
                      setCurrentToolIndex((prevIndex) => prevIndex + 1);
                    } else if (step === 5.2 && currentToolIndex + 1 >= selectedPostsOp2.length) {
                      setStep(6); // Proceed to MMK output
                    }
                  }, 100); // Small delay ensures state updates properly
                } else {
                  if (toolInput.displayText === "") {
                    alert("Display text cannot be blank");
                  } else if (toolInput.cuttingEdge === "") {
                    alert("Cutting Edge cannot be blank");
                  } else {
                    alert("Unknown Error");
                  }
                }
              }}
            >
              Save & Next Tool
            </button>
            <button
                onClick={() => router.push(`/`)}
                className="button"
              >
                Home
              </button>

        </div>
        )}

    {/* Step 6: Show MMK with Proper Notepad++ Formatting */}
    {step === 6 && (
        <div>
          <h2 className="h2">MMK Program ✅</h2>
          <div>
            <textarea
              className="textarea"
              rows="15"
              readOnly
              value={`${mmkHeader.trim()}`}
            />
            <div />
            <div>
              <button
                onClick={() => navigator.clipboard.writeText(mmkHeader)}
                className="button"
              >
                Copy MMK Program
              </button>
              <button
                onClick={() => router.push(`/`)}
                className="button"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}