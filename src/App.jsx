// updated code snippet
import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import "chart.js/auto"; // ✅ Auto-registers everything for chart.js
import { Line } from "react-chartjs-2";
import "./AppTest.css";

export default function App() {
  const [dataRows, setDataRows] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [columnUnits, setColumnUnits] = useState({});

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const lines = e.target.result
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");

      // Find header and unit lines
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

      // Parse data
      const data = lines.slice(unitIndex + 1).map((line) => {
        const values = line.trim().split(/\s+/).map(parseFloat);
        return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
      });

      setDataRows(data);
    };

    reader.readAsText(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".out", ".txt", ".xls", ".xlsx"] },
  });

  return (
    <div className="App" style={{ padding: "20px" }}>
      <h2>📊 Wind Turbine .out File Viewer</h2>

      {/* 🔽 File Drop */}
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
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop your .out file here...</p>
        ) : (
          <p>Drag & drop a `.out` file or click to select</p>
        )}
      </div>

      {/*  Column Selector + Graphs */}
      {availableColumns.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "40px",
            marginTop: "30px",
          }}
        >
          {/* ✅ LEFT PANEL - Column Checkboxes */}
          <div
            style={{
              color: "white",
              minWidth: "250px",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <h3>Select Y-Axes</h3>
            <label
              style={{
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: "bold",
              }}
            >
              <input
                type="checkbox"
                checked={selectedColumns.length === availableColumns.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedColumns(availableColumns);
                  } else {
                    setSelectedColumns([]);
                  }
                }}
              />
              Select All
            </label>
            {availableColumns.map((col) => (
              <label
                key={col}
                style={{
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
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
                />
                {col} {columnUnits[col] ? `${columnUnits[col]}` : ""}
              </label>
            ))}
          </div>

          {/* 📈 RIGHT PANEL - Graphs */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "30px",
              flex: 1,
              backgroundColor: "#ffffffff",
            }}
          >
            {selectedColumns.map((col) => {
              const y = dataRows.map((row) => row[col]);
              const x = dataRows.map((row) => row["Time"]);

              const yMin = Math.min(...y);
              const yMax = Math.max(...y);
              const range = yMax - yMin;
              const pad = range < 1e-5 ? 1 : range * 0.1;

              const data = {
                labels: x,
                datasets: [
                  {
                    label: `${col} ${
                      columnUnits[col] ? `${columnUnits[col]}` : ""
                    }`,
                    data: y,
                    borderColor: "#000",
                    pointRadius: 0,
                    tension: 0,
                  },
                ],
              };

              const options = {
                responsive: true,
                animation: false,
                scales: {
                  y: {
                    min: yMin - pad,
                    max: yMax + pad,
                    title: {
                      display: true,
                      text: `${col} ${
                        columnUnits[col] ? `${columnUnits[col]}` : ""
                      }`,
                    },
                  },
                  x: {
                    title: {
                      display: true,
                      text: "Time (s)",
                    },
                    type: "linear",
                  },
                },
                plugins: {
                  legend: { position: "top" },
                  title: {
                    display: true,
                    text: `Plot: ${col}`,
                  },
                },
              };

              return (
                <div key={col} style={{ width: "48%" }}>
                  <Line data={data} options={options} redraw />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// folder selection code
// App.js
// import React, { useState } from "react";
// import { useDropzone } from "react-dropzone";
// import "chart.js/auto";
// import { Line } from "react-chartjs-2";
// import "./App.css";

// const getLineColor = () => "#000000"; // Black line

// export default function App() {
//   const [files, setFiles] = useState([]);
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [excelData, setExcelData] = useState([]);
//   const [availableAxes, setAvailableAxes] = useState([]);
//   const [selectedAxes, setSelectedAxes] = useState([]);
//   const [columnUnits, setColumnUnits] = useState({});
//   const [showChart, setShowChart] = useState(true);

//   const { getRootProps, getInputProps, isDragActive } = useDropzone({
//     onDrop: (acceptedFiles) => {
//       const onlyOut = acceptedFiles.filter(
//         (f) => f.name.endsWith(".out") || f.name.endsWith(".txt")
//       );
//       setFiles(onlyOut);
//       setExcelData([]);
//       setSelectedFile(null);
//       setAvailableAxes([]);
//       setSelectedAxes([]);
//       setColumnUnits({});
//     },
//     noClick: false,
//     multiple: true,
//   });

//   const loadFile = async (file) => {
//     const text = await file.text();
//     const lines = text
//       .split("\n")
//       .map((l) => l.trim())
//       .filter(Boolean);
//     const headerIndex = lines.findIndex((l) => l.startsWith("Time"));
//     if (headerIndex < 0) return alert("Header row not found.");

//     const headers = lines[headerIndex].split(/\s+/);
//     const units = lines[headerIndex + 1]?.split(/\s+/) || [];
//     const unitMap = Object.fromEntries(
//       headers.map((h, i) => [h, units[i] || ""])
//     );

//     const rows = lines
//       .slice(headerIndex + 2)
//       .map((l) =>
//         Object.fromEntries(
//           l.split(/\s+/).map((v, i) => [headers[i], Number(v)])
//         )
//       );

//     setSelectedFile(file.name);
//     setExcelData(rows);
//     setAvailableAxes(headers.filter((h) => h !== "Time"));
//     setSelectedAxes([]);
//     setColumnUnits(unitMap);
//   };

//   const toggleAxis = (axis) =>
//     setSelectedAxes((prev) =>
//       prev.includes(axis) ? prev.filter((a) => a !== axis) : [...prev, axis]
//     );

//   const renderCharts = () => {
//     return selectedAxes.map((axis) => {
//       const yValues = excelData.map((row) => Number(row[axis]) || 0);
//       const yMin = Math.min(...yValues);
//       const yMax = Math.max(...yValues);
//       const yRange = yMax - yMin;
//       const yPadding = yRange < 1e-5 ? 1 : yRange * 0.1;

//       const chartData = {
//         labels: excelData.map((row) => Number(row["Time"]) ?? "Unknown"),
//         datasets: [
//           {
//             label: axis,
//             data: yValues,
//             borderColor: "#000", // black
//             backgroundColor: "rgba(0,0,0,0)",
//             tension: 0,
//             pointRadius: 0,
//           },
//         ],
//       };

//       const chartOptions = {
//         responsive: true,
//         animation: false,
//         maintainAspectRatio: false, // important for fixed height div
//         scales: {
//           y: {
//             min: yMin - yPadding,
//             max: yMax + yPadding,
//             title: {
//               display: true,
//               text: `${axis} ${columnUnits[axis] || ""}`,
//             },
//           },
//           x: {
//             title: {
//               display: true,
//               text: "Time (s)",
//             },
//             type: "linear",
//             ticks: {
//               stepSize: 1,
//             },
//           },
//         },
//       };

//       return (
//         <div key={axis} className="chart-box">
//           <Line data={chartData} options={chartOptions} />
//         </div>
//       );
//     });
//   };

//   return (
//     <div className="App">
//       <h2>🚀 KPZ Plotting Tool — Folder Upload Support</h2>

//       {/* Folder Upload Dropzone */}
//       <div {...getRootProps({ className: "dropzone" })}>
//         <input {...getInputProps()} webkitdirectory="true" />
//         <p>
//           {isDragActive
//             ? "Drop folder here..."
//             : "Drag a folder or click to select"}
//         </p>
//       </div>

//       {/* File List Selection */}
//       {!!files.length && (
//         <div className="file-list">
//           <h3>Select a .out File to Parse</h3>
//           <ul>
//             {files.map((f, idx) => (
//               <li key={idx}>
//                 <button onClick={() => loadFile(f)}>
//                   {f.webkitRelativePath}
//                 </button>
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}

//       {/* Plots Section */}
//       {excelData.length > 0 && (
//         <div style={{ marginTop: "20px" }}>
//           {/* Show/Hide Checkbox */}
//           <label style={{ color: "white" }}>
//             <input
//               type="checkbox"
//               checked={showChart}
//               onChange={() => setShowChart((s) => !s)}
//             />{" "}
//             Show Plots
//           </label>

//           {showChart && (
//             <div
//               className="controls-charts"
//               style={{ display: "flex", gap: "20px" }}
//             >
//               {/* Column Selection - Aligned Left */}
//               <div
//                 className="axis-selector"
//                 style={{
//                   color: "white",
//                   minWidth: "220px",
//                   textAlign: "left",
//                   display: "flex",
//                   flexDirection: "column",
//                 }}
//               >
//                 <p style={{ marginBottom: "10px" }}>Select Columns to Plot:</p>
//                 {availableAxes.map((axis) => (
//                   <label
//                     key={axis}
//                     className="axis-label"
//                     style={{ marginBottom: "8px" }}
//                   >
//                     <input
//                       type="checkbox"
//                       checked={selectedAxes.includes(axis)}
//                       onChange={() => toggleAxis(axis)}
//                     />{" "}
//                     {axis} {columnUnits[axis] || ""}
//                   </label>
//                 ))}
//               </div>

//               {/* Charts Grid - 2 Charts Per Row */}
//               <div
//                 className="charts-grid"
//                 style={{
//                   display: "grid",
//                   gridTemplateColumns: "repeat(2, 1fr)",
//                   gap: "20px",
//                   width: "120%",
//                   maxWidth: "100vw",
//                   boxSizing: "border-box",
//                   backgroundColor: "#ffffffff",
//                 }}
//               >
//                 {renderCharts()}
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
