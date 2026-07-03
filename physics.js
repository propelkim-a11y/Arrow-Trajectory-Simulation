const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

let dprWidth = 0;
let dprHeight = 0;

// [통일된 월드 공간 스케일 세팅]
const MAX_WORLD_X = 180;   // 최대 전진 거리 180m
const MAX_WORLD_Y = 30;    // 최대 높이 30m (정면도/측면도 공통)
const MAX_WORLD_Z = 15;    // 좌우 최대 관측 편차 범위 (±15m, 총 30m 폭)
const TARGET_SLANT_R = 145; // 사대 0점부터 과녁 바닥 전면까지의 고정 경사 거리 (145m 부동)

// 국궁 표준 과녁 물리 제원
const TGT_W = 2.0;         
const TGT_H = 2.667;       
const TGT_D = 0.5;         
const TGT_TILT = 15 * Math.PI / 180; 

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

// 실시간 조건 검사용 플래그 변수
let hasReachedTargetX = false;
let hasReachedTargetY = false;

// 자 눈금 화면 마진 설정
const ORIGIN_X_OFFSET = 35; 
const GROUND_Y_OFFSET = 30; 

function getDynamicTargetGeometry() {
    const targetH = parseFloat(document.getElementById('targetHeight').value) || 0;
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

    // 통계 및 플래그 초기화
    flightMetrics = { 
        maxDistance: 0, 
        maxHeight: launchH, 
        sideDeviation: 0, 
        flightTime: 0, 
        impactVelocity: v0, 
        impactEnergy: 0 
    };
    hasReachedTargetX = false;
    hasReachedTargetY = false;
    
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
    const targetBaseX = tgtGeo.baseX; // 원호 운동을 고려한 과녁 바닥의 실제 수평 거리
    const targetH = tgtGeo.height;   // 과녁 바닥의 실제 높이

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

    // 이전 위치 백업 (정밀 교차점 체크용)
    const prevX = arrowState.x;
    const prevY = arrowState.y;

    arrowState.vx += ax * dt; 
    arrowState.vy += ay * dt; 
    arrowState.vz += az * dt;
    
    arrowState.x += arrowState.vx * dt; 
    arrowState.y += arrowState.vy * dt; 
    arrowState.z += arrowState.vz * dt;

    arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vz * arrowState.vz));
    arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);

    trajectory.push({ x: arrowState.x, y: arrowState.y, z: arrowState.z });

    // 1. 공통 비행 시간 분초 누적 및 최대 고도 트래킹
    if (!hasReachedTargetX) {
        flightMetrics.flightTime += dt; 
    }
    if (arrowState.y > flightMetrics.maxHeight) {
        flightMetrics.maxHeight = arrowState.y; 
    }

    // 2. [요구사항 반영] 비행 시간 기록: 원호상 과녁 바닥 수평 거리(targetBaseX) 돌파 검증
    if (!hasReachedTargetX && arrowState.x >= targetBaseX) {
        hasReachedTargetX = true;
        // 보정 없이 돌파 순간의 현재 비행 누적 시간으로 고정 잠금
    }

    // 3. [요구사항 반영] 최대 거리 및 낙하 지표 기록: 과녁 바닥 높이(targetH) 선과 최초 교차 판정
    // 발사 초기 상승기(`vy > 0`)를 지나 하강기(`vy <= 0`)에 과녁 바닥 높이 라인 아래로 떨어지는 순간
    if (!hasReachedTargetY && arrowState.vy <= 0 && prevY >= targetH && arrowState.y <= targetH) {
        hasReachedTargetY = true;
        
        // 정밀한 위치 역산을 위한 선형 보정 비례 가중치(t) 구하기
        const t = (prevY - targetH) / (prevY - arrowState.y);
        const exactX = prevX + (arrowState.x - prevX) * t;
        const exactZ = prevX + (arrowState.z - prevX) * t; // 측면 편차도 연동 보정

        flightMetrics.maxDistance = exactX;      // 과녁 바닥 높이 기준 최종 수평 사거리
        flightMetrics.sideDeviation = exactZ;     // 과녁 바닥 높이 기준 최종 측면 편차
        
        const vFinal = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactVelocity = vFinal;
        flightMetrics.impactEnergy = 0.5 * m * vFinal * vFinal;
    }

    // 하단 결과창 계기판 실시간 렌더바인딩 (확정 플래그가 서기 전엔 현재 최고 도달 실시간 값 노출)
    if (!hasReachedTargetY) {
        flightMetrics.maxDistance = arrowState.x;
        flightMetrics.sideDeviation = arrowState.z;
        const vCurrent = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactVelocity = vCurrent;
        flightMetrics.impactEnergy = 0.5 * m * vCurrent * vCurrent;
    }

    updateResultUI();

    // 순수 지면(y <= 0) 충돌 시 물리 시뮬레이션 최종 완전 종료 처리
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

    function toScreen(pX, pY, pZ) {
        if (currentView === 'side') { 
            return { x: ORIGIN_X_OFFSET + (pX * scaleX), y: dprHeight - GROUND_Y_OFFSET - (pY * scaleY) };
        }
        if (currentView === 'top') {  
            return { x: (dprWidth / 2) + (pZ * topScaleSide), y: dprHeight - 25 - (pX * topScaleForward) };
        }
        return { x: ORIGIN_X_OFFSET + (dprWidth - ORIGIN_X_OFFSET - 20) / 2 + (pZ * frontScaleZ), y: dprHeight - GROUND_Y_OFFSET - (pY * frontScaleY) };
    }

    // 가이드 및 격자 라인 눈금선
    if (currentView === 'side') {
        ctx.strokeStyle = '#e5e5ea'; 
        ctx.lineWidth = 1; 
        ctx.font = '10px -apple-system'; 
        ctx.fillStyle = '#8e8e93';
        
        for (let xMeters = 0; xMeters <= MAX_WORLD_X; xMeters += 20) {
            let scrX = ORIGIN_X_OFFSET + (xMeters * scaleX);
            ctx.beginPath(); 
            ctx.moveTo(scrX, 0); 
            ctx.lineTo(scrX, dprHeight - GROUND_Y_OFFSET); 
            ctx.stroke();
            ctx.textAlign = 'center'; 
            ctx.fillText(xMeters + 'm', scrX, dprHeight - GROUND_Y_OFFSET + 14);
        }
        for (let yMeters = 0; yMeters <= MAX_WORLD_Y; yMeters += 5) {
            let scrY = dprHeight - GROUND_Y_OFFSET - (yMeters * scaleY);
            ctx.beginPath(); 
            ctx.moveTo(ORIGIN_X_OFFSET, scrY); 
            ctx.lineTo(dprWidth, scrY); 
            ctx.stroke();
            ctx.textAlign = 'right'; 
            ctx.fillText(yMeters + 'm', ORIGIN_X_OFFSET - 5, scrY + 3);
        }
        ctx.strokeStyle = '#1d1d1f'; 
        ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.moveTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); 
        ctx.lineTo(ORIGIN_X_OFFSET + (MAX_WORLD_X * scaleX), dprHeight - GROUND_Y_OFFSET); 
        ctx.stroke();
        ctx.beginPath(); 
        ctx.moveTo(ORIGIN_X_OFFSET, 0); 
        ctx.lineTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); 
        ctx.stroke();

    } else if (currentView === 'top') {
        ctx.strokeStyle = '#e5e5ea'; 
        ctx.lineWidth = 1; 
        ctx.font = '10px -apple-system'; 
        ctx.fillStyle = '#8e8e93';
        
        for (let xMeters = 0; xMeters <= MAX_WORLD_X; xMeters += 20) {
            let scrY = dprHeight - 25 - (xMeters * topScaleForward);
            ctx.beginPath(); 
            ctx.moveTo(0, scrY); 
            ctx.lineTo(dprWidth, scrY); 
            ctx.stroke();
            ctx.textAlign = 'left'; 
            ctx.fillText(xMeters + 'm', 8, scrY - 4);
        }
        for (let zMeters = -MAX_WORLD_Z; zMeters <= MAX_WORLD_Z; zMeters += 5) {
            let scrX = (dprWidth / 2) + (zMeters * topScaleSide);
            ctx.beginPath(); 
            ctx.moveTo(scrX, 0); 
            ctx.lineTo(scrX, dprHeight); 
            ctx.stroke();
            ctx.textAlign = 'center'; 
            ctx.fillText(zMeters === 0 ? '중앙(0m)' : zMeters + 'm', scrX, dprHeight - 8);
        }
        ctx.strokeStyle = '#86868b'; 
        ctx.lineWidth = 1.5; 
        ctx.beginPath(); 
        ctx.moveTo(dprWidth / 2, 0); 
        ctx.lineTo(dprWidth / 2, dprHeight - 25); 
        ctx.stroke();

    } else if (currentView === 'front') {
        const centerX = ORIGIN_X_OFFSET + (dprWidth - ORIGIN_X_OFFSET - 20) / 2;
        
        for (let zMeters = -MAX_WORLD_Z; zMeters <= MAX_WORLD_Z; zMeters += 5) {
            let scrX = centerX + (zMeters * frontScaleZ);
            ctx.beginPath(); 
            ctx.moveTo(scrX, 0); 
            ctx.lineTo(scrX, dprHeight - GROUND_Y_OFFSET); 
            ctx.stroke();
            ctx.textAlign = 'center'; 
            ctx.fillText(zMeters === 0 ? '0m' : zMeters + 'm', scrX, dprHeight - GROUND_Y_OFFSET + 14);
        }
        for (let yMeters = 0; yMeters <= MAX_WORLD_Y; yMeters += 5) {
            let scrY = dprHeight - GROUND_Y_OFFSET - (yMeters * frontScaleY);
            ctx.beginPath(); 
            ctx.moveTo(ORIGIN_X_OFFSET, scrY); 
            ctx.lineTo(dprWidth, scrY); 
            ctx.stroke();
            ctx.textAlign = 'right'; 
            ctx.fillText(yMeters + 'm', ORIGIN_X_OFFSET - 5, scrY + 3);
        }
        ctx.strokeStyle = '#1d1d1f'; 
        ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.moveTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); 
        ctx.lineTo(dprWidth, dprHeight - GROUND_Y_OFFSET); 
        ctx.stroke();
        ctx.beginPath(); 
        ctx.moveTo(ORIGIN_X_OFFSET, 0); 
        ctx.lineTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); 
        ctx.stroke();
        
        ctx.strokeStyle = '#86868b'; 
        ctx.lineWidth = 1.2; 
        ctx.beginPath(); 
        ctx.moveTo(centerX, 0); 
        ctx.lineTo(centerX, dprHeight - GROUND_Y_OFFSET); 
        ctx.stroke();
    }

    ctx.lineWidth = 1.5;

    // 과녁 그리기
    if (currentView === 'side') {
        const fBottom = toScreen(targetBaseX, safeTargetH, 0);
        const frontTopX = targetBaseX + TGT_H * Math.sin(TGT_TILT);
        const frontTopY = safeTargetH + TGT_H * Math.cos(TGT_TILT);
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
        ctx.arc((leftX + rightX) / 2, (topY + bottomY) / 2, 8, 0, Math.PI * 2); 
        ctx.fill();
        ctx.lineWidth = 1.5;
        
    } else if (currentView === 'top') {
        const projTopX = targetBaseX + TGT_H * Math.sin(TGT_TILT);
        const thickX = TGT_D * Math.cos(TGT_TILT);
        const fLeftBot = toScreen(targetBaseX, safeTargetH, -TGT_W / 2);
        const fRightBot = toScreen(targetBaseX, safeTargetH, TGT_W / 2);
        const bLeftTop = toScreen(projTopX + thickX, safeTargetH, -TGT_W / 2);
        const bRightTop = toScreen(projTopX + thickX, safeTargetH, TGT_W / 2);

        ctx.fillStyle = '#ff3b30';
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

    // 과녁 지지대 (정면 및 측면 전용)
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

    // 누적 비행 궤적 그리기
    if (trajectory.length > 1) {
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

    // 실시간 화살 오브젝트 렌더링
    const arrowPos = toScreen(arrowState.x, arrowState.y, arrowState.z);
    ctx.save(); 
    ctx.translate(arrowPos.x, arrowPos.y);
    
    let angleRad = 0; 
    if (currentView === 'side') angleRad = -arrowState.pitch; 
    else if (currentView === 'top') angleRad = -arrowState.yaw; 
    else if (currentView === 'front') angleRad = Math.atan2(arrowState.vz, arrowState.vy);
    
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
