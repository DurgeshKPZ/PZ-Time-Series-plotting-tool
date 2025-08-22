// // App.js
// import React, { useState, useMemo } from "react";
// import { useDropzone } from "react-dropzone";
// import Plot from "react-plotly.js";
// import "./AppTest.css";

// export default function plot() {
//   const [dataRows, setDataRows] = useState([]);
//   const [availableColumns, setAvailableColumns] = useState([]);
//   const [selectedColumns, setSelectedColumns] = useState([]);
//   const [columnUnits, setColumnUnits] = useState({});

//   const onDrop = (acceptedFiles) => {
//     const file = acceptedFiles[0];
//     if (!file) return;

//     const reader = new FileReader();

//     reader.onload = (e) => {
//       const lines = e.target.result
//         .split(/\r?\n/)
//         .filter((line) => line.trim() !== "");

//       const headerIndex = lines.findIndex((line) => line.includes("Time"));
//       const unitIndex = headerIndex + 1;

//       const headers = lines[headerIndex].trim().split(/\s+/);
//       const units = lines[unitIndex]?.trim().split(/\s+/) || [];

//       const unitMap = {};
//       headers.forEach((h, i) => {
//         unitMap[h] = units[i] || "";
//       });

//       setColumnUnits(unitMap);
//       setAvailableColumns(headers.filter((h) => h !== "Time"));

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

//       setDataRows(data);
//     };

//     reader.readAsText(file);
//   };

//   const { getRootProps, getInputProps, isDragActive } = useDropzone({
//     onDrop,
//     accept: { "text/plain": [".out", ".txt", ".xls", ".xlsx"] },
//   });

//   const downsample = (x, y, maxPoints = 20000) => {
//     const length = x.length;
//     if (length <= maxPoints) return { x, y };
//     const step = Math.floor(length / maxPoints);
//     const xDown = [];
//     const yDown = [];
//     for (let i = 0; i < length; i += step) {
//       xDown.push(x[i]);
//       yDown.push(y[i]);
//     }
//     return { x: xDown, y: yDown };
//   };

//   const plotConfigs = useMemo(() => {
//     return selectedColumns
//       .map((col) => {
//         const filtered = dataRows.filter(
//           (row) =>
//             typeof row["Time"] === "number" &&
//             !isNaN(row["Time"]) &&
//             typeof row[col] === "number" &&
//             !isNaN(row[col])
//         );

//         const x = filtered.map((row) => row["Time"]);
//         const y = filtered.map((row) => row[col]);

//         if (x.length === 0 || y.length === 0) {
//           console.warn(`Column "${col}" has no valid data`);
//           return null;
//         }

//         const { x: xd, y: yd } = downsample(x, y);

//         return {
//           col,
//           data: [
//             {
//               x: xd,
//               y: yd,
//               type: "scatter", // ✅ use "scattergl" for better performance
//               mode: "lines",
//               name: col,
//               line: { color: "#000" },
//             },
//           ],
//           layout: {
//             title: {
//               text: `Plot: ${col}`,
//               font: { size: 16, color: "#000" },
//             },

//             // ✅ Added crosshair on hover configuration below
//             hovermode: "closest", // Enables closest point hover
//             xaxis: {
//               title: {
//                 text: "Time (s)",
//                 font: { size: 14, color: "#000" },
//               },
//               showline: true,
//               linecolor: "#000",
//               linewidth: 2,
//               mirror: true,
//               gridcolor: "#ccc",
//               zeroline: false,

//               // ✅ Crosshair settings for X axis
//               showspikes: true,
//               spikemode: "across",
//               spikesnap: "cursor",
//               spikecolor: "red",
//               spikethickness: 1,
//             },

//             yaxis: {
//               title: {
//                 text: `${col}${columnUnits[col] ? ` ${columnUnits[col]}` : ""}`,
//                 font: { size: 14, color: "#000" },
//               },
//               showline: true,
//               linecolor: "#000",
//               linewidth: 2,
//               mirror: true,
//               gridcolor: "#ccc",
//               zeroline: false,

