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

// 과녁 기본 제원 상수 (필요에 따라 외부 설정값과 연동 가능)
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
    
    // 💡 HTML에서 사수 좌우 위치 값을 안전하게 읽어옵니다.
    const playerZ = parseFloat(document.getElementById('playerZ').value) || 0;

    const pitchRad = pitchDeg * Math.PI / 180;
    const yawRad = yawDeg * Math.PI / 180;

    // 화살 초기 위치 설정 (사수 위치 적용)
    arrowState.x = 0; 
    arrowState.y = launchH; 
    arrowState.z = playerZ; // 💡 읽어온 사수 위치를 시작 Z 좌표로 지정!
    
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
    
    // 💡 발사 순간에는 화면 표시 에러를 방지하기 위해 안전하게 주석 처리하거나 한 번만 호출합니다.
    if (typeof updateResults === "function") {
        updateResults();
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
    const windZ = parseFloat(document.getElementById('windY').value) || 0; // UI상의 windY를 물리적 Z풍으로 매핑

    const g = 9.81; 
    const dt = 0.016; // 대략 60fps 기준 시간 증분
    const area = Math.PI * Math.pow(d / 2, 2); 
    
    // 💡 정의되지 않아 에러를 내던 90번째 줄의 함수를 지우고 국궁 표준 규격(145m, 고도 0m) 고정값으로 안전하게 대체했습니다.
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

    // 공기역학 (항력 및 양력) 계산
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
    
    // 이전 위치 저장 (과녁 평면 충돌 체크용)
    const prevX = arrowState.x; 
    const prevY = arrowState.y; 
    const prevZ = arrowState.z;

    // 오일러 적분을 통한 속도 및 위치 갱신
    arrowState.vx += ax * dt; 
    arrowState.vy += ay * dt; 
    arrowState.vz += az * dt;
    
    arrowState.x += arrowState.vx * dt; 
    arrowState.y += arrowState.vy * dt; 
    arrowState.z += arrowState.vz * dt;

    // 화살의 자세(각도) 갱신
    arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vz * arrowState.vz));
    arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);
    
    // 궤적 배열에 현재 위치 추가
    trajectory.push({ x: arrowState.x, y: arrowState.y, z: arrowState.z });

    // 최고 고도 및 비행시간 측정
    if (!hasReachedTargetX) { flightMetrics.flightTime += dt; }
    if (arrowState.y > flightMetrics.maxHeight) { flightMetrics.maxHeight = arrowState.y; }

    // 📐 과녁 평면(뒤로 15도 누움)과의 교차 판정
    const nx = Math.cos(TGT_TILT); 
    const ny = -Math.sin(TGT_TILT); // 측면도 기하학과 일치하도록 부호 수정 적용됨
    
    const distPrev = nx * (prevX - targetBaseX) + ny * (prevY - targetH);
    const distCurr = nx * (arrowState.x - targetBaseX) + ny * (arrowState.y - targetH);

    // 화살이 이번 프레임에 과녁 평면을 통과했는지 확인
    if (!hasIntersectedTargetPlane && distPrev * distCurr <= 0 && prevX < arrowState.x) {
        hasIntersectedTargetPlane = true;
        
        // 내분점을 이용한 정확한 충돌 시점의 Y, Z 좌표 보간(Interpolation)
        const s = Math.abs(distPrev) / (Math.abs(distPrev) + Math.abs(distCurr));
        const interY = prevY + (arrowState.y - prevY) * s;
        const interZ = prevZ + (arrowState.z - prevZ) * s;
        const centerWorldY = targetH + (TGT_H / 2) * Math.cos(TGT_TILT);

        // 과녁 중심 기준 로컬 좌표계로 변환
        targetHitMetrics.localZ = interZ;
        targetHitMetrics.localY = (interY - centerWorldY) / Math.cos(TGT_TILT);

        // 과녁판 크기(2m x 2m) 범위 안이면 관중(HIT) 판정
        if (Math.abs(targetHitMetrics.localZ) <= TGT_W / 2 && Math.abs(targetHitMetrics.localY) <= TGT_H / 2) {
            targetHitMetrics.isHit = true;
        } else {
            targetHitMetrics.isHit = false;
        }
        
        // 과녁 도달 순간의 데이터 확정
        hasReachedTargetX = true;
        flightMetrics.sideDeviation = arrowState.z; 
        flightMetrics.impactVelocity = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactEnergy = 0.5 * m * flightMetrics.impactVelocity * flightMetrics.impactVelocity;
    }

    // 🚀 [핵심 종료 조건] 과녁을 일정 거리 지나쳤거나 땅에 닿으면 비행 종료
    if (arrowState.x > targetBaseX + 15 || arrowState.y <= 0) {
        isFlying = false;
        
        // 최종 비행 결과를 한 번만 UI에 반영합니다.
        if (typeof updateResults === "function") {
            updateResults(); 
        }
        
        // 시뮬레이션 종료 후 화면 렌더링 강제 실행
        if (typeof drawScene === "function") {
            drawScene(); 
        }
        return; 
    }

    // 비행이 끝나지 않았다면 다음 프레임 예약
    requestAnimationFrame(animate);
}
