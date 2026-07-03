// =========================================================================
// [Part 4/15] physics.js - 전역 변수 및 초기화 셋업
// =========================================================================

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

let dprWidth = 0;
let dprHeight = 0;

// [통일된 월드 공간 스케일 세팅]
const MAX_WORLD_X = 180;   // 최대 전진 거리 180m (측면도/평면도)
const MAX_WORLD_Y = 30;    // 최대 높이 30m (측면도/정면도 보조)
const MAX_WORLD_Z = 15;    // 좌우 최대 관측 편차 범위 (±15m, 평면도)
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

// 4번째 서브 뷰: 과녁 무한 연장 평면 투영용 2D 오프셋 저장 객체
let targetHitMetrics = {
    isHit: false,      // 실제 2m x 2.667m 나무 틀 내부에 적중했는지 여부
    localZ: 0,         // 과녁 정중앙(홍심) 기준 좌우 편차 (m)
    localY: 0          // 과녁 정중앙(홍심) 기준 상하 편차 (m)
};

let hasReachedTargetX = false;
let hasReachedTargetY = false;
let hasIntersectedTargetPlane = false; // 과녁 연장 평면 통과 완료 플래그

const ORIGIN_X_OFFSET = 35; 
const GROUND_Y_OFFSET = 30; 
// =========================================================================
// [Part 5/15] physics.js - 원호 역산 공식 및 발사 처리 루틴
// =========================================================================

function getDynamicTargetGeometry() {
    const targetH = parseFloat(document.getElementById('targetHeight').value) || 0;
    const safeTargetH = Math.min(targetH, TARGET_SLANT_R - 0.1);
    // 피타고라스 원호 운동 공식 적용 (X = sqrt(145^2 - Y^2))
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
    
    // 수평 방위각(yaw)과 수직 발사각(pitch)을 정밀 결합한 3차원 속도 벡터 분해
    arrowState.vx = v0 * Math.cos(pitchRad) * Math.cos(yawRad);
    arrowState.vy = v0 * Math.sin(pitchRad);
    arrowState.vz = v0 * Math.cos(pitchRad) * Math.sin(yawRad);
    
    arrowState.pitch = pitchRad; 
    arrowState.yaw = yawRad;

    // 모든 시뮬레이션 지표 초기화
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
// =========================================================================
// [Part 6/15] physics.js - 에어로다이내믹스 유체 역학 연산 부
// =========================================================================

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
    const targetBaseX = tgtGeo.baseX;
    const targetH = tgtGeo.height;

    // 대기 상대 속도 벡터 계산
    const relVx = arrowState.vx - windX; 
    const relVy = arrowState.vy; 
    const relVz = arrowState.vz - windZ;
    const vRel = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz) || 0.001;

    // 받음각(Angle of Attack) 실시간 추적
    const flowPitch = Math.atan2(relVy, Math.sqrt(relVx * relVx + relVz * relVz));
    const flowYaw = Math.atan2(relVz, relVx);
    const attackAngle = arrowState.pitch - flowPitch;

    const effectiveArea = area * 2.5; // 패러독스 단면적 보정
    const dynamicLiftCoeff = 2.0 * Math.sin(attackAngle) * Math.cos(attackAngle);

    const dragF = 0.5 * rho * vRel * vRel * cd * effectiveArea;
    const liftF = 0.5 * rho * vRel * vRel * (cl + dynamicLiftCoeff) * effectiveArea;
