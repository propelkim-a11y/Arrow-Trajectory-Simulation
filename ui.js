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

// [제2조 사이드 이펙트 디펜스] 다중 레이어 충돌 방지 보텀 시트 트리거
function openBottomSheet(type) {
    // 활성화된 상태의 오버레이 및 모든 보텀 시트 강제 완전 제거 선행
    closeBottomSheet();
    
    // 타겟 활성화 컴포넌트 라우팅 연동
    document.getElementById('overlay').classList.add('active');
    
    const tabBarItems = document.querySelectorAll('.tab-item');
    tabBarItems.forEach(item => item.classList.remove('active'));

    if (type === 'arrow') {
        document.getElementById('sheet-arrow').classList.add('active');
        document.querySelectorAll('.tab-item')[0].classList.add('active');
    } else if (type === 'shooting') {
        document.getElementById('sheet-shooting').classList.add('active');
        document.querySelectorAll('.tab-item')[1].classList.add('active');
    } else if (type === 'env') {
        document.getElementById('sheet-env').classList.add('active');
        document.querySelectorAll('.tab-item')[2].classList.add('active');
    }
}

// 보텀 시트 전체 차단 클로징 핸들러
function closeBottomSheet() {
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('sheet-arrow').classList.remove('active');
    document.getElementById('sheet-shooting').classList.remove('active');
    document.getElementById('sheet-env').classList.remove('active');
    
    const tabBarItems = document.querySelectorAll('.tab-item');
    tabBarItems.forEach(item => item.classList.remove('active'));
    
    // 데이터 영속성 스냅샷 수집 및 물리 캔버스 동기화 업데이트
    saveSettings();
    if (typeof drawScene === 'function') drawScene();
}

// 탑 뷰/사이드 뷰/프론트 뷰 세그먼트 컨트롤 핸들러
let currentView = 'side';
function changeView(viewType, element) {
    const buttons = document.querySelectorAll('.segment-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    currentView = viewType;
    if (typeof drawScene === 'function') drawScene();
}
