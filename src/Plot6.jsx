// import React, { useState, useMemo, useEffect, useRef } from "react";
// import { useDropzone } from "react-dropzone";
// import Plot from "react-plotly.js";
// import "./AppTest.css";
// import Plotly from "plotly.js-dist";

// export default function PLot6() {
//   const [fileDataMap, setFileDataMap] = useState({}); // {filename: [ {headers, units, rows, source} ]}
//   const [availableColumns, setAvailableColumns] = useState([]);
//   const [selectedColumns, setSelectedColumns] = useState([]);
//   const [columnUnits, setColumnUnits] = useState({});
//   const [uploadedFiles, setUploadedFiles] = useState({}); // {filename: [fileVersions]}
//   const [uploadedPaths, setUploadedPaths] = useState([]);
//   const [activeFileKeys, setActiveFileKeys] = useState([]); // active files by name

//   const syncingRef = useRef(false);
//   const plotRefs = useRef({});

//   useEffect(() => {
//     console.log("fileDataMap", fileDataMap);
//   }, [fileDataMap]);
//   const traceColors = [
//     // 🔹 10 Dark / Bold Colors
//     "#000000", // black
//     "#1f77b4", // dark blue
//     "#ff7f0e", // dark orange
//     "#2ca02c", // dark green
//     "#d62728", // dark red
//     "#9467bd", // dark purple
//     "#8c564b", // dark brown
//     "#bcbd22", // dark olive
//     "#e377c2", // dark pink/magenta

//     // 🔹 10 Light / Faint Colors

//     "#7f7f7f", // medium gray
//     "#aec7e8", // light blue
//     "#fcb46bff", // light orange
//     "#98df8a", // light green
//     "#f9a5a4ff", // light red
//     "#c5b0d5", // light purple
//     "#c49c94", // light brown
//     "#9edae5", // light cyan
//     "#dbdb8d", // light olive
//     "#ff9bc6ff", // light pink
//   ];

//   const isAllowedFile = (fileName) => fileName.toLowerCase().endsWith(".out");

//   const onDrop = (acceptedFiles) => {
//     const validFiles = acceptedFiles.filter((file) => isAllowedFile(file.name));
//     if (validFiles.length > 0) {
//       let newPaths = [];

//       // Check if a directory was dropped
//       if (validFiles[0].webkitRelativePath) {
//         // Use the root path of the directory
//         const rootPath = validFiles[0].webkitRelativePath.split("/")[0];
//         newPaths.push("📂 " + rootPath.replaceAll("/", "\\"));
//       } else {
//         // Individual files were dropped
//         validFiles.forEach((f) => {
//           const filePath = f.path || f.name;
//           newPaths.push("📄 " + filePath.replaceAll("/", "\\"));
//         });
//       }

//       setUploadedPaths((prev) => {
//         // Deduplicate paths
//         const combinedPaths = [...prev, ...newPaths];
//         return [...new Set(combinedPaths)];
//       });
//     }

//     // group files by base name, but keep multiple versions if from diff paths
//     setUploadedFiles((prev) => {
//       const newFiles = { ...prev };
//       validFiles.forEach((f) => {
//         const fileKey = f.name; // Use filename as the key
//         if (!newFiles[fileKey]) newFiles[fileKey] = [];

//         // Generate a unique path for the file version
//         const newPath = f.webkitRelativePath
//           ? `${f.webkitRelativePath}_${f.lastModified}`
//           : `${f.name}_${f.lastModified}`;

//         // Check if this exact file version already exists in the array
//         const alreadyExists = newFiles[fileKey].some((existingFile) => {
//           const existingPath =
//             existingFile.webkitRelativePath ||
//             `${existingFile.name}_${existingFile.lastModified}`;
//           return existingPath === newPath;
//         });

//         if (!alreadyExists) {
//           newFiles[fileKey].push(f);
//         }
//       });
//       return newFiles;
//     });
//   };

//   const loadFile = (file, fileKey) => {
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       const lines = e.target.result
//         .split(/\r?\n/)
//         .filter((line) => line.trim() !== "");
//       const headerIndex = lines.findIndex((line) => line.includes("Time"));
//       if (headerIndex === -1) {
//         console.warn(
//           `File ${file.name} does not contain 'Time' header. Skipping.`
//         );
//         return;
//       }
//       const unitIndex = headerIndex + 1;
//       const headers = lines[headerIndex].trim().split(/\s+/);
//       const units = lines[unitIndex]?.trim().split(/\s+/) || [];
//       const unitMap = {};
//       headers.forEach((h, i) => {
//         unitMap[h] = units[i] || "";
//       });

