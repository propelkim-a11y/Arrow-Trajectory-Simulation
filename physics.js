// =========================================================================
// [시각/치수 100% 완전 일치본] physics.js - 전체 소스 코드
// =========================================================================

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

let dprWidth = 0;
let dprHeight = 0;

// 각 화면의 배율. 가로·세로에 같은 값을 적용해 화면 비율을 유지한다.
const VIEW_ZOOM_MIN = 0.25;
const VIEW_ZOOM_MAX = 8;
const viewZooms = {
    front: { x: 1, y: 1 }, side: { x: 1, y: 1 },
    top: { x: 1, y: 1 }, target: { x: 1, y: 1 }
};
const viewPans = {
    front: { x: 0, y: 0 }, side: { x: 0, y: 0 },
    top: { x: 0, y: 0 }, target: { x: 0, y: 0 }
};

function clampViewZoom(value) {
    return Math.max(VIEW_ZOOM_MIN, Math.min(VIEW_ZOOM_MAX, value));
}

function getViewZoom(view = currentView, axis = 'x') {
    return viewZooms[view] ? viewZooms[view][axis] : 1;
}

function getTargetViewScale(axis = 'x') {
    return Math.min(dprWidth, dprHeight) / 5.5 * getViewZoom('target', axis);
}

function updateZoomLabels() {
    const xValue = document.getElementById('zoomXValue');
    const yValue = document.getElementById('zoomYValue');
    const zoomText = `${Math.round(getViewZoom(currentView, 'x') * 100)}%`;
    if (xValue) xValue.textContent = zoomText;
    if (yValue) yValue.textContent = zoomText;
    const singleValue = document.getElementById('zoomValue');
    if (singleValue) singleValue.textContent = zoomText;
}

function setViewZoom(axis, nextZoom, view = currentView) {
    const parsedZoom = Number(nextZoom);
    if (!viewZooms[view] || !Number.isFinite(parsedZoom)) return;
    const zoom = clampViewZoom(parsedZoom);
    viewZooms[view].x = zoom;
    viewZooms[view].y = zoom;
    try {
        localStorage.setItem(`arrow_sim_zoom_${view}_x`, String(zoom));
        localStorage.setItem(`arrow_sim_zoom_${view}_y`, String(zoom));
    } catch (e) { /* 저장 불가 환경 */ }
    updateZoomLabels();
    if (typeof drawScene === 'function') drawScene();
}

function resetViewZoom(view = currentView) {
    if (!viewZooms[view]) return;
    viewZooms[view].x = 1;
    viewZooms[view].y = 1;
    viewPans[view].x = 0;
    viewPans[view].y = 0;
    try {
        localStorage.setItem(`arrow_sim_zoom_${view}_x`, '1');
        localStorage.setItem(`arrow_sim_zoom_${view}_y`, '1');
    } catch (e) { /* 저장 불가 환경 */ }
    updateZoomLabels();
    if (typeof drawScene === 'function') drawScene();
}

function loadViewZooms() {
    Object.keys(viewZooms).forEach(view => {
        ['x', 'y'].forEach(axis => {
            try {
                const savedValue = localStorage.getItem(`arrow_sim_zoom_${view}_${axis}`);
                if (savedValue !== null) {
                    const savedZoom = Number(savedValue);
                    if (Number.isFinite(savedZoom) && (axis === 'x' || viewZooms[view].x === 1)) {
                        viewZooms[view].x = clampViewZoom(savedZoom);
                        viewZooms[view].y = viewZooms[view].x;
                    }
                }
            } catch (e) { /* 기본 배율 사용 */ }
        });
    });
    updateZoomLabels();
}

function getViewPan(view = currentView) {
    return viewPans[view] || { x: 0, y: 0 };
}

function setViewPan(x, y, view = currentView) {
    if (!viewPans[view]) return;
    // 400% 이상에서는 대상과 화살의 화면 좌표가 크게 벌어지므로
    // 캔버스 크기 고정 한도가 아니라 현재 확대 배율에 비례해 이동을 허용한다.
    const zoom = getViewZoom(view, 'x');
    const limitX = Math.max(dprWidth * 2, dprWidth * zoom * 4, 1);
    const limitY = Math.max(dprHeight * 2, dprHeight * zoom * 4, 1);
    viewPans[view].x = Math.max(-limitX, Math.min(limitX, Number(x) || 0));
    viewPans[view].y = Math.max(-limitY, Math.min(limitY, Number(y) || 0));
    if (typeof drawScene === 'function') drawScene();
}

// [통일된 월드 공간 스케일 세팅]
const MIN_WORLD_Y = -20;   // 세로축 시작값 -20m
const MAX_WORLD_X = 200;   // 측면/평면 세로축 최대 전진 거리 200m
const MAX_WORLD_Y = 50;    // 정면/측면 세로축 최대 높이 50m
const MAX_WORLD_Z = 20;    // 정면/평면 가로축 좌우 범위 (±20m)
const TARGET_SLANT_R = 145; // 사대 0점부터 과녁 바닥 전면까지의 고정 경사 거리 (145m 부동)

// 국궁 표준 과녁 물리 제원 및 수직 투영 보정
const TGT_W = 2.0;         // 가로 2m
const TGT_H = 2.667;       // 실제 사선 세로 길이 2.667m
const TGT_D = 0.5;         // 두께 0.5m
const TGT_TILT = 15 * Math.PI / 180; // 뒤로 15도 기울어짐 (라디안)
const TGT_PROJ_H = TGT_H * Math.cos(TGT_TILT); // 정면/측면에서 보이는 수직 투영 높이 = 정확히 2.58m

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
window.addEventListener('load', () => {
    loadViewZooms();
    resizeCanvas();
});

let isFlying = false;
let isPaused = false;
let animationFrameId = null;
let trajectory = [];

let arrowState = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, pitch: 0, yaw: 0 };

let flightMetrics = {
    maxDistance: 0,
    maxHeight: 0,
    sideDeviation: 0,
    flightTime: 0,
    impactVelocity: 0,
    impactEnergy: 0,
    impactPitch: 0,
    impactYaw: 0
};

let targetHitMetrics = {
    isHit: false,      
    localZ: 0,         
    localY: 0          
};

let hasReachedTargetX = false;
let hasReachedTargetY = false;
let hasIntersectedTargetPlane = false; 

const ORIGIN_X_OFFSET = 35; 
const GROUND_Y_OFFSET = 30; 

