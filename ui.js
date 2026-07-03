// ============================================================================
// [UI & Interaction Core - Mobile Stability Version]
// ============================================================================

const INPUT_IDS = [
  'velocity', 'angle', 'yawAngle', 'launchHeight',
  'diameter', 'dragCoeff', 'liftCoeff', 'weight',
  'targetHeight', 'windX', 'windY', 'airDensity'
];

// 모바일 연속 호출 과부하 방지용 가드 변수
let fireTimeout = null;
function safeFireArrow() {
  if (fireTimeout) clearTimeout(fireTimeout);
  fireTimeout = setTimeout(() => {
    if (typeof fireArrow === 'function') {
      fireArrow();
    }
  }, 30); // 30ms 내의 중복 호출은 단 하나로 병합하여 연산 장치 보호
}

function saveSettings() {
  INPUT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value !== undefined && el.value !== "") {
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
    
    if (el) {
      // 모바일 인풋 입력 시 실시간 반영 안정화
      el.addEventListener('input', () => {
        saveSettings();
        safeFireArrow();
      });
    }
  });
}

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
  safeFireArrow();
}

function updateFlightResultsUI(data) {
  if (!data) return;
  
  const ids = {
    resMaxDistance: data.maxDistance,
    resMaxHeight: data.maxHeight,
    resLateralDeviation: data.lateralDeviation,
    resFlightTime: data.flightTime,
    resImpactVelocity: data.impactVelocity,
    resImpactEnergy: data.impactEnergy
  };

  // 모바일 DOM 렌더링 스레드가 지연되어 숫자가 0.00으로 씹히는 현상 완벽 방어
  Object.keys(ids).forEach(id => {
    const el = document.getElementById(id);
    if (el && ids[id] !== undefined && !isNaN(ids[id])) {
      el.textContent = ids[id].toFixed(2);
    }
  });
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

window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setTimeout(() => {
    safeFireArrow();
  }, 100);
});