//       const data = lines.slice(unitIndex + 1).map((line) => {
//         const values = line
//           .trim()
//           .split(/\s+/)
//           .map((val) => {
//             const num = parseFloat(val);
//             return isNaN(num) ? null : num;
//           });
//         return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
//       });

//       setFileDataMap((prev) => {
//         const existing = prev[fileKey] || [];
//         const newSource = file.webkitRelativePath
//           ? `${file.webkitRelativePath}_${file.lastModified}`
//           : `${file.name}_${file.lastModified}`;

//         // Check if this exact source already exists
//         if (existing.some((v) => v.source === newSource)) {
//           return prev; // already loaded
//         }

//         return {
//           ...prev,
//           [fileKey]: [
//             ...existing,
//             {
//               headers,
//               units: unitMap,
//               rows: data,
//               source: newSource,
//             },
//           ],
//         };
//       });

//       setAvailableColumns((prev) => {
//         const allCols = new Set([
//           ...prev,
//           ...headers.filter((h) => h !== "Time"),
//         ]);
//         return [...allCols];
//       });

//       setColumnUnits((prev) => ({ ...prev, ...unitMap }));
//     };
//     reader.readAsText(file);
//   };

//   // Downsampling logic remains the same
//   const downsampleLTTB = (x, y, threshold = 5000) => {
//     const data = x.map((xi, i) => ({ x: xi, y: y[i] }));
//     const n = data.length;
//     if (threshold >= n || threshold === 0) return { x, y };

//     const sampled = [];
//     let sampledIndex = 0;
//     const bucketSize = (n - 2) / (threshold - 2);

//     sampled[sampledIndex++] = data[0];

//     for (let i = 0; i < threshold - 2; i++) {
//       const start = Math.floor((i + 1) * bucketSize) + 1;
//       const end = Math.floor((i + 2) * bucketSize) + 1;
//       const bucket = data.slice(start, end);

//       const avgRangeStart = Math.floor((i + 2) * bucketSize) + 1;
//       const avgRangeEnd = Math.floor((i + 3) * bucketSize) + 1;
//       const avgRange = data.slice(avgRangeStart, avgRangeEnd);

//       const avgX =
//         avgRange.reduce((sum, p) => sum + p.x, 0) / avgRange.length || 0;
//       const avgY =
//         avgRange.reduce((sum, p) => sum + p.y, 0) / avgRange.length || 0;

//       const pointA = sampled[sampledIndex - 1];

//       let maxArea = -1;
//       let nextPoint = null;
//       for (const point of bucket) {
//         const area =
//           Math.abs(
//             (pointA.x - avgX) * (point.y - pointA.y) -
//               (pointA.x - point.x) * (avgY - pointA.y)
//           ) * 0.5;
//         if (area > maxArea) {
//           maxArea = area;
//           nextPoint = point;
//         }
//       }
//       sampled[sampledIndex++] = nextPoint || bucket[0];
//     }
//     sampled[sampledIndex++] = data[n - 1];

//     return {
//       x: sampled.map((p) => p.x),
//       y: sampled.map((p) => p.y),
//     };
//   };
//   // A simple hash function to generate a consistent color
//   const hashCode = (str) => {
//     let hash = 0;
//     for (let i = 0; i < str.length; i++) {
//       hash = str.charCodeAt(i) + ((hash << 5) - hash);
//     }
//     return hash;
//   };

//   const plotConfigs = useMemo(() => {
//     return selectedColumns
//       .map((col) => {
//         const traces = [];
//         activeFileKeys.forEach((key) => {
//           const fileVersions = fileDataMap[key];
//           if (!fileVersions) return;

//           fileVersions.forEach((fileInfo) => {
//             // ✅ Force numeric conversion for Time and selected column
//             const filtered = fileInfo.rows.filter((row) => {
//               const t = Number(row["Time"]);
//               const v = Number(row[col]);
//               return !isNaN(t) && !isNaN(v);
//             });

//             const x = filtered.map((row) => Number(row["Time"]));
//             const y = filtered.map((row) => Number(row[col]));
//             if (x.length === 0 || y.length === 0) return;

//             const { x: xd, y: yd } = downsampleLTTB(x, y);

//             // Get the full relative path
//             const fullPath = fileInfo.source.replaceAll("/", "\\");

//             // Legend name = filename without unique timestamp
//             let legendName = fullPath.split("\\").pop();
//             legendName = legendName.replace(/_\d+$/, "");

