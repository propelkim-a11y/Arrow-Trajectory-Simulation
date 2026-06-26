// [Part 2: 정밀 물리 수치해석 궤적 연산 모듈 - GungdoEngine.js]
const sliders = ['cd0', 'cl0', 'wx', 'wz'];
sliders.forEach(id => {
    const input = document.getElementById(id);
    const valSpan = document.getElementById(id + '_val');
    input.addEventListener('input', () => {
        valSpan.textContent = input.value;
        runSimulation();
    });
});

const inputs = ['v0', 'm_g', 'd_mm', 'theta_deg', 'phi_deg', 'h0', 'target_dh'];
inputs.forEach(id => {
    document.getElementById(id).addEventListener('change', runSimulation);
});

let sideChart = null;
let topChart = null;
let frontChart = null;

function simulate(v0, m_g, d_mm, theta_deg, phi_deg, h0, target_dh, wx, wz, cd0, cl0) {
    const m = m_g / 1000.0;
    const d = d_mm / 1000.0;
    const g = 9.80665;
    const rho = 1.225;
    const dt = 0.01;
    
    const theta = theta_deg * Math.PI / 180.0;
    const phi = phi_deg * Math.PI / 180.0;
    const A = Math.PI * Math.pow(d / 2.0, 2);
    
    let vx = v0 * Math.cos(theta) * Math.cos(phi);
    let vy = v0 * Math.sin(theta);
    let vz = v0 * Math.cos(theta) * Math.sin(phi);
    
    let x = 0.0, y = h0, z = 0.0;
    
    let xs = [x], ys = [y], zs = [z];
    let maxSteps = 5000;
    
    while (y >= (target_dh - 5.0) && x <= 165.0 && maxSteps > 0) {
        maxSteps--;
        let vrx = vx - wx;
        let vry = vy;
        let vrz = vz - wz;
        let v = Math.sqrt(vrx*vrx + vry*vry + vrz*vrz);
        if (v < 1e-6) break;
        
        let Fd = 0.5 * rho * (cd0 * (1 + 0.15 * Math.pow(v / 60.0, 2))) * A * v*v;
        let Fl = 0.5 * rho * cl0 * A * v*v;
        
        let ax = -Fd * vrx / (m * v);
        let az = -Fd * vrz / (m * v);
        let ay = -g - (Fd * vry / (m * v)) + (Fl / m);
        
        vx += ax * dt; vy += ay * dt; vz += az * dt;
        x += vx * dt; y += vy * dt; z += vz * dt;
        
        xs.push(x); ys.push(y); zs.push(z);
    }
    return { xs, ys, zs };
}
// [Part 3: 실시간 조준 판정 및 3축 가독성 뷰 Chart.js 인터페이스 렌더링 - GungdoEngine.js]
function drawWindVector(wx, wz) {
    const canvas = document.getElementById('windCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = 45;
    
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI); ctx.stroke();
    
    const norm = Math.sqrt(wx*wx + wz*wz);
    if (norm > 0) {
        const nx = wx / norm;
        const nz = wz / norm;
        
        ctx.strokeStyle = '#00FFCC';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + nx * r * 0.8, cy - nz * r * 0.8);
        ctx.stroke();
        
        ctx.fillStyle = '#00FFCC';
        ctx.beginPath();
        ctx.arc(cx + nx * r * 0.8, cy - nz * r * 0.8, 4, 0, 2*Math.PI);
        ctx.fill();
    }
}

