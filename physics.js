// 화살의 현재 상태와 비행 기록을 저장하는 전역 변수
let arrowState = {
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    pitch: 0, yaw: 0
};

let trajectory = []; // 화살 궤적 좌표 배열
let isFlying = false;

// 비행 결과 및 과녁 판정용 데이터 구조
let flightMetrics = { maxDistance: 0, maxHeight: 0, sideDeviation: 0, flightTime: 0, impactVelocity: 0, impactEnergy: 0 };
let targetHitMetrics = { isHit: false, localZ: 0, localY: 0 };

let hasReachedTargetX = false;
let hasReachedTargetY = false;
let hasIntersectedTargetPlane = false;

// 과녁 기본 제원 상수
const TGT_TILT = 15 * Math.PI / 180; // 과녁 기울기 15도
const TGT_H = 2.0;  // 과녁 세로 높이 (m)
const TGT_W = 2.0;  // 과녁 가로 너비 (m)

/**
 * 화살 발사 시작 함수
 */
function fireArrow() {
    if (isFlying) return; // 이미 날아가는 중이면 중복 실행 방지

    // 입력값 가져오기
    const pitchDeg = parseFloat(document.getElementById('angle').value) || 0;
    const yawDeg = parseFloat(document.getElementById('yawAngle').value) || 0;
    const v0 = parseFloat(document.getElementById('velocity').value) || 50;
    const launchH = parseFloat(document.getElementById('launchHeight').value) || 1.5;
    
    // HTML에서 사수 좌우 위치 값을 안전하게 읽어옵니다.
    const playerZ = parseFloat(document.getElementById('playerZ').value) || 0;

    const pitchRad = pitchDeg * Math.PI / 180;
    const yawRad = yawDeg * Math.PI / 180;

    // 화살 초기 위치 설정 (사수 위치 적용)
    arrowState.x = 0; 
    arrowState.y = launchH; 
    arrowState.z = playerZ; // 읽어온 사수 위치를 시작 Z 좌표로 지정
    
    // 초기 속도 벡터 계산
    arrowState.vx = v0 * Math.cos(pitchRad) * Math.cos(yawRad);
    arrowState.vy = v0 * Math.sin(pitchRad);
    arrowState.vz = v0 * Math.cos(pitchRad) * Math.sin(yawRad);
    
    arrowState.pitch = pitchRad; 
    arrowState.yaw = yawRad;

    // 데이터 초기화
    flightMetrics = { maxDistance: 0, maxHeight: launchH, sideDeviation: playerZ, flightTime: 0, impactVelocity: v0, impactEnergy: 0 };
    targetHitMetrics = { isHit: false, localZ: 0, localY: 0 };
    hasReachedTargetX = false;
    hasReachedTargetY = false;
    hasIntersectedTargetPlane = false;
    
    // 💡 원본 ui.js 파일에 있는 올바른 함수명(updateResultUI)으로 일치시켰습니다.
    if (typeof updateResultUI === "function") {
        updateResultUI();
    }
    
    // 궤적 배열 초기화 (시작점에 사수 위치 반영)
    trajectory = [{ x: arrowState.x, y: arrowState.y, z: arrowState.z }];
    isFlying = true;
    
    // 애니메이션 루프 시작
    animate();
}

/**
 * 프레임별 물리 연산 및 애니메이션 제어 함수
 */
function animate() {
    if (!isFlying) return;

    // 환경 변수 및 화살 제원 가져오기
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
    
    // 💡 정의되지 않아 에러를 내던 함수 대신 국궁 규격 고정값(거리 145m, 고도 0m)으로 안전하게 대체했습니다.
    const targetBaseX = 145; 
    const targetH = 0;   

    // 상대 속도 및 영각(받음각) 연산
    const relVx = arrowState.vx - windX; 
    const relVy = arrowState.vy; 
    const relVz = arrowState.vz - windZ;
    const vRel = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz) || 0.001;

    const flowPitch = Math.atan2(relVy, Math.sqrt(relVx * relVx + relVz * relVz));
    const flowYaw = Math.atan2(relVz, relVx);
    const attackAngle = arrowState.pitch - flowPitch;

    // 공기역학 계산
    const effectiveArea = area * 2.5; 
    const dynamicLiftCoeff = 2.0 * Math.sin(attackAngle) * Math.cos(attackAngle);
    const dragF = 0.5 * rho * vRel * vRel * cd * effectiveArea;
    const liftF = 0.5 * rho * vRel * vRel * (cl + dynamicLiftCoeff) * effectiveArea;

    // 가속도 성분 분해
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

    // 속도 및 위치 갱신
    arrowState.vx += ax * dt; 
    arrowState.vy += ay * dt; 
    arrowState.vz += az * dt;
    
    arrowState.x += arrowState.vx * dt; 
    arrowState.y += arrowState.vy * dt; 
    arrowState.z += arrowState.vz * dt;

    arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vz * arrowState.vz));
    arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);
    
    trajectory.push({ x: arrowState.x, y: arrowState.y, z: arrowState.z });

    if (!hasReachedTargetX) { flightMetrics.flightTime += dt; }
    if (arrowState.y > flightMetrics.maxHeight) { flightMetrics.maxHeight = arrowState.y; }

    // 과녁 평면 교차 판정 (측면도와 일치하도록 부호 수정 반영)
    const nx = Math.cos(TGT_TILT); 
    const ny = -Math.sin(TGT_TILT); 
    
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
        
        hasReachedTargetX = true;
        flightMetrics.sideDeviation = arrowState.z; 
        flightMetrics.impactVelocity = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactEnergy = 0.5 * m * flightMetrics.impactVelocity * flightMetrics.impactVelocity;
    }

    // 🚀 [종료 조건] 과녁을 지나쳤거나 땅에 닿으면 안전하게 비행 종료
    if (arrowState.x > targetBaseX + 15 || arrowState.y <= 0) {
        isFlying = false;
        
        // 💡 ui.js에 설계된 원래 함수명으로 최종 결과를 UI에 반영합니다.
        if (typeof updateResultUI === "function") {
            updateResultUI(); 
        }
        
        // 캔버스 드로잉 강제 실행
        if (typeof drawScene === "function") {
            drawScene(); 
        }
        return; 
    }

    // 다음 프레임 연산 지속
    requestAnimationFrame(animate);
}
