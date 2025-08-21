// App.js
import React, { useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import Plot from "react-plotly.js";
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
    };

    reader.readAsText(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".out", ".txt", ".xls", ".xlsx"] },
  });

  const downsample = (x, y, maxPoints = 10000) => {
    const length = x.length;
    if (length <= maxPoints) return { x, y };
    const step = Math.floor(length / maxPoints);
    const xDown = [];
    const yDown = [];
    for (let i = 0; i < length; i += step) {
      xDown.push(x[i]);
      yDown.push(y[i]);
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

        if (x.length === 0 || y.length === 0) {
          console.warn(`Column "${col}" has no valid data`);
          return null;
        }

        const { x: xd, y: yd } = downsample(x, y);

        return {
          col,
          data: [
            {
              x: xd,
              y: yd,
              type: "scattergl", // ✅ use "scattergl" for better performance
              mode: "lines",
              name: col,
              line: { color: "#000" },
            },
          ],
          layout: {
            title: {
              text: `Plot: ${col}`,
              font: { size: 16, color: "#000" },
            },

            // ✅ Added crosshair on hover configuration below
            hovermode: "closest", // Enables closest point hover

            xaxis: {
              title: {
                text: "Time (s)",
                font: { size: 14, color: "#000" },
              },
              showline: true,
              linecolor: "#000",
              linewidth: 2,
              mirror: true,
              gridcolor: "#ccc",
              zeroline: false,

              // ✅ Crosshair settings for X axis
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

              // ✅ Crosshair settings for Y axis
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
      .filter(Boolean); // removes nulls
  }, [selectedColumns, dataRows, columnUnits]);

  return (
    <div className="App" style={{ padding: "20px" }}>
      <h2>📊 Wind Turbine .out File Viewer (Plotly)</h2>

      {/* File Drop Zone */}
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

      {/* Columns + Plots */}
      {availableColumns.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "40px",
            marginTop: "30px",
          }}
        >
          {/* Column Selector */}
          <div
            style={{
              color: "white",
              minWidth: "250px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <h3>Select Y-Axes</h3>

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

          {/* Plotly Graphs */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "30px",
              flex: 1,
              backgroundColor: "#fff",
              padding: "10px",
              borderRadius: "10px",
            }}
          >
            {plotConfigs.map(({ col, data, layout }) => (
              <div key={col} style={{ width: "48%" }}>
                <Plot
                  data={data}
                  layout={layout}
                  useResizeHandler
                  style={{ width: "100%", height: "100%" }}
                  config={{ responsive: true }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
