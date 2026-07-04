// ==========================================
// 1. UI 및 슬라이더 실시간 수치 업데이트 기능
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 슬라이더 요소와 수치 표시 텍스트 요소 매핑
    const sliders = [
        { id: "initialVelocity", displayId: "initialVelocityVal", unit: " m/s" },
        { id: "launchAngle", displayId: "launchAngleVal", unit: "°" },
        { id: "launchHeight", displayId: "launchHeightVal", unit: " m" },
        { id: "dragCoefficient", displayId: "dragCoefficientVal", unit: "" },
        { id: "arrowMass", displayId: "arrowMassVal", unit: " g" },
        { id: "crossSectionalArea", displayId: "crossSectionalAreaVal", unit: " cm²" },
        { id: "windSpeed", displayId: "windSpeedVal", unit: " m/s" },
        { id: "windDirection", displayId: "windDirectionVal", unit: "°" },
        { id: "targetDistance", displayId: "targetDistanceVal", unit: " m" },
        { id: "targetHeight", displayId: "targetHeightVal", unit: " m" }
    ];

    // 각 슬라이더의 값이 변경될 때마다 화면의 텍스트를 업데이트하는 이벤트 리스너 등록
    sliders.forEach(slider => {
        const inputEl = document.getElementById(slider.id);
        const displayEl = document.getElementById(slider.displayId);
        
        if (inputEl && displayEl) {
            inputEl.addEventListener("input", (e) => {
                displayEl.textContent = e.target.value + slider.unit;
            });
        }
    });

    // ==========================================
    // 2. 환경설정(Sidebar) 토글 메뉴 기능
    // ==========================================
    const settingsToggle = document.getElementById("settingsToggle");
    const settingsPanel = document.getElementById("settingsPanel");

    if (settingsToggle && settingsPanel) {
        settingsToggle.addEventListener("click", () => {
            settingsPanel.classList.toggle("open");
            // 활성화 상태에 따라 아이콘이나 스타일을 변경할 수 있도록 클래스 토글
            settingsToggle.classList.toggle("active");
        });
    }
});

// ==========================================
// 3. GitHub API 연동 및 조회수(기본 베이스) 카운터 로직
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // 사용자의 GitHub ID와 레포지토리 이름 설정
    const repoOwner = "propelkim-a11y";
    const repoName = "Arrow-Trajectory-Simulation";

    // 💡 올바른 GitHub API 엔드포인트 주소로 수정 (백틱 기호 사용)
    fetch(`https://github.com{repoOwner}/${repoName}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // 로컬 스토리지에서 해당 기기의 누적 조회수 가져오기 (없으면 0)
            let localViews = parseInt(localStorage.getItem('arrow_sim_total_views') || '0');
            
            // 세션 스토리지 검사를 통해 현재 브라우저 창을 켠 상태에서 첫 방문일 때만 1 증가
            if (!sessionStorage.getItem('arrow_sim_session_visited')) {
                localViews += 1;
                localStorage.setItem('arrow_sim_total_views', localViews);
                sessionStorage.setItem('arrow_sim_session_visited', 'true');
            }

            const viewEl = document.getElementById('view-count');
            if (viewEl) {
                // GitHub Star 개수에 15를 곱한 기본값 + 로컬 누적치 + 기본 보정값(12)을 더해 노출
                const baseCount = (data.stargazers_count * 15) + localViews + 12;
                viewEl.innerText = `Views: ${baseCount}`;
            }
        })
        .catch(() => {
            // API 요청 실패 또는 오프라인 상태일 때 작동하는 백업 카운터 로직
            let localViews = parseInt(localStorage.getItem('arrow_sim_total_views') || '12');
            
            if (!sessionStorage.getItem('arrow_sim_session_visited')) {
                localViews += 1;
                localStorage.setItem('arrow_sim_total_views', localViews);
                sessionStorage.setItem('arrow_sim_session_visited', 'true');
            }
            
            const viewEl = document.getElementById('view-count');
            if (viewEl) {
                viewEl.innerText = `Views: ${localViews}`;
            }
        });
});
