// =========================================================================
// [최종 교정본] physics.js - 전체 소스 코드
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

// 국궁 표준 과녁 물리 제원
const TGT_W = 2.0;         // 가로 2m
const TGT_H = 2.667;       // 세로 2.667m
const TGT_D = 0.5;         // 두께 0.5m
const TGT_TILT = 15 * Math.PI / 180; // 뒤로 15도 기울어짐 (라디안)

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

// 과녁 무한 연장 평면 투영용 2D 오프셋 저장 객체
let targetHitMetrics = {
    isHit: false,      // 실제 2m x 2.667m 나무 틀 내부에 적중했는지 여부
    localZ: 0,         // 과녁 정중앙(홍심) 기준 좌우 편차 (m)
    localY: 0          // 과녁 정중앙(홍심) 기준 상하 편차 (m)
};

let hasReachedTargetX = false;
let hasReachedTargetY = false;
let hasIntersectedTargetPlane = false; 

const ORIGIN_X_OFFSET = 35; 
const GROUND_Y_OFFSET = 30; 

// [기준 정립] 사용자 정의에 맞춰 과녁 고도차를 '과녁 바닥'의 높이로 취급
function getDynamicTargetGeometry() {
    const targetH = parseFloat(document.getElementById('targetHeight').value) || 0;
    // 과격 고도가 145m를 넘지 않도록 안전 제한
    const safeTargetH = Math.min(targetH, TARGET_SLANT_R - 0.1);
    // 사대 원점에서 '과녁 바닥'까지의 경사거리가 145m이므로 수평거리 자동 역산
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

    flightMetrics = { 
        maxDistance: 0, 
        maxHeight: launchH, 
        sideDeviation: 0, 
        flightTime: 0, 
        impactVelocity: v0, 
        impactEnergy: 0 
    };
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

    const g = 9.81; 
    const dt = 0.016; 
    const area = Math.PI * Math.pow(d / 2, 2); 

    const tgtGeo = getDynamicTargetGeometry();
    const targetBaseX = tgtGeo.baseX; // 과녁 바닥의 월드 X
    const targetH = tgtGeo.height;   // 과녁 바닥의 월드 Y

    const relVx = arrowState.vx - windX; 
    const relVy = arrowState.vy; 
    const relVz = arrowState.vz - windZ;
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

    const ax = dragAx + liftAx;
    const ay = -g + dragAy + liftAy;
    const az = dragAz + liftAz;

    const prevX = arrowState.x;
    const prevY = arrowState.y;
    const prevZ = arrowState.z;

    arrowState.vx += ax * dt; 
    arrowState.vy += ay * dt; 
    arrowState.vz += az * dt;
    
    arrowState.x += arrowState.vx * dt; 
    arrowState.y += arrowState.vy * dt; 
    arrowState.z += arrowState.vz * dt;

    arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vz * arrowState.vz));
    arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);

    trajectory.push({ x: arrowState.x, y: arrowState.y, z: arrowState.z });

    if (!hasReachedTargetX) {
        flightMetrics.flightTime += dt; 
    }
    if (arrowState.y > flightMetrics.maxHeight) {
        flightMetrics.maxHeight = arrowState.y; 
    }

    // [물리 연산 보정] 과녁 바닥면(targetBaseX, targetH)을 기준으로 15도 평면 방정식 재수립
    const nx = Math.cos(TGT_TILT);
    const ny = Math.sin(TGT_TILT);

    const distPrev = nx * (prevX - targetBaseX) + ny * (prevY - targetH);
    const distCurr = nx * (arrowState.x - targetBaseX) + ny * (arrowState.y - targetH);

    if (!hasIntersectedTargetPlane && distPrev * distCurr <= 0 && prevX < arrowState.x) {
        hasIntersectedTargetPlane = true;

        const s = Math.abs(distPrev) / (Math.abs(distPrev) + Math.abs(distCurr));
        const interY = prevY + (arrowState.y - prevY) * s;
        const interZ = prevZ + (arrowState.z - prevZ) * s;

        // [중요] 과녁 정중앙(홍심)의 물리적 위치는 '과녁 바닥'에서 빗변(TGT_H / 2)만큼 올라간 곳
        const centerWorldY = targetH + (TGT_H / 2) * Math.cos(TGT_TILT);

        const localZ = interZ; 
        const localY = (interY - centerWorldY) / Math.cos(TGT_TILT); 

        targetHitMetrics.localZ = localZ;
        targetHitMetrics.localY = localY;

        // 실제 과녁 범위 판정 (가로 ±1m, 세로 ±1.3335m)
        if (Math.abs(localZ) <= TGT_W / 2 && Math.abs(localY) <= TGT_H / 2) {
            targetHitMetrics.isHit = true;
        } else {
            targetHitMetrics.isHit = false;
        }
    }

    if (!hasReachedTargetX && arrowState.x >= targetBaseX) {
        hasReachedTargetX = true;
    }

    if (!hasReachedTargetY && arrowState.vy <= 0 && prevY >= targetH && arrowState.y <= targetH) {
        hasReachedTargetY = true;
        
        const t = (prevY - targetH) / (prevY - arrowState.y);
        const exactX = prevX + (arrowState.x - prevX) * t;
        const exactZ = prevZ + (arrowState.z - prevZ) * t;

        flightMetrics.maxDistance = exactX;      
        flightMetrics.sideDeviation = exactZ;     
        
        const vFinal = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactVelocity = vFinal;
        flightMetrics.impactEnergy = 0.5 * m * vFinal * vFinal;
    }

    if (!hasReachedTargetY) {
        flightMetrics.maxDistance = arrowState.x;
        flightMetrics.sideDeviation = arrowState.z;
        const vCurrent = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactVelocity = vCurrent;
        flightMetrics.impactEnergy = 0.5 * m * vCurrent * vCurrent;
    }

    updateResultUI();

    if (arrowState.y <= 0) { 
        arrowState.y = 0; 
        isFlying = false; 
        updateResultUI();
    }
    if (arrowState.x > MAX_WORLD_X || arrowState.x < -10) {
        isFlying = false;
    }

    drawScene();
    if (isFlying) {
        animationFrameId = requestAnimationFrame(animate);
    }
}

