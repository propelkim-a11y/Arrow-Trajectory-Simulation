// =========================================================================
// [최종 마스터 완결본] physics.js - 전체 소스 코드 (외곽선 박스 프레임 강화 버전)
// =========================================================================

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

let dprWidth = 0;
let dprHeight = 0;

// [통일된 월드 공간 스케일 세팅]
const MAX_WORLD_X = 180;   // 최대 전진 거리 180m
const MAX_WORLD_Y = 30;    // 최대 높이 30m
const MAX_WORLD_Z = 15;    // 좌우 최대 관측 편차 범위 (±15m)
const TARGET_SLANT_R = 145; // 사대 0점부터 과녁 바닥 전면까지의 고정 경사 거리 (145m 부동)

// 국궁 표준 과녁 물리 제원 및 수직 투영 보정
const TGT_W = 2.0;         // 가로 2m
const TGT_H = 2.667;       // 실제 사선 세로 길이 2.667m
const TGT_D = 0.5;         // 두께 0.5m
const TGT_TILT = 15 * Math.PI / 180; // 뒤로 15도 기울어짐 (라디안)
const TGT_PROJ_H = TGT_H * Math.cos(TGT_TILT); // 정면/측면에서 보이는 수직 투영 높이 = 정확히 2.58m

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

let flightMetrics = {
    maxDistance: 0,
    maxHeight: 0,
    sideDeviation: 0,
    flightTime: 0,
    impactVelocity: 0,
    impactEnergy: 0
};

let targetHitMetrics = {
    isHit: false,      
    localZ: 0,         
    localY: 0          
};

let hasReachedTargetX = false;
let hasReachedTargetY = false;
let hasIntersectedTargetPlane = false; 

const ORIGIN_X_OFFSET = 35; 
const GROUND_Y_OFFSET = 30; 

// 과녁 고도차를 '과녁 바닥'의 높이로 취급
function getDynamicTargetGeometry() {
    const targetHInput = parseFloat(document.getElementById('targetHeight').value);
    const targetH = isNaN(targetHInput) ? 0 : targetHInput;
    const safeTargetH = Math.min(targetH, TARGET_SLANT_R - 0.1);
    const targetBaseX = Math.sqrt(Math.pow(TARGET_SLANT_R, 2) - Math.pow(safeTargetH, 2));
    return { baseX: targetBaseX, height: safeTargetH };
}