//             traces.push({
//               x: xd,
//               y: yd,
//               type: "scatter",
//               mode: "lines",
//               name: legendName,
//               line: {
//                 color:
//                   traceColors[
//                     Math.abs(hashCode(fullPath)) % traceColors.length
//                   ],
//                 width: 2,
//               },
//               hovertemplate: `<b>File:</b> ${fullPath}<br><b>X:</b> %{x},<b>Y:</b> %{y}<extra></extra>`,
//             });
//           });
//         });

//         if (traces.length === 0) return null;

//         return {
//           col,
//           data: traces,
//           layout: {
//             title: {
//               text: `${col} Plot`,
//               font: { size: 16, color: "#000" },
//             },
//             hovermode: "closest",
//             showlegend: true,
//             uirevision: "x-sync",
//             dragmode: "zoom", // ✅ allows proper zoom
//             xaxis: {
//               title: { text: "Time (s)", font: { size: 14, color: "#000" } },
//               showline: true,
//               linecolor: "#000",
//               linewidth: 2,
//               mirror: true,
//               gridcolor: "#ccc",
//               zeroline: false,
//               showspikes: true,
//               spikemode: "across",
//               spikesnap: "cursor",
//               spikethickness: 1,
//               spikecolor: "red",
//               spikedash: "solid",
//             },
//             yaxis: {
//               title: {
//                 text: `${col}${columnUnits[col] ? ` ${columnUnits[col]}` : ""}`,
//                 font: { size: 14, color: "#000" },
//               },
//               showline: true,
//               // fixedrange: true,
//               linecolor: "#000",
//               linewidth: 2,
//               mirror: true,
//               gridcolor: "#ccc",
//               zeroline: false,
//               automargin: true,
//             },
//             legend: {
//               itemwidth: 30,
//             },
//             font: {
//               size: 10,
//             },
//             margin: { t: 40, l: 80, r: 20, b: 60 },
//             height: 300,
//             plot_bgcolor: "#fff",
//             paper_bgcolor: "#fff",
//           },
//         };
//       })
//       .filter(Boolean);
//   }, [selectedColumns, activeFileKeys, fileDataMap, columnUnits]);

//   const {
//     getRootProps: getFolderRootProps,
//     getInputProps: getFolderInputProps,
//     open: openFolder,
//   } = useDropzone({
//     onDrop,
//     noClick: true,
//     multiple: true,
//     webkitdirectory: "true", // Note: This attribute is a string
//     directory: "true", // Note: This attribute is a string
//   });

//   const {
//     getRootProps: getFileRootProps,
//     getInputProps: getFileInputProps,
//     open: openFile,
//   } = useDropzone({
//     onDrop,
//     multiple: true,
//   });

//   return (
//     <div
//       className="App"
//       style={{ height: "100vh", display: "flex", flexDirection: "column" }}
//     >
//       {/* Navbar */}
//       <div
//         style={{
//           backgroundColor: "black",
//           color: "white",
//           padding: "10px 20px",
//         }}
//       >
//         <div style={{ display: "flex", justifyContent: "space-between" }}>
//           <h2 style={{ margin: 0 }}>📁 Time Series Plotting Tool</h2>
//           <div style={{ display: "flex", gap: "10px" }}>
//             <div {...getFolderRootProps()}>
//               <input
//                 {...getFolderInputProps()}
//                 webkitdirectory="true"
//                 directory=""
//               />
//               <button
//                 onClick={openFolder}
//                 style={{
//                   padding: "8px 14px",
//                   background: "#444",
//                   color: "white",
//                   border: "none",
//                   borderRadius: "6px",
//                 }}
//               >
//                 📂 Upload Folder
//               </button>
//             </div>
//             <div {...getFileRootProps()}>
//               <input {...getFileInputProps()} />
//               <button
//                 style={{
//                   padding: "8px 14px",
//                   background: "#444",
//                   color: "white",
//                   border: "none",
//                   borderRadius: "6px",
//                 }}
//               >
//                 📄 Upload File
//               </button>
//             </div>
//           </div>
//         </div>
//         {uploadedPaths.length > 0 && (
//           <div
//             style={{
//               marginTop: "6px",
//               fontSize: "13px",
//               color: "#bbb",
//               textAlign: "left",
//               fontFamily: "monospace",
//             }}
//           >
//             {uploadedPaths.map((p, i) => (
//               <div key={i}>{p}</div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Panels */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "300px 250px 1fr",
//           gap: "15px",
//           padding: "15px",
//           flexGrow: 1,
//           overflow: "hidden",
//         }}
//       >
//         {/* LEFT: File List */}
//         <div
//           style={{
//             backgroundColor: "#000",
//             color: "#fff",
//             borderRadius: "8px",
//             padding: "12px",
//             overflowY: "auto",
//           }}
//         >
//           <h4 style={{ textAlign: "left" }}> Select Files</h4>
//           {Object.keys(uploadedFiles).length === 0 && (
//             <p style={{ color: "#bbb" }}>No file uploaded yet.</p>
//           )}
//           <ul style={{ listStyle: "none", paddingLeft: "0", margin: 0 }}>
//             {Object.keys(uploadedFiles).map((fileKey) => (
//               <li key={fileKey} style={{ marginBottom: "6px" }}>
//                 <label
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "6px",
//                     cursor: "pointer",
//                   }}
//                 >
//                   <input
//                     type="checkbox"
//                     checked={activeFileKeys.includes(fileKey)}
//                     onChange={() => {
//                       if (activeFileKeys.includes(fileKey)) {
//                         setActiveFileKeys((prev) =>
//                           prev.filter((k) => k !== fileKey)
//                         );
//                       } else {
//                         // Load all versions of the file when the checkbox is checked
//                         uploadedFiles[fileKey].forEach((f) =>
//                           loadFile(f, fileKey)
//                         );
//                         setActiveFileKeys((prev) => [...prev, fileKey]);
//                       }
//                     }}
//                   />
//                   <span style={{ fontSize: "14px" }}>
//                     {fileKey}
//                     {/* Display the count of versions if > 1 */}
//                     {uploadedFiles[fileKey].length > 1 &&
//                       ` (${uploadedFiles[fileKey].length - 1})`}
//                   </span>
//                 </label>
//               </li>
//             ))}
//           </ul>
//         </div>

