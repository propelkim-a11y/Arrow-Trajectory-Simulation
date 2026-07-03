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

// 3차원 물리 공간 상태 정의 (x: 전진 전방, y: 연직 높이, z: 측면 수평 편차)
let arrowState = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, pitch: 0, yaw: 0 };

// 비행 분석용 실시간 물리 데이터 저장 객체
let flightMetrics = {
    maxDistance: 0,
    maxHeight: 0,
    sideDeviation: 0,
    flightTime: 0,
    impactVelocity: 0,
    impactEnergy: 0
};

const SCALE = 6;
const ORIGIN_X_OFFSET = 50;
const GROUND_Y_OFFSET = 60;

function fireArrow() {
    if (isFlying) cancelAnimationFrame(animationFrameId);
    if (typeof saveSettings === 'function') saveSettings();

    // [사법 설정] 탭 입력 폼에서 데이터 로드
    const v0 = parseFloat(document.getElementById('velocity').value) || 50;
    const angleDeg = parseFloat(document.getElementById('angle').value) || 0;
    const yawDeg = parseFloat(document.getElementById('yawAngle').value) || 0;
    const launchH = parseFloat(document.getElementById('launchHeight').value) || 0;

    const pitchRad = (angleDeg * Math.PI) / 180;
    const yawRad = (yawDeg * Math.PI) / 180;

    // 초기 물리 상태 설정
    arrowState.x = 0; 
    arrowState.y = launchH; 
    arrowState.z = 0;
    
    // 수평 방위각(yaw)과 발사 각도(pitch)를 반영한 정확한 3차원 속도 벡터 분해
    arrowState.vx = v0 * Math.cos(pitchRad) * Math.cos(yawRad);
    arrowState.vy = v0 * Math.sin(pitchRad);
    arrowState.vz = v0 * Math.cos(pitchRad) * Math.sin(yawRad);
    
    arrowState.pitch = pitchRad; 
    arrowState.yaw = yawRad;

    // [수정] 발사 버튼 클릭 즉시 이전 데이터를 0과 시작값으로 초기 리셋
    flightMetrics = { 
        maxDistance: 0, 
        maxHeight: launchH, 
        sideDeviation: 0, 
        flightTime: 0, 
        impactVelocity: v0, 
        impactEnergy: 0 
    };
    
    // 초기화된 공백 상태를 UI에 선제적으로 업데이트
    updateResultUI();

    trajectory = [{ x: arrowState.x, y: arrowState.y, z: arrowState.z }];
    isFlying = true;
    animate();
}