function fireArrow() {
    if (isFlying) cancelAnimationFrame(animationFrameId);
    if (typeof saveSettings === 'function') saveSettings();

    const v0 = parseFloat(document.getElementById('velocity').value) || 50;
    const angleDeg = parseFloat(document.getElementById('angle').value) || 0;
    const yawDeg = parseFloat(document.getElementById('yawAngle').value) || 0;
    const launchH = parseFloat(document.getElementById('launchHeight').value) || 1.5;

    const pitchRad = (angleDeg * Math.PI) / 180;
    const yawRad = (yawDeg * Math.PI) / 180;

    arrowState.x = 0; 
    arrowState.y = launchH; 
    arrowState.z = 0;
    
    arrowState.vx = v0 * Math.cos(pitchRad) * Math.cos(yawRad);
    arrowState.vy = v0 * Math.sin(pitchRad);
    arrowState.vz = v0 * Math.cos(pitchRad) * Math.sin(yawRad);
    
    arrowState.pitch = pitchRad; 
    arrowState.yaw = yawRad;

    flightMetrics = { maxDistance: 0, maxHeight: launchH, sideDeviation: 0, flightTime: 0, impactVelocity: v0, impactEnergy: 0 };
    targetHitMetrics = { isHit: false, localZ: 0, localY: 0 };
    hasReachedTargetX = false;
    hasReachedTargetY = false;
    hasIntersectedTargetPlane = false;
    
    updateResultUI();
    trajectory = [{ x: arrowState.x, y: arrowState.y, z: arrowState.z }];
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
    const windZ = parseFloat(document.getElementById('windY').value) || 0; 

    const g = 9.81; const dt = 0.016; const area = Math.PI * Math.pow(d / 2, 2); 
    const tgtGeo = getDynamicTargetGeometry();
    const targetBaseX = tgtGeo.baseX; const targetH = tgtGeo.height;   

    const relVx = arrowState.vx - windX; const relVy = arrowState.vy; const relVz = arrowState.vz - windZ;
    const vRel = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz) || 0.001;

    const flowPitch = Math.atan2(relVy, Math.sqrt(relVx * relVx + relVz * relVz));
    const flowYaw = Math.atan2(relVz, relVx);
    const attackAngle = arrowState.pitch - flowPitch;

    const effectiveArea = area * 2.5; 
    const dynamicLiftCoeff = 2.0 * Math.sin(attackAngle) * Math.cos(attackAngle);
    const dragF = 0.5 * rho * vRel * vRel * cd * effectiveArea;
    const liftF = 0.5 * rho * vRel * vRel * (cl + dynamicLiftCoeff) * effectiveArea;

    const dragAx = (-dragF * Math.cos(flowPitch) * Math.cos(flowYaw)) / m;
    const dragAy = (-dragF * Math.sin(flowPitch)) / m;
    const dragAz = (-dragF * Math.cos(flowPitch) * Math.sin(flowYaw)) / m;
    const liftAx = (-liftF * Math.sin(flowPitch) * Math.cos(flowYaw)) / m;
    const liftAy = (liftF * Math.cos(flowPitch)) / m;
    const liftAz = (-liftF * Math.sin(flowPitch) * Math.sin(flowYaw)) / m;

    const ax = dragAx + liftAx; const ay = -g + dragAy + liftAy; const az = dragAz + liftAz;
    const prevX = arrowState.x; const prevY = arrowState.y; const prevZ = arrowState.z;

    arrowState.vx += ax * dt; arrowState.vy += ay * dt; arrowState.vz += az * dt;
    arrowState.x += arrowState.vx * dt; arrowState.y += arrowState.vy * dt; arrowState.z += arrowState.vz * dt;

    arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vz * arrowState.vz));
    arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);
    trajectory.push({ x: arrowState.x, y: arrowState.y, z: arrowState.z });

    if (!hasReachedTargetX) { flightMetrics.flightTime += dt; }
    if (arrowState.y > flightMetrics.maxHeight) { flightMetrics.maxHeight = arrowState.y; }

    const nx = Math.cos(TGT_TILT); const ny = Math.sin(TGT_TILT);
    const distPrev = nx * (prevX - targetBaseX) + ny * (prevY - targetH);
    const distCurr = nx * (arrowState.x - targetBaseX) + ny * (arrowState.y - targetH);

    if (!hasIntersectedTargetPlane && distPrev * distCurr <= 0 && prevX < arrowState.x) {
        hasIntersectedTargetPlane = true;
        const s = Math.abs(distPrev) / (Math.abs(distPrev) + Math.abs(distCurr));
        const interY = prevY + (arrowState.y - prevY) * s;
        const interZ = prevZ + (arrowState.z - prevZ) * s;
        const centerWorldY = targetH + (TGT_H / 2) * Math.cos(TGT_TILT);

        targetHitMetrics.localZ = interZ;
        targetHitMetrics.localY = (interY - centerWorldY) / Math.cos(TGT_TILT);

        if (Math.abs(targetHitMetrics.localZ) <= TGT_W / 2 && Math.abs(targetHitMetrics.localY) <= TGT_H / 2) {
            targetHitMetrics.isHit = true;
        } else {
            targetHitMetrics.isHit = false;
        }
    }

    if (!hasReachedTargetX && arrowState.x >= targetBaseX) { hasReachedTargetX = true; }
    if (!hasReachedTargetY && arrowState.vy <= 0 && prevY >= targetH && arrowState.y <= targetH) {
        hasReachedTargetY = true;
        const t = (prevY - targetH) / (prevY - arrowState.y);
        flightMetrics.maxDistance = prevX + (arrowState.x - prevX) * t;
        flightMetrics.sideDeviation = prevZ + (arrowState.z - prevZ) * t;
        const vFinal = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactVelocity = vFinal; flightMetrics.impactEnergy = 0.5 * m * vFinal * vFinal;
    }

    if (!hasReachedTargetY) {
        flightMetrics.maxDistance = arrowState.x; flightMetrics.sideDeviation = arrowState.z;
        const vCurrent = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactVelocity = vCurrent; flightMetrics.impactEnergy = 0.5 * m * vCurrent * vCurrent;
    }

    updateResultUI();
    if (arrowState.y <= 0) { arrowState.y = 0; isFlying = false; updateResultUI(); }
    if (arrowState.x > MAX_WORLD_X || arrowState.x < -10) { isFlying = false; }

    drawScene();
    if (isFlying) { animationFrameId = requestAnimationFrame(animate); }
}