//         {/* MIDDLE: Column Selector */}
//         <div
//           style={{
//             backgroundColor: "#000",
//             color: "#fff",
//             borderRadius: "8px",
//             padding: "12px",
//             overflowY: "auto",
//             textAlign: "left",
//             display: "flex",
//             flexDirection: "column",
//           }}
//         >
//           {activeFileKeys.length > 0 ? (
//             <>
//               <h4>Select Parameters</h4>
//               {availableColumns.map((col) => (
//                 <label
//                   key={col}
//                   style={{
//                     display: "flex",
//                     // flexDirection: "column",
//                     marginBottom: "8px",
//                     cursor: "pointer",
//                   }}
//                 >
//                   <input
//                     type="checkbox"
//                     checked={selectedColumns.includes(col)}
//                     onChange={() =>
//                       setSelectedColumns((prev) =>
//                         prev.includes(col)
//                           ? prev.filter((c) => c !== col)
//                           : [...prev, col]
//                       )
//                     }
//                     style={{ marginRight: "6px" }}
//                   />
//                   {col} {columnUnits[col] && `${columnUnits[col]}`}
//                 </label>
//               ))}
//             </>
//           ) : (
//             <p style={{ color: "#666" }}>Select a file to continue...</p>
//           )}
//         </div>

//         {/* RIGHT: Plots */}
//         <div
//           style={{ textAlign: "left", overflowY: "auto", paddingRight: "8px" }}
//         >
//           {plotConfigs.map(({ col, data, layout }, idx) => (
//             <div
//               key={`${col}-${idx}`} // ✅ unique key per plot
//               style={{
//                 marginBottom: "20px",
//                 backgroundColor: "white",
//                 borderRadius: "7px",
//                 padding: "15px",
//                 boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
//               }}
//             >
//               <Plot
//                 data={data}
//                 layout={{
//                   ...layout,
//                   autosize: true,
//                   margin: { l: 40, r: 20, t: 40, b: 40 },
//                 }}
//                 useResizeHandler
//                 style={{ width: "100%", height: "100%" }}
//                 config={{
//                   responsive: true,
//                   scrollZoom: true,
//                   doubleClick: "reset",
//                 }}
//                 // ✅ Save reference to each graphDiv for syncing
//                 onInitialized={(figure, graphDiv) => {
//                   plotRefs.current[col] = graphDiv; // use column name as key
//                 }}
//                 onUpdate={(figure, graphDiv) => {
//                   plotRefs.current[col] = graphDiv;
//                 }}
//                 // ✅ Sync X-axis across all plots
//                 onRelayout={(eventData) => {
//                   if (syncingRef.current) return;

//                   let newRange = null;

