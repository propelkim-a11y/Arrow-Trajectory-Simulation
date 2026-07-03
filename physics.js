// ============================================================================
// 국궁 탄도학 시뮬레이션 물리 연산 및 렌더링 엔진 (통합 완결본)
// ============================================================================

// 전역 시뮬레이션 상태 변수
let canvas, ctx;
let animationFrameId = null;
let trajectoryData = []; // 화살 비행 궤적 데이터 저장 배열

// 화면 로드 완료 시 초기화 및 첫 가상 발사
window.addEventListener('load', () => {
    canvas = document.getElementById('simCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        fireArrow(); 
    }
});

// 브라우저 리사이즈 대응
function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if (typeof drawScene === 'function') drawScene();
}

// 화살 발사 및 물리 미분 방정식 계산 루틴
function fireArrow() {
    // 1. UI 입력값 실시간 캡처 및 예외 방어 파싱
    const v0 = parseFloat(document.getElementById('velocity').value) || 50;
    const thetaDeg = parseFloat(document.getElementById('angle').value) || 30;
    const psiDeg = parseFloat(document.getElementById('yawAngle').value) || 0;

    const cd = parseFloat(document.getElementById('dragCoeff').value) || 0.35;
    const cl = parseFloat(document.getElementById('liftCoeff').value) || 0.05;
    const wGram = parseFloat(document.getElementById('weight').value) || 25;
    const dMm = parseFloat(document.getElementById('diameter').value) || 5.5;
    const h0 = parseFloat(document.getElementById('launchHeight').value) || 1.5;

    const windX = parseFloat(document.getElementById('windX').value) || 0;
    const windY = parseFloat(document.getElementById('windY').value) || 0;
    const rho = parseFloat(document.getElementById('airDensity').value) || 1.225;

    // 2. 물리 단위계 변환 (g -> kg, mm -> m)
    const mass = wGram / 1000; 
    const radius = (dMm / 1000) / 2; 
    const area = Math.PI * Math.pow(radius, 2); 
    const g = 9.80665; // 표준 중력 가속도

    // 호도법(Radian) 변환
    const theta = thetaDeg * Math.PI / 180; 
    const psi = psiDeg * Math.PI / 180; 

    // 3차원 속도 벡터 성분 분해 (x: 전방, y: 측면 편차, z: 높이)
    let vx = v0 * Math.cos(theta) * Math.cos(psi);
    let vy = v0 * Math.cos(theta) * Math.sin(psi);
    let vz = v0 * Math.sin(theta);

    // 초기 공간 좌표 설정
    let x = 0;
    let y = 0;
    let z = h0;

    let t = 0;
    const dt = 0.005; // 5ms 고정 정밀도 타임스텝
    let maxDistance = 0;
    let maxHeight = z;
    let maxLoopGuard = 10000; // 무한루프 가드

    trajectoryData = []; 
    trajectoryData.push({ x: x, y: y, z: z });

    // 3. 수치해석 역학 통합 연산 루프
    while (z >= 0 && maxLoopGuard > 0) {
        maxLoopGuard--;

        // 바람을 고려한 화살의 공기역학적 상대속도 계산
        const relVx = vx - windX;
        const relVy = vy - windY;
        const relVz = vz;
        const relV = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz) || 0.0001;

        // 공기저항 항력(Drag Force) 계산
        const fd = 0.5 * cd * rho * area * relV * relV;
        const fdx = -fd * (relVx / relV);
        const fdy = -fd * (relVy / relV);
        const fdz = -fd * (relVz / relV);

        // 양력(Lift Force) 계산
        const fl = 0.5 * cl * rho * area * relV * relV;
        const flz = fl;

        // 뉴턴 가속도 도출 (a = F / m)
        const ax = fdx / mass;
        const ay = fdy / mass;
        const az = -g + (fdz / mass) + (flz / mass);

        // 다음 단계 속도 및 위치 좌표 갱신
        vx += ax * dt;
        vy += ay * dt;
        vz += az * dt;

        x += vx * dt;
        y += vy * dt;
        z += vz * dt;
        t += dt;

        if (z > maxHeight) maxHeight = z;
        maxDistance = x;

        trajectoryData.push({ x: x, y: y, z: z });
    }

    // 4. 최종 영점 충돌 순간의 물리 데이터 산출
    const finalV = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const impactEnergy = 0.5 * mass * finalV * finalV;

    const flightResults = {
        maxDistance: maxDistance,
        maxHeight: maxHeight,
        lateralDeviation: y,
        flightTime: t,
        impactVelocity: finalV,
        impactEnergy: impactEnergy
    };

    // UI 모듈로 결과 데이터 인젝션
    if (typeof updateFlightResultsUI === 'function') {
        updateFlightResultsUI(flightResults);
    }

    // 애니메이션 캔버스 드로잉 호출
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(drawScene);
}

