// 로컬 스토리지 저장 및 불러오기 변수 리스트 (고정 패널 구조에 맞춰 통합)
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

// 상시 노출형 하단 패널 및 탭 메뉴 전환 함수
function switchPanel(type) {
    // 1. 기존 데이터 백업 진행
    saveSettings();

    // 2. 모든 설정 패널 숨기기
    const panels = ['arrow', 'method', 'env', 'result'];
    panels.forEach(p => {
        const el = document.getElementById('panel-' + p);
        if (el) el.classList.remove('active');
    });
    
    // 3. 사용자가 선택한 특정 패널만 화면에 노출
    const targetPanel = document.getElementById('panel-' + type);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }

    // 4. 하단 탭 메뉴 내비게이션 하이라이트 스타일 업데이트
    updateTabActiveStyle(type);
    
    // 5. 수치 변경사항이 있을 수 있으므로 물리 엔진 씬 실시간 리드로잉
    if (typeof drawScene === 'function') drawScene();
}

// 하단 탭바 아이템 활성화 상태 시각화 함수
function updateTabActiveStyle(type) {
    const tabItems = document.querySelectorAll('.tab-bar .tab-item');
    tabItems.forEach(item => item.classList.remove('active'));

    // 버튼 배치 순서 매핑 (HTML 배치 순서: arrow -> method -> env -> result)
    const typeOrder = ['arrow', 'method', 'env', 'result'];
    const activeIndex = typeOrder.indexOf(type);
    
    if (activeIndex !== -1 && tabItems[activeIndex]) {
        tabItems[activeIndex].classList.add('active');
    }
}

// 메인 화면 시점 제어 변수 및 함수
let currentView = 'side';
function changeView(viewType, element) {
    const buttons = document.querySelectorAll('.segmented-control .segment-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (element) {
        element.classList.add('active');
    }
    currentView = viewType;
    
    // 시점 전환 시 즉시 캔버스 화면 재드로잉
    if (typeof drawScene === 'function') drawScene();
}

// 입력 폼에 수치를 타이핑하거나 변경할 때 실시간으로 데이터 저장 및 씬 반영을 돕는 이벤트 리스너 등록
window.addEventListener('DOMContentLoaded', () => {
    // 로컬 스토리지에 보존되어 있던 기존 세팅값 전면 로드
    loadSettings();

    // 사용자가 값을 바꿀 때마다 자동으로 영구 저장하고 캔버스를 갱신하는 핸들러 바인딩
    INPUT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                saveSettings();
                if (typeof drawScene === 'function') drawScene();
            });
        }
    });
});
