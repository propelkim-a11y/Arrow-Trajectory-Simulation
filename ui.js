const INPUT_IDS = [
    'weight', 'diameter', 'dragCoeff', 'liftCoeff',             
    'angle', 'velocity', 'yawAngle', 'launchHeight',            
    'windX', 'windY', 'targetHeight', 'airDensity'              
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
    if (element) element.classList.add('active');
    currentView = viewType;
    if (typeof drawScene === 'function') drawScene();
}

// 💡 [음수 입력 최적화 기능] 마이너스 부호와 소수점이 실시간 타이핑 도중 깨지지 않게 보정하는 정규식 필터
const NEGATIVE_ALLOWED_IDS = ['angle', 'yawAngle', 'windX', 'windY', 'targetHeight'];

window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    INPUT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                if (NEGATIVE_ALLOWED_IDS.includes(id)) {
                    // 첫 글자 마이너스 허용, 소수점은 단 하나만 존재하도록 문자열 실시간 세탁
                    let val = el.value;
                    val = val.replace(/[^0-9.-]/g, ''); // 숫자, 점, 마이너스 외 삭제
                    val = val.replace(/(?!^)-/g, '');   // 첫 자리가 아닌 마이너스 제거
                    const parts = val.split('.');
                    if (parts.length > 2) {
                        val = parts[0] + '.' + parts.slice(1).join(''); // 소수점 두 개 이상 방지
                    }
                    el.value = val;
                }
                saveSettings();
                if (typeof drawScene === 'function') drawScene();
            });
        }
    });

    // 발사 버튼 동적 드래그 제어부 병합
    const dragBtn = document.getElementById('draggableFireBtn');
    if (!dragBtn) return;

    let isDragging = false; let hasMoved = false;
    let startX = 0, startY = 0; let initialLeft = 0, initialTop = 0;

    function startDrag(e) {
        isDragging = true; hasMoved = false;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        startX = clientX; startY = clientY;
        const rect = dragBtn.getBoundingClientRect();
        const container = dragBtn.parentElement.getBoundingClientRect();
        initialLeft = rect.left - container.left; initialTop = rect.top - container.top;
    }

    function doDrag(e) {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaX = clientX - startX; const deltaY = clientY - startY;
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) { hasMoved = true; }
        let newLeft = initialLeft + deltaX; let newTop = initialTop + deltaY;
        const container = dragBtn.parentElement.getBoundingClientRect();
        const maxLeft = container.width - dragBtn.offsetWidth; const maxTop = container.height - dragBtn.offsetHeight;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft)); newTop = Math.max(0, Math.min(newTop, maxTop));
        dragBtn.style.left = newLeft + 'px'; dragBtn.style.top = newTop + 'px'; dragBtn.style.right = 'auto';
    }

    function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;
        if (!hasMoved) { if (typeof fireArrow === 'function') fireArrow(); }
    }

    dragBtn.addEventListener('touchstart', startDrag, { passive: true });
    window.addEventListener('touchmove', doDrag, { passive: false });
    window.addEventListener('touchend', endDrag);
    dragBtn.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', endDrag);
});