function animate() {
    if (!isFlying) return;

    // [화살 설정] 및 [환경 설정] 탭 입력 폼 데이터 로드 및 단위 변환
    const cd = parseFloat(document.getElementById('dragCoeff').value) || 0;
    const cl = parseFloat(document.getElementById('liftCoeff').value) || 0;
    const d = (parseFloat(document.getElementById('diameter').value) || 5.5) / 1000; // mm -> m
    const m = (parseFloat(document.getElementById('weight').value) || 25) / 1000;    // g -> kg
    const rho = parseFloat(document.getElementById('airDensity').value) || 1.225;
    
    const windX = parseFloat(document.getElementById('windX').value) || 0; // 종풍
    const windZ = parseFloat(document.getElementById('windY').value) || 0; // 횡풍 입력값을 z축으로 매핑

    const g = 9.81; 
    const dt = 0.016; // 약 60fps 프레임당 고정 시간 증분
    const area = Math.PI * Math.pow(d / 2, 2); // 화살 전면 단면적

    // 바람을 고려한 대기 상대 속도 벡터 계산
    const relVx = arrowState.vx - windX; 
    const relVy = arrowState.vy; 
    const relVz = arrowState.vz - windZ;
    const vRel = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz) || 0.001;

    // 유체역학 공식 기반 항력 및 양력 크기 연산
    const dragF = 0.5 * rho * vRel * vRel * cd * area;
    const liftF = 0.5 * rho * vRel * vRel * cl * area;

    // 대기 상대 유동 각도 구하기
    const flowPitch = Math.atan2(relVy, Math.sqrt(relVx * relVx + relVz * relVz));
    const flowYaw = Math.atan2(relVz, relVx);

    // 1. 항력 가속도 분해 (상대 풍속 벡터의 정반대)
    const dragAx = (-dragF * Math.cos(flowPitch) * Math.cos(flowYaw)) / m;
    const dragAy = (-dragF * Math.sin(flowPitch)) / m;
    const dragAz = (-dragF * Math.cos(flowPitch) * Math.sin(flowYaw)) / m;

    // 2. 양력 가속도 분해 (상대 유동 방향에 수직 상방)
    const liftAx = (-liftF * Math.sin(flowPitch) * Math.cos(flowYaw)) / m;
    const liftAy = (liftF * Math.cos(flowPitch)) / m;
    const liftAz = (-liftF * Math.sin(flowPitch) * Math.sin(flowYaw)) / m;

    // 3. 총 가속도 합성 (중력 가속도는 순수 물리 상수이므로 질량 m으로 나누지 않음)
    const ax = dragAx + liftAx;
    const ay = -g + dragAy + liftAy;
    const az = dragAz + liftAz;

    // 속도 및 위치 순차 업데이트 (오일러 적분 연산)
    arrowState.vx += ax * dt; 
    arrowState.vy += ay * dt; 
    arrowState.vz += az * dt;
    
    arrowState.x += arrowState.vx * dt; 
    arrowState.y += arrowState.vy * dt; 
    arrowState.z += arrowState.vz * dt;

    // 화살의 비행 3차원 자세 각도를 현재 진행 속도 방향 벡터와 일치시킴
    arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vz * arrowState.vz));
    arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);

    // 실시간 이동 궤적 배열 기록
    trajectory.push({ x: arrowState.x, y: arrowState.y, z: arrowState.z });

    // [수정] 실시간 비행 결과 분석 수치 실시간 수집 및 누적 업데이트
    flightMetrics.flightTime += dt;
    flightMetrics.maxDistance = arrowState.x;    // 실시간 거리 트래킹
    flightMetrics.sideDeviation = arrowState.z;   // 실시간 측면 편차 트래킹

    if (arrowState.y > flightMetrics.maxHeight) {
        flightMetrics.maxHeight = arrowState.y; // 비행 도중 최고 높이 실시간 갱신
    }

    // 현재 프레임의 속도 벡터 크기 및 운동 에너지 실시간 계산
    const vCurrent = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
    flightMetrics.impactVelocity = vCurrent;
    flightMetrics.impactEnergy = 0.5 * m * vCurrent * vCurrent;

    // [수정] 매 프레임마다 결과 창 UI를 동적 갱신하여 0으로 멈춰있는 현상 해결
    updateResultUI();

    // 지면(y <= 0) 충돌 검사 및 최종 결과 고정
    if (arrowState.y <= 0) { 
        arrowState.y = 0; 
        isFlying = false; 

        // 충돌 순간 최종 물리 결과값 최종 셋업
        flightMetrics.maxDistance = arrowState.x;
        flightMetrics.sideDeviation = arrowState.z;
        flightMetrics.impactVelocity = vCurrent;
        flightMetrics.impactEnergy = 0.5 * m * vFinalVel * vFinalVel;

        // 최종 확정 데이터 전송
        updateResultUI();
    }

    // 화면 극단 이탈 시 강제 종료 안전장치
    if ((arrowState.x * SCALE) + ORIGIN_X_OFFSET > dprWidth + 100 || arrowState.x < -10) {
        isFlying = false;
    }

    drawScene();
    if (isFlying) {
        animationFrameId = requestAnimationFrame(animate);
    }
}

// 실시간 연산 결과를 비행 결과 보텀 시트 화면에 포맷팅하여 동적 출력
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
    const targetScreenX = dprWidth - 80;

    // 시점별 3차원 월드 공간 -> 2차원 모니터 화면 뷰포트 좌표 변환 구조
    function toScreen(pX, pY, pZ) {
        if (currentView === 'side') { 
            return { x: ORIGIN_X_OFFSET + (pX * SCALE), y: dprHeight - GROUND_Y_OFFSET - (pY * SCALE) };
        }
        if (currentView === 'top') {  
            return { x: ORIGIN_X_OFFSET + (pX * SCALE), y: (dprHeight / 2) + (pZ * SCALE) };
        }
        return { x: (dprWidth / 2) + (pZ * SCALE), y: dprHeight - GROUND_Y_OFFSET - (pY * SCALE) };
    }

    // 격자 가이드 라인 및 자 눈금 렌더링 (측면도 전용)
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

    // 과녁(Target) 그리기
    const tgt = toScreen((targetScreenX - ORIGIN_X_OFFSET) / SCALE, targetH, 0);
    ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 6, 0, Math.PI * 2); ctx.fill();
    if (currentView === 'side' || currentView === 'front') {
        ctx.strokeStyle = '#1d1d1f'; 
        ctx.lineWidth = 2; 
        ctx.beginPath(); 
        ctx.moveTo(tgt.x, tgt.y + 12); 
        ctx.lineTo(tgt.x, dprHeight - GROUND_Y_OFFSET); 
        ctx.stroke();
    }

    // 누적 비행 궤적 포인트를 이어 선으로 그리기
    if (trajectory.length > 1) {
        ctx.strokeStyle = '#0071e3'; 
        ctx.lineWidth = 2.5; 
        ctx.beginPath();
        
        // 배열 접근 문법 교정: trajectory(0) -> trajectory[0]
        const start = toScreen(trajectory[0].x, trajectory[0].y, trajectory[0].z);
        ctx.moveTo(start.x, start.y);
        
        for (let i = 1; i < trajectory.length; i++) {
            // 배열 접근 문법 교정: trajectory(i) -> trajectory[i]
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

// 최초 로드 시 설정 동기화 및 씬 초기 레이아웃 셋업
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