function updateResultUI() {
    const resDist = document.getElementById('resMaxDist');
    const resHeight = document.getElementById('resMaxHeight');
    const resSide = document.getElementById('resSideDev');
    const resTime = document.getElementById('resFlightTime');
    const resVel = document.getElementById('resImpactVel');
    const resEnergy = document.getElementById('resImpactEnergy');

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
    const targetBaseX = tgtGeo.baseX;
    const safeTargetH = tgtGeo.height;

    const availW = dprWidth - ORIGIN_X_OFFSET - 10;
    const availH = dprHeight - GROUND_Y_OFFSET - 10;

    const scaleX = availW / MAX_WORLD_X;
    const scaleY = availH / MAX_WORLD_Y;

    const topScaleForward = (dprHeight - 40) / MAX_WORLD_X;
    const topScaleSide = (dprWidth - 20) / (MAX_WORLD_Z * 2);

    const frontScaleZ = (dprWidth - ORIGIN_X_OFFSET - 20) / (MAX_WORLD_Z * 2);
    const frontScaleY = availH / MAX_WORLD_Y;

    const targetViewScale = Math.min(dprWidth / 4.0, dprHeight / 4.0);

    function toScreen(pX, pY, pZ) {
        if (currentView === 'side') {
            return { x: ORIGIN_X_OFFSET + (pX * scaleX), y: dprHeight - GROUND_Y_OFFSET - (pY * scaleY) };
        }
        if (currentView === 'top') {
            return { x: (dprWidth / 2) + (pZ * topScaleSide), y: dprHeight - 25 - (pX * topScaleForward) };
        }
        if (currentView === 'front') {
            return { x: ORIGIN_X_OFFSET + (dprWidth - ORIGIN_X_OFFSET - 20) / 2 + (pZ * frontScaleZ), y: dprHeight - GROUND_Y_OFFSET - (pY * frontScaleY) };
        }
        if (currentView === 'target') {
            return { x: (dprWidth / 2) + (pZ * targetViewScale), y: (dprHeight / 2) - (pY * targetViewScale) };
        }
        return { x: 0, y: 0 };
    }

    // 눈금선 레이아웃
    ctx.strokeStyle = '#e5e5ea'; ctx.lineWidth = 1; ctx.font = '10px -apple-system'; ctx.fillStyle = '#8e8e93';

    if (currentView === 'side') {
        for (let xMeters = 0; xMeters <= MAX_WORLD_X; xMeters += 20) {
            let scrX = ORIGIN_X_OFFSET + (xMeters * scaleX);
            ctx.beginPath(); ctx.moveTo(scrX, 0); ctx.lineTo(scrX, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
            ctx.textAlign = 'center'; ctx.fillText(xMeters + 'm', scrX, dprHeight - GROUND_Y_OFFSET + 14);
        }
        for (let yMeters = 0; yMeters <= MAX_WORLD_Y; yMeters += 5) {
            let scrY = dprHeight - GROUND_Y_OFFSET - (yMeters * scaleY);
            ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, scrY); ctx.lineTo(dprWidth, scrY); ctx.stroke();
            ctx.textAlign = 'right'; ctx.fillText(yMeters + 'm', ORIGIN_X_OFFSET - 5, scrY + 3);
        }
        ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); ctx.lineTo(ORIGIN_X_OFFSET + (MAX_WORLD_X * scaleX), dprHeight - GROUND_Y_OFFSET); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, 0); ctx.lineTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); ctx.stroke();

    } else if (currentView === 'top') {
        for (let xMeters = 0; xMeters <= MAX_WORLD_X; xMeters += 20) {
            let scrY = dprHeight - 25 - (xMeters * topScaleForward);
            ctx.beginPath(); ctx.moveTo(0, scrY); ctx.lineTo(dprWidth, scrY); ctx.stroke();
            ctx.textAlign = 'left'; ctx.fillText(xMeters + 'm', 8, scrY - 4);
        }
        for (let zMeters = -MAX_WORLD_Z; zMeters <= MAX_WORLD_Z; zMeters += 5) {
            let scrX = (dprWidth / 2) + (zMeters * topScaleSide);
            ctx.beginPath(); ctx.moveTo(scrX, 0); ctx.lineTo(scrX, dprHeight); ctx.stroke();
            ctx.textAlign = 'center'; ctx.fillText(zMeters === 0 ? '중앙(0m)' : zMeters + 'm', scrX, dprHeight - 8);
        }
        ctx.strokeStyle = '#86868b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(dprWidth / 2, 0); ctx.lineTo(dprWidth / 2, dprHeight - 25); ctx.stroke();

    } else if (currentView === 'front') {
        const centerX = ORIGIN_X_OFFSET + (dprWidth - ORIGIN_X_OFFSET - 20) / 2;
        for (let zMeters = -MAX_WORLD_Z; zMeters <= MAX_WORLD_Z; zMeters += 5) {
            let scrX = centerX + (zMeters * frontScaleZ);
            ctx.beginPath(); ctx.moveTo(scrX, 0); ctx.lineTo(scrX, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
            ctx.textAlign = 'center'; ctx.fillText(zMeters === 0 ? '0m' : zMeters + 'm', scrX, dprHeight - GROUND_Y_OFFSET + 14);
        }
        for (let yMeters = 0; yMeters <= MAX_WORLD_Y; yMeters += 5) {
            let scrY = dprHeight - GROUND_Y_OFFSET - (yMeters * frontScaleY);
            ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, scrY); ctx.lineTo(dprWidth, scrY); ctx.stroke();
            ctx.textAlign = 'right'; ctx.fillText(yMeters + 'm', ORIGIN_X_OFFSET - 5, scrY + 3);
        }
        ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); ctx.lineTo(dprWidth, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, 0); ctx.lineTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
        ctx.strokeStyle = '#86868b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(centerX, 0); ctx.lineTo(centerX, dprHeight - GROUND_Y_OFFSET); ctx.stroke();

    } else if (currentView === 'target') {
        ctx.strokeStyle = '#e5e5ea'; ctx.lineWidth = 0.8;
        for (let lz = -2.0; lz <= 2.0; lz += 0.5) {
            let scrPos = toScreen(0, 0, lz);
            ctx.beginPath(); ctx.moveTo(scrPos.x, 0); ctx.lineTo(scrPos.x, dprHeight); ctx.stroke();
            ctx.fillStyle = '#8e8e93'; ctx.font = '9px -apple-system'; ctx.textAlign = 'center';
            ctx.fillText(lz === 0 ? '중앙' : lz.toFixed(1) + 'm', scrPos.x, dprHeight - 8);
        }
        for (let ly = -2.0; ly <= 2.0; ly += 0.5) {
            let scrPos = toScreen(0, ly, 0);
            ctx.beginPath(); ctx.moveTo(0, scrPos.y); ctx.lineTo(dprWidth, scrPos.y); ctx.stroke();
            ctx.fillStyle = '#8e8e93'; ctx.font = '9px -apple-system'; ctx.textAlign = 'right';
            ctx.fillText(ly === 0 ? '홍심' : (ly > 0 ? '+' : '') + ly.toFixed(1) + 'm', dprWidth - 8, scrPos.y + 3);
        }
        ctx.strokeStyle = '#86868b'; ctx.lineWidth = 1.2;
        let centerScr = toScreen(0, 0, 0);
        ctx.beginPath(); ctx.moveTo(centerScr.x, 0); ctx.lineTo(centerScr.x, dprHeight); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, centerScr.y); ctx.lineTo(dprWidth, centerScr.y); ctx.stroke();
    }
    
    ctx.lineWidth = 1.5;

    // 과녁 그리기 파트
    if (currentView === 'side') {
        // 과녁 바닥면 전면을 정확히 safeTargetH 고도선에 일치시킴
        const fBottom = toScreen(targetBaseX, safeTargetH, 0);
        const frontTopX = targetBaseX + TGT_H * Math.sin(TGT_TILT);
        const frontTopY = safeTargetH + TGT_H * Math.cos(TGT_TILT);
        const fTop = toScreen(frontTopX, frontTopY, 0);
        const thickX = TGT_D * Math.cos(TGT_TILT);
        const thickY = -TGT_D * Math.sin(TGT_TILT);
        const bBottom = toScreen(targetBaseX + thickX, safeTargetH + thickY, 0);
        const bTop = toScreen(frontTopX + thickX, frontTopY + thickY, 0);

        ctx.fillStyle = '#e5e5ea';
        ctx.beginPath(); ctx.moveTo(fBottom.x, fBottom.y); ctx.lineTo(fTop.x, fTop.y); ctx.lineTo(bTop.x, bTop.y); ctx.lineTo(bBottom.x, bBottom.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 1; ctx.stroke();

        ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(fBottom.x, fBottom.y); ctx.lineTo(fTop.x, fTop.y); ctx.stroke();

    } else if (currentView === 'front') {
        // 정면도에서 과녁 바닥을 safeTargetH 눈금선에 칼같이 정렬
        const projH = TGT_H * Math.cos(TGT_TILT);
        const leftX = toScreen(targetBaseX, safeTargetH, -TGT_W / 2).x;
        const rightX = toScreen(targetBaseX, safeTargetH, TGT_W / 2).x;
        const bottomY = toScreen(targetBaseX, safeTargetH, 0).y; // 바닥 높이 고정
        const topY = toScreen(targetBaseX, safeTargetH + projH, 0).y;
        
        const w = rightX - leftX;
        const h = bottomY - topY;

        ctx.fillStyle = '#ffffff'; ctx.fillRect(leftX, topY, w, h);
        ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 1.5; ctx.strokeRect(leftX, topY, w, h);

        const topBarH = h * 0.15;
        ctx.fillStyle = '#1d1d1f';
        ctx.fillRect(leftX + w * 0.1, topY + h * 0.08, w * 0.8, topBarH);

        const mainBoxTop = topY + h * 0.3;
        const mainBoxH = h * 0.62;
        ctx.fillRect(leftX + w * 0.1, mainBoxTop, w * 0.8, mainBoxH);

        // 홍심 드로잉
        const radius = w * 0.23;
        ctx.fillStyle = '#ff3b30'; ctx.beginPath();
        ctx.arc(leftX + w * 0.5, mainBoxTop + mainBoxH * 0.5, radius, 0, Math.PI * 2);
        ctx.fill();

    } else if (currentView === 'top') {
        const projTopX = targetBaseX + TGT_H * Math.sin(TGT_TILT);
        const thickX = TGT_D * Math.cos(TGT_TILT);
        const fLeftBot = toScreen(targetBaseX, safeTargetH, -TGT_W / 2);
        const fRightBot = toScreen(targetBaseX, safeTargetH, TGT_W / 2);
        const bLeftTop = toScreen(projTopX + thickX, safeTargetH, -TGT_W / 2);
        const bRightTop = toScreen(projTopX + thickX, safeTargetH, TGT_W / 2);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(fLeftBot.x, fLeftBot.y); ctx.lineTo(fRightBot.x, fRightBot.y); ctx.lineTo(bRightTop.x, bRightTop.y); ctx.lineTo(bLeftTop.x, bLeftTop.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 1.5; ctx.stroke();

    } else if (currentView === 'target') {
