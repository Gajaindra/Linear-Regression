const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const equationSpan = document.getElementById("equation");
const dataTableBody = document.querySelector("#dataTable tbody");
const statsDisplay = document.getElementById("statsDisplay");
const calcStatsBtn = document.getElementById("calcStatsBtn");
const addRowBtn = document.getElementById("addRowBtn");

canvas.width = 800;
canvas.height = 600;

let points = [];
let hoveredPoint = null;

// Add mousemove listener to show point coordinates on hover
canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    hoveredPoint = null;

    for (let p of points) {
        if (Math.abs(p.x - mouseX) < 7 && Math.abs(p.y - mouseY) < 7) {
            hoveredPoint = p;
            break;
        }
    }
    draw();
});

// Click event to add points (ignore if hovering over existing point)
canvas.addEventListener("click", (e) => {
    if (hoveredPoint) return; // avoid adding on existing point

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    points.push({ x, y });
    updateDataTableFromPoints();
    draw();
});

// Add new empty editable row to table
addRowBtn.addEventListener("click", () => {
    addEmptyRow();
});

// Add an empty editable row to the table
function addEmptyRow() {
    let tr = document.createElement("tr");
    let rowNum = dataTableBody.rows.length + 1;

    tr.innerHTML = `
        <td>${rowNum}</td>
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
    `;
    dataTableBody.appendChild(tr);
}