// =========================================================================
// [Part 7/15] physics.js - 3차원 벡터 가속도 분해 및 오일러 적분
// =========================================================================

    const dragAx = (-dragF * Math.cos(flowPitch) * Math.cos(flowYaw)) / m;
    const dragAy = (-dragF * Math.sin(flowPitch)) / m;
    const dragAz = (-dragF * Math.cos(flowPitch) * Math.sin(flowYaw)) / m;

    const liftAx = (-liftF * Math.sin(flowPitch) * Math.cos(flowYaw)) / m;
    const liftAy = (liftF * Math.cos(flowPitch)) / m;
    const liftAz = (-liftF * Math.sin(flowPitch) * Math.sin(flowYaw)) / m;

    const ax = dragAx + liftAx;
    const ay = -g + dragAy + liftAy;
    const az = dragAz + liftAz;

    // 이전 상태 백업 (정밀 교차면 평면 영사 연산용)
    const prevX = arrowState.x;
    const prevY = arrowState.y;
    const prevZ = arrowState.z;

    // 오일러 수치 적분 수행
    arrowState.vx += ax * dt; 
    arrowState.vy += ay * dt; 
    arrowState.vz += az * dt;
    
    arrowState.x += arrowState.vx * dt; 
    arrowState.y += arrowState.vy * dt; 
    arrowState.z += arrowState.vz * dt;

    // 화살의 비행 3차원 자세 각도를 진행 방향 속도 벡터와 일치시킴
    arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vz * arrowState.vz));
    arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);

    trajectory.push({ x: arrowState.x, y: arrowState.y, z: arrowState.z });

    // 실시간 비행 타이머 누적 (과녁 축 도과 전까지 작동)
    if (!hasReachedTargetX) {
        flightMetrics.flightTime += dt; 
    }
    if (arrowState.y > flightMetrics.maxHeight) {
        flightMetrics.maxHeight = arrowState.y; 
    }
// =========================================================================
// [Part 8/15] physics.js - 뒤로 15도 누운 과녁 평면 영사 연산 (핵심 판정식)
// =========================================================================

    // 뒤로 15도 누운 과녁 평면의 법선 벡터 (n_x, n_y, n_z) 구하기
    // 평면 방정식: cos(15°)*(x - baseX) + sin(15°)*(y - height) = 0
    const nx = Math.cos(TGT_TILT);
    const ny = Math.sin(TGT_TILT);

    // 이전 프레임과 현재 프레임에서 과녁 평면까지의 부호 있는 거리 연산
    const distPrev = nx * (prevX - targetBaseX) + ny * (prevY - targetH);
    const distCurr = nx * (arrowState.x - targetBaseX) + ny * (arrowState.y - targetH);

    // 두 거리의 부호가 바뀐 경우 평면을 관통(교차)한 것으로 간주함
    if (!hasIntersectedTargetPlane && distPrev * distCurr <= 0 && prevX < arrowState.x) {
        hasIntersectedTargetPlane = true;

        // 정확한 평면 교차 지점 비율 s (0 ~ 1 사이) 산출
        const s = Math.abs(distPrev) / (Math.abs(distPrev) + Math.abs(distCurr));
        const interX = prevX + (arrowState.x - prevX) * s;
        const interY = prevY + (arrowState.y - prevY) * s;
        const interZ = prevZ + (arrowState.z - prevZ) * s;

        // 과녁 중심(홍심)의 월드 3차원 좌표 구하기
        // 홍심의 고도는 과녁 바닥 높이에서 과녁판 중심 높이(TGT_H / 2 * cos(15°)) 만큼 올라간 지점임
        const centerWorldX = targetBaseX + (TGT_H / 2) * Math.sin(TGT_TILT);
        const centerWorldY = targetH + (TGT_H / 2) * Math.cos(TGT_TILT);

        // 평면상의 로컬 좌표계로 오프셋 변환 (Z축은 그대로 수평 편차, Y축은 과녁 경사면을 따라 올라가는 높이)
        const localZ = interZ; // 과녁 정면 기준 좌우 편차 (m)
        const localY = (interY - centerWorldY) / Math.cos(TGT_TILT); // 과녁 경사면 기준 상하 편차 (m)

        targetHitMetrics.localZ = localZ;
        targetHitMetrics.localY = localY;

        // 실제 국궁 과녁의 사각형 규격(가로 ±1m, 경사 세로 ±1.3335m) 내에 들어왔는지 최종 판정
        if (Math.abs(localZ) <= TGT_W / 2 && Math.abs(localY) <= TGT_H / 2) {
            targetHitMetrics.isHit = true;
        } else {
            targetHitMetrics.isHit = false;
        }
    }
