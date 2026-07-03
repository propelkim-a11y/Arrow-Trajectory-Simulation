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

// 3차원 좌표계 기본 정의: x = 종축(전진), y = 수직축(높이), z = 횡축(측면 수평)
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

    arrowState.x = 0; 
    arrowState.y = launchH; 
    arrowState.z = 0;
    
    // 3차원 발사 초기 속도 벡터 분해
    arrowState.vx = v0 * Math.cos(pitchRad) * Math.cos(yawRad);
    arrowState.vy = v0 * Math.sin(pitchRad);
    arrowState.vz = v0 * Math.cos(pitchRad) * Math.sin(yawRad);
    arrowState.pitch = pitchRad; 
    arrowState.yaw = yawRad;

    trajectory = [{x: arrowState.x, y: arrowState.y, z: arrowState.z}];
    isFlying = true;
    animate();
}

function animate() {
    if (!isFlying) return;

    // 입력값 로드 및 단위 변환
    const cd = parseFloat(document.getElementById('dragCoeff').value) || 0;
    const cl = parseFloat(document.getElementById('liftCoeff').value) || 0;
    const d = (parseFloat(document.getElementById('diameter').value) || 5.5) / 1000; // mm -> m
    const m = (parseFloat(document.getElementById('weight').value) || 25) / 1000;    // g -> kg
    const rho = parseFloat(document.getElementById('airDensity').value) || 1.225;
    
    const windX = parseFloat(document.getElementById('windX').value) || 0; // 종풍 (x축)
    const windZ = parseFloat(document.getElementById('windY').value) || 0; // 횡풍 (y 입력값을 물리 z축으로 매핑)

    const g = 9.81; 
    const dt = 0.016; 
    const area = Math.PI * Math.pow(d / 2, 2); // 단면적

    // 바람을 고려한 대기 상대 속도 벡터 계산
    const relVx = arrowState.vx - windX; 
    const relVy = arrowState.vy; 
    const relVz = arrowState.vz - windZ;
    const vRel = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz) || 0.001;

    // 항력 및 양력 크기 계산
    const dragF = 0.5 * rho * vRel * vRel * cd * area;
    const liftF = 0.5 * rho * vRel * vRel * cl * area;

    // 공기역학적 유동 각도 (대기 상대 속도 기준)
    const flowPitch = Math.atan2(relVy, Math.sqrt(relVx * relVx + relVz * relVz));
    const flowYaw = Math.atan2(relVz, relVx);

    // 1. 항력 벡터 분해 (상대 풍속 방향의 정반대)
    const dragAx = (-dragF * Math.cos(flowPitch) * Math.cos(flowYaw)) / m;
    const dragAy = (-dragF * Math.sin(flowPitch)) / m;
    const dragAz = (-dragF * Math.cos(flowPitch) * Math.sin(flowYaw)) / m;

    // 2. 양력 벡터 분해 (상대 풍속 방향에 수직 상방)
    // 수평 성분 방향 기준, 윗 방향 수직 벡터 투형 계산
    const liftAx = (-liftF * Math.sin(flowPitch) * Math.cos(flowYaw)) / m;
    const liftAy = (liftF * Math.cos(flowPitch)) / m;
    const liftAz = (-liftF * Math.sin(flowPitch) * Math.sin(flowYaw)) / m;

    // 3. 총 가속도 계산 (중력 가속도는 질량 m으로 나누지 않음)
    const ax = dragAx + liftAx;
    const ay = -g + dragAy + liftAy;
    const az = dragAz + liftAz;

    // 속도 및 위치 업데이트 (오일러 적분)
    arrowState.vx += ax * dt; 
    arrowState.vy += ay * dt; 
    arrowState.vz += az * dt;
    
    arrowState.x += arrowState.vx * dt; 
    arrowState.y += arrowState.vy * dt; 
    arrowState.z += arrowState.vz * dt;

    // 화살의 자세(각도)를 진행 방향 속도 벡터와 일치시킴
    arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vz * arrowState.vz));
    arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);

    // 궤적 배열에 현재 위치 추가
    trajectory.push({x: arrowState.x, y: arrowState.y, z: arrowState.z});

    // 지면 충돌 검사 (y <= 0) 및 화면 이탈 검사
    if (arrowState.y <= 0) { 
        arrowState.y = 0; 
        isFlying = false; 
    }
    if ((arrowState.x * SCALE) + ORIGIN_X_OFFSET > dprWidth + 100 || arrowState.x < -10) {
        isFlying = false;
    }

    drawScene();
    if (isFlying) {
        animationFrameId = requestAnimationFrame(animate);
    }
}

function drawScene() {
    if (dprWidth === 0 || dprHeight === 0) return;
    ctx.clearRect(0, 0, dprWidth, dprHeight);
    const targetH = parseFloat(document.getElementById('targetHeight').value) || 0;
    const targetScreenX = dprWidth - 80;

    // 시점별 3차원 -> 2차원 화면 좌표 변환 함수
    function toScreen(pX, pY, pZ) {
        if (currentView === 'side') { // 측면도: X축(수평), Y축(수직)
            return { 
                x: ORIGIN_X_OFFSET + (pX * SCALE), 
                y: dprHeight - GROUND_Y_OFFSET - (pY * SCALE) 
            };
        }
        if (currentView === 'top') { // 평면도: X축(수평), Z축(수직 방향 화면 전개)
            return { 
                x: ORIGIN_X_OFFSET + (pX * SCALE), 
                y: (dprHeight / 2) + (pZ * SCALE) 
            };
        }
        // 정면도: Z축(좌우), Y축(수직)
        return { 
            x: (dprWidth / 2) + (pZ * SCALE), 
            y: dprHeight - GROUND_Y_OFFSET - (pY * SCALE) 
        };
    }

    // 측면 눈금선 그리기
    if (currentView === 'side') {
        ctx.strokeStyle = '#e5e5ea'; 
        ctx.lineWidth = 1; 
        ctx.font = '10px -apple-system'; 
        ctx.fillStyle = '#8e8e93';
        
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

    // 과녁 그리기
    const tgt = toScreen((targetScreenX - ORIGIN_X_OFFSET) / SCALE, targetH, 0);
    ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 6, 0, Math.PI * 2); ctx.fill();
    
    if (currentView === 'side' || currentView === 'front') {
        ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 2; ctx.beginPath(); 
        ctx.moveTo(tgt.x, tgt.y + 12); ctx.lineTo(tgt.x, dprHeight - GROUND_Y_OFFSET); 
        ctx.stroke();
    }

    // 화살 궤적 선 그리기
    if (trajectory.length > 1) {
        ctx.strokeStyle = '#0071e3'; ctx.lineWidth = 2.5; ctx.beginPath();
        const start = toScreen(trajectory[0].x, trajectory[0].y, trajectory[0].z); 
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < trajectory.length; i++) { 
            const pt = toScreen(trajectory[i].x, trajectory[i].y, trajectory[i].z); 
            ctx.lineTo(pt.x, pt.y); 
        }
        ctx.stroke();
    }

    // 현재 화살 오브젝트 그리기
    const arrowPos = toScreen(arrowState.x, arrowState.y, arrowState.z);
    ctx.save(); 
    ctx.translate(arrowPos.x, arrowPos.y);
    
    let angleRad = 0; 
    if (currentView === 'side') angleRad = -arrowState.pitch; 
    else if (currentView === 'top') angleRad = arrowState.yaw;
    
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
