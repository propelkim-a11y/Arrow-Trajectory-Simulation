const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

let dprWidth = 0;
let dprHeight = 0;

// 고정할 3차원 월드 공간 최대 크기 및 국궁 과녁 규격 정의
const MAX_WORLD_X = 160;   // 최대 거리 160m
const MAX_WORLD_Y = 40;    // 최대 높이 40m
const TARGET_SLANT_R = 145; // [수정] 사대 0점부터 과녁 바닥 전면까지의 고정 '실제 경사 거리' (145m 부동)

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

    arrowState.vx += ax * dt; 
    arrowState.vy += ay * dt; 
    arrowState.vz += az * dt;
    
    arrowState.x += arrowState.vx * dt; 
    arrowState.y += arrowState.vy * dt; 
    arrowState.z += arrowState.vz * dt;

    arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vz * arrowState.vz));
    arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);

    trajectory.push({ x: arrowState.x, y: arrowState.y, z: arrowState.z });

    flightMetrics.flightTime += dt;
    flightMetrics.maxDistance = arrowState.x;    
    flightMetrics.sideDeviation = arrowState.z;   

    if (arrowState.y > flightMetrics.maxHeight) {
        flightMetrics.maxHeight = arrowState.y; 
    }

    const vCurrent = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
    flightMetrics.impactVelocity = vCurrent;
    flightMetrics.impactEnergy = 0.5 * m * vCurrent * vCurrent;

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
    
    const targetH = parseFloat(document.getElementById('targetHeight').value) || 0;

    // [중요] 원호 공식 반영: 경사거리 145m를 유지하기 위한 동적 수평 거리(X) 계산
    // 허수 에러 방지를 위해 고도차가 145m를 넘지 않도록 Math.min 제한 추가
    const safeTargetH = Math.min(targetH, TARGET_SLANT_R - 0.1);
    const targetBaseX = Math.sqrt(Math.pow(TARGET_SLANT_R, 2) - Math.pow(safeTargetH, 2));

    const availableWidth = dprWidth - ORIGIN_X_OFFSET - 80;
    const availableHeight = dprHeight - GROUND_Y_OFFSET - 20;

    const scaleX = availableWidth / MAX_WORLD_X;
    const scaleY = availableHeight / MAX_WORLD_Y;

    function toScreen(pX, pY, pZ) {
        if (currentView === 'side') { 
            return { 
                x: ORIGIN_X_OFFSET + (pX * scaleX), 
                y: dprHeight - GROUND_Y_OFFSET - (pY * scaleY) 
            };
        }
        if (currentView === 'top') {  
            return { 
                x: ORIGIN_X_OFFSET + (pX * scaleX), 
                y: (dprHeight / 2) + (pZ * scaleX) 
            };
        }
        return { 
            x: (dprWidth / 2) + (pZ * scaleY), 
            y: dprHeight - GROUND_Y_OFFSET - (pY * scaleY) 
        };
    }

    // 눈금선 및 텍스트 렌더링
    if (currentView === 'side') {
        ctx.strokeStyle = '#e5e5ea'; ctx.lineWidth = 1; ctx.font = '10px -apple-system'; ctx.fillStyle = '#8e8e93';
        for (let xMeters = 0; xMeters <= MAX_WORLD_X; xMeters += 20) {
            let scrX = ORIGIN_X_OFFSET + (xMeters * scaleX);
            ctx.beginPath(); ctx.moveTo(scrX, 0); ctx.lineTo(scrX, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
            ctx.textAlign = 'center'; ctx.fillText(xMeters + 'm', scrX, dprHeight - GROUND_Y_OFFSET + 18);
        }
        for (let yMeters = 0; yMeters <= MAX_WORLD_Y; yMeters += 10) {
            let scrY = dprHeight - GROUND_Y_OFFSET - (yMeters * scaleY);
            ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, scrY); ctx.lineTo(dprWidth, scrY); ctx.stroke();
            ctx.textAlign = 'right'; ctx.fillText(yMeters + 'm', ORIGIN_X_OFFSET - 8, scrY + 3);
        }
        ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); ctx.lineTo(ORIGIN_X_OFFSET + (MAX_WORLD_X * scaleX), dprHeight - GROUND_Y_OFFSET); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, 0); ctx.lineTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
    } else {
        ctx.strokeStyle = '#86868b'; ctx.lineWidth = 1.5; ctx.beginPath();
        if (currentView === 'front') ctx.moveTo(0, dprHeight - GROUND_Y_OFFSET); else ctx.moveTo(0, dprHeight / 2);
        ctx.stroke();
    }

    ctx.lineWidth = 1.5;

    if (currentView === 'side') {
        // 동적 원호 거리가 반영된 바닥 좌표 바인딩
        const fBottom = toScreen(targetBaseX, safeTargetH, 0);
        
        const frontTopX = targetBaseX + TGT_H * Math.sin(TGT_TILT);
        const frontTopY = safeTargetH + TGT_H * Math.cos(TGT_TILT);
        const fTop = toScreen(frontTopX, frontTopY, 0);
        
        const thickX = TGT_D * Math.cos(TGT_TILT);
        const thickY = -TGT_D * Math.sin(TGT_TILT);
        
        const bBottom = toScreen(targetBaseX + thickX, safeTargetH + thickY, 0);
        const bTop = toScreen(frontTopX + thickX, frontTopY + thickY, 0);

        // 입체 단면 폴리곤 그리기 (과녁 내부 회색 채우기)
        ctx.fillStyle = '#e5e5ea';
        ctx.beginPath(); 
        ctx.moveTo(fBottom.x, fBottom.y); 
        ctx.lineTo(fTop.x, fTop.y); 
        ctx.lineTo(bTop.x, bTop.y); 
        ctx.lineTo(bBottom.x, bBottom.y); 
        ctx.closePath(); 
        ctx.fill();

        // 테두리 외곽선 강조 (정면은 빨간색 과녁판 표시)
        ctx.strokeStyle = '#1d1d1f';
        ctx.beginPath(); 
        ctx.moveTo(fTop.x, fTop.y); 
        ctx.lineTo(bTop.x, bTop.y); 
        ctx.lineTo(bBottom.x, bBottom.y); 
        ctx.lineTo(fBottom.x, fBottom.y); 
        ctx.stroke();

        ctx.strokeStyle = '#ff3b30'; 
        ctx.lineWidth = 3;
        ctx.beginPath(); 
        ctx.moveTo(fBottom.x, fBottom.y); 
        ctx.lineTo(fTop.x, fTop.y); 
        ctx.stroke();
        ctx.lineWidth = 1.5;

    } else if (currentView === 'front') {
        // 2. 정면 뷰포트: 경사 투영으로 세로가 약간 압축되어 보임 (TGT_H * cos(15도))
        const projH = TGT_H * Math.cos(TGT_TILT);
        const tgtCenter = toScreen(targetBaseX, safeTargetH, 0);
        
        const leftX = toScreen(targetBaseX, safeTargetH, -TGT_W / 2).x;
        const rightX = toScreen(targetBaseX, safeTargetH, TGT_W / 2).x;
        const topY = toScreen(targetBaseX, safeTargetH + projH, 0).y;
        const bottomY = tgtCenter.y;

        ctx.fillStyle = '#ffffff'; 
        ctx.fillRect(leftX, topY, rightX - leftX, bottomY - topY);
        
        ctx.strokeStyle = '#ff3b30'; 
        ctx.lineWidth = 4; 
        ctx.strokeRect(leftX, topY, rightX - leftX, bottomY - topY);
        
        ctx.fillStyle = '#ff3b30'; 
        ctx.beginPath(); 
        ctx.arc((leftX + rightX) / 2, (topY + bottomY) / 2, 10, 0, Math.PI * 2); 
        ctx.fill();
        ctx.lineWidth = 1.5;

    } else if (currentView === 'top') {
        // 3. 평면 뷰포트: 위에서 바라본 입체 직사각형 투영 (두께 및 경사 상단 투영)
        const projTopX = targetBaseX + TGT_H * Math.sin(TGT_TILT);
        const thickX = TGT_D * Math.cos(TGT_TILT);
        
        const fLeftBot = toScreen(targetBaseX, safeTargetH, -TGT_W / 2);
        const fRightBot = toScreen(targetBaseX, safeTargetH, TGT_W / 2);
        const bLeftTop = toScreen(projTopX + thickX, safeTargetH, -TGT_W / 2);
        const bRightTop = toScreen(projTopX + thickX, safeTargetH, TGT_W / 2);

        ctx.fillStyle = '#d1d1d6';
        ctx.beginPath(); 
        ctx.moveTo(fLeftBot.x, fLeftBot.y); 
        ctx.lineTo(fRightBot.x, fRightBot.y); 
        ctx.lineTo(bRightTop.x, bRightTop.y); 
        ctx.lineTo(bLeftTop.x, bLeftTop.y); 
        ctx.closePath(); 
        ctx.fill();
        
        ctx.strokeStyle = '#1d1d1f'; 
        ctx.stroke();
    }

    // 과녁 지면 고정용 수직 지지대 (정면 및 측면 전용)
    if (currentView === 'side' || currentView === 'front') {
        const tgtFloor = toScreen(targetBaseX, 0, 0); // 동일 수평선상의 지면(Y=0)
        const tgtBasePos = toScreen(targetBaseX, safeTargetH, 0);
        
        ctx.strokeStyle = '#515154'; 
        ctx.lineWidth = 2; 
        ctx.beginPath();
        ctx.moveTo(tgtBasePos.x, tgtBasePos.y);
        ctx.lineTo(tgtBasePos.x, tgtFloor.y);
        ctx.stroke();
    }

    // 누적 비행 궤적 그리기
    if (trajectory.length > 1) {
        ctx.strokeStyle = '#0071e3'; 
        ctx.lineWidth = 2.5; 
        ctx.beginPath();
        
        const start = toScreen(trajectory.x, trajectory.y, trajectory.z);
        ctx.moveTo(start.x, start.y);
        
        for (let i = 1; i < trajectory.length; i++) {
            const pt = toScreen(trajectory[i].x, trajectory[i].y, trajectory[i].z);
            ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
    }

    // 현재 프레임의 실시간 화살 오브젝트 그래픽 드로잉
    const arrowPos = toScreen(arrowState.x, arrowState.y, arrowState.z);
    ctx.save();
    ctx.translate(arrowPos.x, arrowPos.y);
    
    let angleRad = 0;
    if (currentView === 'side') angleRad = -arrowState.pitch;
    else if (currentView === 'top') angleRad = arrowState.yaw;
    ctx.rotate(angleRad);
    
    ctx.strokeStyle = '#515154'; 
    ctx.lineWidth = 2; 
    ctx.beginPath(); 
    ctx.moveTo(-20, 0); 
    ctx.lineTo(0, 0); 
    ctx.stroke();
    
    ctx.fillStyle = '#1d1d1f'; 
    ctx.beginPath(); 
    ctx.moveTo(0, 0); 
    ctx.lineTo(-6, -3); 
    ctx.lineTo(-6, 3); 
    ctx.closePath(); 
    ctx.fill();
    
    ctx.fillStyle = '#ff9500'; 
    ctx.beginPath(); 
    ctx.moveTo(-20, 0); 
    ctx.lineTo(-16, -4); 
    ctx.lineTo(-10, -4); 
    ctx.lineTo(-14, 0); 
    ctx.fill();
    ctx.restore();
}

setTimeout(() => {
    if (typeof loadSettings === 'function') loadSettings();
    resizeCanvas();
    const launchH = parseFloat(document.getElementById('launchHeight').value) || 1.5;
    arrowState.x = 0; 
    arrowState.y = launchH; 
    arrowState.z = 0;
    arrowState.pitch = (parseFloat(document.getElementById('angle').value) || 30) * Math.PI / 180;
    arrowState.yaw = (parseFloat(document.getElementById('yawAngle').value) || 0) * Math.PI / 180;
    drawScene();
}, 250);