// =========================================================================
// [Part 9/15] physics.js - 145m 비행시간 축 및 과녁 고도 기준 최대거리 잠금 판정
// =========================================================================

    // 비행 시간 기록 고정: 원호상 과녁 바닥 수평 거리(targetBaseX) 돌파 검증
    if (!hasReachedTargetX && arrowState.x >= targetBaseX) {
        hasReachedTargetX = true;
    }

    // 최대 거리 기록 고정: 발사 후 하강기에 과녁 바닥 높이(targetH) 선과 최초 교차 판정
    if (!hasReachedTargetY && arrowState.vy <= 0 && prevY >= targetH && arrowState.y <= targetH) {
        hasReachedTargetY = true;
        
        // 정밀한 위치 역산을 위한 선형 보정 비례 가중치(t) 구하기
        const t = (prevY - targetH) / (prevY - arrowState.y);
        const exactX = prevX + (arrowState.x - prevX) * t;
        const exactZ = prevZ + (arrowState.z - prevZ) * t;

        flightMetrics.maxDistance = exactX;      
        flightMetrics.sideDeviation = exactZ;     
        
        const vFinal = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactVelocity = vFinal;
        flightMetrics.impactEnergy = 0.5 * m * vFinal * vFinal;
    }

    // 데이터 확정 전까지 계기판에 현재 프레임의 최고 도달값 임시 가바인딩
    if (!hasReachedTargetY) {
        flightMetrics.maxDistance = arrowState.x;
        flightMetrics.sideDeviation = arrowState.z;
        const vCurrent = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactVelocity = vCurrent;
        flightMetrics.impactEnergy = 0.5 * m * vCurrent * vCurrent;
    }

    updateResultUI();

    // 순수 지면(y <= 0) 충돌 시 프레임 완전 정지 안전장치
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
// =========================================================================
// [Part 10/15] physics.js - 4분할 시점별 화면 축척 매핑 엔진
// =========================================================================

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

    // 캔버스 가용 영역 연산
    const availW = dprWidth - ORIGIN_X_OFFSET - 10;
    const availH = dprHeight - GROUND_Y_OFFSET - 10;

    // 1. 측면도용 스케일 가중치 (X: 전진 180m, Y: 높이 30m)
    const scaleX = availW / MAX_WORLD_X;
    const scaleY = availH / MAX_WORLD_Y;

    // 2. 평면도 세로 모드 축척 (세로축: 전진 180m, 가로축: 좌우 ±15m)
    const topScaleForward = (dprHeight - 40) / MAX_WORLD_X; 
    const topScaleSide = (dprWidth - 20) / (MAX_WORLD_Z * 2); 

    // 3. 정면도 축척 (가로축: 좌우 ±15m, 세로축: 높이 30m)
    const frontScaleZ = (dprWidth - ORIGIN_X_OFFSET - 20) / (MAX_WORLD_Z * 2);
    const frontScaleY = availH / MAX_WORLD_Y;

    // 4. 과녁 정면 확대 서브 뷰 축척 (가로축: 좌우 편차 ±2m, 세로축: 상하 편차 ±2m 총 4m 스케일 마진)
    const targetViewScale = Math.min(dprWidth / 4.0, dprHeight / 4.0);

    function toScreen(pX, pY, pZ) {
        if (currentView === 'side') { 
            return { 
                x: ORIGIN_X_OFFSET + (pX * scaleX), 
                y: dprHeight - GROUND_Y_OFFSET - (pY * scaleY) 
            };
        }
        if (currentView === 'top') {  
            return { 
                x: (dprWidth / 2) + (pZ * topScaleSide), 
                y: dprHeight - 25 - (pX * topScaleForward) 
            };
        }
        if (currentView === 'front') {
            return {
                x: ORIGIN_X_OFFSET + (dprWidth - ORIGIN_X_OFFSET - 20) / 2 + (pZ * frontScaleZ),
                y: dprHeight - GROUND_Y_OFFSET - (pY * frontScaleY)
            };
        }
        if (currentView === 'target') {
            return {
                x: (dprWidth / 2) + (pZ * targetViewScale), 
                y: (dprHeight / 2) - (pY * targetViewScale) 
            };
        }
        return { x: 0, y: 0 };
    }