function runSimulation() {
    const v0 = parseFloat(document.getElementById('v0').value);
    const m_g = parseFloat(document.getElementById('m_g').value);
    const d_mm = parseFloat(document.getElementById('d_mm').value);
    const theta_deg = parseFloat(document.getElementById('theta_deg').value);
    const phi_deg = parseFloat(document.getElementById('phi_deg').value);
    const h0 = parseFloat(document.getElementById('h0').value);
    const cd0 = parseFloat(document.getElementById('cd0').value);
    const cl0 = parseFloat(document.getElementById('cl0').value);
    const wx = parseFloat(document.getElementById('wx').value);
    const wz = parseFloat(document.getElementById('wz').value);
    const target_dh = parseFloat(document.getElementById('target_dh').value);

    document.getElementById('bannerSpecs').textContent = `${m_g}g Weight | Diameter ${d_mm}mm`;
    drawWindVector(wx, wz);

    const { xs, ys, zs } = simulate(v0, m_g, d_mm, theta_deg, phi_deg, h0, target_dh, wx, wz, cd0, cl0);

    const t_base = 145.0, t_h = 2.67, t_w = 2.0, tilt = 15 * Math.PI / 180.0;
    let hit_data = { y: ys[ys.length-1], z: zs[zs.length-1], hit: false };
    
    for (let i = 0; i < xs.length - 1; i++) {
        let tx = t_base + (ys[i] - target_dh) * Math.tan(tilt);
        if (xs[i] <= tx && tx <= xs[i+1]) {
            let ay = (ys[i] - target_dh) / Math.cos(tilt);
            hit_data = { y: ay, z: zs[i], hit: (ay >= 0 && ay <= t_h && Math.abs(zs[i]) <= t_w / 2) };
            break;
        }
    }

    const resultPanel = document.getElementById('resultPanel');
    if (hit_data.hit) {
        resultPanel.style.borderLeftColor = '#00FFCC';
        resultPanel.innerHTML = `
            <span style="font-size:12px; color:#A9A9B3; text-transform:uppercase; letter-spacing:0.1em;">Simulation Result</span>
            <h2 class="perfect-level" style="margin:4px 0 6px 0; font-size:28px;">🎯 HIT (관중)</h2>
            <p class="tabular-nums" style="font-size:14px; color:#E0E0E3;">Impact Node &rarr; Height: <b>${hit_data.y.toFixed(2)}m</b> | Lateral: <b>${hit_data.z.toFixed(2)}m</b></p>
        `;
    } else {
        resultPanel.style.borderLeftColor = '#FF3366';
        resultPanel.innerHTML = `
            <span style="font-size:12px; color:#A9A9B3; text-transform:uppercase; letter-spacing:0.1em;">Simulation Result</span>
            <h2 class="recording" style="margin:4px 0 6px 0; font-size:28px;">❌ MISS (불관중)</h2>
            <p class="tabular-nums" style="font-size:14px; color:#E0E0E3;">Terminal Node &rarr; Height: <b>${hit_data.y.toFixed(2)}m</b> | Lateral: <b>${hit_data.z.toFixed(2)}m</b></p>
        `;
    }

    if (sideChart) sideChart.destroy();
    const sideData = xs.map((x, idx) => ({ x: x, y: ys[idx] }));
    sideChart = new Chart(document.getElementById('sideViewChart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: [{
                label: 'Arrow Path', data: sideData, borderColor: '#00FFCC', borderWidth: 2, pointRadius: 0, fill: false
            }, {
                label: 'Target Area', data: [{x: t_base, y: target_dh}, {x: t_base + t_h*Math.sin(tilt), y: target_dh + t_h*Math.cos(tilt)}],
                borderColor: '#FF3366', borderWidth: 4, pointRadius: 0, fill: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, title: { display: true, text: 'Flight Trajectory (Side View)', color: '#FFF' } },
            scales: { x: { type: 'linear', grid: { color: 'rgba(255,255,255,0.03)' } }, y: { min: -2, grid: { color: 'rgba(255,255,255,0.03)' } } }
        }
    });

    if (topChart) topChart.destroy();
    const topData = xs.map((x, idx) => ({ x: x, y: zs[idx] }));
    topChart = new Chart(document.getElementById('topViewChart').getContext('2d'), {
        type: 'line',
        data: { datasets: [{ data: topData, borderColor: '#FF9900', borderWidth: 2, pointRadius: 0, fill: false }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, title: { display: true, text: 'Flight Path (Top View)', color: '#FFF' } },
            scales: { x: { type: 'linear', grid: { color: 'rgba(255,255,255,0.03)' } }, y: { min: -4, max: 4, reverse: true, grid: { color: 'rgba(255,255,255,0.03)' } } }
        }
    });

    if (frontChart) frontChart.destroy();
    frontChart = new Chart(document.getElementById('frontViewChart').getContext('2d'), {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Impact Point', data: [{ x: hit_data.z, y: hit_data.y }],
                backgroundColor: hit_data.hit ? '#00FFCC' : '#FF3366', radius: 7, pointStyle: hit_data.hit ? 'circle' : 'crossRot'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, title: { display: true, text: 'Impact Analysis (Front View)', color: '#FFF' },
                beforeDraw: (chart) => {
                    const ctx = chart.ctx;
                    const xAxis = chart.scales.x;
                    const yAxis = chart.scales.y;
                    const xLeft = xAxis.getPixelForValue(-1.0);
                    const xRight = xAxis.getPixelForValue(1.0);
                    const yBottom = yAxis.getPixelForValue(0);
                    const yTop = yAxis.getPixelForValue(2.67);
                    ctx.save();
                    ctx.fillStyle = 'rgba(255, 51, 102, 0.05)';
                    ctx.strokeStyle = '#FF3366';
                    ctx.lineWidth = 2;
                    ctx.fillRect(xLeft, yTop, xRight - xLeft, yBottom - yTop);
                    ctx.strokeRect(xLeft, yTop, xRight - xLeft, yBottom - yTop);
                    ctx.restore();
                }
            },
            scales: { x: { min: -2.5, max: 2.5, grid: { color: 'rgba(255,255,255,0.03)' } }, y: { min: -0.5, max: 3.5, grid: { color: 'rgba(255,255,255,0.03)' } } }
        }
    });
}

window.addEventListener('DOMContentLoaded', runSimulation);
