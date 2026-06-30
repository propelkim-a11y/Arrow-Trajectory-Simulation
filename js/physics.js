const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

let dprWidth = 0;
let dprHeight = 0;

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.resetTransform();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    dprWidth = rect.width;
    dprHeight = rect.height;
    drawScene();
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', resizeCanvas);

let isFlying = false;
let animationFrameId = null;
let trajectory = [];

let arrowState = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, pitch: 0, yaw: 0 };

const SCALE = 6; 
const ORIGIN_X_OFFSET = 50; 
const GROUND_Y_OFFSET = 60;

function fireArrow() {
    if (isFlying) cancelAnimationFrame(animationFrameId);
    if (typeof saveSettings === 'function') saveSettings(); 

    const v0 = parseFloat(document.getElementById('velocity').value) || 50;
    const angleDeg = parseFloat(document.getElementById('angle').value) || 0;
    const yawDeg = parseFloat(document.getElementById('yawAngle').value) || 0;
    const launchH = parseFloat(document.getElementById('launchHeight').value) || 0;

    const pitchRad = (angleDeg * Math.PI) / 180;
    const yawRad = (yawDeg * Math.PI) / 180;

    arrowState.x = 0; arrowState.y = launchH; arrowState.z = 0;
    arrowState.vx = v0 * Math.cos(pitchRad) * Math.cos(yawRad);
    arrowState.vy = v0 * Math.sin(pitchRad);
    arrowState.vz = v0 * Math.cos(pitchRad) * Math.sin(yawRad);
    arrowState.pitch = pitchRad; arrowState.yaw = yawRad;

    trajectory = [{x: arrowState.x, y: arrowState.y, z: arrowState.z}];
    isFlying = true;
    animate();
}

function animate() {
    if (!isFlying) return;

    const cd = parseFloat(document.getElementById('dragCoeff').value) || 0;
    const cl = parseFloat(document.getElementById('liftCoeff').value) || 0;
    const d = (parseFloat(document.getElementById('diameter').value) || 5.5) / 1000;
    const m = (parseFloat(document.getElementById('weight').value) || 25) / 1000;
    const rho = parseFloat(document.getElementById('airDensity').value) || 1.225;
    const windX = parseFloat(document.getElementById('windX').value) || 0;
    const windY = parseFloat(document.getElementById('windY').value) || 0; 

    const g = 9.81; const dt = 0.016; const area = Math.PI * Math.pow(d / 2, 2);

    const relVx = arrowState.vx - windX; const relVy = arrowState.vy; const relVz = arrowState.vz - windY;
    const vRel = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz) || 0.001;

    const dragF = 0.5 * rho * vRel * vRel * cd * area;
    const liftF = 0.5 * rho * vRel * vRel * cl * area;

    const flowPitch = Math.atan2(relVy, Math.sqrt(relVx * relVx + relVz * relVz));
    const flowYaw = Math.atan2(relVz, relVx);

    const ax = (-dragF * Math.cos(flowPitch) * Math.cos(flowYaw) - liftF * Math.sin(flowPitch) * Math.cos(flowYaw)) / m;
    const ay = (-g - dragF * Math.sin(flowPitch) + liftF * Math.cos(flowPitch)) / m;
    const az = (-dragF * Math.cos(flowPitch) * Math.sin(flowYaw) - liftF * Math.sin(flowPitch) * Math.sin(flowYaw)) / m;

    arrowState.vx += ax * dt; arrowState.vy += ay * dt; arrowState.vz += az * dt;
    arrowState.x += arrowState.vx * dt; arrowState.y += arrowState.vy * dt; arrowState.z += arrowState.vz * dt;
    arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vz * arrowState.vz));
    arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);

    trajectory.push({x: arrowState.x, y: arrowState.y, z: arrowState.z});

    if (arrowState.y <= 0) { arrowState.y = 0; isFlying = false; }
    if ((arrowState.x * SCALE) + ORIGIN_X_OFFSET > dprWidth + 100 || arrowState.x < -10) isFlying = false;

    drawScene();
    if (isFlying) animationFrameId = requestAnimationFrame(animate);
}