function updateResultUI() {
    const resDist = document.getElementById('resMaxDist'); const resHeight = document.getElementById('resMaxHeight');
    const resSide = document.getElementById('resSideDev'); const resTime = document.getElementById('resFlightTime');
    const resVel = document.getElementById('resImpactVel'); const resEnergy = document.getElementById('resImpactEnergy');
    if (resDist) resDist.innerText = flightMetrics.maxDistance.toFixed(2) + " m";
    if (resHeight) resHeight.innerText = flightMetrics.maxHeight.toFixed(2) + " m";
    if (resSide) resSide.innerText = flightMetrics.sideDeviation.toFixed(2) + " m";
    if (resTime) resTime.innerText = flightMetrics.flightTime.toFixed(2) + " s";
    if (resVel) resVel.innerText = flightMetrics.impactVelocity.toFixed(2) + " m/s";
    if (resEnergy) resEnergy.innerText = flightMetrics.impactEnergy.toFixed(2) + " J";
}

function drawScene() {
    if (dprWidth === 0 || dprHeight === 0) return;
    ctx.clearRect(0, 0, dprWidth, dprHeight);
    
    const tgtGeo = getDynamicTargetGeometry();
    const targetBaseX = tgtGeo.baseX; const safeTargetH = tgtGeo.height;
    const availW = dprWidth - ORIGIN_X_OFFSET - 20; // 💡 마진 최적화 (우측 20px 여백)
    const availH = dprHeight - GROUND_Y_OFFSET - 15; // 💡 마진 최적화 (상단 15px 여백)

// =========================================================================
// [최종 마스터 완결본] physics.js - 전체 소스 코드 (외곽선 박스 프레임 강화 버전)
// =========================================================================

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

let dprWidth = 0;
let dprHeight = 0;

// [통일된 월드 공간 스케일 세팅]
const MAX_WORLD_X = 180;   // 최대 전진 거리 180m
const MAX_WORLD_Y = 30;    // 최대 높이 30m
const MAX_WORLD_Z = 15;    // 좌우 최대 관측 편차 범위 (±15m)
const TARGET_SLANT_R = 145; // 사대 0점부터 과녁 바닥 전면까지의 고정 경사 거리 (145m 부동)

// 국궁 표준 과녁 물리 제원 및 수직 투영 보정
const TGT_W = 2.0;         // 가로 2m
const TGT_H = 2.667;       // 실제 사선 세로 길이 2.667m
const TGT_D = 0.5;         // 두께 0.5m
const TGT_TILT = 15 * Math.PI / 180; // 뒤로 15도 기울어짐 (라디안)
const TGT_PROJ_H = TGT_H * Math.cos(TGT_TILT); // 정면/측면에서 보이는 수직 투영 높이 = 정확히 2.58m

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

let flightMetrics = {
    maxDistance: 0,
    maxHeight: 0,
    sideDeviation: 0,
    flightTime: 0,
    impactVelocity: 0,
    impactEnergy: 0
};

let targetHitMetrics = {
    isHit: false,      
    localZ: 0,         
    localY: 0          
};

let hasReachedTargetX = false;
let hasReachedTargetY = false;
let hasIntersectedTargetPlane = false; 

const ORIGIN_X_OFFSET = 35; 
const GROUND_Y_OFFSET = 30; 

// 과녁 고도차를 '과녁 바닥'의 높이로 취급
function getDynamicTargetGeometry() {
    const targetHInput = parseFloat(document.getElementById('targetHeight').value);
    const targetH = isNaN(targetHInput) ? 0 : targetHInput;
    const safeTargetH = Math.min(targetH, TARGET_SLANT_R - 0.1);
    const targetBaseX = Math.sqrt(Math.pow(TARGET_SLANT_R, 2) - Math.pow(safeTargetH, 2));
    return { baseX: targetBaseX, height: safeTargetH };
}

function fireArrow() {
    if (isFlying) cancelAnimationFrame(animationFrameId);
    if (typeof saveSettings === 'function') saveSettings();

    const v0 = parseFloat(document.getElementById('velocity').value) || 50;
    const angleDeg = parseFloat(document.getElementById('angle').value) || 0;
    const yawDeg = parseFloat(document.getElementById('yawAngle').value) || 0;
    const launchH = parseFloat(document.getElementById('launchHeight').value) || 1.5;

    const pitchRad = (angleDeg * Math.PI) / 180;
    const yawRad = (yawDeg * Math.PI) / 180;

    arrowState.x = 0; 
    arrowState.y = launchH; 
    arrowState.z = 0;
    
    arrowState.vx = v0 * Math.cos(pitchRad) * Math.cos(yawRad);
    arrowState.vy = v0 * Math.sin(pitchRad);
    arrowState.vz = v0 * Math.cos(pitchRad) * Math.sin(yawRad);
    
    arrowState.pitch = pitchRad; 
    arrowState.yaw = yawRad;

    flightMetrics = { maxDistance: 0, maxHeight: launchH, sideDeviation: 0, flightTime: 0, impactVelocity: v0, impactEnergy: 0 };
    targetHitMetrics = { isHit: false, localZ: 0, localY: 0 };
    hasReachedTargetX = false;
    hasReachedTargetY = false;
    hasIntersectedTargetPlane = false;
    
    updateResultUI();
    trajectory = [{ x: arrowState.x, y: arrowState.y, z: arrowState.z }];
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
    const windZ = parseFloat(document.getElementById('windY').value) || 0; 

    const g = 9.81; const dt = 0.016; const area = Math.PI * Math.pow(d / 2, 2); 
    const tgtGeo = getDynamicTargetGeometry();
    const targetBaseX = tgtGeo.baseX; const targetH = tgtGeo.height;   

    const relVx = arrowState.vx - windX; const relVy = arrowState.vy; const relVz = arrowState.vz - windZ;
    const vRel = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz) || 0.001;

    const flowPitch = Math.atan2(relVy, Math.sqrt(relVx * relVx + relVz * relVz));
    const flowYaw = Math.atan2(relVz, relVx);
    const attackAngle = arrowState.pitch - flowPitch;

    const effectiveArea = area * 2.5; 
    const dynamicLiftCoeff = 2.0 * Math.sin(attackAngle) * Math.cos(attackAngle);
    const dragF = 0.5 * rho * vRel * vRel * cd * effectiveArea;
    const liftF = 0.5 * rho * vRel * vRel * (cl + dynamicLiftCoeff) * effectiveArea;

    const dragAx = (-dragF * Math.cos(flowPitch) * Math.cos(flowYaw)) / m;
    const dragAy = (-dragF * Math.sin(flowPitch)) / m;
    const dragAz = (-dragF * Math.cos(flowPitch) * Math.sin(flowYaw)) / m;
    const liftAx = (-liftF * Math.sin(flowPitch) * Math.cos(flowYaw)) / m;
    const liftAy = (liftF * Math.cos(flowPitch)) / m;
    const liftAz = (-liftF * Math.sin(flowPitch) * Math.sin(flowYaw)) / m;

    const ax = dragAx + liftAx; const ay = -g + dragAy + liftAy; const az = dragAz + liftAz;
    const prevX = arrowState.x; const prevY = arrowState.y; const prevZ = arrowState.z;

    arrowState.vx += ax * dt; arrowState.vy += ay * dt; arrowState.vz += az * dt;
    arrowState.x += arrowState.vx * dt; arrowState.y += arrowState.vy * dt; arrowState.z += arrowState.vz * dt;

    arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vz * arrowState.vz));
    arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);
    trajectory.push({ x: arrowState.x, y: arrowState.y, z: arrowState.z });

    if (!hasReachedTargetX) { flightMetrics.flightTime += dt; }
    if (arrowState.y > flightMetrics.maxHeight) { flightMetrics.maxHeight = arrowState.y; }

    const nx = Math.cos(TGT_TILT); const ny = Math.sin(TGT_TILT);
    const distPrev = nx * (prevX - targetBaseX) + ny * (prevY - targetH);
    const distCurr = nx * (arrowState.x - targetBaseX) + ny * (arrowState.y - targetH);

    if (!hasIntersectedTargetPlane && distPrev * distCurr <= 0 && prevX < arrowState.x) {
        hasIntersectedTargetPlane = true;
        const s = Math.abs(distPrev) / (Math.abs(distPrev) + Math.abs(distCurr));
        const interY = prevY + (arrowState.y - prevY) * s;
        const interZ = prevZ + (arrowState.z - prevZ) * s;
        const centerWorldY = targetH + (TGT_H / 2) * Math.cos(TGT_TILT);

        targetHitMetrics.localZ = interZ;
        targetHitMetrics.localY = (interY - centerWorldY) / Math.cos(TGT_TILT);

        if (Math.abs(targetHitMetrics.localZ) <= TGT_W / 2 && Math.abs(targetHitMetrics.localY) <= TGT_H / 2) {
            targetHitMetrics.isHit = true;
        } else {
            targetHitMetrics.isHit = false;
        }
    }

    if (!hasReachedTargetX && arrowState.x >= targetBaseX) { hasReachedTargetX = true; }
    if (!hasReachedTargetY && arrowState.vy <= 0 && prevY >= targetH && arrowState.y <= targetH) {
        hasReachedTargetY = true;
        const t = (prevY - targetH) / (prevY - arrowState.y);
        flightMetrics.maxDistance = prevX + (arrowState.x - prevX) * t;
        flightMetrics.sideDeviation = prevZ + (arrowState.z - prevZ) * t;
        const vFinal = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactVelocity = vFinal; flightMetrics.impactEnergy = 0.5 * m * vFinal * vFinal;
    }

    if (!hasReachedTargetY) {
        flightMetrics.maxDistance = arrowState.x; flightMetrics.sideDeviation = arrowState.z;
        const vCurrent = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactVelocity = vCurrent; flightMetrics.impactEnergy = 0.5 * m * vCurrent * vCurrent;
    }

    // 지면 충돌 혹은 월드 경계 이탈 시 비행 종료 조건 판정
    if (arrowState.y <= 0 || arrowState.x > MAX_WORLD_X) {
        isFlying = false;
        updateResultUI();
        drawScene();
        return;
    }

    updateResultUI();
    drawScene();
    animationFrameId = requestAnimationFrame(animate);
}
// 과녁 객체 드로잉 파트
if (currentView === 'side') {
    const fBottom = toScreen(targetBaseX, safeTargetH, 0);
    const frontTopX = targetBaseX + TGT_H * Math.sin(TGT_TILT); 
    const frontTopY = safeTargetH + TGT_PROJ_H;
    const fTop = toScreen(frontTopX, frontTopY, 0);
    
    const thickX = TGT_D * Math.cos(TGT_TILT); 
    const thickY = -TGT_D * Math.sin(TGT_TILT);
    const bBottom = toScreen(targetBaseX + thickX, safeTargetH + thickY, 0); 
    const bTop = toScreen(frontTopX + thickX, frontTopY + thickY, 0);
    
    ctx.fillStyle = '#e5e5ea'; 
    ctx.beginPath(); 
    ctx.moveTo(fBottom.x, fBottom.y); 
    ctx.lineTo(fTop.x, fTop.y); 
    ctx.lineTo(bTop.x, bTop.y); 
    ctx.lineTo(bBottom.x, bBottom.y); 
    ctx.closePath(); 
    ctx.fill();
    
    ctx.strokeStyle = '#1d1d1f'; 
    ctx.lineWidth = 1; 
    ctx.stroke();
    
    ctx.strokeStyle = '#1d1d1f'; 
    ctx.lineWidth = 3; 
    ctx.beginPath(); 
    ctx.moveTo(fBottom.x, fBottom.y); 
    ctx.lineTo(fTop.x, fTop.y); 
    ctx.stroke();

} else if (currentView === 'front') {
    const leftX = toScreen(targetBaseX, safeTargetH, -TGT_W / 2).x; 
    const rightX = toScreen(targetBaseX, safeTargetH, TGT_W / 2).x;
    const bottomY = toScreen(targetBaseX, safeTargetH, 0).y; 
    const topY = toScreen(targetBaseX, safeTargetH + TGT_PROJ_H, 0).y;
    
    const w = rightX - leftX; 
    const h = bottomY - topY;
    
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(leftX, topY, w, h);
    
    ctx.strokeStyle = '#1d1d1f'; 
    ctx.lineWidth = 1.5; 
    ctx.strokeRect(leftX, topY, w, h);
    
    ctx.fillStyle = '#1d1d1f'; 
    ctx.fillRect(leftX + w * 0.1, topY + h * 0.08, w * 0.8, h * 0.15);
    ctx.fillRect(leftX + w * 0.1, topY + h * 0.3, w * 0.8, h * 0.62);
    
    ctx.fillStyle = '#ff3b30'; 
    ctx.beginPath(); 
    ctx.arc(leftX + w * 0.5, (topY + h * 0.3) + (h * 0.62) * 0.5, w * 0.23, 0, Math.PI * 2); 
    ctx.fill();

} else if (currentView === 'top') {
    const projTopX = targetBaseX + TGT_H * Math.sin(TGT_TILT); 
    const thickX = TGT_D * Math.cos(TGT_TILT);
    
    const fLeftBot = toScreen(targetBaseX, safeTargetH, -TGT_W / 2); 
    const fRightBot = toScreen(targetBaseX, safeTargetH, TGT_W / 2);
    const bLeftTop = toScreen(projTopX + thickX, safeTargetH, -TGT_W / 2); 
    const bRightTop = toScreen(projTopX + thickX, safeTargetH, TGT_W / 2);
    
    ctx.fillStyle = '#ffffff'; 
    ctx.beginPath(); 
    ctx.moveTo(fLeftBot.x, fLeftBot.y); 
    ctx.lineTo(fRightBot.x, fRightBot.y); 
    ctx.lineTo(bRightTop.x, bRightTop.y); 
    ctx.lineTo(bLeftTop.x, bLeftTop.y); 
    ctx.closePath(); 
    ctx.fill();
    
    ctx.strokeStyle = '#1d1d1f'; 
    ctx.lineWidth = 1.5; 
    ctx.stroke();

} else if (currentView === 'target') {
    const tLeftX = (dprWidth / 2) - (TGT_W / 2 * targetViewScale); 
    const tRightX = (dprWidth / 2) + (TGT_W / 2 * targetViewScale);
    const tBottomY = dprHeight * 0.65; 
    const tTopY = tBottomY - (TGT_PROJ_H * targetViewScale);
    
    const w = tRightX - tLeftX; 
    const h = tBottomY - tTopY;
    
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(tLeftX, tTopY, w, h);
    
    ctx.strokeStyle = '#1d1d1f'; 
    ctx.lineWidth = 2; 
    ctx.strokeRect(tLeftX, tTopY, w, h);
    
    ctx.fillStyle = '#1d1d1f'; 
    ctx.fillRect(tLeftX + w * 0.1, tTopY + h * 0.08, w * 0.8, h * 0.15);
    ctx.fillRect(tLeftX + w * 0.1, tTopY + h * 0.3, w * 0.8, h * 0.62);
    
    ctx.fillStyle = '#ff3b30'; 
    ctx.beginPath(); 
    ctx.arc(tLeftX + w * 0.5, (tTopY + h * 0.3) + (h * 0.62) * 0.5, w * 0.23, 0, Math.PI * 2); 
    ctx.fill();
    
    if (hasIntersectedTargetPlane) {
        const localYFromBottom = targetHitMetrics.localY + (TGT_PROJ_H / 2);
        const markerX = (dprWidth / 2) + (targetHitMetrics.localZ * targetViewScale);
        const markerY = tBottomY - (localYFromBottom * targetViewScale);
        
        if (targetHitMetrics.isHit) {
            ctx.fillStyle = '#34c759'; 
            ctx.strokeStyle = 'rgba(52, 199, 89, 0.4)'; 
            ctx.lineWidth = 8;
            ctx.beginPath(); 
            ctx.arc(markerX, markerY, 6, 0, Math.PI * 2); 
            ctx.stroke(); 
            ctx.fill();
            
            ctx.fillStyle = '#34c759'; 
            ctx.font = 'bold 13px -apple-system'; 
            ctx.textAlign = 'center'; 
            ctx.fillText("🎯 관중 (HIT!)", dprWidth / 2, tTopY - 14);
        } else {
            ctx.fillStyle = '#ff3b30'; 
            ctx.strokeStyle = 'rgba(255, 59, 48, 0.3)'; 
            ctx.lineWidth = 6;
            ctx.beginPath(); 
            ctx.arc(markerX, markerY, 5, 0, Math.PI * 2); 
            ctx.stroke(); 
            ctx.fill();
            
            ctx.fillStyle = '#ff3b30'; 
            ctx.font = 'bold 12px -apple-system'; 
            ctx.textAlign = 'center';
            ctx.fillText(`❌ 탈타 (오차: 좌우 ${targetHitMetrics.localZ.toFixed(2)}m, 바닥높이 ${localYFromBottom.toFixed(2)}m)`, dprWidth / 2, tTopY - 14);
        }
    }
}

if (currentView === 'side' || currentView === 'front') {
    const tgtFloor = toScreen(targetBaseX, 0, 0); 
    const tgtBasePos = toScreen(targetBaseX, safeTargetH, 0);
    
    ctx.strokeStyle = '#515154'; 
    ctx.lineWidth = 2; 
    
    ctx.beginPath(); 
    ctx.moveTo(tgtBasePos.x, tgtBasePos.y); 
    ctx.lineTo(tgtBasePos.x, tgtFloor.y); 
    ctx.stroke();
}

// 누적 비행 궤적선 그리기 (toScreen 공식 완벽 적용)
if (currentView !== 'target' && trajectory.length > 1) {
    ctx.strokeStyle = '#0071e3'; 
    ctx.lineWidth = 2.5; 
    
    ctx.beginPath();
    const start = toScreen(trajectory[0].x, trajectory[0].y, trajectory[0].z);
    ctx.moveTo(start.x, start.y);
    
    for (let i = 1; i < trajectory.length; i++) {
        const pt = toScreen(trajectory[i].x, trajectory[i].y, trajectory[i].z);
        ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
}
