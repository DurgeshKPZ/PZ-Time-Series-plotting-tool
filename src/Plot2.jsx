import React, { useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import Plot from "react-plotly.js";
import "./AppTest.css";

const ALLOWED_EXTENSIONS = [".out", ".txt", ".xls", ".xlsx"];

// {
//  built a React time-series plotting tool using react-dropzone for folder uploads and react-plotly.js for plotting.

// Users can upload a folder of .out, .txt, .xls, .xlsx files, which are displayed in a collapsible folder/file tree (left panel).

// Only one file can be active at a time, managed by a checkbox-style selector.

// When a file is loaded, the app extracts headers (parameters), their units, and numeric data for plotting.

// The middle panel lists parameters with checkboxes; multiple parameters can be plotted simultaneously.

// The right panel shows interactive Plotly plots, styled consistently, with downsampling for performance.

// 👉 This version also preserves selected parameters when switching files, as long as the new file has those same columns.
// }

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
      if (pathParts.length > 2) continue; // only top folder
      const folderPath = pathParts[0] || "Root";
      if (!folderMap[folderPath]) folderMap[folderPath] = [];
      folderMap[folderPath].push(file);
    }
    setFolderFiles(folderMap);
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
      // keepig the selected columns if they exist in new file
      setSelectedColumns((prev) => prev.filter((col) => headers.includes(col)));
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

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
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
    <div
      className="App"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "black",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
        }}
      >
        <h2 style={{ margin: 0 }}>📁 Time Series Plotting Tool</h2>
        <div {...getRootProps()}>
          <input {...getInputProps()} webkitdirectory="true" directory="" />
          <button
            onClick={open}
            style={{
              padding: "8px 14px",
              background: "#444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              marginRight: "20px",
            }}
          >
            📂 Upload Folder
          </button>
        </div>
      </div>

      {/* 3 panels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "350px 300px 1fr",
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
          <h3>📁 Uploaded Files</h3>
          {Object.entries(folderFiles).length === 0 && (
            <p style={{ color: "#bbb" }}>No folder uploaded yet.</p>
          )}
          {Object.entries(folderFiles).map(([relativeFolder, files]) => (
            <div key={relativeFolder}>
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
                  textAlign: "left",
                }}
              >
                ▶ {relativeFolder}
              </div>
              {openFolders[relativeFolder] && (
                <ul
                  style={{ listStyle: "none", paddingLeft: "10px", margin: 0 }}
                >
                  {files.map((file) => (
                    <li
                      key={file.webkitRelativePath || file.name}
                      style={{ marginBottom: "6px", textAlign: "left" }}
                    >
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
                          checked={activeFileName === file.name}
                          onChange={() => {
                            if (activeFileName === file.name) {
                              setActiveFileName(null);
                              setDataRows([]);
                              setAvailableColumns([]);
                              setSelectedColumns([]);
                            } else {
                              loadFile(file);
                            }
                          }}
                        />
                        <span style={{ fontSize: "14px" }}> {file.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
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
          }}
        >
          {activeFileName ? (
            <>
              <h4>Select Parameters</h4>
              {availableColumns.map((col) => (
                <label
                  key={col}
                  style={{
                    display: "block",
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
          style={{
            textAlign: "left",
            overflowY: "auto",
            paddingRight: "8px",
          }}
        >
          {plotConfigs.map(({ col, data, layout }) => (
            <div
              key={col}
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
                config={{ responsive: true }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
