// =================================================================================
// [Physics Core - Part 1] 모바일 가속 및 NaN 가드 탑재 국궁 물리 연산 엔진 (v1.1.0)
// =================================================================================

// 전역 시뮬레이션 상태 인프라 변수
let canvas, ctx;
let animationFrameId = null;
let trajectoryData = []; // 화살 비행 궤적 좌표 축적 데이터 배열
let resizeTimeout = null; // 모바일 하드웨어 락업 방지 디바운스 타이머

// 초기화 이벤트 리스너 바인딩
window.addEventListener('load', () => {
    canvas = document.getElementById('simCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        resizeCanvas();
        
        // 모바일 기기 방향 전환(Orientation) 및 상하단 가상 바 스크롤 리사이징 레이어 결착
        window.addEventListener('resize', () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                resizeCanvas();
            }, 100); // 100ms 디바운스로 모바일 무한 리사이징 루프 락업 완전 격파
        });
        
        fireArrow(); // 로드 완료 직후 첫 프레임 계산 강제 구동
    }
});

// 브라우저 리사이징 대응 뷰포트 정렬
function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    
    // 모바일 캔버스 디바이스 픽셀 비율(DPR) 반영으로 선명도 극대화 및 화질 흐림 방지
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    if (ctx) {
        ctx.scale(dpr, dpr);
    }
    
    if (typeof drawScene === 'function') drawScene();
}

// [핵심 연산 루틴] 화살 시뮬레이션 발사 및 역학 미분 방정식 수치 해석
function fireArrow() {
    // 1. UI 입력 폼 엘리먼트 데이터 실시간 캡처 및 파싱 (모바일 입력 차단 완벽 방어 안전가드)
    const getVal = (id, def) => {
        const el = document.getElementById(id);
        if (!el || el.value.trim() === "") return def;
        const val = parseFloat(el.value);
        return isNaN(val) ? def : val;
    };

    const v0 = getVal('velocity', 50);
    const thetaDeg = getVal('angle', 30);
    const psiDeg = getVal('yawAngle', 0);
    
    const cd = getVal('dragCoeff', 0.35);
    const cl = getVal('liftCoeff', 0.05);
    const wGram = getVal('weight', 25);
    const dMm = getVal('diameter', 5.5);
    const h0 = getVal('launchHeight', 1.5);
    
    const windX = getVal('windX', 0);
    const windY = getVal('windY', 0);
    const rho = getVal('airDensity', 1.225);

    // 2. 물리 표준 단위계 변환
    const mass = wGram / 1000 || 0.025; 
    const radius = (dMm / 1000) / 2; 
    const area = Math.PI * Math.pow(radius, 2); 
    const g = 9.80665; 

    const theta = thetaDeg * Math.PI / 180; 
    const psi = psiDeg * Math.PI / 180; 

    // 3차원 공간 속도 벡터 성분 분해
    let vx = v0 * Math.cos(theta) * Math.cos(psi);
    let vy = v0 * Math.cos(theta) * Math.sin(psi);
    let vz = v0 * Math.sin(theta);

    let x = 0;
    let y = 0;
    let z = h0;

    let t = 0;
    const dt = 0.005; // 5ms 고정 정밀도 타임 스텝 설정
    let maxDistance = 0;
    let maxHeight = z;
    let maxLoopGuard = 10000; 

    trajectoryData = []; 
    trajectoryData.push({ x: x, y: y, z: z });

    // 3. 전진 오일러 역학 해석 통합 연산 루프 진입
    while (z >= 0 && maxLoopGuard > 0) {
        maxLoopGuard--;

        const relVx = vx - windX;
        const relVy = vy - windY;
        const relVz = vz;
        const relV = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz) || 0.0001;

        const fd = 0.5 * cd * rho * area * relV * relV;
        const fdx = -fd * (relVx / relV);
        const fdy = -fd * (relVy / relV);
        const fdz = -fd * (relVz / relV);

        const fl = 0.5 * cl * rho * area * relV * relV;
        const flz = fl; 

        const ax = fdx / mass;
        const ay = fdy / mass;
        const az = -g + (fdz / mass) + (flz / mass);

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

    const finalV = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const impactEnergy = 0.5 * mass * finalV * finalV;

    // 4. 구조화된 비행 연산 결과 데이터 패킹 변환
    const flightResults = {
        maxDistance: maxDistance,
        maxHeight: maxHeight,
        lateralDeviation: y,
        flightTime: t,
        impactVelocity: finalV,
        impactEnergy: impactEnergy
    };

    // ui.js 결과 패널 업데이트 다이렉트 트리거 연동
    if (typeof updateFlightResultsUI === 'function') {
        updateFlightResultsUI(flightResults);
    }

    // 5. 그래픽 프레임 디스플레이 렌더러 애니메이션 호출 동기화
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(drawScene);
}
// =================================================================================
// [Physics Core - Part 2] 모바일 가속 및 격자 깨짐 복구 스크린 렌더링 엔진 (v1.1.0)
// =================================================================================

