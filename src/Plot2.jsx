import React, { useState } from "react";
import Plot from "react-plotly.js";

const PlotApp = () => {
  // State
  const [activeFileName, setActiveFileName] = useState(null);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [plotConfigs, setPlotConfigs] = useState([]);
  const [columnUnits, setColumnUnits] = useState({});

  // Example: Mock file upload (replace with your real upload logic)
  const handleFileUpload = () => {
    setActiveFileName("example_data.csv");
    setAvailableColumns(["Temperature", "Pressure", "Humidity"]);
    setColumnUnits({
      Temperature: "°C",
      Pressure: "Pa",
      Humidity: "%",
    });

    // Mock plotConfigs (replace with real logic)
    setPlotConfigs([
      {
        col: "Temperature",
        data: [
          {
            x: [1, 2, 3],
            y: [22, 25, 27],
            type: "scatter",
            mode: "lines+markers",
          },
        ],
        layout: { title: "Temperature over Time" },
      },
      {
        col: "Pressure",
        data: [
          {
            x: [1, 2, 3],
            y: [1000, 980, 970],
            type: "scatter",
            mode: "lines+markers",
          },
        ],
        layout: { title: "Pressure over Time" },
      },
      {
        col: "Humidity",
        data: [
          {
            x: [1, 2, 3],
            y: [40, 45, 50],
            type: "scatter",
            mode: "lines+markers",
          },
        ],
        layout: { title: "Humidity over Time" },
      },
    ]);
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Upload Button */}
      <button
        onClick={handleFileUpload}
        style={{
          padding: "10px 15px",
          borderRadius: "8px",
          background: "#4CAF50",
          color: "white",
          border: "none",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        Upload & Load File
      </button>

      {/* Main layout (only show after a file is loaded) */}
      {activeFileName && (
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
            {availableColumns.map((col) => (
              <label
                key={col}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "9px",
                  textAlign: "left",
                  gap: "8px",
                }}
              >
                <input
                  type="checkbox"
                  style={{ transform: "scale(1.4)", cursor: "pointer" }}
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
            <div
              style={{
                marginBottom: "20px",
                fontSize: "18px",
                color: "white",
              }}
            >
              <strong>📝 Plotting file:</strong> {activeFileName}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr", // always 2 plots per row
                gap: "20px",
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
      )}
    </div>
  );
};

export default PlotApp;
