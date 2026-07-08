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
// 🎯 과녁도 표보기 조준점 실시간 터치/마우스 드래그 시스템 (최종 검증 완결본)
// =========================================================
let isTargetDragging = false;
const simCanvasEl = document.getElementById('simCanvas');

if (simCanvasEl) {
    simCanvasEl.addEventListener('mousedown', startTargetDrag);
    simCanvasEl.addEventListener('touchstart', startTargetDrag, { passive: false });
}

window.addEventListener('mousemove', doTargetDrag);
window.addEventListener('touchmove', doTargetDrag, { passive: false });
window.addEventListener('mouseup', endTargetDrag);
window.addEventListener('touchend', endTargetDrag);

function startTargetDrag(e) {
    if (typeof currentView !== 'undefined' && currentView !== 'target') return;
    if (e.touches) e.preventDefault(); 
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
    isTargetDragging = false;
}

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

    const currentDprWidth = canvasEl.width / (window.devicePixelRatio || 1);
    const currentDprHeight = canvasEl.height / (window.devicePixelRatio || 1);

    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const tBottomY = currentDprHeight * 0.75;
    const targetViewScale = Math.min(currentDprWidth, currentDprHeight) / 5.5;

    const calculatedZ = (canvasX - (currentDprWidth / 2)) / targetViewScale;
    const calculatedY = (tBottomY - canvasY) / targetViewScale;

    const losYEl = document.getElementById('losTargetY');
    const losZEl = document.getElementById('losTargetZ');
    const useLosEl = document.getElementById('useLos');

    if (losYEl && losZEl) {
        losYEl.value = calculatedY.toFixed(2);
        losZEl.value = calculatedZ.toFixed(2);

        if (useLosEl && !useLosEl.checked) {
            useLosEl.checked = true;
        }

        localStorage.setItem('arrow_sim_losTargetY', losYEl.value);
        localStorage.setItem('arrow_sim_losTargetZ', losZEl.value);
        localStorage.setItem('arrow_sim_useLos', 'true');

        if (typeof drawScene === 'function') {
            window.requestAnimationFrame(drawScene);
        }
    }
}

// 인트로 공지사항 모달 닫기 함수 (안전 재배치)
function closeIntro() {
    const introModal = document.getElementById('introModal');
    if (introModal) {
        introModal.style.opacity = '0';
        introModal.style.visibility = 'hidden';
        setTimeout(() => {
            introModal.style.display = 'none';
        }, 300);
    }
}
// =========================================================
// 🎯 하단 설정 카드 좌우 스와이프(밀기) 전환 시스템 추가
// =========================================================
const panelContainer = document.getElementById('panel-container');

if (panelContainer) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // 탭 순서 정의
    const tabsOrder = ['arrow', 'method', 'env', 'result'];

    panelContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    panelContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // 수평 스와이프 조건 (대각선 오작동 방지: 수평 이동이 수직 이동보다 커야 함)
        if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
            // 현재 활성화된 패널 찾기
            const activePanel = document.querySelector('.fixed-panel.active');
            if (!activePanel) return;
            
            const currentType = activePanel.id.replace('panel-', '');
            const currentIndex = tabsOrder.indexOf(currentType);

            if (deltaX < 0) {
                // ◀ 왼쪽으로 밀기 (다음 패널로 이동)
                if (currentIndex < tabsOrder.length - 1) {
                    switchPanel(tabsOrder[currentIndex + 1]);
                }
            } else {
                // ▶ 오른쪽으로 밀기 (이전 패널로 이동)
                if (currentIndex > 0) {
                    switchPanel(tabsOrder[currentIndex - 1]);
                }
            }
        }
    }
}
// =========================================================
// 🎯 상단 시뮬레이터 화면 좌우 스와이프(밀기) 뷰 전환 시스템 추가
// =========================================================
const simContainer = document.querySelector('.sim-container');

if (simContainer) {
    let simTouchStartX = 0;
    let simTouchStartY = 0;
    let simTouchEndX = 0;
    let simTouchEndY = 0;

    // 뷰 순서 정의 (정면 -> 측면 -> 평면 -> 과녁)
    const viewsOrder = ['front', 'side', 'top', 'target'];

    simContainer.addEventListener('touchstart', (e) => {
        // 발시 버튼 드래그와 충돌 방지 (발시 버튼 터치 시 스와이프 무시)
        if (e.target.id === 'draggableFireBtn') return;
        
        simTouchStartX = e.touches[0].clientX;
        simTouchStartY = e.touches[0].clientY;
    }, { passive: true });

    simContainer.addEventListener('touchend', (e) => {
        if (e.target.id === 'draggableFireBtn') return;
        
        simTouchEndX = e.changedTouches[0].clientX;
        simTouchEndY = e.changedTouches[0].clientY;
        handleSimSwipe();
    }, { passive: true });

    function handleSimSwipe() {
        const deltaX = simTouchEndX - simTouchStartX;
        const deltaY = simTouchEndY - simTouchStartY;

        // 수평 스와이프 조건 (민감도 60px 기준, 수평 이동이 수직 이동보다 커야 함)
        if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
            // 현재 활성화된 뷰(currentView)의 인덱스 찾기
            // 단, index.html 구조상 버튼 엘리먼트도 함께 넘겨주어야 스타일이 바뀝니다.
            if (typeof currentView === 'undefined') return;
            
            const currentIndex = viewsOrder.indexOf(currentView);
            let targetView = '';

            if (deltaX < 0) {
                // ◀ 왼쪽으로 밀기 (다음 뷰로 이동: 정면 -> 측면 -> 평면 -> 과녁)
                if (currentIndex < viewsOrder.length - 1) {
                    targetView = viewsOrder[currentIndex + 1];
                }
            } else {
                // ▶ 오른쪽으로 밀기 (이전 뷰로 이동: 과녁 -> 평면 -> 측면 -> 정면)
                if (currentIndex > 0) {
                    targetView = viewsOrder[currentIndex - 1];
                }
            }

            // 변경할 뷰가 결정되었다면, 상단 세그먼트 버튼 엘리먼트를 찾아서 함께 전달
            if (targetView) {
                const btnSelector = `.segmented-control .segment-btn[onclick*="${targetView}"]`;
                const targetBtnEl = document.querySelector(btnSelector);
                
                // 기존 changeView 함수 호출
                changeView(targetView, targetBtnEl);
            }
        }
    }
}
