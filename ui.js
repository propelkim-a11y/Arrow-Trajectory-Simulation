const INPUT_IDS = [
  'weight', 'diameter', 'dragCoeff', 'liftCoeff',
  'angle', 'velocity', 'yawAngle', 'launchHeight', 'launchZ',
  'windX', 'windY', 'targetDistance', 'targetHeight', 'airDensity',
  'losTargetY', 'losTargetZ' // 💡 LOS 수동 입력 ID 추가 (useLos는 체크박스이므로 별도 처리하거나 제외)
];

// 사용자가 제공할 활터 GPS 자료를 이 목록에 추가합니다.
// 형식: { id: 'unique-id', name: '활터명', latitude: 0, longitude: 0, elevation: 0 }
const ARCHERY_RANGES = [
  { id: 'daejeon-damdeokjeong', name: '대전 담덕정', latitude: 36.41787, longitude: 127.35729 },
  { id: 'daejeon-daedeokjeong', name: '대전 대덕정', latitude: 36.337739, longitude: 127.362572 },
  { id: 'daejeon-daedongjeong', name: '대전 대동정', latitude: 36.340553, longitude: 127.495767 },
  { id: 'daejeon-mudeokjeong', name: '대전 무덕정', latitude: 36.352844, longitude: 127.307219 },
  { id: 'daejeon-bomunjeong', name: '대전 보문정', latitude: 36.283675, longitude: 127.384794 },
  { id: 'daejeon-jumongjeong', name: '대전 주몽정', latitude: 36.4335, longitude: 127.31192 },
  { id: 'daejeon-hoedeokjeong', name: '대전 회덕정', latitude: 36.425686, longitude: 127.415375 }
];
const SELECTED_RANGE_STORAGE_KEY = 'arrow_sim_archery_range';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_CACHE_PREFIX = 'arrow_sim_weather_';
let currentWeatherData = null;

function getTargetBearing() {
  const input = Number.parseFloat(document.getElementById('targetBearing')?.value);
  if (!Number.isFinite(input)) return 0;
  return ((input % 360) + 360) % 360;
}

function updateBallisticWindInputs() {
  if (!currentWeatherData || !Number.isFinite(currentWeatherData.windSpeed) || !Number.isFinite(currentWeatherData.windDirection)) return;
  const bearing = getTargetBearing();
  const differenceRad = (currentWeatherData.windDirection - bearing) * Math.PI / 180;
  // 기상 풍향은 '바람이 불어오는 방향'이다.
  // 종풍: 과녁에서 사대로 불어오면 음수, 횡풍: 과녁 오른쪽에서 왼쪽이면 음수.
  const longitudinalWind = -currentWeatherData.windSpeed * Math.cos(differenceRad);
  const crosswind = -currentWeatherData.windSpeed * Math.sin(differenceRad);
  const windX = document.getElementById('windX');
  const windY = document.getElementById('windY');
  if (windX) windX.value = longitudinalWind.toFixed(2);
  if (windY) windY.value = crosswind.toFixed(2);
  saveSettings();
  if (typeof drawScene === 'function') drawScene();
}

function getSelectedArcheryRange() {
  const select = document.getElementById('archeryRangeSelect');
  return ARCHERY_RANGES.find(range => range.id === select?.value) || null;
}

function formatWindDirection(degrees) {
  if (!Number.isFinite(degrees)) return '-';
  const directions = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  return `${directions[Math.round(degrees / 45) % 8]} (${Math.round(degrees)}°)`;
}

function calculateAirDensity(temperatureC, humidity, pressureHpa) {
  const tempK = Number(temperatureC) + 273.15;
  const pressurePa = Number(pressureHpa) * 100;
  const rh = Math.max(0, Math.min(100, Number(humidity))) / 100;
  if (![tempK, pressurePa, rh].every(Number.isFinite) || tempK <= 0) return null;
  const saturationVaporHpa = 6.112 * Math.exp((17.67 * Number(temperatureC)) / (Number(temperatureC) + 243.5));
  const vaporPressurePa = rh * saturationVaporHpa * 100;
  const dryAirPressurePa = pressurePa - vaporPressurePa;
  return (dryAirPressurePa / (287.05 * tempK)) + (vaporPressurePa / (461.495 * tempK));
}