//                   if (
//                     eventData["xaxis.range[0]"] !== undefined &&
//                     eventData["xaxis.range[1]"] !== undefined
//                   ) {
//                     newRange = [
//                       eventData["xaxis.range[0]"],
//                       eventData["xaxis.range[1]"],
//                     ];
//                   } else if (eventData["xaxis.autorange"]) {
//                     newRange = "autorange";
//                   }

//                   if (!newRange) return;

//                   const sourceKey = col;
//                   const sourceGD = plotRefs.current[sourceKey];

//                   syncingRef.current = true;
//                   try {
//                     Object.entries(plotRefs.current).forEach(([key, gd]) => {
//                       if (!gd || gd === sourceGD) return;

//                       if (newRange === "autorange") {
//                         Plotly.relayout(gd, { "xaxis.autorange": true }).catch(
//                           (err) => console.error("Relayout error:", err)
//                         );
//                       } else {
//                         Plotly.relayout(gd, {
//                           "xaxis.range": newRange,
//                           "xaxis.autorange": false, // ✅ force disable autorange
//                         }).catch((err) =>
//                           console.error("Relayout error:", err)
//                         );
//                       }
//                     });
//                   } finally {
//                     syncingRef.current = false;
//                   }
//                 }}
//               />
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useDropzone } from "react-dropzone";
import Plot from "react-plotly.js";
// The 'plotly.js-dist' import is not needed and was causing a compilation error.

