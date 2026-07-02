// ============================================================================
// [Physics Core] 국궁 탄도학 시뮬레이션 물리 연산 엔진
// ============================================================================

// 전역 시뮬레이션 상태 변수
let canvas, ctx;
let animationFrameId = null;
let trajectoryData = []; // 화살 궤적 좌표 기록용 데이터 배열

// 초기화 바인딩
window.addEventListener('load', () => {
    canvas = document.getElementById('simCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        drawScene(); // 초기 캔버스 화면 렌더링
    }
});

// 캔버스 리사이즈 
function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    drawScene();
}

// 캔버스 그리기 메인 루틴 (시점별 정밀 투영)
function drawScene() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 축 가이드라인 및 배경 연출
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 50; i < canvas.width; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let j = 50; j < canvas.height; j += 50) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
    }

    // 궤적 데이터가 존재할 경우 화면에 드로잉
    if (trajectoryData.length > 0) {
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#0071e3'; // 프리미엄 블루 컬러 매핑
        
        trajectoryData.forEach((point, index) => {
            let screenX = 0;
            let screenY = 0;
            
            // 사용자가 선택한 시점(currentView)에 따른 투영 좌표 변환
            if (currentView === 'side') {
                // 측면도: X축(거리) -> 화면가로, Z축(높이) -> 화면세로
                screenX = (point.x / 160) * (canvas.width * 0.8) + (canvas.width * 0.1);
                screenY = canvas.height * 0.85 - (point.z / 40) * (canvas.height * 0.7);
            } else if (currentView === 'front') {
                // 정면도: Y축(측면편차) -> 화면가로, Z축(높이) -> 화면세로
                screenX = canvas.width / 2 + (point.y / 10) * (canvas.width * 0.4);
                screenY = canvas.height * 0.85 - (point.z / 40) * (canvas.height * 0.7);
            } else if (currentView === 'top') {
                // 평면도: X축(거리) -> 화면가로, Y축(측면편차) -> 화면세로
                screenX = (point.x / 160) * (canvas.width * 0.8) + (canvas.width * 0.1);
                screenY = canvas.height / 2 + (point.y / 10) * (canvas.height * 0.4);
            }
            
            if (index === 0) ctx.moveTo(screenX, screenY);
            else ctx.lineTo(screenX, screenY);
        });
        ctx.stroke();
    }
}

// [핵심 엔진] 화살 시뮬레이션 발사 및 수치 해석 연산 루프
function fireArrow() {
    // 1. DOM 엘리먼트 데이터 파싱 및 캡처
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
    const targetH = parseFloat(document.getElementById('targetHeight').value) || 1.3;
    const rho = parseFloat(document.getElementById('airDensity').value) || 1.225;

    // 2. 물리 단위 변환 (방어적 결함 헷징)
    const mass = wGram / 1000; // Gram -> kg 변환 (제2조 연산폭발 방어)
    const radius = (dMm / 1000) / 2; // mm -> m 반지름 변환
    const area = Math.PI * Math.pow(radius, 2); // 화살 투영 단면적 (A)
    const g = 9.80665; // 표준 중력 가속도

    // 호도법 각도 변환
    const theta = thetaDeg * Math.PI / 180; // 수직 발사각
    const psi = psiDeg * Math.PI / 180;     // 수평 방위각

    // 초기 속도 벡터 성분 분해 (3차원)
    // x: 정면 진행 방향, y: 측면 편차 방향, z: 수직 높이 방향
    let vx = v0 * Math.cos(theta) * Math.cos(psi);
    let vy = v0 * Math.cos(theta) * Math.sin(psi);
    let vz = v0 * Math.sin(theta);

    // 초기 위치 좌표 설정
    let x = 0;
    let y = 0;
    let z = h0;

    // 실시간 비행 추적 변수 초기화
    let t = 0;
    const dt = 0.005; // 수치해석 타임스텝 (5ms 정밀도)
    let maxDistance = 0;
    let maxHeight = z;
    let maxLoopGuard = 10000; // [제2조] 브라우저 락업 무한루프 차단 안전장치

    trajectoryData = []; // 이전 아카이브 궤적 초기화
    trajectoryData.push({ x: x, y: y, z: z });

    // 3. 수치 해석 순방향 오일러 통합 루프 오퍼레이션
    while (z >= 0 && maxLoopGuard > 0) {
        maxLoopGuard--;

        // 상대 속도 벡터 계산 (바람 벡터 반영)
        // 종풍(windX)이 오늬바람(+)이면 화살 속도가 상대적으로 줄고, 촉바람(-)이면 상대 속도가 증가함
        const relVx = vx - windX;
        const relVy = vy - windY;
        const relVz = vz;
        const relV = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz) || 0.0001;

        // 항력(Drag Force) 계산
        const fd = 0.5 * cd * rho * area * relV * relV;
        const fdx = -fd * (relVx / relV);
        const fdy = -fd * (relVy / relV);
        const fdz = -fd * (relVz / relV);

        // 양력(Lift Force) 계산 (수직 상방 작용 가속도)
        const fl = 0.5 * cl * rho * area * relV * relV;
        const flz = fl; 

        // 가속도 계산 (F = ma -> a = F/m)
        const ax = fdx / mass;
        const ay = fdy / mass;
        const az = -g + (fdz / mass) + (flz / mass);

        // 속도 갱신
        vx += ax * dt;
        vy += ay * dt;
        vz += az * dt;

        // 위치 좌표 갱신
        x += vx * dt;
        y += vy * dt;
        z += vz * dt;
        t += dt;

        // 실시간 연산 스냅샷 트래킹
        if (z > maxHeight) maxHeight = z;
        maxDistance = x;

        // 시각화용 궤적 프레임 샘플링 데이터 세이브
        trajectoryData.push({ x: x, y: y, z: z });
    }

    // 4. 최종 경계 조건 및 충돌 순간 물리 지표 추출
    const finalV = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const impactEnergy = 0.5 * mass * finalV * finalV;

    // 5. [제4조 인터페이스 통합] UI 브릿지 객체 데이터 패킹 송신
    const flightResults = {
        maxDistance: maxDistance,
        maxHeight: maxHeight,
        lateralDeviation: y,
        flightTime: t,
        impactVelocity: finalV,
        impactEnergy: impactEnergy
    };

    // ui.js의 전역 데이터 주입 함수 트리거 호출
    if (typeof updateFlightResultsUI === 'function') {
        updateFlightResultsUI(flightResults);
    }

    // 6. 그래픽 디스플레이 스케줄러 동기화 호출
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(drawScene);
}
