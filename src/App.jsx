import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "./App.css";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

const getRandomColor = () => "#282727ff"; // Always return black

export default function App() {
  const [excelData, setExcelData] = useState([]);
  const [selectedAxis, setSelectedAxis] = useState(""); // Radio selected column
  const [availableAxes, setAvailableAxes] = useState([]);
  const [showChart, setShowChart] = useState(true);
  const [columnUnits, setColumnUnits] = useState({});

  const handleAxisChange = (axis) => {
    setSelectedAxis(axis);
  };

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) {
      alert("Please upload a file.");
      return;
    }

    if (file.name.endsWith(".out") || file.name.endsWith(".txt")) {
      const reader = new FileReader();

      reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        const headerLineIndex = lines.findIndex((line) =>
          line.startsWith("Time")
        );
        if (headerLineIndex === -1) {
          alert("❌ Header row not found in .out file.");
          return;
        }

        const unitLineIndex = headerLineIndex + 1;

        const headers = lines[headerLineIndex].split(/\s+/);
        const unitsLine = lines[unitLineIndex]?.split(/\s+/) || [];

        const columnUnitMap = {};
        headers.forEach((h, idx) => {
          const unit = unitsLine[idx] || "";
          columnUnitMap[h] = unit;
        });
        setColumnUnits(columnUnitMap);

        const dataLines = lines.slice(unitLineIndex + 1);

        const parsedData = dataLines.map((line) => {
          const values = line.split(/\s+/).map(Number);
          return Object.fromEntries(
            values.map((val, idx) => [headers[idx], val])
          );
        });

        setExcelData(parsedData);

        const yAxes = headers.filter((h) => h !== "Time");
        setAvailableAxes(yAxes);
        setSelectedAxis(yAxes[0] || "");

        // Optional: Upload to backend
        // try {
        //   await axios.post("http://localhost:5000/api/userKPZ", {
        //     data: parsedData,
        //   });
        //   alert("✅ Data uploaded to MongoDB.");
        // } catch (error) {
        //   console.error(error.message);
        //   alert("❌ Failed to upload to MongoDB.");
        // }
      };

      reader.readAsText(file);
    } else {
      alert("Please upload a valid .out or .txt file.");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".out", ".txt"],
    },
  });

  const chartData = {
    labels: excelData.map((row) => Number(row["Time"]) ?? "Unknown"),
    datasets: selectedAxis
      ? [
          {
            label: selectedAxis,
            data: excelData.map((row) => Number(row[selectedAxis]) || 0),
            borderColor: getRandomColor(selectedAxis),
            backgroundColor: "rgba(0,0,0,0)",
            tension: 0,
            pointRadius: 0,
          },
        ]
      : [],
  };

  // Calculate Y-axis scale padding
  const yValues = chartData.datasets[0]?.data || [];
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yRange = yMax - yMin;

  // Smart padding: if values barely change, apply a fixed zoom-out
  const yPadding = yRange < 1e-5 ? 1 : yRange * 0.1;

  const chartOptions = {
    responsive: true,
    animation: false,
    scales: {
      y: {
        min: yMin - yPadding,
        max: yMax + yPadding,
        title: {
          display: true,
          text: selectedAxis
            ? `${selectedAxis} ${
                columnUnits[selectedAxis] ? `${columnUnits[selectedAxis]}` : ""
              }`
            : "Y-Axis",
        },
      },
      x: {
        title: {
          display: true,
          text: "Time (s)",
        },
        type: "linear",
        min: Math.min(...chartData.labels),
        max: Math.max(...chartData.labels),
        ticks: {
          stepSize: 1,
        },
      },
    },
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Line Chart for Selected Column",
      },
    },
  };

  return (
    <div className="App">
      <h2>Upload .out File to Plot Data</h2>

      <div
        {...getRootProps({
          className: `dropzone ${isDragActive ? "drag-active" : ""}`,
        })}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the .out or .txt file here...</p>
        ) : (
          <p>Drag and drop a .out or .txt file here, or click to select</p>
        )}
      </div>

      {/* Show/Hide Chart Toggle */}
      <div style={{ marginTop: "20px", color: "white" }}>
        <label>
          <input
            type="checkbox"
            checked={showChart}
            onChange={() => setShowChart((prev) => !prev)}
          />
          &nbsp; Show Plot
        </label>
      </div>

      {/* Axis Selection + Chart */}
      {excelData.length > 0 && showChart ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {/* Y-Axis Radio Buttons */}
          <div
            style={{
              color: "white",
              minWidth: "180px",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <p>Select Y-Axis (One at a time):</p>
            {availableAxes.map((axis) => (
              <label
                key={axis}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "8px",
                  gap: "6px",
                }}
              >
                <input
                  type="radio"
                  name="y-axis"
                  checked={selectedAxis === axis}
                  onChange={() => handleAxisChange(axis)}
                />
                {axis} {columnUnits[axis] ? `${columnUnits[axis]}` : ""}
              </label>
            ))}
          </div>

          {/* Line Chart */}
          <div style={{ flex: 1 }}>
            {selectedAxis ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <p style={{ color: "white" }}>Please select a column to plot.</p>
            )}
          </div>
        </div>
      ) : excelData.length === 0 ? (
        <p style={{ marginTop: "20px" }}>No data to display yet.</p>
      ) : null}
    </div>
  );
}
