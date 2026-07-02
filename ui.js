// ============================================================================
// [UI & Interaction Core] 국궁 시뮬레이터 상시 노출형 패널 스위칭 엔진
// ============================================================================

// 로컬 스토리지 저장 및 불러오기 전수 변수 리스트 통합 관리
const INPUT_IDS = [
  'velocity', 'angle', 'yawAngle', 'launchHeight',
  'diameter', 'dragCoeff', 'liftCoeff', 'weight',
  'targetHeight', 'windX', 'windY', 'airDensity'
];

// 설정값 로컬 스토리지에 세션 백업
function saveSettings() {
  INPUT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) localStorage.setItem('arrow_sim_' + id, el.value);
  });
}

// 로컬 스토리지 백업 데이터 셋업 엔진 및 이벤트 리스너 통합 바인딩
function loadSettings() {
  INPUT_IDS.forEach(id => {
    const savedValue = localStorage.getItem('arrow_sim_' + id);
    const el = document.getElementById(id);
    if (el && savedValue !== null) {
      el.value = savedValue;
    }
    
    // [실시간 동기화 인터페이스] 값이 변경될 때마다 자동 백업 및 물리 드로잉 씬 갱신
    if (el) {
      el.addEventListener('input', () => {
        saveSettings();
        if (typeof drawScene === 'function') drawScene();
      });
    }
  });
}

// [상시 노출형 전용 패널 탭 스위칭 트리거 핸들러]
function switchTab(tabType, element) {
  // 1. 하단 탭바 메뉴 전체 활성화 클래스 안전하게 강제 초기화 제거
  const tabBarItems = document.querySelectorAll('.tab-bar .tab-item');
  tabBarItems.forEach(item => item.classList.remove('active'));
  
  // 2. 화면에 고정 노출되는 상시 설정 패널 컨포넌트 전체 비활성화
  const tabPanels = document.querySelectorAll('.tab-panel');
  tabPanels.forEach(panel => panel.classList.remove('active'));

  // 3. 선택된 현재 터치 타겟 탭 메뉴와 일치하는 설정 패널을 활성화 동기화
  element.classList.add('active');
  const targetPanel = document.getElementById('sheet-' + tabType);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  // 4. 레이아웃 변경에 따른 데이터 정밀 데이터 수집 유도 및 물리 캔버스 재수립
  saveSettings();
  if (typeof drawScene === 'function') drawScene();
}

// [물리 연산 연동 데이터 인젝션 인터페이스]
// physics.js 내 연산 루프 종료 후 본 함수를 호출하여 수치를 실시간 투영합니다.
function updateFlightResultsUI(data) {
  if (!data) return;
  
  if (data.maxDistance !== undefined) 
    document.getElementById('resMaxDistance').innerText = data.maxDistance.toFixed(2);
  if (data.maxHeight !== undefined) 
    document.getElementById('resMaxHeight').innerText = data.maxHeight.toFixed(2);
  if (data.lateralDeviation !== undefined) 
    document.getElementById('resLateralDeviation').innerText = data.lateralDeviation.toFixed(2);
  if (data.flightTime !== undefined) 
    document.getElementById('resFlightTime').innerText = data.flightTime.toFixed(2);
  if (data.impactVelocity !== undefined) 
    document.getElementById('resImpactVelocity').innerText = data.impactVelocity.toFixed(2);
  if (data.impactEnergy !== undefined) 
    document.getElementById('resImpactEnergy').innerText = data.impactEnergy.toFixed(2);
}

// 탑 뷰 / 사이드 뷰 / 프론트 뷰 세그먼트 가로 컨트롤 핸들러
let currentView = 'side';
function changeView(viewType, element) {
  const buttons = document.querySelectorAll('.segment-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');
  currentView = viewType;
  if (typeof drawScene === 'function') drawScene();
}

// 도큐먼트 초기화 로드 라이프사이클 바인딩
window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
});