// 과녁 고도차를 '과녁 바닥'의 높이로 취급
function getDynamicTargetGeometry() {
    const targetHInput = parseFloat(document.getElementById('targetHeight').value);
    const targetH = isNaN(targetHInput) ? 0 : targetHInput;
    const safeTargetH = Math.min(targetH, TARGET_SLANT_R - 0.1);
    const targetBaseX = Math.sqrt(Math.pow(TARGET_SLANT_R, 2) - Math.pow(safeTargetH, 2));
    return { baseX: targetBaseX, height: safeTargetH };
}

// 측면도에 그린 지면 높이와 비행 물리의 기준을 일치시킨다.
// 0~120m는 직선 상승, 120~130m는 과녁 바닥까지 연결, 130m 이후는 수평이다.
function getGroundHeightAt(worldX, targetGroundHeight = getDynamicTargetGeometry().height) {
    const x = Math.max(0, Number(worldX) || 0);
    const transition120Height = targetGroundHeight * (120 / 130);
    if (x <= 120) return transition120Height * (x / 120);
    if (x <= 130) {
        const ratio = (x - 120) / 10;
        return transition120Height + (targetGroundHeight - transition120Height) * ratio;
    }
    return targetGroundHeight;
}

function fireArrow() {
    if (isFlying) cancelAnimationFrame(animationFrameId);
    isPaused = false;
    try {
       if (typeof saveSettings === 'function') saveSettings();
     } catch (e) {
       console.warn("시크릿 모드이므로 자동 저장을 건너뜁니다.");
     }

    const v0 = parseFloat(document.getElementById('velocity').value) || 50;
    const angleDeg = parseFloat(document.getElementById('angle').value) || 0;
    const yawDeg = parseFloat(document.getElementById('yawAngle').value) || 0;
    const launchH = parseFloat(document.getElementById('launchHeight').value) || 1.5;
    const launchZ = parseFloat(document.getElementById('launchZ').value) || 0; 
    
    const pitchRad = (angleDeg * Math.PI) / 180;
    const yawRad = (yawDeg * Math.PI) / 180;

    arrowState.x = 0; 
    arrowState.y = launchH; 
    arrowState.z = launchZ;
    
    arrowState.vx = v0 * Math.cos(pitchRad) * Math.cos(yawRad);
    arrowState.vy = v0 * Math.sin(pitchRad);
    arrowState.vz = v0 * Math.cos(pitchRad) * Math.sin(yawRad);
    
    arrowState.pitch = pitchRad; 
    arrowState.yaw = yawRad;

    flightMetrics = { maxDistance: 0, maxHeight: launchH, sideDeviation: 0, flightTime: 0, impactVelocity: v0, impactEnergy: 0, impactPitch: pitchRad, impactYaw: yawRad };
    targetHitMetrics = { isHit: false, localZ: 0, localY: 0 };
    hasReachedTargetX = false;
    hasReachedTargetY = false;
    hasIntersectedTargetPlane = false;
    
    updateResultUI();
    trajectory = [{ x: arrowState.x, y: arrowState.y, z: arrowState.z }];
    isFlying = true;
    updateFireButtonState();
    animate();
}

function updateFireButtonState() {
    const button = document.getElementById('draggableFireBtn');
    if (!button) return;
    if (isPaused) {
        button.textContent = '▶';
        button.setAttribute('aria-label', '비행 재생');
    } else if (isFlying) {
        button.textContent = '⏸';
        button.setAttribute('aria-label', '비행 일시정지');
    } else {
        button.textContent = '발시';
        button.setAttribute('aria-label', '화살 발시');
    }
}

function toggleFlightPause() {
    if (isPaused) {
        isPaused = false;
        isFlying = true;
        updateFireButtonState();
        // 재생 버튼을 한 번만 눌러도 다음 프레임부터 자동으로 계속 진행한다.
        animationFrameId = requestAnimationFrame(animate);
        return;
    }
    if (isFlying) {
        isPaused = true;
        cancelAnimationFrame(animationFrameId);
        updateFireButtonState();
        return;
    }
    fireArrow();
}