// Update table from current points array
function updateDataTableFromPoints() {
    dataTableBody.innerHTML = "";
    points.forEach((p, i) => {
        let xVal = Math.round(p.x - 40);
        let yVal = Math.round(canvas.height - 40 - p.y);
        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td contenteditable="true">${xVal}</td>
            <td contenteditable="true">${yVal}</td>
        `;
        dataTableBody.appendChild(tr);
    });
}

// Read points from the table (validate inputs)
function updatePointsFromTable() {
    points = [];
    let rows = dataTableBody.querySelectorAll("tr");

    for (let i = 0; i < rows.length; i++) {
        let cells = rows[i].querySelectorAll("td");
        if (cells.length < 3) continue;
        let xStr = cells[1].textContent.trim();
        let yStr = cells[2].textContent.trim();

        let xNum = Number(xStr);
        let yNum = Number(yStr);

        if (isNaN(xNum) || isNaN(yNum)) {
            alert(`Row ${i + 1} has invalid number(s). Please enter valid numeric X and Y.`);
            return false;
        }

        // Convert back to canvas coords:
        let canvasX = xNum + 40;
        let canvasY = canvas.height - 40 - yNum;

        points.push({ x: canvasX, y: canvasY });
    }
    return true;
}

// Draw function: axes, points, hovered label, regression line
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes();

    // Draw all points
    for (let p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "blue";
        ctx.fill();

        if (hoveredPoint === p) {
            ctx.strokeStyle = "orange";
            ctx.lineWidth = 3;
            ctx.stroke();

            drawPointLabel(p);
        }
    }

    if (points.length >= 2) {
        const { slope, intercept } = linearRegression(points);
        drawLine(slope, intercept);
        updateEquation(slope, intercept);
    } else {
        equationSpan.textContent = "y = --x + --";
    }
}

// Draw coordinate axes and ticks with labels
function drawAxes() {
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;

    // X-axis line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 40);
    ctx.lineTo(canvas.width, canvas.height - 40);
    ctx.stroke();

    // Y-axis line
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(40, canvas.height);
    ctx.stroke();

    // X axis labels every 100 px
    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";
    for (let x = 40; x <= canvas.width; x += 100) {
        ctx.fillText(x - 40, x - 10, canvas.height - 20);
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - 40);
        ctx.lineTo(x, canvas.height - 35);
        ctx.stroke();
    }

    // Y axis labels every 100 px
    for (let y = canvas.height - 40; y >= 0; y -= 100) {
        ctx.fillText(canvas.height - 40 - y, 5, y + 5);
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(45, y);
        ctx.stroke();
    }

    // Axis titles
    ctx.font = "14px Arial";
    ctx.fillText("X", canvas.width - 20, canvas.height - 20);
    ctx.fillText("Y", 10, 20);
}

// Draw small tooltip near hovered point showing coordinates
function drawPointLabel(p) {
    const label = `(${Math.round(p.x - 40)}, ${Math.round(canvas.height - 40 - p.y)})`;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.font = "13px Arial";

    let labelX = p.x + 10;
    let labelY = p.y - 10;

    // Background rectangle for label
    const width = ctx.measureText(label).width + 10;
    const height = 20;
    ctx.fillRect(labelX - 5, labelY - height + 5, width, height);
    ctx.strokeRect(labelX - 5, labelY - height + 5, width, height);

    // Text label
    ctx.fillStyle = "#000";
    ctx.fillText(label, labelX, labelY);
}

// Linear regression calculation: returns slope and intercept
function linearRegression(pts) {
    let xs = pts.map(p => p.x - 40);
    let ys = pts.map(p => canvas.height - 40 - p.y);

    let n = pts.length;
    let sumX = xs.reduce((a,b) => a+b, 0);
    let sumY = ys.reduce((a,b) => a+b, 0);
    let sumXY = xs.reduce((acc, x, i) => acc + x*ys[i], 0);
    let sumX2 = xs.reduce((acc, x) => acc + x*x, 0);

    let denom = (n*sumX2 - sumX*sumX);
    if (denom === 0) return { slope: 0, intercept: ys[0] || 0 };

    let slope = (n*sumXY - sumX*sumY) / denom;
    let intercept = (sumY - slope*sumX) / n;

    return { slope, intercept };
}

// Draw regression line on canvas (red line)
function drawLine(slope, intercept) {
    let x1 = 40;
    let y1 = canvas.height - 40 - (slope * 0 + intercept);
    let x2 = canvas.width;
    let y2 = canvas.height - 40 - (slope * (canvas.width - 40) + intercept);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Update the regression equation text
function updateEquation(slope, intercept) {
    let slopeText = slope.toFixed(2);
    let interceptText = intercept.toFixed(2);
    let sign = intercept >= 0 ? "+" : "-";
    let interceptAbs = Math.abs(intercept).toFixed(2);
    equationSpan.textContent = `y = ${slopeText}x ${sign} ${interceptAbs}`;
}

// Clear all points and reset display
function clearCanvas() {
    points = [];
    updateDataTableFromPoints();
    statsDisplay.innerHTML = `
        <p>Slope (m): --</p>
        <p>Intercept (b): --</p>
        <p>Mean Squared Error (MSE): --</p>
        <p>Mean Absolute Error (MAE): --</p>
        <p>Root Mean Squared Error (RMSE): --</p>
    `;
    equationSpan.textContent = "y = --x + --";
    draw();
}

// Calculate and display regression stats when button clicked
calcStatsBtn.addEventListener("click", () => {
    if (dataTableBody.rows.length < 2) {
        alert("Please enter at least 2 data points.");
        return;
    }

    if (!updatePointsFromTable()) return;

    if (points.length < 2) {
        alert("Please enter at least 2 valid data points.");
        return;
    }

    const { slope, intercept } = linearRegression(points);

    let xs = points.map(p => p.x - 40);
    let ys = points.map(p => canvas.height - 40 - p.y);

    let preds = xs.map(x => slope * x + intercept);

    let errors = preds.map((pred, i) => pred - ys[i]);
    let absErrors = errors.map(e => Math.abs(e));
    let sqErrors = errors.map(e => e * e);

    let mse = sqErrors.reduce((a, b) => a + b, 0) / points.length;
    let mae = absErrors.reduce((a, b) => a + b, 0) / points.length;
    let rmse = Math.sqrt(mse);

    statsDisplay.innerHTML = `
        <p>Slope (m): ${slope.toFixed(4)}</p>
        <p>Intercept (b): ${intercept.toFixed(4)}</p>
        <p>Mean Squared Error (MSE): ${mse.toFixed(4)}</p>
        <p>Mean Absolute Error (MAE): ${mae.toFixed(4)}</p>
        <p>Root Mean Squared Error (RMSE): ${rmse.toFixed(4)}</p>
    `;

    draw();
});

// Initialize with empty row
clearCanvas();
addEmptyRow();
