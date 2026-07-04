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
// =========================================================================
// [추가] 발사 버튼 터치/마우스 실시간 드래그 제어 및 터치 클릭 판정 로직
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
    const dragBtn = document.getElementById('draggableFireBtn');
    if (!dragBtn) return;

    let isDragging = false;
    let hasMoved = false; // 단순 터치 클릭과 드래그를 구분하기 위한 플래그
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    // 마우스 및 터치 이벤트 통합 핸들러 함수 정의
    function startDrag(e) {
        isDragging = true;
        hasMoved = false;
        
        // 터치 이벤트와 마우스 이벤트의 좌표 추출 통일
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        startX = clientX;
        startY = clientY;

        // 현재 버튼의 상대 위치 계산
        const rect = dragBtn.getBoundingClientRect();
        const container = dragBtn.parentElement.getBoundingClientRect();
        
        initialLeft = rect.left - container.left;
        initialTop = rect.top - container.top;
    }

    function doDrag(e) {
        if (!isDragging) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        // 움직임 거리가 미세하게라도 발생하면 드래그 상태로 인지
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
            hasMoved = true;
        }

        let newLeft = initialLeft + deltaX;
        let newTop = initialTop + deltaY;

        // 부모 시뮬레이션 박스 영역 바깥으로 탈출하지 못하도록 안전 마진 가두기 경계 설정
        const container = dragBtn.parentElement.getBoundingClientRect();
        const maxLeft = container.width - dragBtn.offsetWidth;
        const maxTop = container.height - dragBtn.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        // 스타일 좌표 강제 실시간 플롯
        dragBtn.style.left = newLeft + 'px';
        dragBtn.style.top = newTop + 'px';
        dragBtn.style.right = 'auto'; // 기존 CSS의 right 선언 무력화
    }

    function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;

        // 드래그를 하지 않고 자리에 멈춘 채 터치를 뗐다면 '순수 발사 클릭'으로 인정
        if (!hasMoved) {
            if (typeof fireArrow === 'function') fireArrow();
        }
    }

    // 모바일 터치 이벤트 연결
    dragBtn.addEventListener('touchstart', startDrag, { passive: true });
    window.addEventListener('touchmove', doDrag, { passive: false });
    window.addEventListener('touchend', endDrag);

    // PC 마우스 이벤트 연결
    dragBtn.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', endDrag);
});
