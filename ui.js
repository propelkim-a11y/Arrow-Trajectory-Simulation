// 로컬 스토리지 저장 및 불러오기 변수 리스트 (4개 탭 구조에 맞춰 통합)
const INPUT_IDS = [
    'weight', 'diameter', 'dragCoeff', 'liftCoeff',             // 화살 설정
    'angle', 'velocity', 'yawAngle', 'launchHeight',            // 사법 설정
    'windX', 'windY', 'targetHeight', 'airDensity'              // 환경 설정
];

// 설정값 로컬 스토리지 저장 함수
function saveSettings() {
    INPUT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) localStorage.setItem('arrow_sim_' + id, el.value);
    });
}

// 설정값 로컬 스토리지 로드 함수
function loadSettings() {
    INPUT_IDS.forEach(id => {
        const savedValue = localStorage.getItem('arrow_sim_' + id);
        const el = document.getElementById(id);
        if (el && savedValue !== null) {
            el.value = savedValue;
        }
    });
}

// 개편된 4개 보텀 시트 제어 함수 (열기)
function openBottomSheet(type) {
    // 먼저 열려 있는 모든 보텀 시트를 닫고 비활성화
    closeBottomSheet();
    
    // 배경 어둡게 처리용 오버레이 활성화
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.add('active');
    
    // 매개변수 매핑에 맞춰 해당 보텀 시트 활성화
    let sheetId = '';
    if (type === 'arrow') sheetId = 'sheet-arrow';
    else if (type === 'method') sheetId = 'sheet-method';
    else if (type === 'env') sheetId = 'sheet-env';
    else if (type === 'result') sheetId = 'sheet-result';

    const targetSheet = document.getElementById(sheetId);
    if (targetSheet) {
        targetSheet.classList.add('active');
    }

    // 하단 탭 버튼 활성화 스타일 연동
    updateTabActiveStyle(type);
}

// 모든 보텀 시트 및 오버레이 비활성화 함수 (닫기)
function closeBottomSheet() {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('active');

    const sheets = ['sheet-arrow', 'sheet-method', 'sheet-env', 'sheet-result'];
    sheets.forEach(id => {
        const sheet = document.getElementById(id);
        if (sheet) sheet.classList.remove('active');
    });
    
    // 탭 버튼의 활성화(active) 클래스도 모두 초기화
    const tabItems = document.querySelectorAll('.tab-bar .tab-item');
    tabItems.forEach(item => item.classList.remove('active'));
    
    // 변경된 수치 데이터 자동 영구 저장
    saveSettings();
    
    // 물리 엔진 씬 실시간 갱신 반영
    if (typeof drawScene === 'function') drawScene();
}

// 하단 탭바 아이템 활성화 상태 시각화 함수
function updateTabActiveStyle(type) {
    const tabItems = document.querySelectorAll('.tab-bar .tab-item');
    tabItems.forEach(item => item.classList.remove('active'));

    // 버튼 순서 배열 매핑 (HTML 배치 순서: arrow->method->env->result)
    const typeOrder = ['arrow', 'method', 'env', 'result'];
    const activeIndex = typeOrder.indexOf(type);
    
    if (activeIndex !== -1 && tabItems[activeIndex]) {
        tabItems[activeIndex].classList.add('active');
    }
}

// 메인 화면 시점 제어 변수 및 함수
let currentView = 'side';
function changeView(viewType, element) {
    const buttons = document.querySelectorAll('.segment-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (element) {
        element.classList.add('active');
    }
    currentView = viewType;
    
    // 시점 전환 시 즉시 캔버스 재드로잉
    if (typeof drawScene === 'function') drawScene();
}