function animate() {
    if (!isFlying || isPaused) return;

    const cd = parseFloat(document.getElementById('dragCoeff').value) || 0;
    const cl = parseFloat(document.getElementById('liftCoeff').value) || 0;
    const d = (parseFloat(document.getElementById('diameter').value) || 5.5) / 1000; 
    const m = (parseFloat(document.getElementById('weight').value) || 25) / 1000;    
    const rho = parseFloat(document.getElementById('airDensity').value) || 1.225;
    const windX = parseFloat(document.getElementById('windX').value) || 0; 
    const windZ = parseFloat(document.getElementById('windY').value) || 0; 

    const g = 9.81; const dt = 0.016; const area = Math.PI * Math.pow(d / 2, 2); 
    const tgtGeo = getDynamicTargetGeometry();
    const targetBaseX = tgtGeo.baseX; const targetH = tgtGeo.height;   

    const relVx = arrowState.vx - windX; const relVy = arrowState.vy; const relVz = arrowState.vz - windZ;
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

    const ax = dragAx + liftAx; const ay = -g + dragAy + liftAy; const az = dragAz + liftAz;
    const prevX = arrowState.x; const prevY = arrowState.y; const prevZ = arrowState.z;

    arrowState.vx += ax * dt; arrowState.vy += ay * dt; arrowState.vz += az * dt;
    arrowState.x += arrowState.vx * dt; arrowState.y += arrowState.vy * dt; arrowState.z += arrowState.vz * dt;

    arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vz * arrowState.vz));
    arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);
    if (!hasReachedTargetX) { flightMetrics.flightTime += dt; }
    if (arrowState.y > flightMetrics.maxHeight) { flightMetrics.maxHeight = arrowState.y; }

    const nx = Math.cos(TGT_TILT); const ny = -Math.sin(TGT_TILT);
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

        // 한 프레임 사이에서 과녁면을 통과하지 않도록 실제 교차 지점에 화살을 고정한다.
        arrowState.x = prevX + (arrowState.x - prevX) * s;
        arrowState.y = interY;
        arrowState.z = interZ;
        arrowState.pitch = Math.atan2(arrowState.vy, Math.sqrt(arrowState.vx ** 2 + arrowState.vz ** 2));
        arrowState.yaw = Math.atan2(arrowState.vz, arrowState.vx);
        flightMetrics.flightTime -= dt * (1 - s);
        flightMetrics.maxDistance = arrowState.x;
        flightMetrics.sideDeviation = arrowState.z;
        flightMetrics.impactPitch = arrowState.pitch;
        flightMetrics.impactYaw = arrowState.yaw;
        const impactVelocity = Math.sqrt(arrowState.vx ** 2 + arrowState.vy ** 2 + arrowState.vz ** 2);
        flightMetrics.impactVelocity = impactVelocity;
        flightMetrics.impactEnergy = 0.5 * m * impactVelocity ** 2;

    if (Math.abs(targetHitMetrics.localZ) <= TGT_W / 2 && Math.abs(targetHitMetrics.localY) <= TGT_H / 2) {
    targetHitMetrics.isHit = true;
    
    // 🎯 관중 시 진동 알림 기능 주입
    const useVibrateCheck = document.getElementById('useVibrate');
    if (useVibrateCheck && useVibrateCheck.checked) {
        if ('vibrate' in navigator) {
            // 패턴 진동: 200ms 진동 -> 100ms 휴식 -> 200ms 진동
            navigator.vibrate([200, 000, 000]);
        }
    }
    } else {
        targetHitMetrics.isHit = false;
    }

        // 관중(HIT)이면 과녁면에서 정지한다. 불중(MISS)은 과녁을 통과해
        // 지면 프로파일과 충돌할 때까지 계속 비행한다.
        if (targetHitMetrics.isHit) isFlying = false;
    }

    if (!hasReachedTargetX && arrowState.x >= targetBaseX) { hasReachedTargetX = true; }

    // 관중이 아닌 경우의 종료 기준: 수평 0m가 아니라 새 지면 프로파일과의 충돌.
    const groundPrev = getGroundHeightAt(prevX, targetH);
    const groundCurr = getGroundHeightAt(arrowState.x, targetH);
    if (!hasReachedTargetY && !targetHitMetrics.isHit &&
        prevY >= groundPrev && arrowState.y <= groundCurr && arrowState.vy <= 0) {
        const groundDelta = (prevY - groundPrev) - (arrowState.y - groundCurr);
        const t = Math.abs(groundDelta) > 0.0001 ? (prevY - groundPrev) / groundDelta : 1;
        const impactT = Math.max(0, Math.min(1, t));
        arrowState.x = prevX + (arrowState.x - prevX) * impactT;
        arrowState.z = prevZ + (arrowState.z - prevZ) * impactT;
        arrowState.y = getGroundHeightAt(arrowState.x, targetH);
        hasReachedTargetY = true;
        flightMetrics.maxDistance = arrowState.x;
        flightMetrics.sideDeviation = arrowState.z;
        const vFinal = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactVelocity = vFinal;
        flightMetrics.impactEnergy = 0.5 * m * vFinal * vFinal;
        flightMetrics.impactPitch = arrowState.pitch;
        flightMetrics.impactYaw = arrowState.yaw;
        isFlying = false;
    }

    if (!hasReachedTargetY && !targetHitMetrics.isHit) {
        flightMetrics.maxDistance = arrowState.x; flightMetrics.sideDeviation = arrowState.z;
        const vCurrent = Math.sqrt(arrowState.vx * arrowState.vx + arrowState.vy * arrowState.vy + arrowState.vz * arrowState.vz);
        flightMetrics.impactVelocity = vCurrent; flightMetrics.impactEnergy = 0.5 * m * vCurrent * vCurrent;
        flightMetrics.impactPitch = arrowState.pitch;
        flightMetrics.impactYaw = arrowState.yaw;
    }

    updateResultUI();
    if (arrowState.x > MAX_WORLD_X || arrowState.x < -10) { isFlying = false; }
    if (!isFlying) {
        isPaused = false;
        updateFireButtonState();
    }

    // 과녁 교차·지면 보정까지 끝난 최종 화살 위치를 궤적의 마지막 점으로 기록한다.
    // 이 시점에 기록해야 화면의 화살과 파란 궤적선 끝점이 어긋나지 않는다.
    trajectory.push({ x: arrowState.x, y: arrowState.y, z: arrowState.z });

    drawScene();
    if (isFlying && !isPaused) { animationFrameId = requestAnimationFrame(animate); }
}

function updateResultUI() {
    const resDist = document.getElementById('resMaxDist'); const resHeight = document.getElementById('resMaxHeight');
    const resSide = document.getElementById('resSideDev'); const resTime = document.getElementById('resFlightTime');
    const resVel = document.getElementById('resImpactVel'); const resEnergy = document.getElementById('resImpactEnergy');
    if (resDist) resDist.innerText = flightMetrics.maxDistance.toFixed(2) + " m";
    if (resHeight) resHeight.innerText = flightMetrics.maxHeight.toFixed(2) + " m";
    if (resSide) resSide.innerText = flightMetrics.sideDeviation.toFixed(2) + " m";
    if (resTime) resTime.innerText = flightMetrics.flightTime.toFixed(2) + " s";
    if (resVel) resVel.innerText = flightMetrics.impactVelocity.toFixed(2) + " m/s";
    if (resEnergy) resEnergy.innerText = flightMetrics.impactEnergy.toFixed(2) + " J";
    const resPitch = document.getElementById('resImpactPitch');
    const resYaw = document.getElementById('resImpactYaw');
    if (resPitch) resPitch.innerText = (flightMetrics.impactPitch * 180 / Math.PI).toFixed(2) + " °";
    if (resYaw) resYaw.innerText = (flightMetrics.impactYaw * 180 / Math.PI).toFixed(2) + " °";
}

function updateLosAngleDisplay(pitchRad, yawRad) {
    const pitchDisplay = document.getElementById('losPitchDisplay');
    const yawDisplay = document.getElementById('losYawDisplay');
    if (pitchDisplay) pitchDisplay.textContent = `${(pitchRad * 180 / Math.PI).toFixed(2)}°`;
    if (yawDisplay) yawDisplay.textContent = `${(yawRad * 180 / Math.PI).toFixed(2)}°`;
}