function getWeatherCacheKey(range) {
  return `${WEATHER_CACHE_PREFIX}${range.id}`;
}

function readCachedWeather(range) {
  try {
    const raw = localStorage.getItem(getWeatherCacheKey(range));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writeCachedWeather(range, current) {
  try {
    localStorage.setItem(getWeatherCacheKey(range), JSON.stringify({ current, savedAt: Date.now() }));
  } catch (error) {
    // 저장소가 제한된 브라우저에서도 실시간 조회는 계속 진행한다.
  }
}

async function fetchWeatherWithRetry(url, attempts = 2) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { cache: 'no-store', mode: 'cors', signal: controller.signal });
      if (!response.ok) throw new Error(`weather request failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 700));
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastError || new Error('weather request failed');
}

function populateArcheryRangeSelect() {
  const select = document.getElementById('archeryRangeSelect');
  const notice = document.getElementById('rangeDataNotice');
  if (!select) return;
  select.innerHTML = '';
  if (!ARCHERY_RANGES.length) {
    select.appendChild(new Option('등록된 활터 없음', ''));
    if (notice) notice.textContent = 'GPS 자료를 등록하면 해당 활터의 날씨를 조회할 수 있습니다.';
    return;
  }
  ARCHERY_RANGES.forEach(range => select.appendChild(new Option(range.name, range.id)));
  const savedId = localStorage.getItem(SELECTED_RANGE_STORAGE_KEY);
  select.value = ARCHERY_RANGES.some(range => range.id === savedId) ? savedId : ARCHERY_RANGES[0].id;
  const bearingInput = document.getElementById('targetBearing');
  const savedBearing = localStorage.getItem(`arrow_sim_targetBearing_${select.value}`);
  if (bearingInput && savedBearing !== null) bearingInput.value = savedBearing;
  if (notice) notice.textContent = `${ARCHERY_RANGES.length}개 활터가 등록되어 있습니다.`;
}

function setWeatherValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderWeatherCurrent(current, range, fromCache = false) {
  if (!current) return false;
  currentWeatherData = {
    windSpeed: Number(current.wind_speed_10m),
    windDirection: Number(current.wind_direction_10m)
  };
  const density = calculateAirDensity(current.temperature_2m, current.relative_humidity_2m, current.surface_pressure);
  setWeatherValue('weatherTemperature', Number.isFinite(Number(current.temperature_2m)) ? `${Number(current.temperature_2m).toFixed(1)}℃` : '-');
  setWeatherValue('weatherHumidity', Number.isFinite(Number(current.relative_humidity_2m)) ? `${Math.round(Number(current.relative_humidity_2m))}%` : '-');
  setWeatherValue('weatherPrecipitation', Number.isFinite(Number(current.precipitation)) ? `${Number(current.precipitation).toFixed(1)}mm` : '-');
  setWeatherValue('weatherWind', Number.isFinite(Number(current.wind_speed_10m)) ? `${Number(current.wind_speed_10m).toFixed(1)}m/s` : '-');
  setWeatherValue('weatherWindDirection', formatWindDirection(Number(current.wind_direction_10m)));
  setWeatherValue('weatherAirDensity', Number.isFinite(density) ? `${density.toFixed(3)}kg/m³` : '-');
  const airDensityInput = document.getElementById('airDensity');
  if (airDensityInput && Number.isFinite(density)) {
    airDensityInput.value = density.toFixed(3);
    airDensityInput.dispatchEvent(new Event('input', { bubbles: true }));
    airDensityInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  updateBallisticWindInputs();
  const status = document.getElementById('weatherStatus');
  if (status) {
    const time = current.time ? new Date(current.time).toLocaleString('ko-KR') : '현재';
    status.textContent = `${range.name} · ${fromCache ? '저장된 최근 자료' : `${time} 기준`}`;
  }
  return true;
}

async function loadArcheryRangeWeather() {
  const range = getSelectedArcheryRange();
  currentWeatherData = null;
  const status = document.getElementById('weatherStatus');
  if (!range) {
    if (status) status.textContent = '활터 GPS 자료를 등록하면 날씨를 조회할 수 있습니다.';
    ['weatherTemperature', 'weatherHumidity', 'weatherPrecipitation', 'weatherWind', 'weatherWindDirection', 'weatherAirDensity'].forEach(id => setWeatherValue(id, '-'));
    return;
  }
  if (status) status.textContent = `${range.name} 날씨를 불러오는 중...`;
  const cached = readCachedWeather(range);
  if (cached?.current) renderWeatherCurrent(cached.current, range, true);
  try {
    const params = new URLSearchParams({
      latitude: range.latitude,
      longitude: range.longitude,
      current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure',
      temperature_unit: 'celsius',
      wind_speed_unit: 'ms',
      precipitation_unit: 'mm',
      timezone: 'auto'
    });
    const data = await fetchWeatherWithRetry(`${WEATHER_API_URL}?${params.toString()}`);
    const current = data.current || {};
    writeCachedWeather(range, current);
    renderWeatherCurrent(current, range);
  } catch (error) {
    console.warn('날씨 조회 실패', error);
    if (cached?.current) {
      if (status) status.textContent = `${range.name} · 실시간 연결 실패, 저장된 최근 날씨를 표시합니다.`;
    } else if (status) {
      status.textContent = '실시간 날씨 연결에 실패했습니다. 잠시 후 새로고침을 눌러 다시 시도하세요.';
    }
  }
}

function setupArcheryRangeWeather() {
  const select = document.getElementById('archeryRangeSelect');
  const refreshButton = document.getElementById('refreshWeatherBtn');
  if (!select) return;
  populateArcheryRangeSelect();
  select.addEventListener('change', () => {
    localStorage.setItem(SELECTED_RANGE_STORAGE_KEY, select.value);
    const bearingInput = document.getElementById('targetBearing');
    const savedBearing = localStorage.getItem(`arrow_sim_targetBearing_${select.value}`);
    if (bearingInput) bearingInput.value = savedBearing === null ? '0' : savedBearing;
    loadArcheryRangeWeather();
  });
  const bearingInput = document.getElementById('targetBearing');
  bearingInput?.addEventListener('input', () => {
    const range = getSelectedArcheryRange();
    if (range) localStorage.setItem(`arrow_sim_targetBearing_${range.id}`, bearingInput.value);
    updateBallisticWindInputs();
  });
  refreshButton?.addEventListener('click', loadArcheryRangeWeather);
  loadArcheryRangeWeather();
}

function saveSettings() {
  try {
    INPUT_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) localStorage.setItem('arrow_sim_' + id, el.value);
    });
    const useLosEl = document.getElementById('useLos');
    if (useLosEl) localStorage.setItem('arrow_sim_useLos', useLosEl.checked ? 'true' : 'false');
    ['useVibrate', 'lockLos', 'followArrow'].forEach(id => {
      const el = document.getElementById(id);
      if (el) localStorage.setItem('arrow_sim_' + id, el.checked ? 'true' : 'false');
    });
  } catch (e) {
    // 시크릿 모드 등 브라우저 저장소가 차단된 경우 에러를 무시하고 진행
    console.warn("Storage access denied. Running in volatile memory.", e);
  }
}

function loadSettings() {
  try {
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
    ['useVibrate', 'lockLos', 'followArrow'].forEach(id => {
      const el = document.getElementById(id);
      const savedValue = localStorage.getItem('arrow_sim_' + id);
      if (el && savedValue !== null) el.checked = (savedValue === 'true');
    });
  } catch (e) {
    // 저장된 값을 읽지 못해도 기본값으로 캔버스가 켜지도록 예외 처리
    console.warn("Storage load failed. Using app defaults.", e);
  }
}

function switchPanel(type) {
  saveSettings();

  const panelOrder = ['arrow', 'method', 'env', 'result', 'settings-file'];
  const activePanel = document.querySelector('.fixed-panel.active');
  const currentType = activePanel ? activePanel.id.replace('panel-', '') : type;
  const direction = panelOrder.indexOf(type) >= panelOrder.indexOf(currentType) ? 'left' : 'right';
  
  // 💡 기존 배열에 'settings-file'을 추가했습니다.
  const panels = ['arrow', 'method', 'env', 'result', 'settings-file'];
  
  panels.forEach(p => {
    const el = document.getElementById('panel-' + p);
    if (el) el.classList.remove('active');
  });

  const targetPanel = document.getElementById('panel-' + type);
  if (targetPanel) {
    targetPanel.classList.add('active');
    animateSlide(targetPanel, `panel-slide-in-${direction}`);
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
  const viewOrder = ['front', 'side', 'top', 'target'];
  const previousView = currentView;
  const direction = viewOrder.indexOf(viewType) >= viewOrder.indexOf(previousView) ? 'left' : 'right';
  const buttons = document.querySelectorAll('.segmented-control .segment-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (element) element.classList.add('active');
  currentView = viewType;
  updateTargetZoomControls();
  if (typeof drawScene === 'function') drawScene();
  if (viewType !== previousView) {
    animateSlide(document.getElementById('simCanvas'), `view-slide-in-${direction}`);
  }
}

function animateSlide(element, animationClass) {
  if (!element) return;
  element.classList.remove('panel-slide-in-left', 'panel-slide-in-right', 'view-slide-in-left', 'view-slide-in-right');
  void element.offsetWidth;
  element.classList.add(animationClass);
  element.addEventListener('animationend', () => element.classList.remove(animationClass), { once: true });
}

function updateTargetZoomControls() {
  if (typeof updateZoomLabels === 'function') updateZoomLabels();
}

const NEGATIVE_ALLOWED_IDS = ['angle', 'yawAngle', 'windX', 'windY', 'targetHeight', 'losTargetY', 'losTargetZ'];

window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
    setupArcheryRangeWeather();
    if (typeof updateTargetZoomControls === 'function') updateTargetZoomControls();
    const useLosEl = document.getElementById('useLos');
  if (useLosEl) {
        useLosEl.addEventListener('change', () => {
           if (typeof saveSettings === 'function') saveSettings();
           if (typeof drawScene === 'function') drawScene();
  });
}

  ['useVibrate', 'lockLos', 'followArrow'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => {
      if (typeof saveSettings === 'function') saveSettings();
      if (typeof drawScene === 'function') drawScene();
    });
  });
    
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

  // 모바일 터치 환경에서 모든 안내 팝업을 공통 오버레이로 열고 바깥 터치로 닫는다.
  const helpGroups = document.querySelectorAll('.hint-group, .coefficient-group');
  const helpOverlay = document.getElementById('impactEnergyOverlay');
  if (helpGroups.length && helpOverlay) {
    let activeHelpGroup = null;
    let scrollLockState = null;
    const panelContainer = document.getElementById('panel-container');
    const lockPageScroll = () => {
      if (scrollLockState) return;
      scrollLockState = {
        bodyOverflow: document.body.style.overflow,
        bodyPosition: document.body.style.position,
        bodyTop: document.body.style.top,
        bodyWidth: document.body.style.width,
        panelOverflowY: panelContainer?.style.overflowY || '',
        panelOverscrollBehavior: panelContainer?.style.overscrollBehavior || '',
        panelScrollTop: panelContainer?.scrollTop || 0,
        windowScrollY: window.scrollY
      };
      document.body.classList.add('help-popup-open');
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollLockState.windowScrollY}px`;
      document.body.style.width = '100%';
      if (panelContainer) {
        panelContainer.style.overflowY = 'hidden';
        panelContainer.style.overscrollBehavior = 'none';
      }
    };
    const unlockPageScroll = () => {
      if (!scrollLockState) return;
      const state = scrollLockState;
      scrollLockState = null;
      document.body.classList.remove('help-popup-open');
      document.body.style.overflow = state.bodyOverflow;
      document.body.style.position = state.bodyPosition;
      document.body.style.top = state.bodyTop;
      document.body.style.width = state.bodyWidth;
      if (panelContainer) {
        panelContainer.style.overflowY = state.panelOverflowY;
        panelContainer.style.overscrollBehavior = state.panelOverscrollBehavior;
        panelContainer.scrollTop = state.panelScrollTop;
      }
      window.scrollTo(0, state.windowScrollY);
    };
    const showHelpOverlay = (group) => {
      activeHelpGroup = group;
      lockPageScroll();
      helpOverlay.classList.add('is-visible');
      helpOverlay.setAttribute('aria-hidden', 'false');
    };
    const hideHelpOverlay = () => {
      helpOverlay.classList.remove('is-visible');
      helpOverlay.setAttribute('aria-hidden', 'true');
      activeHelpGroup = null;
      unlockPageScroll();
      const focused = document.activeElement;
      if (focused && focused.closest('.hint-group, .coefficient-group')) focused.blur();
    };

    helpGroups.forEach(group => {
      group.addEventListener('focusin', () => showHelpOverlay(group));
      group.addEventListener('focusout', () => {
        window.setTimeout(() => {
          const focusedGroup = document.activeElement?.closest?.('.hint-group, .coefficient-group');
          if (!focusedGroup && activeHelpGroup === group) hideHelpOverlay();
        }, 0);
      });
    });

    helpOverlay.addEventListener('pointerdown', hideHelpOverlay, { passive: true });
    helpOverlay.addEventListener('touchstart', hideHelpOverlay, { passive: true });
    helpOverlay.addEventListener('click', hideHelpOverlay);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideHelpOverlay();
    });
  }

  // =========================================================================
  // [💡 위치 기억 기능 추가] 무제한 스크린 프리 드래그 제어 시스템
  // =========================================================================
  const dragBtn = document.getElementById('draggableFireBtn');
  if (!dragBtn) return;

  let isDragging = false;
  let hasMoved = false;
  let activePointerId = null;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;
  let suppressNextClick = false;
  let touchFallbackTimer = null;
  let touchActionHandled = false;

  function activateFireButton() {
    if (typeof toggleFlightPause === 'function') toggleFlightPause();
    else if (typeof fireArrow === 'function') fireArrow();
  }

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
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isDragging = true;
    hasMoved = false;
    activePointerId = e.pointerId;
    if (e.pointerType === 'touch') {
      touchActionHandled = false;
      if (touchFallbackTimer) clearTimeout(touchFallbackTimer);
    }
    startX = e.clientX;
    startY = e.clientY;
    if (dragBtn.setPointerCapture) dragBtn.setPointerCapture(e.pointerId);
    const rect = dragBtn.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
  }

  function doDrag(e) {
    if (!isDragging || e.pointerId !== activePointerId) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
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
    if (!isDragging || e.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;
    if (dragBtn.releasePointerCapture) {
      try { dragBtn.releasePointerCapture(e.pointerId); } catch (ignore) {}
    }
    if (!hasMoved) {
      if (e.pointerType === 'touch') {
        // 정상적인 모바일 click이 오면 click 핸들러가 실행하고,
        // click이 누락되는 WebView에서만 보조 타이머가 실행한다.
        touchFallbackTimer = setTimeout(() => {
          if (!touchActionHandled) {
            touchActionHandled = true;
            activateFireButton();
          }
        }, 350);
      }
    } else {
      touchActionHandled = true;
      suppressNextClick = true;
      setTimeout(() => { suppressNextClick = false; }, 400);
      // 드래그 이동이 정상적으로 완료되면 로컬스토리지에 위치 좌표 저장
      localStorage.setItem('arrow_sim_btn_left', dragBtn.style.left);
      localStorage.setItem('arrow_sim_btn_top', dragBtn.style.top);
    }
  }

  // 초기 실행 시 저장된 버튼 위치 불러오기
  loadButtonPosition();

  // 이벤트 리스너 등록
  dragBtn.addEventListener('pointerdown', startDrag, { passive: false });
  dragBtn.addEventListener('pointermove', doDrag, { passive: false });
  dragBtn.addEventListener('pointerup', endDrag, { passive: false });
  dragBtn.addEventListener('pointercancel', endDrag, { passive: false });
  // Pointer Events를 지원하지 않는 환경과 키보드 입력을 위한 클릭 보완 경로
  dragBtn.addEventListener('click', () => {
    if (touchFallbackTimer) {
      clearTimeout(touchFallbackTimer);
      touchFallbackTimer = null;
      if (touchActionHandled) return;
      touchActionHandled = true;
      activateFireButton();
      return;
    }
    if (suppressNextClick) return;
    activateFireButton();
  });
 
  const useLosCheck = document.getElementById('useLos');
  if (useLosCheck) {
    // loadSettings()에서 기본값 또는 저장된 상태를 복원한 뒤 변경값을 저장한다.
    useLosCheck.addEventListener('change', () => {
      if (typeof saveSettings === 'function') saveSettings();
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
let isCanvasPanning = false;
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
    if (isCanvasPanning) return;
    if (e.touches && e.touches.length > 1) return;
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
    const targetViewScaleX = typeof getTargetViewScale === 'function'
      ? getTargetViewScale('x')
      : Math.min(currentDprWidth, currentDprHeight) / 5.5;
    const targetViewScaleY = typeof getTargetViewScale === 'function'
      ? getTargetViewScale('y')
      : Math.min(currentDprWidth, currentDprHeight) / 5.5;

    const calculatedZ = (canvasX - (currentDprWidth / 2)) / targetViewScaleX;
    const calculatedY = (tBottomY - canvasY) / targetViewScaleY;

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

// =========================================================
// 모든 화면의 가로·세로 독립 확대/축소 입력(버튼, 휠, 두 손가락 핀치)
// =========================================================
(() => {
  const canvasEl = document.getElementById('simCanvas');
  const zoomXOut = document.getElementById('zoomXOut');
  const zoomXIn = document.getElementById('zoomXIn');
  const zoomReset = document.getElementById('zoomReset');
  if (!canvasEl) return;

  const adjustZoom = (delta) => {
    if (typeof getViewZoom !== 'function' || typeof setViewZoom !== 'function') return;
    setViewZoom('x', getViewZoom(currentView, 'x') + delta);
  };

  if (zoomXOut) zoomXOut.addEventListener('click', () => adjustZoom(-0.25));
  if (zoomXIn) zoomXIn.addEventListener('click', () => adjustZoom(0.25));
  if (zoomReset) zoomReset.addEventListener('click', () => {
    if (typeof resetViewZoom === 'function') resetViewZoom(currentView);
  });

  canvasEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    adjustZoom(e.deltaY < 0 ? 0.25 : -0.25);
  }, { passive: false });

  let pinchStartDistance = 0;
  let pinchStartZoom = 1;
  canvasEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    isTargetDragging = false;
    pinchStartDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    pinchStartZoom = typeof getViewZoom === 'function' ? getViewZoom(currentView, 'x') : 1;
  }, { passive: false });

  canvasEl.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2 || !pinchStartDistance) return;
    e.preventDefault();
    const distance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    if (typeof setViewZoom === 'function') {
      const ratio = distance / pinchStartDistance;
      setViewZoom('x', pinchStartZoom * ratio);
    }
  }, { passive: false });

  canvasEl.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) pinchStartDistance = 0;
  });
})();

