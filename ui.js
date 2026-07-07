const INPUT_IDS = [
  'weight', 'diameter', 'dragCoeff', 'liftCoeff',
  'angle', 'velocity', 'yawAngle', 'launchHeight', 'launchZ',
  'windX', 'windY', 'targetHeight', 'airDensity',
  'losTargetY', 'losTargetZ' // 💡 LOS 수동 입력 ID 추가 (useLos는 체크박스이므로 별도 처리하거나 제외)
];

function saveSettings() {
  INPUT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) localStorage.setItem('arrow_sim_' + id, el.value);
  });
    const useLosEl = document.getElementById('useLos');
    if (useLosEl) localStorage.setItem('arrow_sim_useLos', useLosEl.checked ? 'true' : 'false');
}

function loadSettings() {
  INPUT_IDS.forEach(id => {
    const savedValue = localStorage.getItem('arrow_sim_' + id);
    const el = document.getElementById(id);
    if (el && savedValue !== null) {
      el.value = savedValue;
    }
  });
    const useLosEl = document.getElementById('useLos');
    const savedLos = localStorage.getItem('arrow_sim_useLos');
    if (useLosEl && savedLos !== null) useLosEl.checked = (savedLos === 'true');   
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

const NEGATIVE_ALLOWED_IDS = ['angle', 'yawAngle', 'windX', 'windY', 'targetHeight', 'losTargetY', 'losTargetZ'];

window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
    const useLosEl = document.getElementById('useLos');
    if (useLosEl) {
        useLosEl.addEventListener('change', () => {
           if (typeof saveSettings === 'function') saveSettings();
           if (typeof drawScene === 'function') drawScene();
  });
}
    
  INPUT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (NEGATIVE_ALLOWED_IDS.includes(id)) {
          let val = el.value;
          val = val.replace(/[^0-9.-]/g, '');
          val = val.replace(/(?!^)-/g, '');
          const parts = val.split('.');
          if (parts.length > 2) {
            val = parts[0] + '.' + parts.slice(1).join('');
          }
          el.value = val;
        }
        saveSettings();
        if (typeof drawScene === 'function') drawScene();
      });
    }
  });

  // =========================================================================
  // [💡 위치 기억 기능 추가] 무제한 스크린 프리 드래그 제어 시스템
  // =========================================================================
  const dragBtn = document.getElementById('draggableFireBtn');
  if (!dragBtn) return;

  let isDragging = false;
  let hasMoved = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;

  // 이전 사용 위치 복원 함수
  function loadButtonPosition() {
    const savedLeft = localStorage.getItem('arrow_sim_btn_left');
    const savedTop = localStorage.getItem('arrow_sim_btn_top');
    
    if (savedLeft !== null && savedTop !== null) {
      dragBtn.style.left = savedLeft;
      dragBtn.style.top = savedTop;
      dragBtn.style.right = 'auto'; // 초기 CSS 우측 고정 해제
    }
  }

  function startDrag(e) {
    isDragging = true;
    hasMoved = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startX = clientX;
    startY = clientY;
    const rect = dragBtn.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
  }

  function doDrag(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMoved = true;
    }
    let newLeft = initialLeft + deltaX;
    let newTop = initialTop + deltaY;

    // 브라우저 뷰포트 전체 크기를 기준으로 가둠
    const maxLeft = window.innerWidth - dragBtn.offsetWidth;
    const maxTop = window.innerHeight - dragBtn.offsetHeight;
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    dragBtn.style.left = newLeft + 'px';
    dragBtn.style.top = newTop + 'px';
    dragBtn.style.right = 'auto';
  }

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    if (!hasMoved) {
      if (typeof fireArrow === 'function') fireArrow();
    } else {
      // 드래그 이동이 정상적으로 완료되면 로컬스토리지에 위치 좌표 저장
      localStorage.setItem('arrow_sim_btn_left', dragBtn.style.left);
      localStorage.setItem('arrow_sim_btn_top', dragBtn.style.top);
    }
  }

  // 초기 실행 시 저장된 버튼 위치 불러오기
  loadButtonPosition();

  // 이벤트 리스너 등록
  dragBtn.addEventListener('touchstart', startDrag, { passive: true });
  window.addEventListener('touchmove', doDrag, { passive: false });
  window.addEventListener('touchend', endDrag);
  dragBtn.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', doDrag);
  window.addEventListener('mouseup', endDrag);
 
  const useLosCheck = document.getElementById('useLos');
  if (useLosCheck) {
    // 로컬스토리지에서 기존 상태 복원
    const savedLos = localStorage.getItem('arrow_sim_useLos');
    useLosCheck.checked = (savedLos === 'true');

    // 변경될 때마다 저장하고 화면 리드로우
    useLosCheck.addEventListener('change', () => {
      localStorage.setItem('arrow_sim_useLos', useLosCheck.checked);
      if (typeof drawScene === 'function') drawScene();
    });
  }  
  
});
// 인트로 공지사항 모달 닫기 함수
function closeIntro() {
  const introModal = document.getElementById('introModal');
  if (introModal) {
    introModal.style.opacity = '0';
    introModal.style.visibility = 'hidden';
    setTimeout(() => {
      introModal.style.display = 'none';
    }, 300); // CSS transition 시간(0.3s)과 일치시켜 부드럽게 제거
  }
}