function drawScene() {
    if (dprWidth === 0 || dprHeight === 0) return;
    ctx.clearRect(0, 0, dprWidth, dprHeight);
    const targetH = parseFloat(document.getElementById('targetHeight').value) || 0;
    const targetScreenX = dprWidth - 80;

    function toScreen(pX, pY, pZ) {
        if (currentView === 'side') return { x: ORIGIN_X_OFFSET + (pX * SCALE), y: dprHeight - GROUND_Y_OFFSET - (pY * SCALE) };
        if (currentView === 'top') return { x: ORIGIN_X_OFFSET + (pX * SCALE), y: (dprHeight / 2) + (pZ * SCALE) };
        return { x: (dprWidth / 2) + (pZ * SCALE), y: dprHeight - GROUND_Y_OFFSET - (pY * SCALE) };
    }

    if (currentView === 'side') {
        ctx.strokeStyle = '#e5e5ea'; ctx.lineWidth = 1; ctx.font = '10px -apple-system'; ctx.fillStyle = '#8e8e93';
        for (let xMeters = 0; ORIGIN_X_OFFSET + (xMeters * SCALE) < dprWidth; xMeters += 20) {
            let scrX = ORIGIN_X_OFFSET + (xMeters * SCALE);
            ctx.beginPath(); ctx.moveTo(scrX, 0); ctx.lineTo(scrX, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
            ctx.textAlign = 'center'; ctx.fillText(xMeters + 'm', scrX, dprHeight - GROUND_Y_OFFSET + 18);
        }
        for (let yMeters = 0; dprHeight - GROUND_Y_OFFSET - (yMeters * SCALE) > 0; yMeters += 10) {
            let scrY = dprHeight - GROUND_Y_OFFSET - (yMeters * SCALE);
            ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, scrY); ctx.lineTo(dprWidth, scrY); ctx.stroke();
            ctx.textAlign = 'right'; ctx.fillText(yMeters + 'm', ORIGIN_X_OFFSET - 8, scrY + 3);
        }
        ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); ctx.lineTo(dprWidth, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, 0); ctx.lineTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
    } else {
        ctx.strokeStyle = '#86868b'; ctx.lineWidth = 1.5; ctx.beginPath();
        if (currentView === 'front') ctx.moveTo(0, dprHeight - GROUND_Y_OFFSET); else ctx.moveTo(0, dprHeight / 2);
        ctx.stroke();
    }

    const tgt = toScreen((targetScreenX - ORIGIN_X_OFFSET) / SCALE, targetH, 0);
    ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 6, 0, Math.PI * 2); ctx.fill();
    if (currentView === 'side' || currentView === 'front') {
        ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tgt.x, tgt.y + 12); ctx.lineTo(tgt.x, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
    }

    if (trajectory.length > 1) {
        ctx.strokeStyle = '#0071e3'; ctx.lineWidth = 2.5; ctx.beginPath();
        const start = toScreen(trajectory[0].x, trajectory[0].y, trajectory[0].z); ctx.moveTo(start.x, start.y);
        for (let i = 1; i < trajectory.length; i++) { const pt = toScreen(trajectory[i].x, trajectory[i].y, trajectory[i].z); ctx.lineTo(pt.x, pt.y); }
        ctx.stroke();
    }

    const arrowPos = toScreen(arrowState.x, arrowState.y, arrowState.z);
    ctx.save(); ctx.translate(arrowPos.x, arrowPos.y);
    let angleRad = 0; if (currentView === 'side') angleRad = -arrowState.pitch; else if (currentView === 'top') angleRad = arrowState.yaw;
    ctx.rotate(angleRad);
    ctx.strokeStyle = '#515154'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = '#1d1d1f'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6, -3); ctx.lineTo(-6, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff9500'; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-16, -4); ctx.lineTo(-10, -4); ctx.lineTo(-14, 0); ctx.fill();
    ctx.restore();
}

setTimeout(() => {
    if (typeof loadSettings === 'function') loadSettings();  
    resizeCanvas();
    const launchH = parseFloat(document.getElementById('launchHeight').value) || 1.5;
    arrowState.x = 0; arrowState.y = launchH; arrowState.z = 0;
    arrowState.pitch = (parseFloat(document.getElementById('angle').value) || 30) * Math.PI / 180;
    arrowState.yaw = (parseFloat(document.getElementById('yawAngle').value) || 0) * Math.PI / 180;
    drawScene();
}, 250);
