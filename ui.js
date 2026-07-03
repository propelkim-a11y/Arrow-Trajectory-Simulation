// 로컬 스토리지 저장 및 불러오기 변수 리스트
const INPUT_IDS = [
    'velocity', 'angle', 'yawAngle', 'launchHeight', 
    'diameter', 'dragCoeff', 'liftCoeff', 'weight',
    'targetHeight', 'windX', 'windY', 'airDensity'
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

function openBottomSheet(type) {
    closeBottomSheet();
    document.getElementById('overlay').classList.add('active');
    if(type === 'arrow') {
        document.getElementById('sheet-arrow').classList.add('active');
    } else if(type === 'env') {
        document.getElementById('sheet-env').classList.add('active');
    }
}

function closeBottomSheet() {
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('sheet-arrow').classList.remove('active');
    document.getElementById('sheet-env').classList.remove('active');
    saveSettings(); 
    if (typeof drawScene === 'function') drawScene();    
}

let currentView = 'side';
function changeView(viewType, element) {
    const buttons = document.querySelectorAll('.segment-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    currentView = viewType;
    if (typeof drawScene === 'function') drawScene();
}
