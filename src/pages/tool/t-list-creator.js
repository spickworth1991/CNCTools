"use client";
import React, { useRef, useEffect, useState } from "react";


export default function TListCreator() {
  const [step, setStep] = useState(1);
  const [operations, setOperations] = useState(1);
  const [flowDirection, setFlowDirection] = useState("left-to-right");
  const [op1, setOp1] = useState("");
  const [op2, setOp2] = useState("");
  const [selectedPostsOp1, setSelectedPostsOp1] = useState([]);
  const [selectedPostsOp2, setSelectedPostsOp2] = useState([]);
  const [isProbeSelected1, setIsProbeSelected1] = useState(false);
  const [selectedProbePostOp1, setSelectedProbePostOp1] = useState("");
  const [selectedProbePostOp2, setSelectedProbePostOp2] = useState("");
  const [isProbeSelected2, setIsProbeSelected2] = useState(false);
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  const [_tools, setTools] = useState([]);
  const [toolInput, setToolInput] = useState({
    duploNumber: "1",
    cuttingEdge: "100",
  });
  const [generatedCode, setGeneratedCode] = useState({ tlist1: "", tlist2: "" });

  const handleOpChange = (e, setOp) => {
    const value = e.target.value;
    if (!isNaN(value)) {
      setOp(value);
    } else {
      alert("Please enter a numerical value.");
    }
  };

  const handleSaveTool = () => {
      const post = currentToolIndex < selectedPostsOp1.length ? selectedPostsOp1[currentToolIndex] : null;
      if (!post) {
        alert("Invalid tool index.");
        return;
      }
      const op = op1;
      const newTool = { post, op, ...toolInput };

      setTools((prev) => [...prev, newTool]);

      if (currentToolIndex + 1 < selectedPostsOp1.length) {
        console.log("im here 1");
        setCurrentToolIndex((prev) => prev + 1);
      } else if (isProbeSelected1 && currentToolIndex + 1 === selectedPostsOp1.length) {
        console.log("im here 2");
        setStep(5);
      } else if (operations === 1) {
        console.log("im here 3");
        setTools((prev) => {
          const updatedTools = [...prev, newTool];
          generateCode(updatedTools);
          return updatedTools;
        });
        setStep(6);
      } else if (operations === 2) {
        console.log("im here 4");
        setCurrentToolIndex(0); // Reset for Op2 tools
        setStep(4.2);
      }
  };


  const handleSaveTool2 = () => {
      const post = selectedPostsOp2[currentToolIndex];
      if (!post) {
        alert("Invalid tool index.");
        return;
      }
      const op = op2;
      const newTool = { post, op, ...toolInput };

      setTools((prev) => [...prev, newTool]);

      if (currentToolIndex + 1 < selectedPostsOp2.length) {
        console.log("im here 1");
        setCurrentToolIndex((prev) => prev + 1);
      } else if (isProbeSelected2 && currentToolIndex + 1 === selectedPostsOp2.length) {
        console.log("im here 2");
        setStep(5.2);
      } else {
        console.log("im here 3");
        setTools((prev) => {
          const updatedTools = [...prev, newTool];
          generateCode(updatedTools);
          return updatedTools;
        });
        setStep(6);
      }
  };

  const nextStep = () => setStep((prev) => prev + 1);

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

  const togglePostSelection = (post, operation, isProbe = false) => {
          if (operation === 1) {
              setSelectedPostsOp1((prev) => {
                  let updated;
                  if (!isProbe) {
                      updated = prev.includes(post) ? prev.filter((p) => p !== post) : [...prev, post];
                  } else {
                      updated = prev.includes(post) ? prev : [...prev, post]; // Ensure probe is added but not removed accidentally
                  }
                  return updated.sort((a, b) => a - b); // ✅ Always sort in ascending order
              });
          } else {
              setSelectedPostsOp2((prev) => {
                  let updated;
                  if (!isProbe) {
                      updated = prev.includes(post) ? prev.filter((p) => p !== post) : [...prev, post];
                  } else {
                      updated = prev.includes(post) ? prev : [...prev, post]; // Ensure probe is added but not removed accidentally
                  }
                  return updated.sort((a, b) => a - b); // ✅ Always sort in ascending order
              });
          }
      };
  const handleToolSave = () => {
    const post =
      currentToolIndex < selectedPostsOp1.length
        ? selectedPostsOp1[currentToolIndex]
        : selectedPostsOp2[currentToolIndex - selectedPostsOp1.length];
    const op = currentToolIndex < selectedPostsOp1.length ? op1 : op2;

    const newTool = { post, op, ...toolInput };
    setTools((prev) => [...prev, newTool]);

    setTimeout
    if (operations === 1) {
      if (step === 5 || step ===4) {
        setTools((prev) => {
          const updatedTools = [...prev, newTool];
          generateCode(updatedTools);
          return updatedTools;
        });
        setStep(6);
      }
    } else if (operations === 2) {
      if (step === 5) {
        setCurrentToolIndex(0); // Reset for Op2
        setStep(4.2); // Move to Op2 tool input
      }else if (step === 5.2) {
        setTools((prev) => {
          const updatedTools = [...prev, newTool];
          generateCode(updatedTools);
          return updatedTools;
        });
        setStep(6);
      }
    }
    
  }; 

  

  const generateCode = (_tools) => {
    const generateHeaderOp1 = () => `;                - EMAG -
;------------------------------------------------
; Siemens tool management
; Tool list: 1st tool carrier
;------------------------------------------------
;PROGRAM NAME:          T_LIST1
;VERSION:               08.02.02 Jul 03,2018
;AUTHOR:                SK
;MACHINE TYPE:          ALL
;MACHINE NUMBER:
;SVN $Id: T_LIST1.ARC 3408 2019-06-27 07:49:50Z skastrati $ ;*RO*
;SVN $HeadURL: file:///T:/ESC/SVNRepository/SIEMENS/_NC/840D_V8/tags/3.6.2/999_ModularStandard/VL150Duo/01_Generally/02_UserProg_English/T_LIST1.ARC $ ;*RO*;*HD*
;------------------------------------------------
CR_T[1]=1           ; Number tool carrier ;*RO*
`;
  
    const generateHeaderOp2 = () => `
;                - EMAG -
;------------------------------------------------
; Siemens tool management
; Tool list: 2nd tool carrier
;------------------------------------------------
;PROGRAM NAME:          T_LIST2
;VERSION:               08.02.02 Jul 03,2018
;AUTHOR:                SK
;MACHINE TYPE:          ALL
;MACHINE NUMBER:
;SVN $Id: T_LIST2.ARC 3408 2019-06-27 07:49:50Z skastrati $ ;*RO*
;SVN $HeadURL: file:///T:/ESC/SVNRepository/SIEMENS/_NC/840D_V8/tags/3.6.2/999_ModularStandard/VL150Duo/01_Generally/02_UserProg_English/T_LIST2.ARC $ ;*RO*;*HD*
;------------------------------------------------
CR_T[1]=2           ; Number tool carrier ;*RO*
`;
  
    const footer = `
;------------------------------------------------
N999  RET           ; Program end ;*RO*
;------------------------------------------------
;
;
; Sample data
;------------------------------------------------
; Tool Post Example
;------------------------------------------------
;CR_T[2]=1         ; Post number
;CS_T[1]="4711"    ; Tool name
;CR_T[3]=1         ; Duplo number (main/spare tool)
;CR_T[5]=1         ; Quantity monitoring (0=manual, 1=activate, 2=deselect)
;CR_T[13]=1000     ; Cutting edge 1: number of pieces nominal value
;CR_T[14]=100      ; Cutting edge 1: number of pieces prewarning limit
;T_LOAD
;-------------------Legend-----------------------
;CR_T[2]=1         ; Post number
;CS_T[1]="4711"    ; Tool name
;CR_T[3]=1         ; Duplo number (main/spare tool)
;CR_T[9]=1         ; Control cut ON/OFF
;
;CR_T[4]=1         ; Tool life monitoring (0=manual, 1=activate, 2=deselect)
;CR_T[11]=100      ; Cutting edge 1: tool life nominal value
;CR_T[12]=10       ; Cutting edge 1: tool life prewarning limit
;CR_T[21]=100      ; Cutting edge 2: tool life nominal value
;CR_T[22]=10       ; Cutting edge 2: tool life prewarning limit
;CR_T[x1]=100      ; Cutting edge x: tool life nominal value
;CR_T[x2]=10       ; Cutting edge x: tool life prewarning limit
;
;CR_T[5]=1         ; Quantity monitoring (0=manual, 1=activate, 2=deselect)
;CR_T[13]=1000     ; Cutting edge 1: number of pieces nominal value
;CR_T[14]=100      ; Cutting edge 1: number of pieces prewarning limit
;CR_T[23]=1000     ; Cutting edge 2: number of pieces nominal value
;CR_T[24]=100      ; Cutting edge 2: number of pieces prewarning limit
;CR_T[x3]=1000     ; Cutting edge x: number of pieces nominal value
;CR_T[x4]=100      ; Cutting edge x: number of pieces prewarning limit
;
;CR_T[6]=1         ; Wear monitoring (0=manual, 1=activate, 2=deselect)
;CR_T[15]=0        ; Cutting edge 1: wear nominal value
;CR_T[16]=0        ; Cutting edge 1: wear prewarning limit
;CR_T[25]=0        ; Cutting edge 2: wear nominal value
;CR_T[26]=0        ; Cutting edge 2: wear prewarning limit
;CR_T[x5]=0        ; Cutting edge x: wear nominal value
;CR_T[x6]=0        ; Cutting edge x: wear prewarning limit
;
;T_LOAD            ; Cycle load tool data
;------------------------------------------------
;`;
  
    const generateToolData = (toolsForOp, probePost, probeOp) => {
      const uniqueTools = [...new Map(toolsForOp.map(tool => [tool.post, tool])).values()]; // ✅ Remove duplicates

      let toolCode = uniqueTools
        .map(
          (tool) => `
;------------------------------------------------
; Tool post ${tool.post}
;------------------------------------------------
CR_T[2]=${tool.post}          ; Post number
CS_T[1]="T${tool.post}_OP${tool.op}"   ; Tool name
CR_T[3]=${tool.duploNumber}           ; Duplo number (main/spare tool)
CR_T[5]=1           ; Quantity monitoring (0=manual, 1=activate, 2=deselect)
CR_T[13]=${tool.cuttingEdge}        ; Cutting edge 1: number of pieces nominal value
CR_T[14]=10         ; Cutting edge 1: number of pieces prewarning limit
T_LOAD              ; Cycle load Tool data ;*RO*
`
        )
        .join("\n");

  
      // Add Probe Code if Selected
      if (probePost && probeOp) {
        const probeCode = `
;------------------------------------------------
; Probe post ${probePost}
;------------------------------------------------
CR_T[2]=${probePost}           ; Post number
CS_T[1]="PROBE_OP${probeOp}"   ; Tool name
CR_T[3]=1           ; Duplo number (main/spare tool) {Always 1 for probe}
CR_T[5]=0           ; Quantity monitoring (0=manual, 1=activate, 2=deselect) {Always 0 for probe}
CR_T[13]=100        ; Cutting edge 1: number of pieces nominal value {Always 100 for probe}
CR_T[14]=10         ; Cutting edge 1: number of pieces prewarning limit {Always 10 for probe}
T_LOAD              ; Cycle load Tool data ;*RO*
`;
      
        toolCode += probeCode;
      }
  
      return toolCode;
    };
  
  
    const toolsOp1 = _tools.filter((tool) => String(tool.op) === String(op1));
    const toolsOp2 = _tools.filter((tool) => String(tool.op) === String(op2));

  
    const op1IsFirst = flowDirection === "left-to-right";
    const tlist1 =
      generateHeaderOp1(op1IsFirst ? 1 : 2) +
      generateToolData(op1IsFirst ? toolsOp1 : toolsOp2, 
        op1IsFirst ? (isProbeSelected1 ? selectedProbePostOp1 : null) : (isProbeSelected2 ? selectedProbePostOp2 : null), op1IsFirst ? op1 : op2) +
      footer;
  
    const tlist2 =
      generateHeaderOp2(op1IsFirst ? 2 : 1) +
      generateToolData(op1IsFirst ? toolsOp2 : toolsOp1, 
        op1IsFirst ? (isProbeSelected2 ? selectedProbePostOp2 : null) : (isProbeSelected1 ? selectedProbePostOp1 : null), op1IsFirst ? op2 : op1) +
      footer;
  
    setGeneratedCode({ tlist1, tlist2 });
  };

  return (
    <div>
      <h1 className="h1">T_LIST Creator</h1>

      {step === 1 && (
        <div>
          <label className="question">How many operations?</label>
          <select
            className= "dropdown"
            value={operations}
            onChange={(e) => setOperations(Number(e.target.value))}
          >
            <option value={1}>1 Operation</option>
            <option value={2}>2 Operations</option>
          </select>
          {operations === 2 && (
            <>
              <label className="question">Machining Flow:</label>
              <select
                className= "dropdown"
                value={flowDirection}
                onChange={(e) => setFlowDirection(e.target.value)}
              >
                <option value="left-to-right">Left to Right</option>
                <option value="right-to-left">Right to Left</option>
              </select>
            </>
          )}
          <button ref={nextButtonRef} onClick={nextStep} className= "button">
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div>
            <label className="question">Enter Operation Number(s):</label>
          </div>
          <div>
            <input
              className="input"
              type="text"
              value={op1}
              onChange={(e) => handleOpChange(e, setOp1)}
              placeholder="Operation 1"
            />
          </div>
          <div>
            {operations === 2 && (
              <input
                className="input"
                type="text"
                value={op2}
                onChange={(e) => handleOpChange(e, setOp2)}
                placeholder="Operation 2"
              />
            )}
          </div>
          <div>
            <button
              ref={nextButtonRef}
              className="button"
              onClick={() => {
                if (op1 === "") {
                  alert("Please enter a numerical value for Operation 1.");
                  return;
                }

                if (operations === 2 && op2 === "") {
                  alert("Please enter a numerical value for Operation 2.");
                  return;
                } else {
                  nextStep();
                }
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>Select Tool Posts</h2>
          <h3>Operation 1</h3>
          <div>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((post) => (
              <button
              key={`op1-${post}`}
              onClick={() => togglePostSelection(post, 1)}
              className={`button ${selectedPostsOp1.includes(post) ? "selected" : ""}`}
            >
              Post {post} {selectedPostsOp1.includes(post) ? "✔" : ""}
            </button>
            
            ))}
          {/* PROBE BUTTON */}
          <button
            key="probe"
            onClick={() => {
              setIsProbeSelected1((prev) => !prev);
              if (!isProbeSelected1 && selectedProbePostOp1) {
                togglePostSelection(selectedProbePostOp1, 1, true);
              } else {
                setSelectedPostsOp1((prevPosts) => prevPosts.filter((p) => p !== selectedProbePostOp1));
              }
            }}
            className={`button ${isProbeSelected1 ? "selected" : ""}`}
          >
            Probe {isProbeSelected1 ? "✔" : ""}
          </button>


        </div>
          {operations === 2 && (
            <>
              <h3>Operation 2</h3>
              <div >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((post) => (
                  <button
                  key={`op2-${post}`}
                  onClick={() => togglePostSelection(post, 2)}
                  className={`button ${selectedPostsOp2.includes(post) ? "selected" : ""}`}
                >
                  Post {post} {selectedPostsOp2.includes(post) ? "✔" : ""}
                </button>
                
                ))}
              {/* PROBE BUTTON */}
              <button
                key="probe"
                onClick={() => {
                  setIsProbeSelected2((prev) => !prev);
                  if (!isProbeSelected2 && selectedProbePostOp2) {
                    togglePostSelection(selectedProbePostOp2, 2, true);
                  } else {
                    setSelectedPostsOp2((prevPosts) => prevPosts.filter((p) => p !== selectedProbePostOp2));
                  }
                }}
                className={`button ${isProbeSelected2 ? "selected" : ""}`}
              >
                Probe {isProbeSelected2 ? "✔" : ""}
              </button>
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
                nextStep();
              }
            }}
          >
            Next
          </button>
        </div>
      )}

      {step === 4 && currentToolIndex <  selectedPostsOp1.length &&  (
        <div>
          <h2 className="h2"> 
            Tool for Post { selectedPostsOp1[currentToolIndex]
                }{" "}
            (OP{op1})
          </h2>

          <label className="question">Duplo Number:</label>
          <select
            className="dropdown"
            value={toolInput.duploNumber}
            onChange={(e) => setToolInput({ ...toolInput, duploNumber: e.target.value })}
          >
            <option value="1">Main Tool</option>
            <option value="2">Spare Tool</option>
          </select>
          <label className="question">Cutting Edge Nominal Value:</label>
          <input
            className="input"
            type="number"
            value={toolInput.cuttingEdge}
            onChange={(e) => setToolInput({ ...toolInput, cuttingEdge: e.target.value })}
          />
          <button
            ref={nextButtonRef}
            className="button"
            onClick={handleSaveTool}
          >
            Save Tool
          </button>
        </div>
        )}
        {step === 4.2 && currentToolIndex  < selectedPostsOp1.length + selectedPostsOp2.length  &&  (
          <div>
            <h2 className="h2">
              Tool for Post {selectedPostsOp2[currentToolIndex]
                  }{" "}
              (OP{op2})
            </h2>

            <label className="question">Duplo Number:</label>
            <select
              className="dropdown"
              value={toolInput.duploNumber}
              onChange={(e) => setToolInput({ ...toolInput, duploNumber: e.target.value })}
            >
              <option value="1">Main Tool</option>
              <option value="2">Spare Tool</option>
            </select>
            <label className="question">Cutting Edge Nominal Value:</label>
            <input
              className="input"
              type="number"
              value={toolInput.cuttingEdge}
              onChange={(e) => setToolInput({ ...toolInput, cuttingEdge: e.target.value })}
            />
            <button
              ref={nextButtonRef}
              className="button"
              onClick={handleSaveTool2}
            >
              Save Tool
            </button>
          </div>

      )}
      {step === 5 && (
        <div>
          <h2 className="h2">Select Probe Post for Operation 1</h2>
          <select
            className="dropdown"
            value={selectedProbePostOp1}
            onChange={(e) => setSelectedProbePostOp1(e.target.value)}
          >
            <option value="">Select Probe Post</option>
            {Array.from({ length: 16 }, (_, i) => i + 1).map((post) => (
              <option key={`probe-${post}`} value={post}>
                Post {post}
              </option>
            ))}
          </select>
          <button
          ref={nextButtonRef}
          className="button"
            onClick={handleToolSave} // Move to operation 2 tool questions or final step
          >
            Next
          </button>
        </div>
      )}

      {step === 5.2 && (
        <div>
          <h2 className="h2">Select Probe Post for Operation 2</h2>
          <select
            className="dropdown"
            value={selectedProbePostOp2}
            onChange={(e) => setSelectedProbePostOp2(e.target.value)}
          >
            <option value="">Select Probe Post</option>
            {Array.from({ length: 16 }, (_, i) => i + 1).map((post) => (
              <option key={`probe-${post}`} value={post}>
                Post {post}
              </option>
            ))}
          </select>
          <button
            ref={nextButtonRef}
            className="button"
            onClick={handleToolSave} // Move to the final step
          >
            Next
          </button>
        </div>
      )}

{step === 6 && (
  <div>
    <h2 className="h2">T_LIST Program ✅</h2>
    {operations === 1 ? (
      <div>
        <div>
          <h3 className="h3">T_LIST1</h3>
          <div>
            <textarea
              className="textarea"
              readOnly
              rows="15"
              value={generatedCode.tlist1}
            ></textarea>
          </div>
          <div>
            <button
              className="button"
              onClick={() => navigator.clipboard.writeText(generatedCode.tlist1)}
            >
              Copy T_LIST1
            </button>
            <button
              className="button"
              onClick={() => window.location.href = "/"}
            >
              Home
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div>
        <div>
          <h3 className="h3">T_LIST1</h3>
          <div>
            <textarea
              className="textarea"
              readOnly
              rows="15"
              value={generatedCode.tlist1}
            ></textarea>
          </div>
          <div>
            <button
              className="button"
              onClick={() => navigator.clipboard.writeText(generatedCode.tlist1)}
            >
              Copy T_LIST1
            </button>
          </div>
        </div>
        <div>
          <h3 className="h3">T_LIST2</h3>
          <div>
            <textarea
              className="textarea"
              readOnly
              rows="15"
              value={generatedCode.tlist2}
            ></textarea>
          </div>
          <div>
            <button
              className="button"
              onClick={() => navigator.clipboard.writeText(generatedCode.tlist2)}
            >
              Copy T_LIST2
            </button>
            <button
              className="button"
              onClick={() => window.location.href = "/"}
            >
              Home
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)}
    </div>
  );
} 