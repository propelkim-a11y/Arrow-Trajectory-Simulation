// ============================================================================
// [Physics Core - Part 1 Mobile Canvas Fix & Core Logic Version]
// ============================================================================

let canvas, ctx;
let animationFrameId = null;
let trajectoryData = []; 
let currentView = 'side'; // ui.js와의 타이밍 이슈 방지를 위한 안전한 기본값 선언

// 초기화 이벤트 리스너 바인딩
window.addEventListener('load', () => {
    canvas = document.getElementById('simCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        
        // 모바일 초기화 타이밍 버그 방지: 화면이 안착할 때까지 미세한 시차를 두고 3번 강제 크기 정렬
        resizeCanvas();
        setTimeout(resizeCanvas, 50);
        setTimeout(resizeCanvas, 150);
        
        window.addEventListener('resize', resizeCanvas);
    }
});

// 브라우저 리사이징 대응 뷰포트 정렬 (모바일 강제 스케일링 보정)
function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    
    // 모바일 웹앱 구동 시 부모 박스가 크기를 간혹 0으로 잡으면 스마트폰 전체 화면 너비를 강제로 주입
    const targetWidth = container.clientWidth || window.innerWidth * 0.9;
    const targetHeight = container.clientHeight || 200; 
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // 도화지 크기가 잡히면 즉시 연산하고 강제로 그림을 그립니다.
    if (typeof fireArrow === 'function') {
        fireArrow();
    }
}

// [핵심 연산 루틴] 화살 시뮬레이션 발사 및 역학 미분 방정식 수치 해석
function fireArrow() {
    // 1. UI 입력 폼 데이터 캡처 (모바일 빈 값 및 컴포넌트 미안착 대비 옵셔널 체이닝 방어 코드 탑재)
    const v0 = parseFloat(document.getElementById('velocity')?.value) || 50;
    const thetaDeg = parseFloat(document.getElementById('angle')?.value) || 30;
    const psiDeg = parseFloat(document.getElementById('yawAngle')?.value) || 0;
    
    const cd = parseFloat(document.getElementById('dragCoeff')?.value) || 0.35;
    const cl = parseFloat(document.getElementById('liftCoeff')?.value) || 0.05;
    const wGram = parseFloat(document.getElementById('weight')?.value) || 25;
    const dMm = parseFloat(document.getElementById('diameter')?.value) || 5.5;
    const h0 = parseFloat(document.getElementById('launchHeight')?.value) || 1.5;
    
    const windX = parseFloat(document.getElementById('windX')?.value) || 0;
    const windY = parseFloat(document.getElementById('windY')?.value) || 0;
    const rho = parseFloat(document.getElementById('airDensity')?.value) || 1.225;
    
    // 2. 물리 표준 단위계 변환 (g -> kg, mm -> m)
    const mass = wGram / 1000; 
    const radius = (dMm / 1000) / 2; 
    const area = Math.PI * Math.pow(radius, 2); 
    const g = 9.80665; 
    
    // 호도법(Radian) 변환
    const theta = thetaDeg * Math.PI / 180; 
    const psi = psiDeg * Math.PI / 180; 
    
    // 3차원 공간 속도 벡터 성분 분해
    let vx = v0 * Math.cos(theta) * Math.cos(psi);
    let vy = v0 * Math.cos(theta) * Math.sin(psi);
    let vz = v0 * Math.sin(theta);
    let x = 0; let y = 0; let z = h0;
    let t = 0; const dt = 0.005; 
    let maxDistance = 0; let maxHeight = z;
    let maxLoopGuard = 10000; 
    trajectoryData = [{ x: x, y: y, z: z }];
    // 3. 전진 오일러 역학 해석 통합 연산 루프 (무한 루프 스레드 마비 방어 대책 탑재)
    while (z >= 0 && maxLoopGuard > 0) {
        maxLoopGuard--;
        const relVx = vx - windX;
        const relVy = vy - windY;
        const relVz = vz;
        const relV = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz) || 0.0001;
        
        // 공기 저항 항력 계산
        const fd = 0.5 * cd * rho * area * relV * relV;
        const fdx = -fd * (relVx / relV);
        const fdy = -fd * (relVy / relV);
        const fdz = -fd * (relVz / relV);
        
        // 상방 유도 양력 계산 (하강 국면에서 역학적 무한 치솟음 버그 완전 제어)
        const fl = 0.5 * cl * rho * area * relV * relV;
        const flz = vz > 0 ? fl : -fl * 0.1; 
        
        // 가속도 도출 (a = F / m)
        const ax = fdx / mass;
        const ay = fdy / mass;
        const az = -g + (fdz / mass) + (flz / mass);
        
        // 속도 및 위치 좌표 갱신
        vx += ax * dt; vy += ay * dt; vz += az * dt;
        x += vx * dt; y += vy * dt; z += vz * dt; t += dt;
        
        if (z > maxHeight) maxHeight = z;
        maxDistance = x;
        trajectoryData.push({ x: x, y: y, z: z });
    }
    
    // 4. 최종 영점 충돌 순간 역학 산출
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
    
    // UI 모듈로 데이터 전송
    if (typeof updateFlightResultsUI === 'function') {
        updateFlightResultsUI(flightResults);
    }
    
    // 캔버스 그래픽 동기화 렌더링 호출
    drawScene();
}