//               // ✅ Crosshair settings for Y axis
//               showspikes: true,
//               spikemode: "across",
//               spikesnap: "cursor",
//               spikecolor: "red",
//               spikethickness: 1,
//             },

//             margin: { t: 40, l: 60, r: 20, b: 60 },
//             height: 300,
//             plot_bgcolor: "#fff",
//             paper_bgcolor: "#fff",
//           },
//         };
//       })
//       .filter(Boolean); // removes nulls
//   }, [selectedColumns, dataRows, columnUnits]);

//   return (
//     <div className="App" style={{ padding: "20px" }}>
//       <h2>📊 Time Series Plotting Tool</h2>

//       {/* File Drop Zone */}
//       <div
//         {...getRootProps({
//           className: `dropzone ${isDragActive ? "drag-active" : ""}`,
//         })}
//         style={{
//           border: "2px dashed #aaa",
//           padding: "20px",
//           borderRadius: "10px",
//           textAlign: "center",
//           background: "#1c1c1c",
//           color: "white",
//         }}
//       >
//         <input {...getInputProps()} />
//         {isDragActive ? (
//           <p>Drop your .out file here...</p>
//         ) : (
//           <p>Drag & drop a `.out` file or click to select</p>
//         )}
//       </div>

//       {/* Columns + Plots */}
//       {availableColumns.length > 0 && (
//         <div
//           style={{
//             display: "flex",
//             alignItems: "flex-start",
//             gap: "40px",
//             marginTop: "30px",
//           }}
//         >
//           {/* Column Selector */}
//           <div
//             style={{
//               color: "white",
//               minWidth: "250px",
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "flex-start",
//             }}
//           >
//             <h3>Select Y-Axes Parameter</h3>

//             {availableColumns.map((col) => (
//               <label
//                 key={col}
//                 style={{
//                   marginBottom: "8px",
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "6px",
//                 }}
//               >
//                 <input
//                   type="checkbox"
//                   checked={selectedColumns.includes(col)}
//                   onChange={() =>
//                     setSelectedColumns((prev) =>
//                       prev.includes(col)
//                         ? prev.filter((c) => c !== col)
//                         : [...prev, col]
//                     )
//                   }
//                   style={{
//                     width: "20px",
//                     height: "20px",
//                     transform: "scale(1)",
//                     marginRight: "8px", // Optional: add spacing if needed
//                     cursor: "pointer", // Optional: makes it more user-friendly
//                   }}
//                 />
//                 {col} {columnUnits[col] ? `${columnUnits[col]}` : ""}
//               </label>
//             ))}
//           </div>

