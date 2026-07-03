// ============================================================================
// [UI & Interaction Core - Part 1] 국궁 시뮬레이터 데이터 영속성 백업 관리 엔진
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
    // 0이나 공백, NaN이 무분별하게 입력되어 데이터가 유실되는 현상을 엄격히 가드 처리 후 저장
    if (el && el.value !== "" && !isNaN(el.valueAsNumber)) {
      localStorage.setItem('arrow_sim_persistent_' + id, el.value);
    }
  });
}

// [데이터 복구] 앱 실행 시 과거 백업된 세션이 존재하면 안전하게 데이터 로드
function loadSettings() {
  INPUT_IDS.forEach(id => {
    const savedValue = localStorage.getItem('arrow_sim_persistent_' + id);
    const el = document.getElementById(id);
    
    // 저장소 오염 방어 가드: 정상적인 수치 스냅샷인 경우에만 덮어쓰기 허용 (0값 유실 차단)
    if (el && savedValue !== null && savedValue !== "" && !isNaN(parseFloat(savedValue))) {
      const parsed = parseFloat(savedValue);
      if (parsed !== 0 || id === 'yawAngle' || id === 'windX' || id === 'windY') {
        el.value = savedValue;
      }
    }
    
    // [실시간 백업 인터페이스 수호] 인풋 값이 변경되는 즉시 유효성 검증 후 포물선을 재연산
    if (el) {
      el.addEventListener('input', () => {
        const val = el.valueAsNumber;
        // 유저가 타이핑 중인 임시 소수점 공백 분기 차단 유효성 검사
        if (!isNaN(val)) {
          saveSettings();
          if (typeof fireArrow === 'function') {
            fireArrow();
          }
        }
      });
    }
  });
}
// ============================================================================
// [UI & Interaction Core - Part 2] 상시 노출형 패널 탭 스위칭 및 결과 표출 엔진
// ============================================================================

// [상시 노출형 패널 탭 스위칭 트리거 핸들러] - 결과 패널 강제 연산 동기화 적용
function switchTab(tabType, element) {
  // 1. 하단 탭바 메뉴 전체 활성화 클래스 안전하게 일괄 차단 제거
  const tabBarItems = document.querySelectorAll('.tab-bar .tab-item');
  tabBarItems.forEach(item => item.classList.remove('active'));
  
  // 2. 화면에 고정 노출되는 상시 설정 패널 컴포넌트 전체 비활성화
  const tabPanels = document.querySelectorAll('.tab-panel');
  tabPanels.forEach(panel => panel.classList.remove('active'));

  // 3. 선택된 현재 터치 타겟 탭 메뉴와 일치하는 설정 패널을 활성화 동기화
  element.classList.add('active');
  const targetPanel = document.getElementById('sheet-' + tabType);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  // 4. 패널 이동 시점에도 가려진 탭 바인딩 락업을 차단하기 위해 강제 역학 해석 가동
  saveSettings();
  if (typeof fireArrow === 'function') {
    fireArrow();
  }
}

// [물리 연산 연동 데이터 인젝션 인터페이스] - display: none 락업 완전 격파
function updateFlightResultsUI(data) {
  if (!data) return;
  
  // display: none에 영향을 받는 innerText 대신 브라우저 메모리 상의 DOM 트리를 직접 강제 수정하는 textContent 사양 적용
  const injectText = (id, value) => {
    const el = document.getElementById(id);
    if (el && value !== undefined && !isNaN(value)) {
      el.textContent = value.toFixed(2);
    }
  };

  injectText('resMaxDistance', data.maxDistance);
  injectText('resMaxHeight', data.maxHeight);
  injectText('resLateralDeviation', data.lateralDeviation);
  injectText('resFlightTime', data.flightTime);
  injectText('resImpactVelocity', data.impactVelocity);
  injectText('resImpactEnergy', data.impactEnergy);
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

// [라이프사이클 동기화] HTML 로드가 끝나는 즉시 데이터를 로드하고 포물선 첫 프레임 연산 결과 표출
window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // 브라우저 첫 구동 시 복구된 이전 설정값을 반영하여 포물선 궤적 그림과 결과를 상시 자동 표출
  setTimeout(() => {
    if (typeof fireArrow === 'function') {
      fireArrow();
    }
  }, 60); // DOM 트리 안착 및 가려진 탭 노드의 메모리 활성화를 위한 60ms 미세 안정 가드 시간 부여
});
