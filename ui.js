// 로컬 스토리지 저장 및 불러오기 변수 리스트 (고정 패널 구조에 맞춰 통합)
const INPUT_IDS = [
    'weight', 'diameter', 'dragCoeff', 'liftCoeff',             // 화살 설정
    'angle', 'velocity', 'yawAngle', 'launchHeight',            // 사법 설정
    'windX', 'windY', 'targetHeight', 'airDensity'              // 환경 설정
];

function saveSettings() {
    INPUT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) localStorage.setItem('arrow_sim_' + id, el.value);
    });
}

function loadSettings() {
    INPUT_IDS.forEach(id => {
        const savedValue = localStorage.getItem('arrow_sim_' + id);
        const el = document.getElementById(id);
        if (el && savedValue !== null) {
            el.value = savedValue;
        }
    });
}

function switchPanel(type) {
    saveSettings();
    const panels = ['arrow', 'method', 'env', 'result'];
    panels.forEach(p => {
        const el = document.getElementById('panel-' + p);
        if (el) el.classList.remove('active');
    });
    
    const targetPanel = document.getElementById('panel-' + type);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
    updateTabActiveStyle(type);
    if (typeof drawScene === 'function') drawScene();
}

function updateTabActiveStyle(type) {
    const tabItems = document.querySelectorAll('.tab-bar .tab-item');
    tabItems.forEach(item => item.classList.remove('active'));

    const typeOrder = ['arrow', 'method', 'env', 'result'];
    const activeIndex = typeOrder.indexOf(type);
    
    if (activeIndex !== -1 && tabItems[activeIndex]) {
        tabItems[activeIndex].classList.add('active');
    }
}

let currentView = 'side';
function changeView(viewType, element) {
    const buttons = document.querySelectorAll('.segmented-control .segment-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (element) {
        element.classList.add('active');
    }
    currentView = viewType;
    if (typeof drawScene === 'function') drawScene();
}

window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
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
