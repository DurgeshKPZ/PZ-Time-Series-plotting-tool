import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useDropzone } from "react-dropzone";
import Plot from "react-plotly.js";

// Memoized Plotly component
const MemoizedPlot = React.memo(
  ({ col, data, layout, onInitialized, onUpdate, onRelayout, plotRefs }) => {
    return (
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
          config={{
            responsive: true,
            scrollZoom: true,
            doubleClick: "reset",
          }}
          onInitialized={(figure, graphDiv) => {
            plotRefs.current[col] = graphDiv;
            onInitialized(figure, graphDiv);
          }}
          onUpdate={(figure, graphDiv) => {
            plotRefs.current[col] = graphDiv;
            onUpdate(figure, graphDiv);
          }}
          onRelayout={(eventData) => {
            onRelayout(eventData, col);
          }}
        />
      </div>
    );
  }
);

// Main React component for the plotting tool
export default function PLot6() {
  const [fileDataMap, setFileDataMap] = useState({});
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [columnUnits, setColumnUnits] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadedPaths, setUploadedPaths] = useState([]);
  const [activeFileKeys, setActiveFileKeys] = useState([]);

  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isMiddleCollapsed, setIsMiddleCollapsed] = useState(false);

  const plotRefs = useRef({});
  const syncingRef = useRef(false);

  // New: A ref to the main plot container.
  const plotContainerRef = useRef(null);

  // NEW: useEffect to handle plot resizing using ResizeObserver.
  useEffect(() => {
    if (!plotContainerRef.current) return;

    // The observer callback function
    const handleResize = () => {
      Object.values(plotRefs.current).forEach((gd) => {
        if (gd && window.Plotly && window.Plotly.Plots) {
          window.Plotly.Plots.resize(gd);
        }
      });
    };

    const observer = new ResizeObserver(handleResize);

    // Observe the main container where all the plots are rendered.
    // This is more efficient than observing each individual plot.
    observer.observe(plotContainerRef.current);

    // Cleanup function to disconnect the observer
    return () => {
      observer.disconnect();
    };
  }, [plotContainerRef, isLeftCollapsed, isMiddleCollapsed]);

  // Colors for plot traces
  const traceColors = [
    "#000000",
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#bcbd22",
    "#e377c2",
    "#7f7f7f",
    "#aec7e8",
    "#fcb46bff",
    "#98df8a",
    "#f9a5a4ff",
    "#c5b0d5",
    "#c49c94",
    "#9edae5",
    "#dbdb8d",
    "#ff9bc6ff",
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

  // Function to load, parse, and down-sample a file's data.
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

      const downsampledData = {};
      const timeData = data
        .map((row) => Number(row["Time"]))
        .filter((t) => !isNaN(t));

      headers.forEach((col) => {
        if (col === "Time") return;
        const yData = data
          .map((row) => Number(row[col]))
          .filter((v) => !isNaN(v));
        if (timeData.length > 0 && yData.length > 0) {
          downsampledData[col] = downsampleLTTB(timeData, yData);
        }
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
              downsampledData,
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

  // Memoized plot configurations now use downsampled data.
  const plotConfigs = useMemo(() => {
    return selectedColumns
      .map((col) => {
        const traces = [];
        activeFileKeys.forEach((key) => {
          const fileVersions = fileDataMap[key];
          if (!fileVersions) return;

          fileVersions.forEach((fileInfo) => {
            const downsampled = fileInfo.downsampledData[col];
            if (!downsampled || downsampled.x.length === 0) return;

            const fullPath = fileInfo.source.replaceAll("/", "\\");

            let legendName = fullPath.split("\\").pop();
            legendName = legendName.replace(/_\d+$/, "");

            traces.push({
              x: downsampled.x,
              y: downsampled.y,
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
            uirevision: "x-sync",
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

  // Use a debounce function to limit how often a function is called.
  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  // Wrap the synchronization logic in a `useCallback` hook to make it stable.
  const handleRelayoutDebounced = useCallback(
    debounce((eventData, sourceCol) => {
      if (syncingRef.current) return;

      let newRange = null;
      if (
        eventData["xaxis.range[0]"] !== undefined &&
        eventData["xaxis.range[1]"] !== undefined
      ) {
        newRange = [eventData["xaxis.range[0]"], eventData["xaxis.range[1]"]];
      } else if (eventData["xaxis.autorange"]) {
        newRange = "autorange";
      }

      if (!newRange) return;

      const sourceGD = plotRefs.current[sourceCol];

      syncingRef.current = true;
      try {
        Object.entries(plotRefs.current).forEach(([key, gd]) => {
          if (!gd || gd === sourceGD) return;

          if (newRange === "autorange") {
            window.Plotly.relayout(gd, { "xaxis.autorange": true }).catch(
              (err) => console.error("Relayout error:", err)
            );
          } else {
            window.Plotly.relayout(gd, {
              "xaxis.range": newRange,
              "xaxis.autorange": false,
            }).catch((err) => console.error("Relayout error:", err));
          }
        });
      } finally {
        syncingRef.current = false;
      }
    }, 200),
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
          gridTemplateColumns: `${isLeftCollapsed ? "60px" : "300px"} ${
            isMiddleCollapsed ? "60px" : "250px"
          } 1fr`,
          gap: "15px",
          padding: "15px",
          flexGrow: 1,
          overflow: "hidden",
          // transition: "grid-template-columns 0.3s ease",  // animation of the left and middle panel.....
        }}
      >
        {/* LEFT: File List */}
        <div
          style={{
            backgroundColor: "#000",
            color: "#fff",
            borderRadius: "8px",
            padding: isLeftCollapsed ? "12px 0" : "12px",
            overflowY: "auto",
          }}
        >
          <h4
            style={{
              textAlign: "left",
              display: "flex",
              justifyContent: isLeftCollapsed ? "center" : "space-between",
              alignItems: "center",
              flexDirection: isLeftCollapsed ? "column" : "row",
            }}
          >
            {!isLeftCollapsed && <span>Select Files</span>}
            {isLeftCollapsed && (
              <span
                style={{
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  transform: "rotate(180deg)",
                  fontSize: "14px",
                  marginBottom: "8px",
                  whiteSpace: "nowrap",
                }}
              >
                Files
              </span>
            )}
            <button
              onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
              style={{
                backgroundColor: isLeftCollapsed ? "#333" : "transparent",
                color: "white",
                border: "1px solid white",
                borderRadius: "4px",
                padding: "2px 8px",
                cursor: "pointer",
                fontSize: "12px",
                alignSelf: isLeftCollapsed ? "center" : "auto",
              }}
            >
              {isLeftCollapsed ? ">>" : "<<"}
            </button>
          </h4>
          {!isLeftCollapsed && (
            <>
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
            </>
          )}
        </div>

        {/* MIDDLE: Column Selector */}
        <div
          style={{
            backgroundColor: "#000",
            color: "#fff",
            borderRadius: "8px",
            padding: isMiddleCollapsed ? "12px 0" : "12px",
            overflowY: "auto",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h4
            style={{
              textAlign: "left",
              display: "flex",
              justifyContent: isMiddleCollapsed ? "center" : "space-between",
              alignItems: "center",
              flexDirection: isMiddleCollapsed ? "column" : "row",
            }}
          >
            {!isMiddleCollapsed && <span>Select Parameters</span>}
            {isMiddleCollapsed && (
              <span
                style={{
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  transform: "rotate(180deg)",
                  fontSize: "14px",
                  marginBottom: "8px",
                  whiteSpace: "nowrap",
                }}
              >
                Params
              </span>
            )}
            <button
              onClick={() => setIsMiddleCollapsed(!isMiddleCollapsed)}
              style={{
                backgroundColor: isMiddleCollapsed ? "#333" : "transparent",
                color: "white",
                border: "1px solid white",
                borderRadius: "4px",
                padding: "2px 8px",
                cursor: "pointer",
                fontSize: "12px",
                alignSelf: isMiddleCollapsed ? "center" : "auto",
              }}
            >
              {isMiddleCollapsed ? ">>" : "<<"}
            </button>
          </h4>
          {!isMiddleCollapsed && (
            <>
              {activeFileKeys.length > 0 ? (
                <>
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
            </>
          )}
        </div>

        {/* RIGHT: Plots */}
        <div
          ref={plotContainerRef}
          style={{ textAlign: "left", overflowY: "auto", paddingRight: "8px" }}
        >
          {plotConfigs.map(({ col, data, layout }, idx) => (
            <MemoizedPlot
              key={`${col}-${idx}`}
              col={col}
              data={data}
              layout={layout}
              onInitialized={() => {}}
              onUpdate={() => {}}
              onRelayout={handleRelayoutDebounced}
              plotRefs={plotRefs}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
