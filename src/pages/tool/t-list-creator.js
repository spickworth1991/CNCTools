"use client";
import React from "react";
import { useState } from "react";


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

  const handleSaveTool = () => {
    const post =
      currentToolIndex < selectedPostsOp1.length
        ? selectedPostsOp1[currentToolIndex]
        : selectedPostsOp2[currentToolIndex - selectedPostsOp1.length];
    const op = currentToolIndex < selectedPostsOp1.length ? op1 : op2;
    const newTool = { post, op, ...toolInput };
    setTools((prev) => [...prev, newTool]);
    console.log("Im Here handleSaveTool1 1");
    console.log("tools", _tools);
    console.log("newTool", newTool);
    if (currentToolIndex + 1 < selectedPostsOp1.length) {
      setCurrentToolIndex((prev) => prev + 1);
      console.log("Im Here handleSaveTool1 2");
    } else if (isProbeSelected1 && currentToolIndex + 1 === selectedPostsOp1.length && step !== 5) {
      console.log("Im Here handleSaveTool1 3");
      setStep(5);
    } else {
      console.log("Im Here handleSaveTool1 4");
      setTools((prev) => {
        const updatedTools = [...prev, newTool];
        generateCode(updatedTools);
        return updatedTools;
      });
      console.log("Im Here handleSaveTool1 5");
      setStep(4.2);
    }
  };

  const handleSaveTool2 = () => {
    const post =
      currentToolIndex < selectedPostsOp1.length
        ? selectedPostsOp1[currentToolIndex]
        : selectedPostsOp2[currentToolIndex - selectedPostsOp1.length];
    const op = currentToolIndex < selectedPostsOp1.length ? op1 : op2;
    const newTool = { post, op, ...toolInput };
    setTools((prev) => [...prev, newTool]);
    console.log("Im Here handleSaveTool2 1");
    console.log("tools", _tools);
    console.log("newTool", newTool);
    if (currentToolIndex + 1 < selectedPostsOp2.length) {
      console.log("Im Here handleSaveTool2 2");
      setCurrentToolIndex((prev) => prev + 1); // Continue Op2 tools
    } else if (isProbeSelected2 && currentToolIndex + 1 === selectedPostsOp2.length && step !== 5.2) {
      setStep(5.2); // Move to Probe Op2 selection
      console.log("Im Here handleSaveTool2 3");
    } else {
      console.log("Im Here handleSaveTool2 4");
      setTools((prev) => {
        const updatedTools = [...prev, newTool];
        generateCode(updatedTools);
        return updatedTools;
      });
      console.log("Im Here handleSaveTool2 5");
      setStep(6); // Final step after tools & probe selection
    }
  }
    ;

  const nextStep = () => setStep((prev) => prev + 1);

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

  const handleToolSave = () => {
    const post =
      currentToolIndex < selectedPostsOp1.length
        ? selectedPostsOp1[currentToolIndex]
        : selectedPostsOp2[currentToolIndex - selectedPostsOp1.length];
    const op = currentToolIndex < selectedPostsOp1.length ? op1 : op2;
    console.log("post", post);
    console.log("op", op);
  
    const newTool = { post, op, ...toolInput };
    setTools((prev) => [...prev, newTool]);
    console.log("tools", _tools);
    console.log("newTool", newTool);
  
    if (operations === 1) {
      if (currentToolIndex + 1 < selectedPostsOp1.length) {
        console.log("Im Here handleToolSave op 1 1");
        setCurrentToolIndex((prev) => prev + 1);
        console.log("Im Here handleToolSave op 1 A");
      } else if (isProbeSelected1) {
        console.log("Im Here handleToolSave op 1 2");
        setStep(5);  // Go to probe step before generating
        console.log("Im Here handleToolSave op 1 B");
      } else {
        console.log("Im Here handleToolSave op 1 3");
        setTools((prev) => {
          const updatedTools = [...prev, newTool];
          generateCode(updatedTools);
          console.log("Im Here handleToolSave op 1 C");
          return updatedTools;
        });
        console.log("Im Here handleToolSave op 1 4");
        setStep(6);
        console.log("Im Here handleToolSave op 1 D");
      }
    } else if (operations === 2) {
      if (step === 5) {
        console.log("Im Here handleToolSave op 2 3");
        setCurrentToolIndex(0); // Reset for Op2
        console.log("Im Here handleToolSave op 2 C");
        setStep(4.2); // Move to Op2 tool input
        console.log("Im Here handleToolSave op 2 D");
      }else if (step === 5.2) {
        console.log("Im Here handleToolSave op 2 4");
        setTools((prev) => {
          const updatedTools = [...prev, newTool];
          generateCode(updatedTools);
          console.log("Im Here handleToolSave op 2 E");
          return updatedTools;
        });
        console.log("Im Here handleToolSave op 2 5");
        setStep(6);
        console.log("Im Here handleToolSave op 2 F");
      }
    }
    
  }; 

  

  const generateCode = (tools) => {
    const generateHeaderOp1 = () => `
  ;                - EMAG -
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
      let toolCode = toolsForOp
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
      if (probePost) {
        const probeCode = `
  ;------------------------------------------------
  ; Probe
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
  
  
    const toolsOp1 = tools.filter((tool) => String(tool.op) === String(op1));
    const toolsOp2 = tools.filter((tool) => String(tool.op) === String(op2));
  
    const op1IsFirst = flowDirection === "left-to-right";
    const tlist1 =
      generateHeaderOp1(op1IsFirst ? 1 : 2) +
      generateToolData(op1IsFirst ? toolsOp1 : toolsOp2, 
        isProbeSelected1 ? selectedProbePostOp1 : null, op1) +
      footer;
  
    const tlist2 =
      generateHeaderOp2(op1IsFirst ? 2 : 1) +
      generateToolData(op1IsFirst ? toolsOp2 : toolsOp1, 
        isProbeSelected2 ? selectedProbePostOp2 : null, op2) +
      footer;
  
    setGeneratedCode({ tlist1, tlist2 });
  };

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">T_LIST Creator</h1>

      {step === 1 && (
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
          {operations === 2 && (
            <>
              <label className="block text-lg mb-2">Machining Flow:</label>
              <select
                value={flowDirection}
                onChange={(e) => setFlowDirection(e.target.value)}
                className="w-full p-2 border rounded-md mb-4"
              >
                <option value="left-to-right">Left to Right</option>
                <option value="right-to-left">Right to Left</option>
              </select>
            </>
          )}
          <button onClick={nextStep} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md">
          <label className="block text-lg mb-2">Enter Operation Number(s):</label>
          <input
            type="text"
            value={op1}
            onChange={(e) => setOp1(e.target.value)}
            className="w-full p-2 border rounded-md mb-4"
            placeholder="Operation 1"
          />
          {operations === 2 && (
            <input
              type="text"
              value={op2}
              onChange={(e) => setOp2(e.target.value)}
              className="w-full p-2 border rounded-md mb-4"
              placeholder="Operation 2"
            />
          )}
          <button onClick={nextStep} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            Next
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Tool Posts</h2>
          <h3 className="font-bold mb-2">Operation 1</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((post) => (
              <button
              key={`op1-${post}`}
              onClick={() => togglePostSelection(post, 1)}
              className={`p-4 border rounded-md font-bold transition-all ${
                selectedPostsOp1.includes(post)
                  ? "bg-blue-500 text-white border-4 border-blue-800 scale-110"
                  : "bg-gray-200 border border-gray-400 hover:bg-gray-300"
              }`}
            >
              Post {post} {selectedPostsOp1.includes(post) ? "✔" : ""}
            </button>
            
            ))}
          {/* PROBE BUTTON */}
          <button
            key="probe"
            onClick={() => setIsProbeSelected1(!isProbeSelected1)}
            className={`p-4 border rounded-md font-bold transition-all ${
              isProbeSelected1
                ? "bg-purple-500 text-white border-4 border-purple-800 scale-110"
                : "bg-gray-200 border border-gray-400 hover:bg-gray-300"
            }`}
          >
            Probe {isProbeSelected1 ? "✔" : ""}
          </button>
        </div>
          {operations === 2 && (
            <>
              <h3 className="font-bold mb-2">Operation 2</h3>
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((post) => (
                  <button
                  key={`op2-${post}`}
                  onClick={() => togglePostSelection(post, 2)}
                  className={`p-4 border rounded-md font-bold transition-all ${
                    selectedPostsOp2.includes(post)
                      ? "bg-green-500 text-white border-4 border-green-800 scale-110"
                      : "bg-gray-200 border border-gray-400 hover:bg-gray-300"
                  }`}
                >
                  Post {post} {selectedPostsOp2.includes(post) ? "✔" : ""}
                </button>
                
                ))}
              {/* PROBE BUTTON */}
                <button
                  key="probe"
                  onClick={() => setIsProbeSelected2(!isProbeSelected2)}
                  className={`p-4 border rounded-md font-bold transition-all ${
                    isProbeSelected2
                      ? "bg-purple-500 text-white border-4 border-purple-800 scale-110"
                      : "bg-gray-200 border border-gray-400 hover:bg-gray-300"
                  }`}
                >
                  Probe {isProbeSelected2 ? "✔" : ""}
                </button>
              </div>
            </>
          )}
          <button
            onClick={nextStep}
            className="bg-blue-500 text-white px-4 py-2 rounded-md mt-4"
          >
            Next
          </button>
        </div>
      )}

      {step === 4 && currentToolIndex <  selectedPostsOp1.length &&  (
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">
            Tool for Post { selectedPostsOp1[currentToolIndex]
                }{" "}
            (OP{op1})
          </h2>

          <label className="block text-lg mb-2">Duplo Number:</label>
          <select
            value={toolInput.duploNumber}
            onChange={(e) => setToolInput({ ...toolInput, duploNumber: e.target.value })}
            className="w-full p-2 border rounded-md mb-4"
          >
            <option value="1">Main Tool</option>
            <option value="2">Spare Tool</option>
          </select>
          <label className="block text-lg mb-2">Cutting Edge Nominal Value:</label>
          <input
            type="number"
            value={toolInput.cuttingEdge}
            onChange={(e) => setToolInput({ ...toolInput, cuttingEdge: e.target.value })}
            className="w-full p-2 border rounded-md mb-4"
          />
          <button
            onClick={handleSaveTool}
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Save Tool
          </button>
        </div>
        )}
        {step === 4.2 && currentToolIndex  < selectedPostsOp1.length + selectedPostsOp2.length  &&  (
          <div className="w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              Tool for Post {selectedPostsOp2[currentToolIndex]
                  }{" "}
              (OP{op2})
            </h2>

            <label className="block text-lg mb-2">Duplo Number:</label>
            <select
              value={toolInput.duploNumber}
              onChange={(e) => setToolInput({ ...toolInput, duploNumber: e.target.value })}
              className="w-full p-2 border rounded-md mb-4"
            >
              <option value="1">Main Tool</option>
              <option value="2">Spare Tool</option>
            </select>
            <label className="block text-lg mb-2">Cutting Edge Nominal Value:</label>
            <input
              type="number"
              value={toolInput.cuttingEdge}
              onChange={(e) => setToolInput({ ...toolInput, cuttingEdge: e.target.value })}
              className="w-full p-2 border rounded-md mb-4"
            />
            <button
              onClick={handleSaveTool2}
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              Save Tool
            </button>
          </div>

      )}
      {step === 5 && (
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Select Probe Post for Operation 1</h2>
          <select
            value={selectedProbePostOp1}
            onChange={(e) => setSelectedProbePostOp1(e.target.value)}
            className="w-full p-2 border rounded-md mb-4"
          >
            <option value="">Select Probe Post</option>
            {Array.from({ length: 16 }, (_, i) => i + 1).map((post) => (
              <option key={`probe-${post}`} value={post}>
                Post {post}
              </option>
            ))}
          </select>
          <button
            onClick={handleToolSave} // Move to operation 2 tool questions or final step
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Next
          </button>
        </div>
      )}

      {step === 5.2 && (
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Select Probe Post for Operation 2</h2>
          <select
            value={selectedProbePostOp2}
            onChange={(e) => setSelectedProbePostOp2(e.target.value)}
            className="w-full p-2 border rounded-md mb-4"
          >
            <option value="">Select Probe Post</option>
            {Array.from({ length: 16 }, (_, i) => i + 1).map((post) => (
              <option key={`probe-${post}`} value={post}>
                Post {post}
              </option>
            ))}
          </select>
          <button
            onClick={handleToolSave} // Move to the final step
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Next
          </button>
        </div>
      )}

      {step === 6 && (
        <div className="w-full max-w-lg flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-4">Generated T_LIST Code</h2>
          {operations === 1 ? (
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="w-full md:w-1/2">
                <h3 className="text-lg font-semibold mb-2">T_LIST1</h3>
                <textarea
                  readOnly
                  className="w-full p-4 border rounded-md font-mono text-sm"
                  rows="15"
                  value={generatedCode.tlist1}
                ></textarea>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedCode.tlist1)}
                  className="bg-green-500 text-white px-4 py-2 mt-2 rounded-md"
                >
                  Copy T_LIST1
                </button>
                <button
                  onClick={() => window.location.href = "/"}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md mt-6 hover:bg-blue-700"
                >
                  Home
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="w-full md:w-1/2">
                <h3 className="text-lg font-semibold mb-2">T_LIST1</h3>
                <textarea
                  readOnly
                  className="w-full p-4 border rounded-md font-mono text-sm"
                  rows="15"
                  value={generatedCode.tlist1}
                ></textarea>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedCode.tlist1)}
                  className="bg-green-500 text-white px-4 py-2 mt-2 rounded-md"
                >
                  Copy T_LIST1
                </button>
              </div>
              <div className="w-full md:w-1/2">
                <h3 className="text-lg font-semibold mb-2">T_LIST2</h3>
                <textarea
                  readOnly
                  className="w-full p-4 border rounded-md font-mono text-sm"
                  rows="15"
                  value={generatedCode.tlist2}
                ></textarea>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedCode.tlist2)}
                  className="bg-green-500 text-white px-4 py-2 mt-2 rounded-md"
                >
                  Copy T_LIST2
                </button>
                <button
                  onClick={() => window.location.href = "/"}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md mt-6 hover:bg-blue-700"
                >
                  Home
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
  }