// Main React component for the plotting tool
export default function PLot6() {
  // State for managing file data and uploaded files
  const [fileDataMap, setFileDataMap] = useState({}); // {filename: [ {headers, units, rows, source} ]}
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [columnUnits, setColumnUnits] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({}); // {filename: [fileVersions]}
  const [uploadedPaths, setUploadedPaths] = useState([]);
  const [activeFileKeys, setActiveFileKeys] = useState([]); // active files by name

  // ✅ Use a ref to store references to each Plotly graphDiv.
  // This allows us to programmatically call `Plotly.relayout` on them.
  const plotRefs = useRef({});

  // ✅ Use a ref as a flag to prevent infinite loops.
  // When we programmatically call `Plotly.relayout`, it also triggers the onRelayout event,
  // so this ref helps us distinguish between user interaction and our own code updates.
  const syncingRef = useRef(false);

  useEffect(() => {
    console.log("fileDataMap", fileDataMap);
  }, [fileDataMap]);

  // Colors for plot traces
  const traceColors = [
    // 🔹 10 Dark / Bold Colors
    "#000000", // black
    "#1f77b4", // dark blue
    "#ff7f0e", // dark orange
    "#2ca02c", // dark green
    "#d62728", // dark red
    "#9467bd", // dark purple
    "#8c564b", // dark brown
    "#bcbd22", // dark olive
    "#e377c2", // dark pink/magenta

    // 🔹 10 Light / Faint Colors
    "#7f7f7f", // medium gray
    "#aec7e8", // light blue
    "#fcb46bff", // light orange
    "#98df8a", // light green
    "#f9a5a4ff", // light red
    "#c5b0d5", // light purple
    "#c49c94", // light brown
    "#9edae5", // light cyan
    "#dbdb8d", // light olive
    "#ff9bc6ff", // light pink
  ];

  // File validation function
  const isAllowedFile = (fileName) => fileName.toLowerCase().endsWith(".out");

  // Handler for file drop events
  const onDrop = (acceptedFiles) => {
    const validFiles = acceptedFiles.filter((file) => isAllowedFile(file.name));
    if (validFiles.length > 0) {
      let newPaths = [];

      if (validFiles[0].webkitRelativePath) {
        const rootPath = validFiles[0].webkitRelativePath.split("/")[0];
        newPaths.push("📂 " + rootPath.replaceAll("/", "\\"));
      } else {
        validFiles.forEach((f) => {
          const filePath = f.path || f.name;
          newPaths.push("📄 " + filePath.replaceAll("/", "\\"));
        });
      }

      setUploadedPaths((prev) => {
        const combinedPaths = [...prev, ...newPaths];
        return [...new Set(combinedPaths)];
      });
    }

    setUploadedFiles((prev) => {
      const newFiles = { ...prev };
      validFiles.forEach((f) => {
        const fileKey = f.name;
        if (!newFiles[fileKey]) newFiles[fileKey] = [];
        const newPath = f.webkitRelativePath
          ? `${f.webkitRelativePath}_${f.lastModified}`
          : `${f.name}_${f.lastModified}`;

        const alreadyExists = newFiles[fileKey].some((existingFile) => {
          const existingPath =
            existingFile.webkitRelativePath ||
            `${existingFile.name}_${existingFile.lastModified}`;
          return existingPath === newPath;
        });

        if (!alreadyExists) {
          newFiles[fileKey].push(f);
        }
      });
      return newFiles;
    });
  };

  // Function to load and parse a file's data
  const loadFile = (file, fileKey) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");
      const headerIndex = lines.findIndex((line) => line.includes("Time"));
      if (headerIndex === -1) {
        console.warn(
          `File ${file.name} does not contain 'Time' header. Skipping.`
        );
        return;
      }
      const unitIndex = headerIndex + 1;
      const headers = lines[headerIndex].trim().split(/\s+/);
      const units = lines[unitIndex]?.trim().split(/\s+/) || [];
      const unitMap = {};
      headers.forEach((h, i) => {
        unitMap[h] = units[i] || "";
      });

      const data = lines.slice(unitIndex + 1).map((line) => {
        const values = line
          .trim()
          .split(/\s+/)
          .map((val) => {
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
          });
        return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
      });

      setFileDataMap((prev) => {
        const existing = prev[fileKey] || [];
        const newSource = file.webkitRelativePath
          ? `${file.webkitRelativePath}_${file.lastModified}`
          : `${file.name}_${file.lastModified}`;

        if (existing.some((v) => v.source === newSource)) {
          return prev;
        }

        return {
          ...prev,
          [fileKey]: [
            ...existing,
            {
              headers,
              units: unitMap,
              rows: data,
              source: newSource,
            },
          ],
        };
      });

      setAvailableColumns((prev) => {
        const allCols = new Set([
          ...prev,
          ...headers.filter((h) => h !== "Time"),
        ]);
        return [...allCols];
      });

      setColumnUnits((prev) => ({ ...prev, ...unitMap }));
    };
    reader.readAsText(file);
  };

  // Downsampling logic using Largest Triangle Three Buckets
  const downsampleLTTB = (x, y, threshold = 5000) => {
    const data = x.map((xi, i) => ({ x: xi, y: y[i] }));
    const n = data.length;
    if (threshold >= n || threshold === 0) return { x, y };

    const sampled = [];
    let sampledIndex = 0;
    const bucketSize = (n - 2) / (threshold - 2);

    sampled[sampledIndex++] = data[0];

    for (let i = 0; i < threshold - 2; i++) {
      const start = Math.floor((i + 1) * bucketSize) + 1;
      const end = Math.floor((i + 2) * bucketSize) + 1;
      const bucket = data.slice(start, end);

      const avgRangeStart = Math.floor((i + 2) * bucketSize) + 1;
      const avgRangeEnd = Math.floor((i + 3) * bucketSize) + 1;
      const avgRange = data.slice(avgRangeStart, avgRangeEnd);

      const avgX =
        avgRange.reduce((sum, p) => sum + p.x, 0) / avgRange.length || 0;
      const avgY =
        avgRange.reduce((sum, p) => sum + p.y, 0) / avgRange.length || 0;

      const pointA = sampled[sampledIndex - 1];

      let maxArea = -1;
      let nextPoint = null;
      for (const point of bucket) {
        const area =
          Math.abs(
            (pointA.x - avgX) * (point.y - pointA.y) -
              (pointA.x - point.x) * (avgY - pointA.y)
          ) * 0.5;
        if (area > maxArea) {
          maxArea = area;
          nextPoint = point;
        }
      }
      sampled[sampledIndex++] = nextPoint || bucket[0];
    }
    sampled[sampledIndex++] = data[n - 1];

    return {
      x: sampled.map((p) => p.x),
      y: sampled.map((p) => p.y),
    };
  };

  // A simple hash function to generate a consistent color
  const hashCode = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  // Memoized plot configurations to avoid unnecessary re-computation
  const plotConfigs = useMemo(() => {
    return selectedColumns
      .map((col) => {
        const traces = [];
        activeFileKeys.forEach((key) => {
          const fileVersions = fileDataMap[key];
          if (!fileVersions) return;

          fileVersions.forEach((fileInfo) => {
            const filtered = fileInfo.rows.filter((row) => {
              const t = Number(row["Time"]);
              const v = Number(row[col]);
              return !isNaN(t) && !isNaN(v);
            });

            const x = filtered.map((row) => Number(row["Time"]));
            const y = filtered.map((row) => Number(row[col]));
            if (x.length === 0 || y.length === 0) return;

            const { x: xd, y: yd } = downsampleLTTB(x, y);

            const fullPath = fileInfo.source.replaceAll("/", "\\");

            let legendName = fullPath.split("\\").pop();
            legendName = legendName.replace(/_\d+$/, "");

            traces.push({
              x: xd,
              y: yd,
              type: "scatter",
              mode: "lines",
              name: legendName,
              line: {
                color:
                  traceColors[
                    Math.abs(hashCode(fullPath)) % traceColors.length
                  ],
                width: 2,
              },
              hovertemplate: `<b>File:</b> ${fullPath}<br><b>X:</b> %{x},<b>Y:</b> %{y}<extra></extra>`,
            });
          });
        });

        if (traces.length === 0) return null;

        return {
          col,
          data: traces,
          layout: {
            title: {
              text: `${col} Plot`,
              font: { size: 16, color: "#000" },
            },
            hovermode: "closest",
            showlegend: true,
            uirevision: "x-sync", // ✅ This ensures zoom/pan state is preserved
            dragmode: "zoom",
            xaxis: {
              title: { text: "Time (s)", font: { size: 14, color: "#000" } },
              showline: true,
              linecolor: "#000",
              linewidth: 2,
              mirror: true,
              gridcolor: "#ccc",
              zeroline: false,
              showspikes: true,
              spikemode: "across",
              spikesnap: "cursor",
              spikethickness: 1,
              spikecolor: "red",
              spikedash: "solid",
            },
            yaxis: {
              title: {
                text: `${col}${columnUnits[col] ? ` ${columnUnits[col]}` : ""}`,
                font: { size: 14, color: "#000" },
              },
              showline: true,
              linecolor: "#000",
              linewidth: 2,
              mirror: true,
              gridcolor: "#ccc",
              zeroline: false,
              automargin: true,
            },
            legend: {
              itemwidth: 30,
            },
            font: {
              size: 10,
            },
            margin: { t: 40, l: 80, r: 20, b: 60 },
            height: 300,
            plot_bgcolor: "#fff",
            paper_bgcolor: "#fff",
          },
        };
      })
      .filter(Boolean);
  }, [selectedColumns, activeFileKeys, fileDataMap, columnUnits]);

  // Dropzone hooks for file and folder uploads
  const {
    getRootProps: getFolderRootProps,
    getInputProps: getFolderInputProps,
    open: openFolder,
  } = useDropzone({
    onDrop,
    noClick: true,
    multiple: true,
    webkitdirectory: "true",
    directory: "true",
  });

  const {
    getRootProps: getFileRootProps,
    getInputProps: getFileInputProps,
    open: openFile,
  } = useDropzone({
    onDrop,
    multiple: true,
  });

  // ✅ Use a debounce function to limit how often a function is called.
  // This prevents the app from freezing during rapid user interactions.
  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  // ✅ Wrap the synchronization logic in a `useCallback` hook to make it stable.
  // We use `useCallback` here to ensure that the debounced function is only
  // created once, preventing re-renders from creating new debounce timers.
  const handleRelayoutDebounced = useCallback(
    debounce((eventData, sourceCol) => {
      // Prevent an infinite loop. The flag is set when we are programmatically updating
      // the other plots, so we don't re-trigger this event handler.
      if (syncingRef.current) return;

      let newRange = null;

      // Extract the new x-axis range from the event data
      if (
        eventData["xaxis.range[0]"] !== undefined &&
        eventData["xaxis.range[1]"] !== undefined
      ) {
        newRange = [eventData["xaxis.range[0]"], eventData["xaxis.range[1]"]];
      } else if (eventData["xaxis.autorange"]) {
        // This case handles double-click to autoscale
        newRange = "autorange";
      }

      // If no valid range is found, do nothing
      if (!newRange) return;

      const sourceGD = plotRefs.current[sourceCol];

      // Set the flag to true to start the syncing process
      syncingRef.current = true;
      try {
        // Iterate through all the other plots and apply the new x-axis range
        Object.entries(plotRefs.current).forEach(([key, gd]) => {
          // Skip the plot that triggered the initial event
          if (!gd || gd === sourceGD) return;

          if (newRange === "autorange") {
            // Apply autorange if the source plot was reset
            window.Plotly.relayout(gd, { "xaxis.autorange": true }).catch(
              (err) => console.error("Relayout error:", err)
            );
          } else {
            // Apply the new numeric range
            window.Plotly.relayout(gd, {
              "xaxis.range": newRange,
              "xaxis.autorange": false, // ✅ force disable autorange to use the new range
            }).catch((err) => console.error("Relayout error:", err));
          }
        });
      } finally {
        // Always reset the flag to false, allowing future user interactions to trigger syncing
        syncingRef.current = false;
      }
    }, 200), // 200ms debounce delay
    [plotRefs, syncingRef]
  );

  return (
    <div
      className="App"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Navbar */}
      <div
        style={{
          backgroundColor: "black",
          color: "white",
          padding: "10px 20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>📁 Time Series Plotting Tool</h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <div {...getFolderRootProps()}>
              <input
                {...getFolderInputProps()}
                webkitdirectory="true"
                directory=""
              />
              <button
                onClick={openFolder}
                style={{
                  padding: "8px 14px",
                  background: "#444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                }}
              >
                📂 Upload Folder
              </button>
            </div>
            <div {...getFileRootProps()}>
              <input {...getFileInputProps()} />
              <button
                onClick={openFile}
                style={{
                  padding: "8px 14px",
                  background: "#444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                }}
              >
                📄 Upload File
              </button>
            </div>
          </div>
        </div>
        {uploadedPaths.length > 0 && (
          <div
            style={{
              marginTop: "6px",
              fontSize: "13px",
              color: "#bbb",
              textAlign: "left",
              fontFamily: "monospace",
            }}
          >
            {uploadedPaths.map((p, i) => (
              <div key={i}>{p}</div>
            ))}
          </div>
        )}
      </div>

      {/* Panels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 250px 1fr",
          gap: "15px",
          padding: "15px",
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        {/* LEFT: File List */}
        <div
          style={{
            backgroundColor: "#000",
            color: "#fff",
            borderRadius: "8px",
            padding: "12px",
            overflowY: "auto",
          }}
        >
          <h4 style={{ textAlign: "left" }}> Select Files</h4>
          {Object.keys(uploadedFiles).length === 0 && (
            <p style={{ color: "#bbb" }}>No file uploaded yet.</p>
          )}
          <ul style={{ listStyle: "none", paddingLeft: "0", margin: 0 }}>
            {Object.keys(uploadedFiles).map((fileKey) => (
              <li key={fileKey} style={{ marginBottom: "6px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={activeFileKeys.includes(fileKey)}
                    onChange={() => {
                      if (activeFileKeys.includes(fileKey)) {
                        setActiveFileKeys((prev) =>
                          prev.filter((k) => k !== fileKey)
                        );
                      } else {
                        uploadedFiles[fileKey].forEach((f) =>
                          loadFile(f, fileKey)
                        );
                        setActiveFileKeys((prev) => [...prev, fileKey]);
                      }
                    }}
                  />
                  <span style={{ fontSize: "14px" }}>
                    {fileKey}
                    {uploadedFiles[fileKey].length > 1 &&
                      ` (${uploadedFiles[fileKey].length - 1})`}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        {/* MIDDLE: Column Selector */}
        <div
          style={{
            backgroundColor: "#000",
            color: "#fff",
            borderRadius: "8px",
            padding: "12px",
            overflowY: "auto",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {activeFileKeys.length > 0 ? (
            <>
              <h4>Select Parameters</h4>
              {availableColumns.map((col) => (
                <label
                  key={col}
                  style={{
                    display: "flex",
                    marginBottom: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col)}
                    onChange={() =>
                      setSelectedColumns((prev) =>
                        prev.includes(col)
                          ? prev.filter((c) => c !== col)
                          : [...prev, col]
                      )
                    }
                    style={{ marginRight: "6px" }}
                  />
                  {col} {columnUnits[col] && `${columnUnits[col]}`}
                </label>
              ))}
            </>
          ) : (
            <p style={{ color: "#666" }}>Select a file to continue...</p>
          )}
        </div>

        {/* RIGHT: Plots */}
        <div
          style={{ textAlign: "left", overflowY: "auto", paddingRight: "8px" }}
        >
          {plotConfigs.map(({ col, data, layout }, idx) => (
            <div
              key={`${col}-${idx}`}
              style={{
                marginBottom: "20px",
                backgroundColor: "white",
                borderRadius: "7px",
                padding: "15px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              }}
            >
              <Plot
                data={data}
                layout={{
                  ...layout,
                  autosize: true,
                  margin: { l: 40, r: 20, t: 40, b: 40 },
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{
                  responsive: true,
                  scrollZoom: true,
                  doubleClick: "reset",
                }}
                // ✅ Save reference to each graphDiv for syncing
                onInitialized={(figure, graphDiv) => {
                  plotRefs.current[col] = graphDiv; // use column name as key
                }}
                onUpdate={(figure, graphDiv) => {
                  plotRefs.current[col] = graphDiv;
                }}
                // ✅ Call the new debounced handler instead of the raw logic
                onRelayout={(eventData) => {
                  handleRelayoutDebounced(eventData, col);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
