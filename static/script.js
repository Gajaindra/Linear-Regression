const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const equationSpan = document.getElementById("equation");
const dataTableBody = document.querySelector("#dataTable tbody");
const statsDisplay = document.getElementById("statsDisplay");
const calcStatsBtn = document.getElementById("calcStatsBtn");
const addRowBtn = document.getElementById("addRowBtn");

canvas.width = 800;
canvas.height = 600;

const margin = 40;
const scaleMax = 150;

let points = [];
let hoveredPoint = null;

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

canvas.addEventListener("click", (e) => {
    if (hoveredPoint) return;

    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    let dataX = Math.round((x - margin) * scaleMax / (canvas.width - 2 * margin));
    let dataY = Math.round((canvas.height - margin - y) * scaleMax / (canvas.height - 2 * margin));

    if (dataX < 0 || dataX > scaleMax || dataY < 0 || dataY > scaleMax) {
        alert("Please click within the 0 to 150 range.");
        return;
    }

    // Convert back to canvas coordinates
    x = margin + dataX * (canvas.width - 2 * margin) / scaleMax;
    y = canvas.height - margin - dataY * (canvas.height - 2 * margin) / scaleMax;

    points.push({ x, y });
    updateDataTableFromPoints();
    draw();
});

addRowBtn.addEventListener("click", () => {
    addEmptyRow();
});

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

function updateDataTableFromPoints() {
    dataTableBody.innerHTML = "";
    points.forEach((p, i) => {
        let xVal = Math.round((p.x - margin) * scaleMax / (canvas.width - 2 * margin));
        let yVal = Math.round((canvas.height - margin - p.y) * scaleMax / (canvas.height - 2 * margin));
        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td contenteditable="true">${xVal}</td>
            <td contenteditable="true">${yVal}</td>
        `;
        dataTableBody.appendChild(tr);
    });
}

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

        if (isNaN(xNum) || isNaN(yNum) || xNum < 0 || xNum > scaleMax || yNum < 0 || yNum > scaleMax) {
            alert(`Row ${i + 1} has invalid X or Y (must be 0-150).`);
            return false;
        }

        let canvasX = margin + xNum * (canvas.width - 2 * margin) / scaleMax;
        let canvasY = canvas.height - margin - yNum * (canvas.height - 2 * margin) / scaleMax;

        points.push({ x: canvasX, y: canvasY });
    }
    return true;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes();

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

function drawAxes() {
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(margin, 0);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width, canvas.height - margin);
    ctx.stroke();

    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";

    for (let i = 0; i <= scaleMax; i += 25) {
        let x = margin + i * (canvas.width - 2 * margin) / scaleMax;
        let y = canvas.height - margin - i * (canvas.height - 2 * margin) / scaleMax;

        ctx.fillText(i, x - 5, canvas.height - 20);
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - margin);
        ctx.lineTo(x, canvas.height - margin + 5);
        ctx.stroke();

        ctx.fillText(i, 5, y + 5);
        ctx.beginPath();
        ctx.moveTo(margin - 5, y);
        ctx.lineTo(margin, y);
        ctx.stroke();
    }

    ctx.fillText("X", canvas.width - 20, canvas.height - 20);
    ctx.fillText("Y", 10, 20);
}

function drawPointLabel(p) {
    let xVal = Math.round((p.x - margin) * scaleMax / (canvas.width - 2 * margin));
    let yVal = Math.round((canvas.height - margin - p.y) * scaleMax / (canvas.height - 2 * margin));
    const label = `(${xVal}, ${yVal})`;

    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.font = "13px Arial";

    let labelX = p.x + 10;
    let labelY = p.y - 10;

    const width = ctx.measureText(label).width + 10;
    const height = 20;
    ctx.fillRect(labelX - 5, labelY - height + 5, width, height);
    ctx.strokeRect(labelX - 5, labelY - height + 5, width, height);

    ctx.fillStyle = "#000";
    ctx.fillText(label, labelX, labelY);
}

function linearRegression(pts) {
    let xs = pts.map(p => (p.x - margin) * scaleMax / (canvas.width - 2 * margin));
    let ys = pts.map(p => (canvas.height - margin - p.y) * scaleMax / (canvas.height - 2 * margin));

    let n = pts.length;
    let sumX = xs.reduce((a, b) => a + b, 0);
    let sumY = ys.reduce((a, b) => a + b, 0);
    let sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
    let sumX2 = xs.reduce((acc, x) => acc + x * x, 0);

    let denom = (n * sumX2 - sumX * sumX);
    if (denom === 0) return { slope: 0, intercept: ys[0] || 0 };

    let slope = (n * sumXY - sumX * sumY) / denom;
    let intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

function drawLine(slope, intercept) {
    let x1 = 0;
    let y1 = slope * x1 + intercept;

    let x2 = scaleMax;
    let y2 = slope * x2 + intercept;

    let canvasX1 = margin + x1 * (canvas.width - 2 * margin) / scaleMax;
    let canvasY1 = canvas.height - margin - y1 * (canvas.height - 2 * margin) / scaleMax;
    let canvasX2 = margin + x2 * (canvas.width - 2 * margin) / scaleMax;
    let canvasY2 = canvas.height - margin - y2 * (canvas.height - 2 * margin) / scaleMax;

    ctx.beginPath();
    ctx.moveTo(canvasX1, canvasY1);
    ctx.lineTo(canvasX2, canvasY2);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.stroke();
}

function updateEquation(slope, intercept) {
    let slopeText = slope.toFixed(2);
    let interceptText = intercept.toFixed(2);
    let sign = intercept >= 0 ? "+" : "-";
    let interceptAbs = Math.abs(intercept).toFixed(2);
    equationSpan.textContent = `y = ${slopeText}x ${sign} ${interceptAbs}`;
}

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

    let xs = points.map(p => (p.x - margin) * scaleMax / (canvas.width - 2 * margin));
    let ys = points.map(p => (canvas.height - margin - p.y) * scaleMax / (canvas.height - 2 * margin));
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

clearCanvas();
addEmptyRow();