// HTML5 Canvas 시점별 렌더링 엔진
function drawScene() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 배경 그리드 레이어 드로잉
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 50; i < canvas.width; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let j = 50; j < canvas.height; j += 50) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
    }

    const targetH = parseFloat(document.getElementById('targetHeight').value) || 1.3;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "SF Pro Text"';
    ctx.textBaseline = 'middle';

    const viewMode = typeof currentView !== 'undefined' ? currentView : 'side';

    // 2. 시점별(측면/정면/평면) 좌표축 및 눈금자 표현
    if (viewMode === 'side') {
        const startX = canvas.width * 0.1;
        const endX = canvas.width * 0.9;
        const groundY = canvas.height * 0.85;
        const topY = canvas.height * 0.15;

        ctx.strokeStyle = '#1d1d1f';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(startX - 20, groundY); ctx.lineTo(endX + 20, groundY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(startX, groundY + 10); ctx.lineTo(startX, topY - 20); ctx.stroke();

        ctx.fillStyle = '#86868b';
        ctx.textAlign = 'left';
        ctx.fillText('X (m) 거리', endX + 25, groundY);
        ctx.textAlign = 'center';
        ctx.fillText('Z (m) 높이', startX, topY - 30);

        // [정상 수정] 비어있던 거리를 20m 간격 및 145m 타겟으로 명확히 채움
        const distances =;
        distances.forEach(d => {
            const tickX = startX + (d / 160) * (canvas.width * 0.8);
            ctx.strokeStyle = d === 145 ? '#ff453a' : 'rgba(0,0,0,0.15)'; 
            ctx.lineWidth = d === 145 ? 1.5 : 1;
            ctx.beginPath(); ctx.moveTo(tickX, groundY); ctx.lineTo(tickX, groundY + 5); ctx.stroke();

            ctx.fillStyle = d === 145 ? '#ff453a' : '#515154';
            ctx.font = d === 145 ? 'bold 11px -apple-system' : '11px -apple-system';
            ctx.fillText(d + 'm', tickX, groundY + 18);
        });

        // [정상 수정] 비어있던 높이를 10m 간격 정수 배열로 채움
        const heights =;
        ctx.font = '11px -apple-system';
        ctx.fillStyle = '#515154';
        ctx.textAlign = 'right';
        heights.forEach(h => {
            const tickY = groundY - (h / 40) * (canvas.height * 0.7);
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath(); ctx.moveTo(startX, tickY); ctx.lineTo(startX - 5); ctx.stroke();
            ctx.fillText(h + 'm', startX - 10, tickY);
        });

        // 145m 국궁 과녁 십자 보조선 처리
        const targetX145 = startX + (145 / 160) * (canvas.width * 0.8);
        const targetYPos = groundY - (targetH / 40) * (canvas.height * 0.7);
        ctx.strokeStyle = 'rgba(255, 69, 58, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]); 
        ctx.beginPath(); ctx.moveTo(startX, targetYPos); ctx.lineTo(targetX145, targetYPos); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(targetX145, groundY); ctx.lineTo(targetX145, targetYPos); ctx.stroke();
        ctx.setLineDash([]); 

        ctx.fillStyle = '#ff453a';
        ctx.beginPath(); ctx.arc(targetX145, targetYPos, 5, 0, 2 * Math.PI); ctx.fill();
        ctx.font = 'bold 11px -apple-system';
        ctx.fillText('국궁과녁 (145m)', targetX145 - 10, targetYPos - 12);

    } else if (viewMode === 'front') {
        const midX = canvas.width / 2;
        const groundY = canvas.height * 0.85;
        const topY = canvas.height * 0.15;

        ctx.strokeStyle = '#1d1d1f';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(midX - (canvas.width * 0.4) - 20, groundY); ctx.lineTo(midX + (canvas.width * 0.4) + 20, groundY); ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(midX, groundY + 10); ctx.lineTo(midX, topY - 20); ctx.stroke();

        ctx.fillStyle = '#86868b';
        ctx.textAlign = 'left';
        ctx.fillText('Y (m) 측면 편차', midX + (canvas.width * 0.4) + 25, groundY);
        ctx.textAlign = 'center';
        ctx.fillText('Z (m) 높이', midX, topY - 30);

        const deviations = [-5, -2.5, 0, 2.5, 5];
        ctx.textAlign = 'center';
        deviations.forEach(d => {
            const tickX = midX + (d / 10) * (canvas.width * 0.4);
            ctx.strokeStyle = d === 0 ? '#0071e3' : 'rgba(0,0,0,0.15)';
            ctx.beginPath(); ctx.moveTo(tickX, groundY); ctx.lineTo(tickX, groundY + 5); ctx.stroke();
            ctx.fillStyle = d === 0 ? '#0071e3' : '#515154';
            ctx.fillText(d + 'm', tickX, groundY + 18);
        });

        const targetYPos = groundY - (targetH / 40) * (canvas.height * 0.7);
        ctx.strokeStyle = 'rgba(255, 69, 58, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(midX - 30, targetYPos); ctx.lineTo(midX + 30, targetYPos); ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ff453a';
        ctx.beginPath(); ctx.arc(midX, targetYPos, 5, 0, 2 * Math.PI); ctx.fill();
        ctx.font = 'bold 11px -apple-system';
        ctx.fillText('과녁 중심점', midX, targetYPos - 12);

    } else if (viewMode === 'top') {
        const startX = canvas.width * 0.1;
        const endX = canvas.width * 0.9;
        const midY = canvas.height / 2;

        ctx.strokeStyle = '#1d1d1f';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(startX - 20, midY); ctx.lineTo(endX + 20, midY); ctx.stroke();

ctx.fillStyle = '#86868b';
ctx.textAlign = 'left';
ctx.fillText('X (m) 거리', endX + 25, midY);
ctx.textAlign = 'center';
ctx.fillText('Y (m) 측면 편차', startX, midY - (canvas.height * 0.4) - 20);

// (정상 수정) 평면 뷰 수평 눈금도 배열 데이터를 제대로 지정함
const distances =;
ctx.textAlign = 'center';
distances.forEach(d => {
    const tickX = startX + (d / 160) * (canvas.width * 0.8);
    ctx.strokeStyle = d === 145 ? '#ff453a' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = d === 145 ? 1.5 : 1;
    ctx.beginPath(); ctx.moveTo(tickX, midY - 5); ctx.lineTo(tickX, midY + 5); ctx.stroke();
    ctx.fillStyle = d === 145 ? '#ff453a' : '#515154';
    ctx.font = d === 145 ? 'bold 11px -apple-system' : '11px -apple-system';
    ctx.fillText(d + 'm', tickX, midY + 18);
});

const targetX145 = startX + (145 / 160) * (canvas.width * 0.8);
ctx.strokeStyle = '#ff453a';
ctx.lineWidth = 2;
ctx.beginPath(); ctx.moveTo(targetX145, midY - 15); ctx.lineTo(targetX145, midY + 15); ctx.stroke();
ctx.fillStyle = '#ff453a';
ctx.font = 'bold 11px -apple-system';
ctx.textAlign = 'left';
ctx.fillText('과녁 라인', targetX145 + 8, midY - 8);
}

// 3. 최상단 실시간 화살 비행 궤적 선 그리기
if (trajectoryData.length > 0) {
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0071e3';
    
    trajectoryData.forEach((point, index) => {
        let screenX = 0;
        let screenY = 0;
        
        if (viewMode === 'side') {
            screenX = (point.x / 160) * (canvas.width * 0.8) + (canvas.width * 0.1);
            screenY = (canvas.height * 0.85) - (point.z / 40) * (canvas.height * 0.7);
        } else if (viewMode === 'front') {
            screenX = (canvas.width / 2) + (point.y / 10) * (canvas.width * 0.4);
            screenY = (canvas.height * 0.85) - (point.z / 40) * (canvas.height * 0.7);
        } else if (viewMode === 'top') {
            screenX = (point.x / 160) * (canvas.width * 0.8) + (canvas.width * 0.1);
            screenY = (canvas.height / 2) + (point.y / 10) * (canvas.height * 0.4);
        }
        
        if (index === 0) ctx.moveTo(screenX, screenY);
        else ctx.lineTo(screenX, screenY);
    });
    ctx.stroke();
}