function drawScene() {
    if (dprWidth === 0 || dprHeight === 0) return;
    ctx.clearRect(0, 0, dprWidth, dprHeight);
    
    const tgtGeo = getDynamicTargetGeometry();
    const targetBaseX = tgtGeo.baseX; const safeTargetH = tgtGeo.height;
    const availW = dprWidth - ORIGIN_X_OFFSET - 10; const availH = dprHeight - GROUND_Y_OFFSET - 10;

    const followArrowCheck = document.getElementById('followArrow');
    const shouldFollowArrow = followArrowCheck && followArrowCheck.checked && isFlying && currentView !== 'target';
    if (shouldFollowArrow) {
        const followZoom = Math.max(getViewZoom(currentView, 'x'), 2.5);
        viewZooms[currentView].x = followZoom;
        viewZooms[currentView].y = followZoom;
        updateZoomLabels();
    }

    // 각 뷰의 두 축에서 1m가 같은 픽셀 길이가 되도록 공통 기본 축척을 사용한다.
    // 화면에 모든 범위를 한 번에 담을 수 없는 경우에는 패닝으로 나머지 영역을 볼 수 있다.
    const sideBaseScale = Math.min(availW / MAX_WORLD_X, availH / (MAX_WORLD_Y - MIN_WORLD_Y));
    const scaleX = sideBaseScale * getViewZoom('side', 'x');
    const scaleY = sideBaseScale * getViewZoom('side', 'x');
    const topBaseScale = Math.min((dprHeight - 40) / MAX_WORLD_X, (dprWidth - 20) / (MAX_WORLD_Z * 2));
		const topScaleForward = topBaseScale * getViewZoom('top', 'x'); 
    const topScaleSide = topBaseScale * getViewZoom('top', 'x');
    const frontBaseScale = Math.min((dprWidth - ORIGIN_X_OFFSET - 20) / (MAX_WORLD_Z * 2), availH / (MAX_WORLD_Y - MIN_WORLD_Y));
    const frontScaleZ = frontBaseScale * getViewZoom('front', 'x'); 
    const frontScaleY = frontBaseScale * getViewZoom('front', 'x');
const targetViewScaleX = getTargetViewScale('x');
const targetViewScaleY = getTargetViewScale('y');
// 📐 [1단계 수식 주입 완료] 고도에 따른 동적 세로 계산식
const launchH = parseFloat(document.getElementById('launchHeight').value) || 1.5;
const hDist = Math.sqrt(Math.pow(TARGET_SLANT_R, 2) - Math.pow(safeTargetH, 2)); 
const losPitchRad = Math.atan2(safeTargetH - launchH, hDist); 
const dynamicTgtProjH = TGT_H * Math.cos(losPitchRad + TGT_TILT);
const finalProjH = isNaN(dynamicTgtProjH) ? TGT_PROJ_H : Math.min(TGT_H, dynamicTgtProjH);
window.currentDynamicTgtProjH = finalProjH;

// 🌐 [2단계 신규 추가] 사수 좌우 위치에 따른 동적 가로 너비 연산
const launchZ = parseFloat(document.getElementById('launchZ').value) || 0;
// 사수의 좌우 시선 편각(라디안) 구하기 (과녁의 기준 전방 거리 targetBaseX 대비 좌우 치우침)
const losYawRad = Math.atan2(launchZ, targetBaseX);
// 좌우로 치우칠수록 cos 값이 작아져 가로가 홀쭉해지는 압축 수식
const dynamicTgtProjW = TGT_W * Math.cos(losYawRad);
// 에러 방지 안전장치 및 ui.js 공유용 글로벌 세팅
const finalProjW = isNaN(dynamicTgtProjW) ? TGT_W : Math.min(TGT_W, dynamicTgtProjW);
window.currentDynamicTgtProjW = finalProjW;

// 표보기 조준점까지 사수가 실제로 바라보는 고각·편각
const losTargetYInput = parseFloat(document.getElementById('losTargetY').value);
const losTargetZInput = parseFloat(document.getElementById('losTargetZ').value);
const losTargetY = Number.isFinite(losTargetYInput) ? losTargetYInput : 2.67;
const losTargetZ = Number.isFinite(losTargetZInput) ? losTargetZInput : -1;
const horizontalLosDistance = Math.sqrt(Math.pow(targetBaseX, 2) + Math.pow(losTargetZ - launchZ, 2));
const sightPitchRad = Math.atan2((safeTargetH + losTargetY) - launchH, horizontalLosDistance);
const sightYawRad = Math.atan2(losTargetZ - launchZ, targetBaseX);
updateLosAngleDisplay(sightPitchRad, sightYawRad);

    
function toScreen(pX, pY, pZ) {
  if (currentView === 'side') {
    return { x: ORIGIN_X_OFFSET + (pX * scaleX), y: dprHeight - GROUND_Y_OFFSET - ((pY - MIN_WORLD_Y) * scaleY) };
  }
  if (currentView === 'top') {
    return { x: (dprWidth / 2) + (pZ * topScaleSide), y: dprHeight - 25 - (pX * topScaleForward) };
  }
  if (currentView === 'front') {
    return { x: ORIGIN_X_OFFSET + (dprWidth - ORIGIN_X_OFFSET - 20) / 2 + (pZ * frontScaleZ), y: dprHeight - GROUND_Y_OFFSET - ((pY - MIN_WORLD_Y) * frontScaleY) };
  }
  if (currentView === 'target') {
    return { x: (dprWidth / 2) + (pZ * targetViewScaleX), y: (dprHeight * 0.65) - (pY * targetViewScaleY) };
  }
  return { x: 0, y: 0 };
}

// 발시 중에는 화살을 화면 중앙 부근에 부드럽게 유지한다.
if (shouldFollowArrow) {
  const arrowScreen = toScreen(arrowState.x, arrowState.y, arrowState.z);
  const currentPan = viewPans[currentView];
  const desiredPanX = (dprWidth * 0.5) - arrowScreen.x;
  const desiredPanY = (dprHeight * 0.5) - arrowScreen.y;
  const followEase = 0.22;
  currentPan.x += (desiredPanX - currentPan.x) * followEase;
  currentPan.y += (desiredPanY - currentPan.y) * followEase;
}

const pan = getViewPan(currentView);
ctx.save();
ctx.translate(pan.x, pan.y);

// 눈금선 기본 스타일 레이아웃 설정
ctx.strokeStyle = '#e5e5ea'; 
ctx.lineWidth = 1; 
ctx.font = '9px -apple-system, sans-serif';
ctx.fillStyle = '#8e8e93';

// 1. 측면도 (Side View) 격자 렌더링
 if (currentView === 'side') {
  let lastSideXLabel = -Infinity;
  let lastSideYLabel = -Infinity;
  for (let xMeters = 0; xMeters <= MAX_WORLD_X; xMeters += 20) {
    let scrX = ORIGIN_X_OFFSET + (xMeters * scaleX);
    ctx.beginPath(); ctx.moveTo(scrX, -pan.y); ctx.lineTo(scrX, dprHeight - pan.y); ctx.stroke();
    if (scrX - lastSideXLabel >= 36) {
      ctx.textAlign = 'center'; ctx.fillText(xMeters + 'm', scrX, dprHeight - GROUND_Y_OFFSET + 12);
      lastSideXLabel = scrX;
    }
  }
  for (let yMeters = MIN_WORLD_Y; yMeters <= MAX_WORLD_Y; yMeters += 10) {
    let scrY = dprHeight - GROUND_Y_OFFSET - ((yMeters - MIN_WORLD_Y) * scaleY);
    ctx.beginPath(); ctx.moveTo(-pan.x, scrY); ctx.lineTo(dprWidth - pan.x, scrY); ctx.stroke();
    if (Math.abs(scrY - lastSideYLabel) >= 16) {
      ctx.textAlign = 'right'; ctx.fillText(yMeters + 'm', ORIGIN_X_OFFSET - 5, scrY + 3);
      lastSideYLabel = scrY;
    }
  }
  // 메인 기선축
  ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 2;
  const sideGroundY = dprHeight - GROUND_Y_OFFSET - ((0 - MIN_WORLD_Y) * scaleY);
  // 확대·패닝으로 축의 끝점이 화면 밖으로 이동해도, 현재 보이는 축 범위까지 계속 연결한다.
  ctx.save();
  ctx.beginPath();
  ctx.rect(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET - ((MAX_WORLD_Y - MIN_WORLD_Y) * scaleY), MAX_WORLD_X * scaleX, (MAX_WORLD_Y - MIN_WORLD_Y) * scaleY);
  ctx.clip();
  ctx.beginPath(); ctx.moveTo(-pan.x, sideGroundY); ctx.lineTo(dprWidth - pan.x, sideGroundY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, -pan.y); ctx.lineTo(ORIGIN_X_OFFSET, dprHeight - pan.y); ctx.stroke();
  ctx.restore();

  // 측면 지면: 120m까지 직선으로 상승하고 130m부터 과녁 바닥 높이로 이어진다.
  const ground120Y = safeTargetH * (120 / 130);
  const ground0 = toScreen(0, 0, 0);
  const ground120 = toScreen(120, ground120Y, 0);
  const ground130 = toScreen(130, safeTargetH, 0);
  const groundEnd = toScreen(MAX_WORLD_X, safeTargetH, 0);
  ctx.save();
  ctx.strokeStyle = '#6b7f3a'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(ground0.x, ground0.y);
  ctx.lineTo(ground120.x, ground120.y);
  ctx.lineTo(ground130.x, ground130.y);
  ctx.lineTo(groundEnd.x, groundEnd.y);
  ctx.stroke();
  ctx.restore();

// 2. 조감도 (Top View) 격자 렌더링
} else if (currentView === 'top') {
  let lastTopXLabel = -Infinity;
  let lastTopZLabel = -Infinity;
  for (let xMeters = 0; xMeters <= MAX_WORLD_X; xMeters += 20) {
    let scrY = dprHeight - 25 - (xMeters * topScaleForward);
    ctx.beginPath(); ctx.moveTo(-pan.x, scrY); ctx.lineTo(dprWidth - pan.x, scrY); ctx.stroke();
    if (Math.abs(scrY - lastTopXLabel) >= 16) {
      ctx.textAlign = 'left'; ctx.fillText(xMeters + 'm', 8, scrY - 4);
      lastTopXLabel = scrY;
    }
  }
  for (let zMeters = -MAX_WORLD_Z; zMeters <= MAX_WORLD_Z; zMeters += 5) {
    let scrX = (dprWidth / 2) + (zMeters * topScaleSide);
    ctx.beginPath(); ctx.moveTo(scrX, -pan.y); ctx.lineTo(scrX, dprHeight - pan.y); ctx.stroke();
    if (scrX - lastTopZLabel >= 36) {
      ctx.textAlign = 'center'; ctx.fillText(zMeters === 0 ? '중앙(0m)' : zMeters + 'm', scrX, dprHeight - 8);
      lastTopZLabel = scrX;
    }
  }
  // 사대 중앙 분리 기준축선
  ctx.strokeStyle = '#86868b'; ctx.lineWidth = 1.5; 
  ctx.beginPath(); ctx.moveTo(dprWidth / 2, -pan.y); ctx.lineTo(dprWidth / 2, dprHeight - pan.y); ctx.stroke();

  // 평면도: 과녁 바닥 위치를 알려주는 보조선
  const targetGroundLeft = toScreen(targetBaseX, safeTargetH, -MAX_WORLD_Z);
  const targetGroundRight = toScreen(targetBaseX, safeTargetH, MAX_WORLD_Z);
  ctx.save();
  ctx.strokeStyle = '#8e8e93'; ctx.lineWidth = 1; ctx.setLineDash([7, 5]);
  ctx.beginPath(); ctx.moveTo(targetGroundLeft.x, targetGroundLeft.y); ctx.lineTo(targetGroundRight.x, targetGroundRight.y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

// 3. 정면도 (Front View) 격자 렌더링
} else if (currentView === 'front') {
  const centerX = ORIGIN_X_OFFSET + (dprWidth - ORIGIN_X_OFFSET - 20) / 2;
  let lastFrontZLabel = -Infinity;
  let lastFrontYLabel = -Infinity;
  for (let zMeters = -MAX_WORLD_Z; zMeters <= MAX_WORLD_Z; zMeters += 5) {
    let scrX = centerX + (zMeters * frontScaleZ);
    ctx.beginPath(); ctx.moveTo(scrX, -pan.y); ctx.lineTo(scrX, dprHeight - pan.y); ctx.stroke();
    if (scrX - lastFrontZLabel >= 36) {
      ctx.textAlign = 'center'; ctx.fillText(zMeters === 0 ? '0m' : zMeters + 'm', scrX, dprHeight - GROUND_Y_OFFSET + 12);
      lastFrontZLabel = scrX;
    }
  }
  for (let yMeters = MIN_WORLD_Y; yMeters <= MAX_WORLD_Y; yMeters += 5) {
    let scrY = dprHeight - GROUND_Y_OFFSET - ((yMeters - MIN_WORLD_Y) * frontScaleY);
    ctx.beginPath(); ctx.moveTo(-pan.x, scrY); ctx.lineTo(dprWidth - pan.x, scrY); ctx.stroke();
    if (Math.abs(scrY - lastFrontYLabel) >= 16) {
      ctx.textAlign = 'right'; ctx.fillText(yMeters + 'm', ORIGIN_X_OFFSET - 5, scrY + 3);
      lastFrontYLabel = scrY;
    }
  }
  // 지면 및 좌측 기준 기선
  ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 2;
  const frontGroundY = dprHeight - GROUND_Y_OFFSET - ((0 - MIN_WORLD_Y) * frontScaleY);
  // 정면도도 동일하게 확대·패닝된 현재 화면 구간까지 축선을 연장한다.
  ctx.save();
  ctx.beginPath();
  ctx.rect(centerX - MAX_WORLD_Z * frontScaleZ, dprHeight - GROUND_Y_OFFSET - ((MAX_WORLD_Y - MIN_WORLD_Y) * frontScaleY), MAX_WORLD_Z * 2 * frontScaleZ, (MAX_WORLD_Y - MIN_WORLD_Y) * frontScaleY);
  ctx.clip();
  ctx.beginPath(); ctx.moveTo(-pan.x, frontGroundY); ctx.lineTo(dprWidth - pan.x, frontGroundY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ORIGIN_X_OFFSET, -pan.y); ctx.lineTo(ORIGIN_X_OFFSET, dprHeight - pan.y); ctx.stroke();
  ctx.restore();
  // 정가운데 수직 기준선
  ctx.strokeStyle = '#86868b'; ctx.lineWidth = 1.2; 
  ctx.beginPath(); ctx.moveTo(centerX, -pan.y); ctx.lineTo(centerX, dprHeight - pan.y); ctx.stroke();

  // 정면도: 과녁 바닥 높이를 기준으로 한 지면선
  const frontGroundLeft = toScreen(0, safeTargetH, -MAX_WORLD_Z);
  const frontGroundRight = toScreen(0, safeTargetH, MAX_WORLD_Z);
  ctx.save();
  ctx.strokeStyle = '#6b7f3a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(frontGroundLeft.x, frontGroundLeft.y); ctx.lineTo(frontGroundRight.x, frontGroundRight.y); ctx.stroke();
  ctx.restore();

// 4. 과녁 확대도 (Target View) 정밀 격자 렌더링
} else if (currentView === 'target') {
  const tBottomY = dprHeight * 0.75;
  // 색상 전이 현상 방지를 위해 격자선 컬러 명시적 재할당 및 두께 미세화
  ctx.strokeStyle = '#e5e5ea'; 
  ctx.lineWidth = 0.8; 
  
  const targetZMin = Math.floor(((0 - dprWidth / 2 - pan.x) / targetViewScaleX) / 0.5) * 0.5;
  const targetZMax = Math.ceil(((dprWidth - dprWidth / 2 - pan.x) / targetViewScaleX) / 0.5) * 0.5;
  const targetYMin = Math.floor(((tBottomY + pan.y - dprHeight) / targetViewScaleY) / 0.5) * 0.5;
  const targetYMax = Math.ceil(((tBottomY + pan.y) / targetViewScaleY) / 0.5) * 0.5;
  for (let lz = targetZMin; lz <= targetZMax; lz += 0.5) {
    let scrX = (dprWidth / 2) + (lz * targetViewScaleX);
    ctx.beginPath(); ctx.moveTo(scrX, 0); ctx.lineTo(scrX, dprHeight); ctx.stroke();
    ctx.fillStyle = '#8e8e93'; ctx.font = '9px -apple-system'; ctx.textAlign = 'center';
    ctx.fillText(lz === 0 ? '중앙' : lz.toFixed(1) + 'm', scrX, dprHeight - 8);
  }
  for (let ly = targetYMin; ly <= targetYMax; ly += 0.5) {
    let scrY = tBottomY - (ly * targetViewScaleY);
    ctx.beginPath(); ctx.moveTo(0, scrY); ctx.lineTo(dprWidth, scrY); ctx.stroke();
    ctx.fillStyle = '#8e8e93'; ctx.font = '9px -apple-system'; ctx.textAlign = 'right';
    ctx.fillText(ly === 0 ? '바닥(0m)' : (ly > 0 ? '+' : '') + ly.toFixed(1) + 'm', dprWidth - 8, scrY + 3);
  }
  // 과녁 조준 십자 기선축
  ctx.strokeStyle = '#86868b'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(dprWidth / 2, 0); ctx.lineTo(dprWidth / 2, dprHeight); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, tBottomY); ctx.lineTo(dprWidth, tBottomY); ctx.stroke();
}

// 눈금 라벨은 축 경계 밖으로 잘리지 않도록 먼저 그린다.
// 이후의 화살·과녁·궤적·보조선만 축 범위 안에서 클리핑한다.
ctx.save();
if (currentView === 'side') {
  ctx.beginPath();
  ctx.rect(ORIGIN_X_OFFSET, dprHeight - GROUND_Y_OFFSET - ((MAX_WORLD_Y - MIN_WORLD_Y) * scaleY), MAX_WORLD_X * scaleX, (MAX_WORLD_Y - MIN_WORLD_Y) * scaleY);
  ctx.clip();
} else if (currentView === 'top') {
  ctx.beginPath();
  ctx.rect((dprWidth / 2) - (MAX_WORLD_Z * topScaleSide), dprHeight - 25 - (MAX_WORLD_X * topScaleForward), MAX_WORLD_Z * 2 * topScaleSide, MAX_WORLD_X * topScaleForward);
  ctx.clip();
} else if (currentView === 'front') {
  const frontCenterX = ORIGIN_X_OFFSET + (dprWidth - ORIGIN_X_OFFSET - 20) / 2;
  ctx.beginPath();
  ctx.rect(frontCenterX - MAX_WORLD_Z * frontScaleZ, dprHeight - GROUND_Y_OFFSET - ((MAX_WORLD_Y - MIN_WORLD_Y) * frontScaleY), MAX_WORLD_Z * 2 * frontScaleZ, (MAX_WORLD_Y - MIN_WORLD_Y) * frontScaleY);
  ctx.clip();
}

ctx.lineWidth = 1.5;
  // 과녁 객체 드로잉
  if (currentView === 'side') {
    const fBottom = toScreen(targetBaseX, safeTargetH, 0);
    const frontTopX = targetBaseX + TGT_H * Math.sin(TGT_TILT); 
    const frontTopY = safeTargetH + TGT_PROJ_H;
    const fTop = toScreen(frontTopX, frontTopY, 0);
    const thickX = TGT_D * Math.cos(TGT_TILT); 
    const thickY = -TGT_D * Math.sin(TGT_TILT);
    const bBottom = toScreen(targetBaseX + thickX, safeTargetH + thickY, 0); 
    const bTop = toScreen(frontTopX + thickX, frontTopY + thickY, 0);

    ctx.fillStyle = '#e5e5ea'; 
    ctx.beginPath(); ctx.moveTo(fBottom.x, fBottom.y); ctx.lineTo(fTop.x, fTop.y); ctx.lineTo(bTop.x, bTop.y); ctx.lineTo(bBottom.x, bBottom.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 3; 
    ctx.beginPath(); ctx.moveTo(fBottom.x, fBottom.y); ctx.lineTo(fTop.x, fTop.y); ctx.stroke();

  } else if (currentView === 'front') {
    const leftX = toScreen(targetBaseX, safeTargetH, -TGT_W / 2).x; 
    const rightX = toScreen(targetBaseX, safeTargetH, TGT_W / 2).x;
    const bottomY = toScreen(targetBaseX, safeTargetH, 0).y; 
    const topY = toScreen(targetBaseX, safeTargetH + finalProjH, 0).y;
    const w = rightX - leftX; 
    const h = bottomY - topY;

       // [1단계-보완] 내부 요소 세로 압축 비율 연동 처리
    ctx.fillStyle = '#ffffff'; ctx.fillRect(leftX, topY, w, h);
    ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 1.5; ctx.strokeRect(leftX, topY, w, h);
    ctx.fillStyle = '#1d1d1f'; ctx.fillRect(leftX + w * 0.1, topY + h * 0.08, w * 0.8, h * 0.15);
    ctx.fillRect(leftX + w * 0.1, topY + h * 0.3, w * 0.8, h * 0.62);
      
      // 빨간 원을 타원(ellipse) 구조로 변경하여 세로 압축률 반영
    ctx.fillStyle = '#ff3b30'; 
    ctx.beginPath(); 
    ctx.ellipse(
      leftX + w * 0.5, 
      (topY + h * 0.3) + (h * 0.62) * 0.5, 
      w * 0.23, 
      (w * 0.23) * (finalProjH / TGT_H),
      0, 0, Math.PI * 2
    ); 
    ctx.fill();


  } else if (currentView === 'top') {
    const projTopX = targetBaseX + TGT_H * Math.sin(TGT_TILT); 
    const thickX = TGT_D * Math.cos(TGT_TILT);
    const fLeftBot = toScreen(targetBaseX, safeTargetH, -TGT_W / 2); 
    const fRightBot = toScreen(targetBaseX, safeTargetH, TGT_W / 2);
    const bLeftTop = toScreen(projTopX + thickX, safeTargetH, -TGT_W / 2); 
    const bRightTop = toScreen(projTopX + thickX, safeTargetH, TGT_W / 2);

    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(fLeftBot.x, fLeftBot.y); ctx.lineTo(fRightBot.x, fRightBot.y); ctx.lineTo(bRightTop.x, bRightTop.y); ctx.lineTo(bLeftTop.x, bLeftTop.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 1.5; ctx.stroke();

  } else if (currentView === 'target') {
    const tLeftX = (dprWidth / 2) - (finalProjW / 2 * targetViewScaleX);  
    const tRightX = (dprWidth / 2) + (finalProjW / 2 * targetViewScaleX);
    const tBottomY = dprHeight * 0.75; 
    const tTopY = tBottomY - (dynamicTgtProjH * targetViewScaleY); // 🔥 동적 높이 변수로 교체 
    const w = tRightX - tLeftX; 
    const h = tBottomY - tTopY;

        ctx.fillStyle = '#ffffff'; ctx.fillRect(tLeftX, tTopY, w, h);
    ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 2; ctx.strokeRect(tLeftX, tTopY, w, h);
    ctx.fillStyle = '#1d1d1f'; ctx.fillRect(tLeftX + w * 0.1, tTopY + h * 0.08, w * 0.8, h * 0.15);
    ctx.fillRect(tLeftX + w * 0.1, tTopY + h * 0.3, w * 0.8, h * 0.62);
    
    // 과녁도 역시 동일한 압축률을 적용하여 정면도와 100% 같은 모양의 타원으로 표현
    ctx.fillStyle = '#ff3b30'; 
    ctx.beginPath(); 
    ctx.ellipse(
      tLeftX + w * 0.5, 
      (tTopY + h * 0.3) + (h * 0.62) * 0.5, 
      (w * 0.23) * (finalProjW / TGT_W), // 🔥 사수 좌우 위치에 따른 가로 압축 공식 결합!
      (w * 0.23) * (finalProjH / TGT_H),
      0, 0, Math.PI * 2
    ); 
    ctx.fill();

    if (hasIntersectedTargetPlane) {
      const localYFromBottom = targetHitMetrics.localY + (TGT_PROJ_H / 2);
      const markerX = (dprWidth / 2) + (targetHitMetrics.localZ * targetViewScaleX);
      const markerY = tBottomY - (localYFromBottom * targetViewScaleY);

      if (targetHitMetrics.isHit) {
        ctx.fillStyle = '#34c759'; ctx.strokeStyle = 'rgba(52, 199, 89, 0.4)'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(markerX, markerY, 6, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
        ctx.fillStyle = '#34c759'; ctx.font = 'bold 13px -apple-system'; ctx.textAlign = 'center'; 
        ctx.fillText("🎯 관중 (HIT!)", dprWidth / 2, tTopY - 14);
      } else {
        ctx.fillStyle = '#ff3b30'; ctx.strokeStyle = 'rgba(255, 59, 48, 0.3)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(markerX, markerY, 5, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
        ctx.fillStyle = '#ff3b30'; ctx.font = 'bold 12px -apple-system'; ctx.textAlign = 'center'; 
        ctx.fillText(`❌ 불중 (오차: 좌우 ${targetHitMetrics.localZ.toFixed(2)}m, 바닥높이 ${localYFromBottom.toFixed(2)}m)`, dprWidth / 2, tTopY - 14);
      }
    }
 // ==========================================
 // 🎯 [여기에 코드가 추가되었습니다] 표보기 조준 원 그리기
 // ==========================================
 const useLosCheck = document.getElementById('useLos');
 if (useLosCheck && useLosCheck.checked) {
     const losY = parseFloat(document.getElementById('losTargetY').value) || 1.3;
     const losZ = parseFloat(document.getElementById('losTargetZ').value) || 0.0;

     //const losScreenX = (dprWidth / 2) + (losZ * targetViewScale);
     //const losScreenY = tBottomY - (losY * targetViewScale);
     // 💡 과녁의 찌그러진 가로/세로 비율(finalProjW / TGT_W 등)을 곱해주어, 
     // 눈에 보이는 압축된 과녁 모양과 조준선의 위치를 완벽하게 정렬합니다.
     const losScreenX = (dprWidth / 2) + ((losZ / TGT_W) * finalProjW * targetViewScaleX);
     const losScreenY = tBottomY - ((losY / TGT_H) * finalProjH * targetViewScaleY);

     ctx.save();
     ctx.strokeStyle = '#ff9500'; // 주황색
     ctx.lineWidth = 1.5;

     // 조준선 위치 표시용 외부 원
     ctx.beginPath();
     ctx.arc(losScreenX, losScreenY, 6, 0, Math.PI * 2);
     ctx.stroke();

     // 중앙 핵심 점
     ctx.fillStyle = '#ff9500';
     ctx.beginPath();
     ctx.arc(losScreenX, losScreenY, 1.5, 0, Math.PI * 2);
     ctx.fill();
     
     ctx.restore();
 }
 // ==========================================      
  }

  // 지면 지지기둥 기선 드로잉
  if (currentView === 'side' || currentView === 'front') {
    const tgtFloor = toScreen(targetBaseX, 0, 0); 
    const tgtBasePos = toScreen(targetBaseX, safeTargetH, 0);
    ctx.strokeStyle = '#515154'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tgtBasePos.x, tgtBasePos.y); ctx.lineTo(tgtBasePos.x, tgtFloor.y); ctx.stroke();
  }

  // [🛠️ 핵심 버그 패치 완료] 누적 비행 궤적선 변환 공식을 toScreen 시스템으로 강제 단일화 결합
  if (currentView !== 'target' && trajectory.length > 1) {
    ctx.strokeStyle = '#0071e3'; ctx.lineWidth = 2.5; ctx.beginPath();
    const start = toScreen(trajectory[0].x, trajectory[0].y, trajectory[0].z);
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < trajectory.length; i++) {
      const pt = toScreen(trajectory[i].x, trajectory[i].y, trajectory[i].z);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  // 실시간 화살 오브젝트 렌더링
  if (currentView !== 'target') {
    const arrowPos = toScreen(arrowState.x, arrowState.y, arrowState.z);
    ctx.save(); ctx.translate(arrowPos.x, arrowPos.y);

    // 캔버스의 화면축 투영 방향으로 화살의 피치·요를 표현한다.
    // 화살 머리는 로컬 +X(오른쪽)에 있으므로 화면 벡터의 각도를 그대로 회전값으로 사용한다.
    const previousArrowPoint = trajectory.length > 1 ? trajectory[trajectory.length - 2] : null;
    const trajectoryVx = previousArrowPoint ? arrowState.x - previousArrowPoint.x : arrowState.vx;
    const trajectoryVy = previousArrowPoint ? arrowState.y - previousArrowPoint.y : arrowState.vy;
    const trajectoryVz = previousArrowPoint ? arrowState.z - previousArrowPoint.z : arrowState.vz;
    const directionMagnitude = Math.sqrt(trajectoryVx ** 2 + trajectoryVy ** 2 + trajectoryVz ** 2);
    const directionVx = directionMagnitude > 0.0001 ? trajectoryVx : arrowState.vx;
    const directionVy = directionMagnitude > 0.0001 ? trajectoryVy : arrowState.vy;
    const directionVz = directionMagnitude > 0.0001 ? trajectoryVz : arrowState.vz;
    const speed = Math.sqrt(directionVx ** 2 + directionVy ** 2 + directionVz ** 2);
    const hasVelocity = speed > 0.001;
    let screenDx;
    let screenDy;
    if (currentView === 'side') {
      // 측면도: 월드 X(거리) / Y(높이) = 화면 가로 / 화면 세로
      screenDx = hasVelocity ? directionVx : Math.cos(arrowState.pitch);
      screenDy = hasVelocity ? -directionVy : -Math.sin(arrowState.pitch);
    } else if (currentView === 'front') {
      // 정면도: 월드 Z(좌우) / Y(높이) = 화면 가로 / 화면 세로
      screenDx = hasVelocity ? directionVz : Math.cos(arrowState.pitch) * Math.sin(arrowState.yaw);
      screenDy = hasVelocity ? -directionVy : -Math.sin(arrowState.pitch);
    } else {
      // 평면도: 월드 Z(좌우) / X(거리) = 화면 가로 / 화면 세로
      screenDx = hasVelocity ? directionVz : Math.sin(arrowState.yaw);
      screenDy = hasVelocity ? -directionVx : -Math.cos(arrowState.yaw);
    }
    const angleRad = Math.atan2(screenDy, screenDx);
    
    ctx.rotate(angleRad);
    ctx.strokeStyle = '#515154'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = '#1d1d1f'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6, -3); ctx.lineTo(-6, 3); ctx.closePath(); ctx.fill();
    // 깃은 화살촉(로컬 +X)의 반대쪽에 넓은 면이 오고, 앞쪽으로 갈수록 좁아지도록 그린다.
    ctx.fillStyle = '#ff9500'; ctx.beginPath(); ctx.moveTo(-20, -4); ctx.lineTo(-14, -4); ctx.lineTo(-10, -1); ctx.lineTo(-15, 0); ctx.lineTo(-10, 1); ctx.lineTo(-14, 4); ctx.lineTo(-20, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
// =========================================================================
// 🎯 과녁 고도차를 완벽 보정한 3D 공간 표보기 가이드선 (최종본)
// =========================================================================
const useLosCheck = document.getElementById('useLos');
if (useLosCheck && useLosCheck.checked && currentView !== 'target') {
    ctx.save();
    
    const startX = 0;
    const startY = parseFloat(document.getElementById('launchHeight').value) || 1.5;
    const startZ = parseFloat(document.getElementById('launchZ').value) || 0;
    
    const tgtGeo = getDynamicTargetGeometry();
    const targetBaseX = tgtGeo.baseX;
    const safeTargetH = tgtGeo.height; // 과녁 자체의 지형 높이 고도차
    
    const losY = parseFloat(document.getElementById('losTargetY').value) || 1.3;
    const losZ = parseFloat(document.getElementById('losTargetZ').value) || 0.0;
    
    // 🔥 과녁도 상대 높이(losY)에 지형 고도(safeTargetH)를 더해 절대 높이 완벽 정렬!
    const absoluteLosY = safeTargetH + losY; 
    
    const screenStart = toScreen(startX, startY, startZ);
    const screenEnd = toScreen(targetBaseX, absoluteLosY, losZ); 
    
    ctx.strokeStyle = '#ff9500'; // 표보기 전용 주황색
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]); // 점선 스타일 적용
    
    ctx.beginPath();
    ctx.moveTo(screenStart.x, screenStart.y);
    ctx.lineTo(screenEnd.x, screenEnd.y);
    ctx.stroke();
    
    ctx.setLineDash([]); // 스타일 리셋
    
    ctx.fillStyle = '#ff9500';
    ctx.beginPath();
    ctx.arc(screenEnd.x, screenEnd.y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

    // 축 범위 클리핑 상태와 화면 이동 변환을 순서대로 복원한다.
    ctx.restore();
    ctx.restore();
}

// 캔버스 초기 크기 반영 지연 제어
setTimeout(() => {
    if (typeof loadSettings === 'function') loadSettings();
    resizeCanvas();
  
    const launchH = parseFloat(document.getElementById('launchHeight').value) || 1.5;
// [추가] 초기 Z값 반영
    const launchZ = parseFloat(document.getElementById('launchZ').value) || 0; 
  
    arrowState.x = 0; 
    arrowState.y = launchH; 
    arrowState.z = launchZ; // [수정] 기존 0에서 launchZ 변수로 변경!
  
    arrowState.pitch = (parseFloat(document.getElementById('angle').value) || 30) * Math.PI / 180;
    arrowState.yaw = (parseFloat(document.getElementById('yawAngle').value) || 0) * Math.P
  
  updateFireButtonState();
  drawScene();
}, 250);