//           {/* Plotly Graphs */}
//           <div
//             style={{
//               display: "flex",
//               flexWrap: "wrap",
//               gap: "30px",
//               flex: 1,
//               // background highlight if plots exist
//               backgroundColor:
//                 selectedColumns.length > 0 ? "#efefef" : "transparent",
//               padding: "10px",
//               borderRadius: "10px",
//             }}
//           >
//             {plotConfigs.map(({ col, data, layout }) => (
//               <div key={col} style={{ width: "48%" }}>
//                 <Plot
//                   data={data}
//                   layout={layout}
//                   useResizeHandler
//                   style={{ width: "100%", height: "100%" }}
//                   config={{ responsive: true }}
//                 />
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// App.js
// App.js
import React, { useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import Plot from "react-plotly.js";
import "./AppTest.css";

const ALLOWED_EXTENSIONS = [".out", ".txt", ".xls", ".xlsx"];

export default function PlotApp() {
  const [dataRows, setDataRows] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [columnUnits, setColumnUnits] = useState({});
  const [folderFiles, setFolderFiles] = useState({});
  const [activeFileName, setActiveFileName] = useState(null);
  const [openFolders, setOpenFolders] = useState({});

  const isAllowedFile = (fileName) =>
    ALLOWED_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));

  const onDrop = (acceptedFiles) => {
    const folderMap = {};

    for (const file of acceptedFiles) {
      if (!isAllowedFile(file.name)) continue;

      const relativePath = file.webkitRelativePath || file.name;
      const pathParts = relativePath.split("/");

      // Get folder path including root folder
      const folderPath = pathParts.slice(0, -1).join("/") || "Root";

      if (!folderMap[folderPath]) folderMap[folderPath] = [];
      folderMap[folderPath].push(file);
    }

    setFolderFiles(folderMap);

    // Open all folders by default
    const allFolders = {};
    Object.keys(folderMap).forEach((f) => (allFolders[f] = true));
    setOpenFolders(allFolders);
  };

  const loadFile = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const lines = e.target.result
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");

      const headerIndex = lines.findIndex((line) => line.includes("Time"));
      const unitIndex = headerIndex + 1;

      const headers = lines[headerIndex].trim().split(/\s+/);
      const units = lines[unitIndex]?.trim().split(/\s+/) || [];

      const unitMap = {};
      headers.forEach((h, i) => {
        unitMap[h] = units[i] || "";
      });

      setColumnUnits(unitMap);
      setAvailableColumns(headers.filter((h) => h !== "Time"));

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

      setDataRows(data);
      setSelectedColumns([]);
      setActiveFileName(file.name);
    };

    reader.readAsText(file);
  };

  const downsample = (x, y, maxPoints = 20000) => {
    const len = x.length;
    if (len <= maxPoints) return { x, y };

    const bucketSize = Math.floor(len / maxPoints);
    const xDown = [];
    const yDown = [];

    for (let i = 0; i < len; i += bucketSize) {
      const sliceX = x.slice(i, i + bucketSize);
      const sliceY = y.slice(i, i + bucketSize);
      if (sliceX.length === 0) continue;

      const minIdx = sliceY.indexOf(Math.min(...sliceY));
      const maxIdx = sliceY.indexOf(Math.max(...sliceY));

      xDown.push(sliceX[minIdx], sliceX[maxIdx]);
      yDown.push(sliceY[minIdx], sliceY[maxIdx]);
    }

    return { x: xDown, y: yDown };
  };

  const plotConfigs = useMemo(() => {
    return selectedColumns
      .map((col) => {
        const filtered = dataRows.filter(
          (row) =>
            typeof row["Time"] === "number" &&
            !isNaN(row["Time"]) &&
            typeof row[col] === "number" &&
            !isNaN(row[col])
        );

        const x = filtered.map((row) => row["Time"]);
        const y = filtered.map((row) => row[col]);

        if (x.length === 0 || y.length === 0) return null;

        const { x: xd, y: yd } = downsample(x, y);

        return {
          col,
          data: [
            {
              x: xd,
              y: yd,
              type: "scatter",
              mode: "lines",
              name: col,
              line: { color: "#000" },
            },
          ],
          layout: {
            title: {
              text: `${col} Plot`,
              font: { size: 16, color: "#000" },
            },
            hovermode: "closest",
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
              spikecolor: "red",
              spikethickness: 1,
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
              showspikes: true,
              spikemode: "across",
              spikesnap: "cursor",
              spikecolor: "red",
              spikethickness: 1,
            },
            margin: { t: 40, l: 60, r: 20, b: 60 },
            height: 300,
            plot_bgcolor: "#fff",
            paper_bgcolor: "#fff",
          },
        };
      })
      .filter(Boolean);
  }, [selectedColumns, dataRows, columnUnits]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
    multiple: true,
    webkitdirectory: true,
    directory: true,
  });

  const toggleFolder = (folder) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folder]: !prev[folder],
    }));
  };

  return (
    <div className="App" style={{ padding: "20px" }}>
      <h2>📁 Time Series Plotting Tool</h2>

      {/* Dropzone */}
      <div
        {...getRootProps({
          className: `dropzone ${isDragActive ? "drag-active" : ""}`,
        })}
        style={{
          border: "2px dashed #aaa",
          padding: "20px",
          borderRadius: "10px",
          textAlign: "center",
          background: "#1c1c1c",
          color: "white",
          userSelect: "none",
        }}
      >
        <input {...getInputProps()} webkitdirectory="true" directory="" />
        {isDragActive ? (
          <p>Drop your folder here...</p>
        ) : (
          <p>Drag & drop a folder or click to select</p>
        )}
      </div>

      {/* Folder content bar (no scrolling) */}
      <div
        style={{
          marginTop: "30px",
          padding: "15px 20px",
          backgroundColor: "#2c2c2c",
          color: "#fff",
          borderRadius: "10px",
          // Removed maxHeight and overflowY to remove scroll
          userSelect: "none",
        }}
      >
        <h3
          style={{
            marginBottom: "10px",
            fontSize: "18px",
            color: "#fff",
          }}
        >
          📁 Uploaded Folder Structure
        </h3>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {Object.entries(folderFiles).length === 0 && (
            <p style={{ color: "#bbb" }}>No folder uploaded yet.</p>
          )}

          {Object.entries(folderFiles).map(([relativeFolder, files]) => (
            <div key={relativeFolder}>
              {/* Folder header with toggle */}
              <div
                onClick={() => toggleFolder(relativeFolder)}
                style={{
                  fontSize: "15px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                  borderBottom: "1px solid #444",
                  paddingBottom: "4px",
                  fontFamily: "monospace",
                  color: "#aad",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                title="Click to toggle folder"
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: openFolders[relativeFolder]
                      ? "rotate(90deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    fontWeight: "bold",
                  }}
                >
                  ▶
                </span>
                {relativeFolder}
              </div>

              {/* Files list, toggled */}
              {openFolders[relativeFolder] && (
                <ul
                  style={{
                    listStyle: "none",
                    paddingLeft: "20px",
                    margin: 0,
                    borderLeft: "2px solid #444",
                  }}
                >
                  {files.map((file) => (
                    <li
                      key={file.webkitRelativePath || file.name}
                      style={{ marginBottom: "6px" }}
                    >
                      <button
                        onClick={() => loadFile(file)}
                        style={{
                          background: "#3a3a3a",
                          color: "#eee",
                          border: "1px solid #555",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "14px",
                          textAlign: "left",
                          width: "100%",
                          fontFamily: "monospace",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          transition: "background 0.2s, color 0.2s",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "#555";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "#3a3a3a";
                        }}
                        title={file.webkitRelativePath || file.name}
                      >
                        📄 {file.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div
        style={{
          display: "flex",
          marginTop: "30px",
          gap: "40px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* Column Selector */}
        <div style={{ minWidth: "250px", flexGrow: 0, flexShrink: 0 }}>
          <h3>Select Y-Axis Columns</h3>
          {availableColumns.length === 0 && (
            <p style={{ color: "#666" }}>
              Upload and select a file to see columns
            </p>
          )}
          {availableColumns.map((col) => (
            <label
              key={col}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "9px",
                textAlign: "left",
                gap: "8px", // spacing between checkbox and text
              }}
            >
              <input
                type="checkbox"
                style={{ transform: "scale(1.4)", cursor: "pointer" }} // makes checkbox bigger
                checked={selectedColumns.includes(col)}
                onChange={() =>
                  setSelectedColumns((prev) =>
                    prev.includes(col)
                      ? prev.filter((c) => c !== col)
                      : [...prev, col]
                  )
                }
              />
              <span>
                {col} {columnUnits[col] && `${columnUnits[col]}`}
              </span>
            </label>
          ))}
        </div>

        {/* Plotting Area */}
        <div style={{ flex: 1, minWidth: 300 }}>
          {activeFileName && (
            <div
              style={{ marginBottom: "20px", fontSize: "18px", color: "white" }}
            >
              <strong>📝 Plotting file:</strong> {activeFileName}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr", // exactly 2 columns
              gap: "20px", // space between plots
              backgroundColor: "rgba(220, 220, 220, 1)",
              padding: "20px",
              borderRadius: "5px",
            }}
          >
            {plotConfigs.map(({ col, data, layout }) => (
              <div
                key={col}
                style={{
                  minHeight: "300px",
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
                  config={{ responsive: true }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
