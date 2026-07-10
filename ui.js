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
  
  // 💡 기존 배열에 'settings-file'을 추가했습니다.
  const panels = ['arrow', 'method', 'env', 'result', 'settings-file'];
  
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
  
  // 💡 HTML 버튼 순서와 똑같이 맨 뒤에 'settings-file'을 추가했습니다.
  const typeOrder = ['arrow', 'method', 'env', 'result', 'settings-file'];
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
    const lockLosEl = document.getElementById('lockLos'); // 💡 고정 엘리먼트 가져오기 추가
    
    // 💡 [우선순위 제어] 표보기 설정(useLos)이 체크되어 있지 않다면 터치 입력을 무시하고 리턴합니다.
    if (!useLosEl || !useLosEl.checked) {
        return;
    }

    // 💡 [새로 추가된 고정 기능] 고정 체크박스가 켜져 있다면 터치 입력을 무시하고 리턴합니다.
    if (lockLosEl && lockLosEl.checked) {
        return;
    }
    
    if (losYEl && losZEl) {
        losYEl.value = calculatedY.toFixed(2);
        losZEl.value = calculatedZ.toFixed(2);
    
        localStorage.setItem('arrow_sim_losTargetY', losYEl.value);
        localStorage.setItem('arrow_sim_losTargetZ', losZEl.value);
    
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
// =========================================================
// [1단계] 설정 파일 저장 (유저 지정 이름으로 다운로드)
// =========================================================
function exportSettingsToFile() {
  const saveBtn = document.getElementById('saveSettingsBtn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    // 1. 현재 화면의 최신 입력값들을 로컬스토리지에 먼저 동기화
    if (typeof saveSettings === 'function') saveSettings();

    // 2. 기본 파일 이름 생성 (예: arrow_sim_settings_2026-07-10)
    const defaultDate = new Date().toISOString().slice(0, 10);
    const defaultFileName = `arrow_sim_settings_${defaultDate}`;

    // 3. 유저에게 팝업창으로 파일 이름 입력받기
    let customFileName = prompt("저장할 설정 파일 이름을 입력하세요:", defaultFileName);
    
    // 취소 버튼을 누른 경우 작동 중단
    if (customFileName === null) return; 

    // 앞뒤 공백 제거 및 빈칸일 경우 기본 이름 적용
    customFileName = customFileName.trim();
    if (customFileName === "") {
      customFileName = defaultFileName;
    }

    // 4. 저장할 데이터 구조 조립
    const configData = {};
    
    // INPUT_IDS 배열을 순회하며 데이터 수집
    if (typeof INPUT_IDS !== 'undefined') {
      INPUT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) configData[id] = el.value;
      });
    }

    // useLos 체크박스 상태 수집
    const useLosEl = document.getElementById('useLos');
    if (useLosEl) configData['useLos'] = useLosEl.checked;

    // 발시 버튼 위치 정보 수집
    const btnLeft = localStorage.getItem('arrow_sim_btn_left');
    const btnTop = localStorage.getItem('arrow_sim_btn_top');
    if (btnLeft) configData['btn_left'] = btnLeft;
    if (btnTop) configData['btn_top'] = btnTop;

    // 5. 가상 다운로드 링크를 생성하여 JSON 파일 내보내기
    const jsonString = JSON.stringify(configData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    // 확장자(.json) 중복 방지 처리
    link.download = customFileName.endsWith('.json') ? customFileName : `${customFileName}.json`;
    
    document.body.appendChild(link);
    link.click();
    
    // 메모리 정리 및 가상 링크 제거
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

// =========================================================
// [2단계] 설정 파일 열기 (JSON 읽기 및 화면 반영)
// =========================================================
function importSettingsFromFile() {
  const loadBtn = document.getElementById('loadSettingsBtn');
  const fileInput = document.getElementById('settingsFileInput');
  if (!loadBtn || !fileInput) return;

  // 1. 열기 그래픽 버튼 클릭 시, 숨겨진 실제 파일 선택 창을 트리거
  loadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // 2. 파일 선택 창에서 사용자가 파일을 골랐을 때의 처리
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const configData = JSON.parse(event.target.result);

        // 정상적인 객체 데이터인지 검증
        if (!configData || typeof configData !== 'object') {
          alert('올바르지 않은 설정 파일 형식입니다.');
          return;
        }

        // INPUT_IDS 항목들을 순회하며 화면 입력창 채우고 로컬스토리지 저장
        if (typeof INPUT_IDS !== 'undefined') {
          INPUT_IDS.forEach(id => {
            if (configData[id] !== undefined) {
              const el = document.getElementById(id);
              if (el) el.value = configData[id];
              localStorage.setItem('arrow_sim_' + id, configData[id]);
            }
          });
        }

        // useLos 체크박스 상태 복원
        if (configData['useLos'] !== undefined) {
          const useLosEl = document.getElementById('useLos');
          if (useLosEl) useLosEl.checked = configData['useLos'];
          localStorage.setItem('arrow_sim_useLos', configData['useLos'] ? 'true' : 'false');
        }

        // 발시 버튼 위치 복원 및 로컬스토리지 최신화
        if (configData['btn_left'] && configData['btn_top']) {
          localStorage.setItem('arrow_sim_btn_left', configData['btn_left']);
          localStorage.setItem('arrow_sim_btn_top', configData['btn_top']);
          
          const dragBtn = document.getElementById('draggableFireBtn');
          if (dragBtn) {
            dragBtn.style.left = configData['btn_left'];
            dragBtn.style.top = configData['btn_top'];
            dragBtn.style.right = 'auto'; // 기존 우측 고정 초기화
          }
        }

        // 3. 변경된 데이터 기반으로 시뮬레이터 화면 즉시 갱신
        if (typeof drawScene === 'function') drawScene();
        
        alert('설정 파일이 성공적으로 적용되었습니다.');

      } catch (error) {
        alert('파일을 읽는 중 오류가 발생했습니다: ' + error.message);
      } finally {
        // 똑같은 파일을 연속으로 다시 불러올 수 있도록 파일 선택 상태 초기화
        fileInput.value = '';
      }
    };

    reader.readAsText(file);
  });
}

// =========================================================
// [3단계] 문서 로드가 완료되면 기능들을 최종 활성화
// =========================================================
window.addEventListener('DOMContentLoaded', () => {
  exportSettingsToFile();
  importSettingsFromFile();
});
