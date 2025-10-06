import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useDropzone } from "react-dropzone";
import Plot from "react-plotly.js";

// A simple TextDecoder to convert ArrayBuffer chunks to strings
const textDecoder = new TextDecoder();

/**
 * Reads a ReadableStream and yields lines of text.
 * This is crucial for handling large files without loading the entire file into memory.
 * @param {ReadableStream} stream The file stream.
 * @yields {string} Each line of the file.
 */
async function* readLineStream(stream) {
  const reader = stream.getReader();
  let { value: chunk, done: readerDone } = await reader.read();
  // Decode the first chunk
  chunk = chunk ? textDecoder.decode(chunk, { stream: true }) : "";

  let re = /\r?\n/g; // Regex to find newline characters
  let startIndex = 0;

  while (true) {
    let result = re.exec(chunk);
    if (!result) {
      if (readerDone) {
        // If the reader is done and there's a final partial line
        if (startIndex < chunk.length) {
          yield chunk.substring(startIndex);
        }
        break;
      }

      // Move the remaining partial line (not yet ended by a newline) to the start of the buffer
      const remaining = chunk.substring(startIndex);

      // Read next chunk
      ({ value: chunk, done: readerDone } = await reader.read());
      // Decode the new chunk and prepend the remaining data
      chunk =
        remaining + (chunk ? textDecoder.decode(chunk, { stream: true }) : "");

      startIndex = 0;
      re.lastIndex = 0;
      continue;
    }

    // Found a complete line
    yield chunk.substring(startIndex, result.index);
    startIndex = result.index + result[0].length;
  }

  reader.releaseLock();
}

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
            doubleClick: "reset",
            modeBarButtonsToRemove: ["zoomIn", "zoomOut"],
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
  const plotContainerRef = useRef(null);

  // useEffect to handle plot resizing using ResizeObserver.
  useEffect(() => {
    if (!plotContainerRef.current) return;

    const handleResize = () => {
      Object.values(plotRefs.current).forEach((gd) => {
        if (gd && window.Plotly && window.Plotly.Plots) {
          window.Plotly.Plots.resize(gd);
        }
      });
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(plotContainerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [plotContainerRef, isLeftCollapsed, isMiddleCollapsed]);

  // Colors for plot traces
  const traceColors = [
    "#000000",
    "#1f2eb4ff",
    "#e808e4ff",
    "#87f887ff",
    "#d62728",
    "#7e0aebff",
    "#6f281aff",
    "#f4f407ff",
    "#f1a0e1ff",
    "#7f7f7f",
    "#8099e9ff",
    "#f88604ff",
    "#98df8a",
    "#f79292ff",
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

  /**
   * Function to load, parse, and down-sample a file's data using the Streaming API.
   * This is the critical change for handling large files.
   */
  const loadFile = useCallback(async (file, fileKey) => {
    const DOWNSAMPLE_THRESHOLD = 1000;

    let headers = [];
    let unitMap = {};
    const columnData = {}; // Temp store for all data points
    let dataLineCount = 0;

    const fileStream = file.stream();
    const lineGenerator = readLineStream(fileStream);

    // Metadata tracking
    let headerLineNumber = -1;
    let unitLineNumber = -1;
    let lineCounter = 0;

    // --- Pass 1: Stream, Parse, and Collect Data ---
    for await (const line of lineGenerator) {
      lineCounter++;
      const trimmedLine = line.trim();
      if (trimmedLine === "") continue;

      // Identify Header Line
      if (headerLineNumber === -1 && trimmedLine.includes("Time")) {
        headerLineNumber = lineCounter;
        headers = trimmedLine.split(/\s+/);
        headers
          .filter((h) => h !== "Time")
          .forEach((h) => (columnData[h] = []));
        columnData["Time"] = [];
        continue;
      }

      // Identify Unit Line (assumed to be right after the header)
      if (
        headerLineNumber !== -1 &&
        unitLineNumber === -1 &&
        lineCounter === headerLineNumber + 1
      ) {
        unitLineNumber = lineCounter;
        const units = trimmedLine.split(/\s+/);
        headers.forEach((h, i) => {
          unitMap[h] = units[i] || "";
        });
        // Remove the 'Time' column from the main headers list, but keep it in columnData
        headers = headers.filter((h) => h !== "Time");
        continue;
      }

      // Process Data Lines
      if (unitLineNumber !== -1 && lineCounter > unitLineNumber) {
        const values = trimmedLine.split(/\s+/).map((val) => {
          const num = parseFloat(val);
          return isNaN(num) ? null : num;
        });

        // The values array includes Time at index 0, followed by other headers
        if (values.length !== headers.length + 1) {
          // console.warn(`Line ${lineCounter} has column count mismatch. Skipping.`);
          continue;
        }

        const timeValue = values[0];
        if (timeValue === null || isNaN(timeValue)) continue;

        columnData["Time"].push(timeValue);
        // Note: data columns start at index 1 of the values array
        headers.forEach((col, i) => {
          const dataValue = values[i + 1];
          columnData[col].push(dataValue);
        });
        dataLineCount++;
      }
    }
    // --- End Streaming/Reading ---

    const downsampledData = {};
    const timeData = columnData["Time"] || [];

    if (timeData.length === 0) {
      console.warn(`File ${file.name} contained no usable data.`);
      return;
    }

    // --- Pass 2: Downsample Collected Data ---
    headers.forEach((col) => {
      const yData = columnData[col] || [];
      if (yData.length > 0) {
        downsampledData[col] = downsampleLTTB(
          timeData,
          yData,
          DOWNSAMPLE_THRESHOLD
        );
      }
    });

    // --- Update State ---
    const allHeaders = ["Time", ...headers];
    const newSource = file.webkitRelativePath
      ? `${file.webkitRelativePath}_${file.lastModified}`
      : `${file.name}_${file.lastModified}`;

    setFileDataMap((prev) => {
      const existing = prev[fileKey] || [];
      if (existing.some((v) => v.source === newSource)) {
        return prev;
      }

      return {
        ...prev,
        [fileKey]: [
          ...existing,
          {
            headers: allHeaders,
            units: unitMap,
            downsampledData,
            source: newSource,
          },
        ],
      };
    });

    setAvailableColumns((prev) => {
      const allCols = new Set([...prev, ...headers]);
      return [...allCols];
    });

    setColumnUnits((prev) => ({ ...prev, ...unitMap }));
  }, []);

  // Downsampling logic using Largest Triangle Three Buckets
  const downsampleLTTB = (x, y, threshold = 5000) => {
    const data = x.map((xi, i) => ({ x: xi, y: y[i] }));
    const n = data.length;
    if (threshold >= n || threshold === 0) return { x, y };

    const sampled = [];
    let sampledIndex = 0;
    const bucketSize = (n - 2) / (threshold - 2);

    sampled[sampledIndex++] = data[0]; // Always keep the first point

    for (let i = 0; i < threshold - 2; i++) {
      const a = data[sampledIndex - 1]; // The last point we kept

      const start = Math.floor(i * bucketSize) + 1;
      const end = Math.floor((i + 1) * bucketSize) + 1;
      const bucket = data.slice(start, end);

      const nextStart = Math.floor((i + 1) * bucketSize) + 1;
      const nextEnd = Math.min(n, Math.floor((i + 2) * bucketSize) + 1);
      const avgRange = data.slice(nextStart, nextEnd);

      const avgX =
        avgRange.reduce((sum, p) => sum + p.x, 0) / avgRange.length || 0;
      const avgY =
        avgRange.reduce((sum, p) => sum + p.y, 0) / avgRange.length || 0;

      let maxArea = -1;
      let nextPoint = null;

      // Find the point in the current bucket that maximizes the area of the triangle
      // formed by (a, point, average_point_of_next_bucket)
      for (const point of bucket) {
        // Area = 0.5 * |(A.x - C.x) * (B.y - A.y) - (A.x - B.x) * (C.y - A.y)|
        // A = last_kept_point, B = current_point_in_bucket, C = average_point_of_next_bucket
        const area =
          Math.abs(
            (a.x - avgX) * (point.y - a.y) - (a.x - point.x) * (avgY - a.y)
          ) * 0.5;
        if (area > maxArea) {
          maxArea = area;
          nextPoint = point;
        }
      }
      sampled[sampledIndex++] = nextPoint || bucket[0];
    }
    sampled[sampledIndex++] = data[n - 1]; // Always keep the last point

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
                text: `${col}${
                  columnUnits[col] ? ` (${columnUnits[col]})` : ""
                }`,
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
      let isAutorange = false; // Initialize the flag
      if (
        eventData["xaxis.range[0]"] !== undefined &&
        eventData["xaxis.range[1]"] !== undefined
      ) {
        newRange = [eventData["xaxis.range[0]"], eventData["xaxis.range[1]"]];
      } else if (eventData["xaxis.autorange"] !== undefined) {
        isAutorange = eventData["xaxis.autorange"]; // Use the value from eventData
      }

      if (!newRange && !isAutorange) return;

      const sourceGD = plotRefs.current[sourceCol];

      syncingRef.current = true;
      try {
        Object.entries(plotRefs.current).forEach(([key, gd]) => {
          if (!gd || gd === sourceGD) return;

          if (isAutorange) {
            window.Plotly.relayout(gd, { "xaxis.autorange": true }).catch(
              (err) => console.error("Relayout autorange error:", err)
            );
          } else if (newRange) {
            window.Plotly.relayout(gd, {
              "xaxis.range": newRange,
              "xaxis.autorange": false,
            }).catch((err) => console.error("Relayout range error:", err));
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
                  cursor: "pointer",
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
                  cursor: "pointer",
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
                            // Call the async loadFile function for each file version
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
                          ` (${uploadedFiles[fileKey].length})`}
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