// =========================================================================
// [Part 11/15] physics.js - 측면도 및 세로 평면도 격자 눈금선 렌더링
// =========================================================================

    ctx.strokeStyle = '#e5e5ea'; ctx.lineWidth = 1; ctx.font = '10px -apple-system'; ctx.fillStyle = '#8e8e93';

    if (currentView === 'side') {
        // 180m 스케일 대응 20m 간격 수직 격자선 배치
        for (let xMeters = 0; xMeters <= MAX_WORLD_X; xMeters += 20) {
            let scrX = ORIGIN_X_OFFSET + (xMeters * scaleX);
            ctx.beginPath(); ctx.moveTo(scrX, 0); ctx.lineTo(scrX, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
            ctx.textAlign = 'center'; ctx.fillText(xMeters + 'm', scrX, dprHeight - GROUND_Y_OFFSET + 14);
        }
        // 30m 최고 고도 대응 5m 간격 촘촘한 수평 격자선 배치
        for (let yMeters = 0; yMeters <= MAX_WORLD_Y; yMeters += 5) {
            let scrY = dprHeight - GROUND_Y_OFFSET - (yMeters * scaleY);
            ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, scrY); ctx.lineTo(dprWidth, scrY); ctx.stroke();
            ctx.textAlign = 'right'; ctx.fillText(yMeters + 'm', ORIGIN_X_OFFSET - 5, scrY + 3);
        }
        // 메인 외곽 축 라인 강조
        ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); ctx.lineTo(ORIGIN_X_OFFSET + (MAX_WORLD_X * scaleX), dprHeight - GROUND_Y_OFFSET); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, 0); ctx.lineTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); ctx.stroke();

    } else if (currentView === 'top') {
        // 전진 거리 수직 안내선 (20m 단위로 하단에서 위로 정렬)
        for (let xMeters = 0; xMeters <= MAX_WORLD_X; xMeters += 20) {
            let scrY = dprHeight - 25 - (xMeters * topScaleForward);
            ctx.beginPath(); ctx.moveTo(0, scrY); ctx.lineTo(dprWidth, scrY); ctx.stroke();
            ctx.textAlign = 'left'; ctx.fillText(xMeters + 'm', 8, scrY - 4);
        }
        // 좌우 편차 수평 안내선 (5m 단위로 중앙 0m 기준 좌우 정렬)
        for (let zMeters = -MAX_WORLD_Z; zMeters <= MAX_WORLD_Z; zMeters += 5) {
            let scrX = (dprWidth / 2) + (zMeters * topScaleSide);
            ctx.beginPath(); ctx.moveTo(scrX, 0); ctx.lineTo(scrX, dprHeight); ctx.stroke();
            ctx.textAlign = 'center'; ctx.fillText(zMeters === 0 ? '중앙(0m)' : zMeters + 'm', scrX, dprHeight - 8);
        }
        // 센터 메인 전진축 강조선
        ctx.strokeStyle = '#86868b'; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(dprWidth / 2, 0); ctx.lineTo(dprWidth / 2, dprHeight - 25); ctx.stroke();
// =========================================================================
// [Part 12/15] physics.js - 정면도 정밀 격자 자 눈금선 렌더링
// =========================================================================

    } else if (currentView === 'front') {
        const centerX = ORIGIN_X_OFFSET + (dprWidth - ORIGIN_X_OFFSET - 20) / 2;
        // 가로 좌우 편차 눈금선 생성 (5m 간격)
        for (let zMeters = -MAX_WORLD_Z; zMeters <= MAX_WORLD_Z; zMeters += 5) {
            let scrX = centerX + (zMeters * frontScaleZ);
            ctx.beginPath(); ctx.moveTo(scrX, 0); ctx.lineTo(scrX, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
            ctx.textAlign = 'center'; ctx.fillText(zMeters === 0 ? '0m' : zMeters + 'm', scrX, dprHeight - GROUND_Y_OFFSET + 14);
        }
        // 세로 높이 눈금선 생성 (5m 간격)
        for (let yMeters = 0; yMeters <= MAX_WORLD_Y; yMeters += 5) {
            let scrY = dprHeight - GROUND_Y_OFFSET - (yMeters * frontScaleY);
            ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, scrY); ctx.lineTo(dprWidth, scrY); ctx.stroke();
            ctx.textAlign = 'right'; ctx.fillText(yMeters + 'm', ORIGIN_X_OFFSET - 5, scrY + 3);
        }
        // 정면도 메인 베이스 축 라인 강조
        ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); ctx.lineTo(dprWidth, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, 0); ctx.lineTo(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
        
        ctx.strokeStyle = '#86868b'; ctx.lineWidth = 1.2; ctx.beginPath();
        ctx.moveTo(centerX, 0); ctx.lineTo(centerX, dprHeight - GROUND_Y_OFFSET); ctx.stroke();
    }