// 확대된 화면을 한 손가락/마우스로 끌어 이동하는 패닝 기능
(() => {
  const canvasEl = document.getElementById('simCanvas');
  if (!canvasEl) return;
  let panPointerId = null;
  let panStartX = 0;
  let panStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;
  const activeTouchPointers = new Set();

  function canPan() {
    if (currentView !== 'target') return true;
    // 과녁도는 확대 상태에서 화면 이동을 우선하고,
    // 기본 배율에서는 기존 조준점 드래그를 유지한다.
    return typeof getViewZoom !== 'function' || getViewZoom('target', 'x') > 1;
  }

  canvasEl.addEventListener('pointerdown', (e) => {
    if (!canPan() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.pointerType === 'touch') {
      activeTouchPointers.add(e.pointerId);
      if (activeTouchPointers.size > 1) {
        panPointerId = null;
        return;
      }
    }
    panPointerId = e.pointerId;
    isCanvasPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    const origin = getViewPan(currentView);
    panOriginX = origin.x;
    panOriginY = origin.y;
    if (canvasEl.setPointerCapture) canvasEl.setPointerCapture(e.pointerId);
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  canvasEl.addEventListener('pointermove', (e) => {
    if (e.pointerId !== panPointerId) return;
    if (typeof getViewPan !== 'function' || typeof setViewPan !== 'function') return;
    setViewPan(panOriginX + e.clientX - panStartX, panOriginY + e.clientY - panStartY, currentView);
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  function endPan(e) {
    if (e.pointerType === 'touch') activeTouchPointers.delete(e.pointerId);
    if (e.pointerType === 'touch' && activeTouchPointers.size === 0) isCanvasPanning = false;
    if (e.pointerId !== panPointerId) return;
    panPointerId = null;
    isCanvasPanning = false;
    if (canvasEl.releasePointerCapture) {
      try { canvasEl.releasePointerCapture(e.pointerId); } catch (ignore) {}
    }
  }
  canvasEl.addEventListener('pointerup', endPan);
  canvasEl.addEventListener('pointercancel', endPan);
})();


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
// 상단 시뮬레이터 뷰(정면·측면·평면·과녁)는 상단 탭 클릭으로만 전환한다.
// =========================================================
// 화면 배율 프리셋 저장·불러오기
// =========================================================
const ZOOM_PRESETS_STORAGE_KEY = 'arrow_sim_zoom_presets';

function getZoomPresets() {
  try {
    const raw = localStorage.getItem(ZOOM_PRESETS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveZoomPresets(presets) {
  try { localStorage.setItem(ZOOM_PRESETS_STORAGE_KEY, JSON.stringify(presets)); } catch (e) { /* 저장 불가 환경 */ }
}

function refreshZoomPresetSelect() {
  const select = document.getElementById('zoomPresetSelect');
  if (!select) return;
  const presets = getZoomPresets();
  select.innerHTML = '';
  if (!presets.length) {
    select.appendChild(new Option('저장된 프리셋 없음', ''));
    return;
  }
  presets.forEach((preset, index) => {
    select.appendChild(new Option(preset.name, String(index)));
  });
}

function collectZoomPreset() {
  const presetZooms = {};
  if (typeof viewZooms !== 'undefined') {
    Object.keys(viewZooms).forEach(view => {
      presetZooms[view] = {
        x: Number(viewZooms[view].x) || 1,
        y: Number(viewZooms[view].y) || 1
      };
    });
  }
  return presetZooms;
}

function applyZoomPreset(presetZooms) {
  if (!presetZooms || typeof setViewZoom !== 'function') return false;
  Object.keys(presetZooms).forEach(view => {
    const values = presetZooms[view];
    if (!values || !Number.isFinite(Number(values.x)) || !Number.isFinite(Number(values.y))) return;
    setViewZoom('x', Number(values.x), view);
    setViewZoom('y', Number(values.y), view);
  });
  if (typeof updateZoomLabels === 'function') updateZoomLabels();
  if (typeof drawScene === 'function') drawScene();
  return true;
}

function setupZoomPresetControls() {
  const nameInput = document.getElementById('zoomPresetName');
  const select = document.getElementById('zoomPresetSelect');
  const saveBtn = document.getElementById('saveZoomPresetBtn');
  const loadBtn = document.getElementById('loadZoomPresetBtn');
  const deleteBtn = document.getElementById('deleteZoomPresetBtn');
  if (!nameInput || !select || !saveBtn || !loadBtn || !deleteBtn) return;

  refreshZoomPresetSelect();

  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert('저장할 프리셋 이름을 입력하세요.');
      nameInput.focus();
      return;
    }
    const presets = getZoomPresets();
    const existingIndex = presets.findIndex(preset => preset.name === name);
    const preset = { name, zooms: collectZoomPreset(), savedAt: Date.now() };
    if (existingIndex >= 0) presets[existingIndex] = preset;
    else presets.push(preset);
    saveZoomPresets(presets);
    refreshZoomPresetSelect();
    select.value = String(existingIndex >= 0 ? existingIndex : presets.length - 1);
    alert(`'${name}' 프리셋을 저장했습니다.`);
  });

  loadBtn.addEventListener('click', () => {
    const index = Number(select.value);
    const presets = getZoomPresets();
    if (!Number.isInteger(index) || !presets[index]) return;
    applyZoomPreset(presets[index].zooms);
    alert(`'${presets[index].name}' 프리셋을 불러왔습니다.`);
  });

  deleteBtn.addEventListener('click', () => {
    const index = Number(select.value);
    const presets = getZoomPresets();
    if (!Number.isInteger(index) || !presets[index]) return;
    const deletedName = presets[index].name;
    presets.splice(index, 1);
    saveZoomPresets(presets);
    refreshZoomPresetSelect();
    alert(`'${deletedName}' 프리셋을 삭제했습니다.`);
  });
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

    // 화면 배율 프리셋 수집
    configData['zoomPresets'] = getZoomPresets();
    const selectedRange = document.getElementById('archeryRangeSelect')?.value || '';
    configData['archeryRangeId'] = selectedRange;
    const bearingInput = document.getElementById('targetBearing');
    if (bearingInput) configData['targetBearing'] = bearingInput.value;

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

        // 화면 배율 프리셋 복원
        if (Array.isArray(configData['zoomPresets'])) {
          saveZoomPresets(configData['zoomPresets']);
          refreshZoomPresetSelect();
        }

        if (typeof configData['archeryRangeId'] === 'string') {
          const rangeSelect = document.getElementById('archeryRangeSelect');
          if (rangeSelect && ARCHERY_RANGES.some(range => range.id === configData['archeryRangeId'])) {
            rangeSelect.value = configData['archeryRangeId'];
            localStorage.setItem(SELECTED_RANGE_STORAGE_KEY, configData['archeryRangeId']);
            loadArcheryRangeWeather();
          }
        }
        if (configData['targetBearing'] !== undefined) {
          const bearingInput = document.getElementById('targetBearing');
          const rangeSelect = document.getElementById('archeryRangeSelect');
          if (bearingInput) bearingInput.value = configData['targetBearing'];
          if (rangeSelect?.value) localStorage.setItem(`arrow_sim_targetBearing_${rangeSelect.value}`, configData['targetBearing']);
          updateBallisticWindInputs();
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
  setupZoomPresetControls();
  exportSettingsToFile();
  importSettingsFromFile();
});
