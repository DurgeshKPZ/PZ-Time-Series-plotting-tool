import React, { useState, useMemo, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Plot from "react-plotly.js";
import "./AppTest.css";

export default function PLot5() {
  const [fileDataMap, setFileDataMap] = useState({}); // {filename: [ {headers, units, rows, source} ]}
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [columnUnits, setColumnUnits] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({}); // {filename: [fileVersions]}
  const [uploadedPaths, setUploadedPaths] = useState([]);
  const [activeFileKeys, setActiveFileKeys] = useState([]); // active files by name

  useEffect(() => {
    console.log("fileDataMap", fileDataMap);
  }, [fileDataMap]);
  const traceColors = [
    "#1f77b4", // blue
    "#ff7f0e", // orange
    "#2ca02c", // green
    "#d62728", // red
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
    "#bcbd22", // olive
    "#17becf", // cyan
  ];

  const isAllowedFile = (fileName) => fileName.toLowerCase().endsWith(".out");

  const onDrop = (acceptedFiles) => {
    const validFiles = acceptedFiles.filter((file) => isAllowedFile(file.name));
    if (validFiles.length > 0) {
      let newPaths = [];

      // Check if a directory was dropped
      if (validFiles[0].webkitRelativePath) {
        // Use the root path of the directory
        const rootPath = validFiles[0].webkitRelativePath.split("/")[0];
        newPaths.push("📂 " + rootPath.replaceAll("/", "\\"));
      } else {
        // Individual files were dropped
        validFiles.forEach((f) => {
          const filePath = f.path || f.name;
          newPaths.push("📄 " + filePath.replaceAll("/", "\\"));
        });
      }

      setUploadedPaths((prev) => {
        // Deduplicate paths
        const combinedPaths = [...prev, ...newPaths];
        return [...new Set(combinedPaths)];
      });
    }

    // group files by base name, but keep multiple versions if from diff paths
    setUploadedFiles((prev) => {
      const newFiles = { ...prev };
      validFiles.forEach((f) => {
        const fileKey = f.name; // Use filename as the key
        if (!newFiles[fileKey]) newFiles[fileKey] = [];

        // Generate a unique path for the file version
        const newPath = f.webkitRelativePath
          ? `${f.webkitRelativePath}_${f.lastModified}`
          : `${f.name}_${f.lastModified}`;

        // Check if this exact file version already exists in the array
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

        // Check if this exact source already exists
        if (existing.some((v) => v.source === newSource)) {
          return prev; // already loaded
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

  // Downsampling logic remains the same
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

  const plotConfigs = useMemo(() => {
    return selectedColumns
      .map((col) => {
        const traces = [];
        activeFileKeys.forEach((key) => {
          const fileVersions = fileDataMap[key];
          if (!fileVersions) return;

          fileVersions.forEach((fileInfo) => {
            const filtered = fileInfo.rows.filter(
              (row) =>
                typeof row["Time"] === "number" &&
                !isNaN(row["Time"]) &&
                typeof row[col] === "number" &&
                !isNaN(row[col])
            );

            const x = filtered.map((row) => row["Time"]);
            const y = filtered.map((row) => row[col]);
            if (x.length === 0 || y.length === 0) return;

            const { x: xd, y: yd } = downsampleLTTB(x, y);

            // Get the full relative path
            const fullPath = fileInfo.source.replaceAll("/", "\\");

            // Extract a user-friendly name for the legend
            const pathSegments = fullPath.split("\\");
            const legendName =
              pathSegments.length > 2
                ? `${pathSegments[pathSegments.length - 2]}...\\${
                    pathSegments[pathSegments.length - 1]
                  }`
                : fullPath;

            traces.push({
              x: xd,
              y: yd,
              type: "scattergl",
              mode: "lines",
              // Set a unique name for each trace to ensure a separate legend entry
              name: legendName,
              line: {
                color:
                  traceColors[
                    Math.abs(hashCode(fullPath)) % traceColors.length
                  ],
                width: 2,
              },

              //   line: { color: traceColors[idx % traceColors.length], width: 2 },
              // Include full path in the hover template for detailed info
              hovertemplate: `<b>File:</b> ${fullPath}<br><b>X:</b> %{x}<br><b>Y:</b> %{y}<extra></extra>`,
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
            xaxis: {
              title: { text: "Time (s)", font: { size: 14, color: "#000" } },
              showline: true,
              linecolor: "#000",
              linewidth: 2,
              mirror: true,
              gridcolor: "#ccc",
              zeroline: false,
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
            margin: { t: 40, l: 80, r: 20, b: 60 },
            height: 300,
            plot_bgcolor: "#fff",
            paper_bgcolor: "#fff",
          },
        };
      })
      .filter(Boolean);
  }, [selectedColumns, activeFileKeys, fileDataMap, columnUnits]);

  const {
    getRootProps: getFolderRootProps,
    getInputProps: getFolderInputProps,
    open: openFolder,
  } = useDropzone({
    onDrop,
    noClick: true,
    multiple: true,
    webkitdirectory: "true", // Note: This attribute is a string
    directory: "true", // Note: This attribute is a string
  });

  const {
    getRootProps: getFileRootProps,
    getInputProps: getFileInputProps,
    open: openFile,
  } = useDropzone({
    onDrop,
    multiple: true,
  });

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
          gridTemplateColumns: "320px 250px 1fr",
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
                        // Load all versions of the file when the checkbox is checked
                        uploadedFiles[fileKey].forEach((f) =>
                          loadFile(f, fileKey)
                        );
                        setActiveFileKeys((prev) => [...prev, fileKey]);
                      }
                    }}
                  />
                  <span style={{ fontSize: "14px" }}>
                    {fileKey}
                    {/* Display the count of versions if > 1 */}
                    {uploadedFiles[fileKey].length > 1 &&
                      ` (${uploadedFiles[fileKey].length} versions)`}
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
          }}
        >
          {activeFileKeys.length > 0 ? (
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
          style={{ textAlign: "left", overflowY: "auto", paddingRight: "8px" }}
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