// =========================================================================
// [Part 13/15] physics.js - 과녁 확대 시점 조밀 격자선 렌더링
// =========================================================================

    if (currentView === 'target') {
        // 과녁 정면 확대 뷰 가이드 격자선 그리기 (0.5m 조밀 간격, 총 범위 가로/세로 ±2m 마진)
        ctx.strokeStyle = '#e5e5ea'; ctx.lineWidth = 0.8;
        
        // 로컬 좌우 편차(Z축) 보조선 그리드 매핑
        for (let lz = -2.0; lz <= 2.0; lz += 0.5) {
            let scrPos = toScreen(0, 0, lz);
            ctx.beginPath(); ctx.moveTo(scrPos.x, 0); ctx.lineTo(scrPos.x, dprHeight); ctx.stroke();
            ctx.fillStyle = '#8e8e93'; ctx.font = '9px -apple-system'; ctx.textAlign = 'center';
            ctx.fillText(lz === 0 ? '중앙' : lz.toFixed(1) + 'm', scrPos.x, dprHeight - 8);
        }
        // 로컬 상하 편차(기울어진 Y축 평면) 보조선 그리드 매핑
        for (let ly = -2.0; ly <= 2.0; ly += 0.5) {
            let scrPos = toScreen(0, ly, 0);
            ctx.beginPath(); ctx.moveTo(0, scrPos.y); ctx.lineTo(dprWidth, scrPos.y); ctx.stroke();
            ctx.fillStyle = '#8e8e93'; ctx.font = '9px -apple-system'; ctx.textAlign = 'right';
            ctx.fillText(ly === 0 ? '홍심' : (ly > 0 ? '+' : '') + ly.toFixed(1) + 'm', dprWidth - 8, scrPos.y + 3);
        }
        // 과녁 확대 시점 전용 가상 정중앙 십자선 스케일선 강조
        ctx.strokeStyle = '#86868b'; ctx.lineWidth = 1.2;
        let centerScr = toScreen(0, 0, 0);
        ctx.beginPath(); ctx.moveTo(centerScr.x, 0); ctx.lineTo(centerScr.x, dprHeight); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, centerScr.y); ctx.lineTo(dprWidth, centerScr.y); ctx.stroke();
    }
    
    ctx.lineWidth = 1.5; // 기본 선 굵기 복원
