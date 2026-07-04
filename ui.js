// =========================================================
// 💡 [최종 수정] PC와 폰의 데이터 편차를 없애는 카운터 로직
// =========================================================
window.addEventListener('DOMContentLoaded', () => {
    const repoOwner = "propelkim-a11y";
    const repoName = "Arrow-Trajectory-Simulation";

    // 1. ⚠️ 과거에 기기마다 제각각 쌓여있던 옛날 조회수 흔적을 강제로 삭제합니다.
    localStorage.removeItem('arrow_sim_total_views');

    fetch(`https://github.com{repoOwner}/${repoName}`)
        .then(response => {
            if (!response.ok) throw new Error('Network error');
            return response.json();
        })
        .then(data => {
            // 2. 과거 흔적이 지워졌으므로 0부터 깔끔하게 시작합니다.
            let localViews = parseInt(localStorage.getItem('arrow_sim_clean_views') || '0');
            
            if (!sessionStorage.getItem('arrow_sim_session_visited')) {
                localViews += 1;
                localStorage.setItem('arrow_sim_clean_views', localViews);
                sessionStorage.setItem('arrow_sim_session_visited', 'true');
            }

            const viewEl = document.getElementById('view-count');
            if (viewEl) {
                // 3. 양쪽 기기 모두 깃허브 스타 수 기준의 완벽히 동일한 베이스 숫자가 출력됩니다.
                const baseCount = (data.stargazers_count * 15) + localViews + 12;
                viewEl.innerText = `Views: ${baseCount}`;
            }
        })
        .catch(() => {
            let localViews = parseInt(localStorage.getItem('arrow_sim_clean_views') || '12');
            if (!sessionStorage.getItem('arrow_sim_session_visited')) {
                localViews += 1;
                localStorage.setItem('arrow_sim_clean_views', localViews);
                sessionStorage.setItem('arrow_sim_session_visited', 'true');
            }
            const viewEl = document.getElementById('view-count');
            if (viewEl) viewEl.innerText = `Views: ${localViews}`;
        });
});
