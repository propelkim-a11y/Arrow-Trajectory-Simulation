// ============================================================================
// [UI & Interaction Core] 국궁 시뮬레이터 로컬 스토리지 데이터 백업 및 복구 엔진
// ============================================================================

// 데이터 영속성 관리를 위한 전체 입력 필드 ID 전수 리스트
const INPUT_IDS = [
  'velocity', 'angle', 'yawAngle', 'launchHeight',
  'diameter', 'dragCoeff', 'liftCoeff', 'weight',
  'targetHeight', 'windX', 'windY', 'airDensity'
];

// [데이터 저장] 현재 입력 폼에 기입된 수치들을 브라우저에 스냅샷으로 영구 백업
function saveSettings() {
  INPUT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      localStorage.setItem('arrow_sim_persistent_' + id, el.value);
    }
  });
}

// [데이터 복구] 앱 실행 시 과거 백업된 세션이 존재하면 안전하게 데이터 로드
function loadSettings() {
  INPUT_IDS.forEach(id => {
    const savedValue = localStorage.getItem('arrow_sim_persistent_' + id);
    const el = document.getElementById(id);
    
    // 과거 저장된 수치가 있을 때만 주입하며, 없을 경우 HTML 기본값(Default)을 온전히 보존
    if (el && savedValue !== null && savedValue !== "") {
      el.value = savedValue;
    }
    
    // [실시간 백업 인터페이스 수호] 인풋 값이 변경되는 즉시 저장하고 포물선을 재연산
    if (el) {
      el.addEventListener('input', () => {
        saveSettings();
        if (typeof fireArrow === 'function') {
          fireArrow();
        }
      });
    }
  });
}

// [상시 노출형 패널 탭 스위칭 트리거 핸들러]
function switchTab(tabType, element) {
  // 1. 하단 탭바 메뉴 전체 활성화 클래스 안전하게 일괄 차단 제거
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

  // 4. 패널 이동 시점에도 실시간 데이터 동기화 및 물리 연산 갱신 트리거 작동
  saveSettings();
  if (typeof fireArrow === 'function') {
    fireArrow();
  }
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
  const buttons = document.querySelectorAll('.segmented-control .segment-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');
  currentView = viewType;
  
  // 시점 변경 시 연산된 궤적 데이터를 기반으로 스크린 드로잉만 재수립
  if (typeof drawScene === 'function') {
    drawScene();
  }
}

// [라이프사이클 동기화] HTML 로드가 끝나는 즉시 데이터를 로드하고 포물선 첫 프레임을 투영
window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // 브라우저 첫 구동 시 복구된 이전 설정값을 반영하여 포물선 궤적 그림을 상시 자동 표출
  setTimeout(() => {
    if (typeof fireArrow === 'function') {
      fireArrow();
    }
  }, 50); // DOM 트리 안착을 위한 50ms 미세 안정 가드 시간 부여
});