// =========================================================================
// [Part 14/15] physics.js - 4분할 시점별 국궁 표준 경사 과녁 및 명중 마커 드로잉
// =========================================================================

    // 과녁 객체 그래픽 드로잉 파트
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
        ctx.beginPath(); ctx.moveTo(fBottom.x, fBottom.y); ctx.lineTo(fTop.x, fTop.y); ctx.lineTo(bTop.x, bTop.y); ctx.lineTo(bBottom.x, bBottom.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1d1d1f';
        ctx.beginPath(); ctx.moveTo(fTop.x, fTop.y); ctx.lineTo(bTop.x, bTop.y); ctx.lineTo(bBottom.x, bBottom.y); ctx.lineTo(fBottom.x, fBottom.y); ctx.stroke();
        ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.moveTo(fBottom.x, fBottom.y); ctx.lineTo(fTop.x, fTop.y); ctx.stroke();
        ctx.lineWidth = 1.5;

    } else if (currentView === 'front') {
        const projH = TGT_H * Math.cos(TGT_TILT);
        const tgtCenter = toScreen(targetBaseX, safeTargetH, 0);
        const leftX = toScreen(targetBaseX, safeTargetH, -TGT_W / 2).x;
        const rightX = toScreen(targetBaseX, safeTargetH, TGT_W / 2).x;
        const topY = toScreen(targetBaseX, safeTargetH + projH, 0).y;
        const bottomY = tgtCenter.y;

        ctx.fillStyle = '#ffffff'; ctx.fillRect(leftX, topY, rightX - leftX, bottomY - topY);
        ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 4; ctx.strokeRect(leftX, topY, rightX - leftX, bottomY - topY);
        ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc((leftX + rightX) / 2, (topY + bottomY) / 2, 8, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 1.5;

    } else if (currentView === 'top') {
        const projTopX = targetBaseX + TGT_H * Math.sin(TGT_TILT);
        const thickX = TGT_D * Math.cos(TGT_TILT);
        const fLeftBot = toScreen(targetBaseX, safeTargetH, -TGT_W / 2);
        const fRightBot = toScreen(targetBaseX, safeTargetH, TGT_W / 2);
        const bLeftTop = toScreen(projTopX + thickX, safeTargetH, -TGT_W / 2);
        const bRightTop = toScreen(projTopX + thickX, safeTargetH, TGT_W / 2);

        ctx.fillStyle = '#ff3b30'; 
        ctx.beginPath(); ctx.moveTo(fLeftBot.x, fLeftBot.y); ctx.lineTo(fRightBot.x, fRightBot.y); ctx.lineTo(bRightTop.x, bRightTop.y); ctx.lineTo(bLeftTop.x, bLeftTop.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1d1d1f'; ctx.stroke();

    } else if (currentView === 'target') {
        const tLeftX = toScreen(0, 0, -TGT_W / 2).x;
        const tRightX = toScreen(0, 0, TGT_W / 2).x;
        const tTopY = toScreen(0, TGT_H / 2, 0).y;
        const tBottomY = toScreen(0, -TGT_H / 2, 0).y;

        ctx.fillStyle = '#ffffff'; ctx.fillRect(tLeftX, tTopY, tRightX - tLeftX, tBottomY - tTopY);
        ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 5; ctx.strokeRect(tLeftX, tTopY, tRightX - tLeftX, tBottomY - tTopY);
        
        ctx.fillStyle = '#ff3b30';
        const tCenter = toScreen(0, 0, 0);
        ctx.beginPath(); ctx.arc(tCenter.x, tCenter.y, 14, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 1.5;

        // 화살이 과녁 평면을 통과 완료했다면 타겟팅 충돌 흔적 표시
        if (hasIntersectedTargetPlane) {
            const hitScr = toScreen(0, targetHitMetrics.localY, targetHitMetrics.localZ);
            
            if (targetHitMetrics.isHit) {
                ctx.fillStyle = '#34c759'; // 명중 그린 도트
                ctx.strokeStyle = 'rgba(52, 199, 89, 0.4)'; ctx.lineWidth = 8;
                ctx.beginPath(); ctx.arc(hitScr.x, hitScr.y, 6, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
                ctx.fillStyle = '#34c759'; ctx.font = 'bold 13px -apple-system'; ctx.textAlign = 'center';
                ctx.fillText("🎯 관중 (HIT!)", dprWidth / 2, tTopY - 14);
            } else {
                ctx.fillStyle = '#af52de'; // 빗나감 퍼플 도트
                ctx.strokeStyle = 'rgba(175, 82, 222, 0.3)'; ctx.lineWidth = 6;
                ctx.beginPath(); ctx.arc(hitScr.x, hitScr.y, 5, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
                ctx.fillStyle = '#af52de'; ctx.font = 'bold 12px -apple-system'; ctx.textAlign = 'center';
                ctx.fillText(`❌ 탈타 (오차: 좌우 ${targetHitMetrics.localZ.toFixed(2)}m, 상하 ${targetHitMetrics.localY.toFixed(2)}m)`, dprWidth / 2, tTopY - 14);
            }
            ctx.lineWidth = 1.5;
        }
    }

    if (currentView === 'side' || currentView === 'front') {
        const tgtFloor = toScreen(targetBaseX, 0, 0); 
        const tgtBasePos = toScreen(targetBaseX, safeTargetH, 0);
        ctx.strokeStyle = '#515154'; ctx.lineWidth = 2; ctx.beginPath(); 
        ctx.moveTo(tgtBasePos.x, tgtBasePos.y); ctx.lineTo(tgtBasePos.x, tgtFloor.y); ctx.stroke();
    }
// =========================================================================
// [Part 15/15] physics.js - 궤적 누적선 연결, 실시간 화살 렌더링 및 기동 마감 구문
// =========================================================================

    // 누적 비행 궤적 그리기 (과녁 확대 뷰 시점일 때는 비행 궤적 선 렌더링 스킵하여 시야 확보)
    if (currentView !== 'target' && trajectory.length > 1) {
        ctx.strokeStyle = '#0071e3'; ctx.lineWidth = 2.5; ctx.beginPath();
        const start = toScreen(trajectory.x, trajectory.y, trajectory.z); 
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < trajectory.length; i++) { 
            const pt = toScreen(trajectory[i].x, trajectory[i].y, trajectory[i].z); 
            ctx.lineTo(pt.x, pt.y); 
        }
        ctx.stroke();
    }

    // 실시간 화살 오브젝트 렌더링 (과녁 확대 뷰 시점일 때는 탄착점 마커가 있으므로 화살 드로잉 스킵)
    if (currentView !== 'target') {
        const arrowPos = toScreen(arrowState.x, arrowState.y, arrowState.z);
        ctx.save(); 
        ctx.translate(arrowPos.x, arrowPos.y);
        
        let angleRad = 0; 
        if (currentView === 'side') angleRad = -arrowState.pitch; 
        else if (currentView === 'top') angleRad = -arrowState.yaw; 
        else if (currentView === 'front') angleRad = Math.atan2(arrowState.vz, arrowState.vy);
        
        ctx.rotate(angleRad);
        ctx.strokeStyle = '#515154'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(0, 0); ctx.stroke();
        ctx.fillStyle = '#1d1d1f'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6, -3); ctx.lineTo(-6, 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff9500'; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-16, -4); ctx.lineTo(-10, -4); ctx.lineTo(-14, 0); ctx.fill();
        ctx.restore();
    }
}

// 최초 웹앱 로드 시 로컬 스토리지 보존 설정 동기화 및 씬 초기 레이아웃 기획 셋업
setTimeout(() => {
    if (typeof loadSettings === 'function') loadSettings();
    resizeCanvas();
    const launchH = parseFloat(document.getElementById('launchHeight').value) || 1.5;
    arrowState.x = 0; arrowState.y = launchH; arrowState.z = 0;
    arrowState.pitch = (parseFloat(document.getElementById('angle').value) || 30) * Math.PI / 180;
    arrowState.yaw = (parseFloat(document.getElementById('yawAngle').value) || 0) * Math.PI / 180;
    drawScene();
}, 250);