function drawScene() {
    if (!ctx || !canvas) return;
    
    // 모바일 물리적 화면 크기 실시간 파싱 계산을 위해 상위 래퍼 기준 좌표 추출
    const container = canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;
    
    ctx.clearRect(0, 0, w, h);
    
    // --------------------------------------------------------------------------
    // 1. 구조 배경 베이스 그리드 레이어 (Grid Layer)
    // --------------------------------------------------------------------------
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 50; i < w; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let j = 50; j < h; j += 50) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
    }

    const targetHeightEl = document.getElementById('targetHeight');
    const targetH = (targetHeightEl && targetHeightEl.value !== "") ? parseFloat(targetHeightEl.value) : 1.3;

    // --------------------------------------------------------------------------
    // 2. 프리미엄 계측 좌표축 및 과녁 보조선 레이어 (SF Pro 서체 규격 탑재)
    // --------------------------------------------------------------------------
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif';
    ctx.textBaseline = 'middle';
    
    const viewMode = typeof currentView !== 'undefined' ? currentView : 'side';

    if (viewMode === 'side') {
        const startX = w * 0.12; // 모바일 화면 터치 여백 레이아웃 보정
        const endX = w * 0.88;
        const groundY = h * 0.82;
        const topY = h * 0.18;

        ctx.strokeStyle = '#1d1d1f';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(startX - 10, groundY); ctx.lineTo(endX + 10, groundY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(startX, groundY + 5); ctx.lineTo(startX, topY - 10); ctx.stroke();

        ctx.fillStyle = '#86868b';
        ctx.textAlign = 'left';
        ctx.fillText('X (m)', endX + 15, groundY);
        ctx.textAlign = 'center';
        ctx.fillText('Z (m)', startX, topY - 20);

        // 거리 눈금 스케일
        const distances = ;
        distances.forEach(d => {
            const tickX = startX + (d / 160) * (endX - startX);
            ctx.strokeStyle = d === 145 ? '#ff453a' : 'rgba(0,0,0,0.15)';
            ctx.lineWidth = d === 145 ? 1.5 : 1;
            
            ctx.beginPath(); ctx.moveTo(tickX, groundY); ctx.lineTo(tickX, groundY + 4); ctx.stroke();
            
            ctx.fillStyle = d === 145 ? '#ff453a' : '#515154';
            ctx.font = d === 145 ? 'bold 10px -apple-system' : '10px -apple-system';
            ctx.fillText(d, tickX, groundY + 15);
        });

        // 높이 눈금 스케일
        const heights = ;
        ctx.font = '10px -apple-system';
        ctx.fillStyle = '#515154';
        ctx.textAlign = 'right';
        heights.forEach(hVal => {
            const tickY = groundY - (hVal / 40) * (groundY - topY);
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath(); ctx.moveTo(startX, tickY); ctx.lineTo(startX - 4); ctx.stroke();
            ctx.fillText(hVal, startX - 8, tickY);
        });

        // 과녁 크로스 마커
        const targetX145 = startX + (145 / 160) * (endX - startX);
        const targetYPos = groundY - (targetH / 40) * (groundY - topY);
        ctx.strokeStyle = 'rgba(255, 69, 58, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash(); // 모바일 크래시 방지 고정값 주입
        ctx.beginPath(); ctx.moveTo(startX, targetYPos); ctx.lineTo(targetX145, targetYPos); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(targetX145, groundY); ctx.lineTo(targetX145, targetYPos); ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ff453a';
        ctx.beginPath(); ctx.arc(targetX145, targetYPos, 4, 0, 2 * Math.PI); ctx.fill();

    } else if (viewMode === 'front') {
        const midX = w / 2;
        const groundY = h * 0.82;
        const topY = h * 0.18;

        ctx.strokeStyle = '#1d1d1f';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(midX - (w * 0.38), groundY); ctx.lineTo(midX + (w * 0.38), groundY); ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.beginPath(); ctx.moveTo(midX, groundY + 5); ctx.lineTo(midX, topY - 10); ctx.stroke();

        ctx.fillStyle = '#86868b';
        ctx.textAlign = 'left';
        ctx.fillText('Y (m)', midX + (w * 0.38) + 10, groundY);
        ctx.textAlign = 'center';
        ctx.fillText('Z (m)', midX, topY - 20);

        const deviations = [-5, -2.5, 0, 2.5, 5];
        ctx.textAlign = 'center';
        deviations.forEach(d => {
            const tickX = midX + (d / 10) * (w * 0.76);
            ctx.strokeStyle = d === 0 ? '#0071e3' : 'rgba(0,0,0,0.15)';
            ctx.beginPath(); ctx.moveTo(tickX, groundY); ctx.lineTo(tickX, groundY + 4); ctx.stroke();
            
            ctx.fillStyle = d === 0 ? '#0071e3' : '#515154';
            ctx.fillText(d, tickX, groundY + 15);
        });

        const targetYPos = groundY - (targetH / 40) * (groundY - topY);
        ctx.strokeStyle = 'rgba(255, 69, 58, 0.4)';
        ctx.setLineDash();
        ctx.beginPath(); ctx.moveTo(midX - 20, targetYPos); ctx.lineTo(midX + 20, targetYPos); ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ff453a';
        ctx.beginPath(); ctx.arc(midX, targetYPos, 4, 0, 2 * Math.PI); ctx.fill();

    } else if (viewMode === 'top') {
        const startX = w * 0.12;
        const endX = w * 0.88;
        const midY = h / 2;

        ctx.strokeStyle = '#1d1d1f';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(startX - 10, midY); ctx.lineTo(endX + 10, midY); ctx.stroke();

        ctx.fillStyle = '#86868b';
        ctx.textAlign = 'left';
        ctx.fillText('X (m)', endX + 15, midY);
        ctx.textAlign = 'center';
        ctx.fillText('Y (m)', startX, midY - (h * 0.35));

        const distances = ;
        ctx.textAlign = 'center';
        distances.forEach(d => {
            const tickX = startX + (d / 160) * (endX - startX);
            ctx.strokeStyle = d === 145 ? '#ff453a' : 'rgba(0,0,0,0.15)';
            ctx.lineWidth = d === 145 ? 1.5 : 1;
            
            ctx.beginPath(); ctx.moveTo(tickX, midY - 4); ctx.lineTo(tickX, midY + 4); ctx.stroke();
            
            ctx.fillStyle = d === 145 ? '#ff453a' : '#515154';
            ctx.font = d === 145 ? 'bold 10px -apple-system' : '10px -apple-system';
            ctx.fillText(d, tickX, midY + 15);
        });

        const targetX145 = startX + (145 / 160) * (endX - startX);
        ctx.strokeStyle = '#ff453a';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(targetX145, midY - 12); ctx.lineTo(targetX145, midY + 12); stroke();
    }

    // --------------------------------------------------------------------------
    // 3. 최상단 최우선 순위 비행 탄도 궤적 렌더링 레이어
    // --------------------------------------------------------------------------
    if (trajectoryData.length > 0) {
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#0071e3'; // 프리미엄 네온 블루 칼라
        
        const startX = w * 0.12;
        const endX = w * 0.88;
        const groundY = h * 0.82;
        const topY = h * 0.18;

        trajectoryData.forEach((point, index) => {
            let screenX = 0;
            let screenY = 0;
            
            if (viewMode === 'side') {
                screenX = startX + (point.x / 160) * (endX - startX);
                screenY = groundY - (point.z / 40) * (groundY - topY);
            } else if (viewMode === 'front') {
                screenX = (w / 2) + (point.y / 10) * (w * 0.76);
                screenY = groundY - (point.z / 40) * (groundY - topY);
            } else if (viewMode === 'top') {
                screenX = startX + (point.x / 160) * (endX - startX);
                screenY = (h / 2) + (point.y / 10) * (h * 0.76);
            }
            
            if (index === 0) ctx.moveTo(screenX, screenY);
            else ctx.lineTo(screenX, screenY);
        });
        ctx.stroke();
    }
}