// =========================================================
// 🎯 과녁도 표보기 조준점 실시간 터치/마우스 드래그 제어 시스템 (오류 수정 버전)
// =========================================================
let isTargetDragging = false;

// 1. 캔버스 엘리먼트에 직접 이벤트 바인딩
const simCanvasEl = document.getElementById('simCanvas');

if (simCanvasEl) {
    simCanvasEl.addEventListener('mousedown', startTargetDrag);
    simCanvasEl.addEventListener('touchstart', startTargetDrag, { passive: false });
}

// 2. 브라우저 창 전역에서 드래그 및 해제 추적
window.addEventListener('mousemove', doTargetDrag);
window.addEventListener('touchmove', doTargetDrag, { passive: false });
window.addEventListener('mouseup', endTargetDrag);
window.addEventListener('touchend', endTargetDrag);

function startTargetDrag(e) {
    if (typeof currentView !== 'undefined' && currentView !== 'target') return;
    if (e.touches) e.preventDefault(); // 스크롤 바운스 방지
    
    isTargetDragging = true;
    updateTargetCoords(e);
}

function doTargetDrag(e) {
    if (!isTargetDragging) return;
    if (typeof currentView !== 'undefined' && currentView !== 'target') return;
    if (e.touches) e.preventDefault();
    
    updateTargetCoords(e);
}

function endTargetDrag(e) {
    if (isTargetDragging) {
        isTargetDragging = false;
    }
}

// 변수 충돌 없는 좌표 역산 처리 핵심 함수
function updateTargetCoords(e) {
    const canvasEl = document.getElementById('simCanvas');
    if (!canvasEl) return;
    
    const rect = canvasEl.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    // 1. [핵심 패치] ui.js 내부에서 직접 안전하게 Canvas 해상도 너비/높이 확보
    const currentDprWidth = canvasEl.width / (window.devicePixelRatio || 1);
    const currentDprHeight = canvasEl.height / (window.devicePixelRatio || 1);
    
    // 2. 마우스 CSS 픽셀 위치 환산
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    
    // 3. physics.js 물리 레이아웃 비례 연산 동기화
    const tBottomY = currentDprHeight * 0.65;
    const targetViewScale = Math.min(currentDprWidth, currentDprHeight) / 5.5;
    
    // 4. 월드 공간 미터 수치 역산
    const calculatedZ = (canvasX - (currentDprWidth / 2)) / targetViewScale;
    const calculatedY = (tBottomY - canvasY) / targetViewScale;
    
    // 5. DOM 엘리먼트 값 주입 및 전파
    const losYEl = document.getElementById('losTargetY');
    const losZEl = document.getElementById('losTargetZ');
    const useLosEl = document.getElementById('useLos');
    
    if (losYEl && losZEl) {
        losYEl.value = calculatedY.toFixed(2);
        losZEl.value = calculatedZ.toFixed(2);
        
        if (useLosEl && !useLosEl.checked) {
            useLosEl.checked = true;
            localStorage.setItem('arrow_sim_useLos', 'true');
        }
        
        // 브라우저에 값이 바뀌었음을 강제 전파하여 스토리지 저장 작동 유도
        const intTrigger = new Event('input', { bubbles: true });
        losYEl.dispatchEvent(intTrigger);
        losZEl.dispatchEvent(intTrigger);

        // 실시간 강제 드로잉 호출
        if (typeof saveSettings === 'function') saveSettings();
        if (typeof drawScene === 'function') drawScene();
    }
}
