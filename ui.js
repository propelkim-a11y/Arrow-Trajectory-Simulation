// ============================================================================
// [UI & Interaction Core - Part 1] 모바일 터치 전파 및 고정폭 인젝션 엔진 (v1.1.0)
// ============================================================================

const INPUT_IDS = [
  'velocity', 'angle', 'yawAngle', 'launchHeight',
  'diameter', 'dragCoeff', 'liftCoeff', 'weight',
  'targetHeight', 'windX', 'windY', 'airDensity'
];

function saveSettings() {
  INPUT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      localStorage.setItem('arrow_sim_persistent_' + id, el.value);
    }
  });
}

function loadSettings() {
  INPUT_IDS.forEach(id => {
    const savedValue = localStorage.getItem('arrow_sim_persistent_' + id);
    const el = document.getElementById(id);
    
    if (el && savedValue !== null && savedValue !== "") {
      el.value = savedValue;
    }
    
    // 모바일 가상 패드 및 스크롤 인풋 동작 시 상시 동기화 바인딩
    if (el) {
      el.addEventListener('input', () => {
        saveSettings();
        if (typeof fireArrow === 'function') {
          fireArrow();
        }
      });
    }
  });

  // [모바일 핵가드] 모바일 웹뷰 가상 이벤트 차단 필터 격파를 위한 다이렉트 엔진 작동
  saveSettings();
  if (typeof fireArrow === 'function') {
    fireArrow();
  }
}
// ============================================================================
// [UI & Interaction Core - Part 2] 모바일 가독성 수호 및 모바일 탭 스위칭 엔진 (v1.1.0)
// ============================================================================

function switchTab(tabType, element) {
  const tabBarItems = document.querySelectorAll('.tab-bar .tab-item');
  tabBarItems.forEach(item => item.classList.remove('active'));
  
  const tabPanels = document.querySelectorAll('.tab-panel');
  tabPanels.forEach(panel => panel.classList.remove('active'));

  element.classList.add('active');
  const targetPanel = document.getElementById('sheet-' + tabType);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  saveSettings();
  if (typeof fireArrow === 'function') {
    fireArrow();
  }
}

// [물리 연산 연동 데이터 인젝션] 모바일 고정 폭 가독성 규격(tabular-nums) 수호 메커니즘
function updateFlightResultsUI(data) {
  if (!data) return;
  
  const maxDistanceEl = document.getElementById('resMaxDistance');
  const maxHeightEl = document.getElementById('resMaxHeight');
  const lateralDeviationEl = document.getElementById('resLateralDeviation');
  const flightTimeEl = document.getElementById('resFlightTime');
  const impactVelocityEl = document.getElementById('resImpactVelocity');
  const impactEnergyEl = document.getElementById('resImpactEnergy');

  const renderValue = (el, val) => {
    if (!el) return;
    // 폰 화면에서 숫자가 바뀔 때 레이아웃이 미세하게 떨리는 버그 방지를 위해 tabular-nums 규격 주입
    el.style.fontVariantNumeric = 'tabular-nums'; 
    if (val === undefined || val === null || isNaN(val) || !isFinite(val)) {
      el.innerText = "0.00";
    } else {
      el.innerText = val.toFixed(2);
    }
  };

  renderValue(maxDistanceEl, data.maxDistance);
  renderValue(maxHeightEl, data.maxHeight);
  renderValue(lateralDeviationEl, data.lateralDeviation);
  renderValue(flightTimeEl, data.flightTime);
  renderValue(impactVelocityEl, data.impactVelocity);
  renderValue(impactEnergyEl, data.impactEnergy);
}

let currentView = 'side';
function changeView(viewType, element) {
  const buttons = document.querySelectorAll('.segmented-control .segment-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');
  currentView = viewType;
  
  if (typeof drawScene === 'function') {
    drawScene();
  }
}

// [라이프사이클 통합] 외부 캔버스 리소스를 확보한 후 안전하게 실행하는 모바일 확정 로드 체인
window.addEventListener('load', () => {
  // 모바일 브라우저 렌더러 파이프라인의 안전한 초기 정렬을 보장하기 위해 60ms 지연 후 기동
  setTimeout(() => {
    loadSettings();
  }, 60);
});
