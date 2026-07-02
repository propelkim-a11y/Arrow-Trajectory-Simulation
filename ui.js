// ============================================================================
// [UI & Interaction Core] 국궁 시뮬레이터 보텀 시트 및 탭 바 제어 엔진 (Runtime Fix)
// ============================================================================

// 로컬 스토리지 저장 및 불러오기 전수 변수 리스트 통합 관리
const INPUT_IDS = [
    'velocity', 'angle', 'yawAngle', 'launchHeight',
    'diameter', 'dragCoeff', 'liftCoeff', 'weight',
    'targetHeight', 'windX', 'windY', 'airDensity'
];

// 설정값 로컬 스토리지에 세션 백업
function saveSettings() {
    INPUT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) localStorage.setItem('arrow_sim_' + id, el.value);
    });
}

// 로컬 스토리지 백업 데이터 셋업 엔진
function loadSettings() {
    INPUT_IDS.forEach(id => {
        const savedValue = localStorage.getItem('arrow_sim_' + id);
        const el = document.getElementById(id);
        if (el && savedValue !== null) {
            el.value = savedValue;
        }
    });
}

// [제2조 사이드 이펙트 디펜스] 다중 레이어 충돌 및 NodeList 런타임 에러 완전 차단 트리거
function openBottomSheet(type) {
    // 1. 활성화된 상태의 오버레이 및 모든 보텀 시트 클래스 강제 일괄 제거
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('sheet-arrow').classList.remove('active');
    document.getElementById('sheet-shooting').classList.remove('active');
    document.getElementById('sheet-env').classList.remove('active');
    document.getElementById('sheet-result').classList.remove('active');
    
    // 2. 하단 탭바 아이템 전체 비활성화 스타일 초기화 (안전한 순회 처리)
    const tabBarItems = document.querySelectorAll('.tab-bar .tab-item');
    tabBarItems.forEach(item => item.classList.remove('active'));
    
    // 3. 외곽 배경 어두운 오버레이 레이어 활성화
    document.getElementById('overlay').classList.add('active');

    // 4. 요청된 타겟 보텀시트 맵핑 및 활성화 매칭 (배열 인덱스 매치 포함)
    if (type === 'arrow') {
        document.getElementById('sheet-arrow').classList.add('active');
        if (tabBarItems[0]) tabBarItems[0].classList.add('active');
    } else if (type === 'shooting') {
        document.getElementById('sheet-shooting').classList.add('active');
        if (tabBarItems[1]) tabBarItems[1].classList.add('active');
    } else if (type === 'env') {
        document.getElementById('sheet-env').classList.add('active');
        if (tabBarItems[2]) tabBarItems[2].classList.add('active');
    } else if (type === 'result') {
        document.getElementById('sheet-result').classList.add('active');
        if (tabBarItems[3]) tabBarItems[3].classList.add('active');
    }
}

// 보텀 시트 전체 차단 클로징 오퍼레이션 핸들러
function closeBottomSheet() {
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('sheet-arrow').classList.remove('active');
    document.getElementById('sheet-shooting').classList.remove('active');
    document.getElementById('sheet-env').classList.remove('active');
    document.getElementById('sheet-result').classList.remove('active');
    
    const tabBarItems = document.querySelectorAll('.tab-bar .tab-item');
    tabBarItems.forEach(item => item.classList.remove('active'));
    
    // 데이터 영속성 스냅샷 수집 및 물리 캔버스 동기화 업데이트
    saveSettings();
    if (typeof drawScene === 'function') drawScene();
}

// [물리 연산 연동 데이터 인젝션 인터페이스]
// physics.js 내 연산 루프 종료 후 본 함수를 호출하여 수치를 실시간 투영합니다.
function updateFlightResultsUI(data) {
    if (!data) return;
    
    if (data.maxDistance !== undefined) document.getElementById('resMaxDistance').innerText = data.maxDistance.toFixed(2);
    if (data.maxHeight !== undefined) document.getElementById('resMaxHeight').innerText = data.maxHeight.toFixed(2);
    if (data.lateralDeviation !== undefined) document.getElementById('resLateralDeviation').innerText = data.lateralDeviation.toFixed(2);
    if (data.flightTime !== undefined) document.getElementById('resFlightTime').innerText = data.flightTime.toFixed(2);
    if (data.impactVelocity !== undefined) document.getElementById('resImpactVelocity').innerText = data.impactVelocity.toFixed(2);
    if (data.impactEnergy !== undefined) document.getElementById('resImpactEnergy').innerText = data.impactEnergy.toFixed(2);
}

// 탑 뷰 / 사이드 뷰 / 프론트 뷰 세그먼트 가로 컨트롤 핸들러
let currentView = 'side';
function changeView(viewType, element) {
    const buttons = document.querySelectorAll('.segment-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    currentView = viewType;
    if (typeof drawScene === 'function') drawScene();
}

// 도큐먼트 초기화 로드 라이프사이클 바인딩
window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});