// HTML5 Canvas 그래픽스 신 드로잉 메인 엔진 루틴
function drawScene() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // --------------------------------------------------------------------------
    // 1. 구조 배경 베이스 그리드 레이어 (Grid Layer)
    // --------------------------------------------------------------------------
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 50; i < canvas.width; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let j = 50; j < canvas.height; j += 50) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
    }
    
    // 과녁 높이 데이터 파싱
    const targetH = parseFloat(document.getElementById('targetHeight')?.value) || 1.3;
    // --------------------------------------------------------------------------
    // 2. 프리미엄 계측 좌표축 및 과녁 보조선 레이어 (Axis Layer)
    // --------------------------------------------------------------------------
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "SF Pro Text"';
    ctx.textBaseline = 'middle';
    
    const viewMode = typeof currentView !== 'undefined' ? currentView : 'side';
    
    if (viewMode === 'side') {
        // [측면도 고정 스케일]
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
        ctx.fillText('거리 X (m)', endX + 25, groundY);
        ctx.textAlign = 'center';
        ctx.fillText('높이 Z (m)', startX, topY - 30);
        
        // 거리 눈금 주입 (0m ~ 160m 구간) - 문법 버그 및 데이터 완전 복구 완료
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
        
        // 높이 눈금 주입 (0m ~ 40m 구간) - 문법 버그 및 데이터 완전 복구 완료
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
        
        // 145m 국궁 과녁 십자 보조선 (모바일 표준 규격 대괄호 배열 주입 완료)
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
    }
    else if (viewMode === 'front') {
        // [정면도 고정 스케일]
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
        ctx.fillText('측면 편차 Y (m)', midX + (canvas.width * 0.4) + 25, groundY);
        ctx.textAlign = 'center';
        ctx.fillText('높이 Z (m)', midX, topY - 30);
        
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
    } 
    else if (viewMode === 'top') {
        // [평면도 고정 스케일]
        const startX = canvas.width * 0.1;
        const endX = canvas.width * 0.9;
        const midY = canvas.height / 2;
        
        ctx.strokeStyle = '#1d1d1f';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(startX - 20, midY); ctx.lineTo(endX + 20, midY); ctx.stroke();
        
        ctx.fillStyle = '#86868b';
        ctx.textAlign = 'left';
        ctx.fillText('거리 X (m)', endX + 25, midY);
        ctx.textAlign = 'center';
        ctx.fillText('측면 편차 Y (m)', startX, midY - (canvas.height * 0.4) - 20);
        
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
    
    // --------------------------------------------------------------------------
    // 3. 최상단 최우선 순위 비행 탄도 궤적 렌더링 레이어 (Trajectory Arrow Layer)
    // --------------------------------------------------------------------------
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
}
