import streamlit as st
import math
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import matplotlib.ticker as ticker
import os
import numpy as np

# =========================
# 버전 및 설정
# =========================
VERSION = "v1.7.0 (Added Arrow Diameter)"
st.set_page_config(page_title="주몽정 - 국궁 시뮬레이터", layout="wide")

def set_korean_font():
    # Streamlit Cloud 및 다양한 환경을 위한 폰트 설정
    paths = [
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf", 
        "C:/Windows/Fonts/malgun.ttf", 
        "/system/fonts/NanumGothic.ttf"
    ]
    font_set = False
    for p in paths:
        if os.path.exists(p):
            try:
                plt.rc('font', family=fm.FontProperties(fname=p).get_name())
                font_set = True
                break
            except: continue
    if not font_set:
        plt.rcParams['font.family'] = 'sans-serif'
    plt.rcParams['axes.unicode_minus'] = False

set_korean_font()

# =========================
# 물리 엔진
# =========================
def simulate(v0, m_g, d_mm, theta_deg, phi_deg, h0, target_dh, wx, wz, cd0, cl0):
    # 단위 변환 (g -> kg, mm -> m)
    m, d = m_g / 1000.0, d_mm / 1000.0
    g, rho, dt = 9.80665, 1.225, 0.01
    theta, phi = math.radians(theta_deg), math.radians(phi_deg)
    
    # 투영 면적 계산 (직경 d 반영)
    A = math.pi * (d / 2.0)**2
    
    # 초기 속도 벡터
    vx = v0 * math.cos(theta) * math.cos(phi)
    vy = v0 * math.sin(theta)
    vz = v0 * math.cos(theta) * math.sin(phi)
    
    x, y, z = 0.0, h0, 0.0
    
    xs, ys, zs, v_vectors = [x], [y], [z], [(vx, vy, vz)]
    
    # 시뮬레이션 루프
    while y >= (target_dh - 5.0) and x <= 165.0:
        # 상대 속도 (바람 고려)
        vrx, vry, vrz = vx - wx, vy, vz - wz
        v = math.sqrt(vrx**2 + vry**2 + vrz**2)
        if v < 1e-6: break
        
        # 항력 및 양력 계산 (면적 A가 핵심 변수)
        Fd = 0.5 * rho * (cd0 * (1 + 0.15 * (v/60.0)**2)) * A * v**2
        Fl = 0.5 * rho * cl0 * A * v**2
        
        # 가속도 계산
        ax = -Fd * vrx / (m * v)
        az = -Fd * vrz / (m * v)
        ay = -g - (Fd * vry / (m * v)) + (Fl / m)
        
        # 상태 업데이트
        vx += ax * dt; vy += ay * dt; vz += az * dt
        x += vx * dt; y += vy * dt; z += vz * dt
        
        xs.append(x); ys.append(y); zs.append(z)
        v_vectors.append((vx, vy, vz))
        
    return xs, ys, zs, v_vectors

# =========================
# UI 구성
# =========================
st.markdown("<h1 style='text-align: center;'>🏹 주 몽 정 (朱蒙亭)</h1>", unsafe_allow_html=True)

with st.sidebar:
    st.header("⚙️ 시뮬레이션 설정")
    v0 = st.number_input("초속 (m/s)", 30.0, 100.0, 60.0, help="발시 순간의 화살 속도")
    m_g = st.number_input("무게 (g)", 15.0, 40.0, 26.25, help="화살의 전체 무게")
    
    # --- 추가된 직경 입력창 ---
    d_mm = st.number_input("화살 직경 (mm)", 5.0, 15.0, 8.0, step=0.1, help="화살대(샤프트)의 굵기")
    # -----------------------
    
    theta_deg = st.number_input("수직각 (°)", 0.0, 45.0, 13.0)
    phi_deg = st.number_input("좌우각 (°)", -5.0, 5.0, -0.5)
    h0 = st.number_input("발시높이 (m)", 0.0, 5.0, 1.5)
    
    st.markdown("---")
    st.subheader("🖼️ 시각화 설정")
    graph_height = st.slider("그래프 세로 높이", 6, 20, 10)
    
    st.markdown("---")
    st.subheader("🧪 물리 및 환경")
    cd0 = st.slider("항력계수 (Cd)", 0.1, 1.5, 0.9)
    cl0 = st.slider("양력계수 (Cl)", 0.0, 0.5, 0.05)
    wx = st.slider("순풍(+) / 역풍(-) (m/s)", -15.0, 15.0, 11.0)
    wz = st.slider("측풍 (L:-, R:+) (m/s)", -10.0, 10.0, 8.0)
    target_dh = st.number_input("과녁 상대높이 (m)", -10.0, 10.0, 2.0)

# 바람 벡터 시각화 준비
norm = math.sqrt(wx**2 + wz**2)
n_wx, n_wz = (wx/norm, wz/norm) if norm > 0 else (0, 0)

# 시뮬레이션 실행 (d_mm 전달)
xs, ys, zs, vs = simulate(v0, m_g, d_mm, theta_deg, phi_deg, h0, target_dh, wx, wz, cd0, cl0)

# 과녁 판정 로직
t_base, t_h, t_w, tilt = 145.0, 2.67, 2.0, math.radians(15)
hit_data = {}
for i in range(len(xs)-1):
    tx = t_base + (ys[i] - target_dh) * math.tan(tilt)
    if xs[i] <= tx <= xs[i+1]:
        ay = (ys[i] - target_dh) / math.cos(tilt)
        hit_data = {'y': ay, 'z': zs[i], 'hit': (0 <= ay <= t_h and abs(zs[i]) <= t_w/2)}
        break

# 결과 헤더 레이아웃
top_col1, top_col2 = st.columns([1, 4])
with top_col1:
    fig_wind, ax_wind = plt.subplots(figsize=(1.2, 1.2))
    if norm > 0:
        ax_wind.quiver(0, 0, n_wx, -n_wz, angles='xy', scale_units='xy', scale=1.5, 
                       color='#3498db', width=0.15, headwidth=5)
    ax_wind.set_xlim(-1, 1); ax_wind.set_ylim(-1, 1)
    ax_wind.set_title(f"Wind: {norm:.1f}m/s", fontsize=7)
    ax_wind.set_xticks([]); ax_wind.set_yticks([])
    st.pyplot(fig_wind)

with top_col2:
    if hit_data.get('hit'):
        st.success(f"🎯 **적중(HIT)!** (높이: {hit_data['y']:.2f}m, 좌우: {hit_data['z']:.2f}m)")
    else:
        st.error("❌ **불합(MISS)** - 과녁을 벗어났습니다.")

# =========================
# 그래프 시각화 영역
# =========================
fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(10, graph_height), gridspec_kw={'height_ratios': [1, 1, 1.2]})

# 1. 측면도 (Side View)
ax1.plot(xs, ys, color='#2ecc71', lw=2, label="Arrow Path")
ax1.plot([0, t_base], [0, target_dh], color='#95a5a6', linestyle='--', alpha=0.5)
ax1.plot([t_base, t_base + t_h*math.sin(tilt)], [target_dh, target_dh + t_h*math.cos(tilt)], 'r-', lw=5, label="Target")
ax1.set_ylim(-2, max(ys)*1.2 if len(ys)>0 else 15)
ax1.set_title("궤적 측면도 (Side View)")
ax1.set_xlabel("거리 (m)"); ax1.set_ylabel("높이 (m)")
ax1.legend(loc='upper right', fontsize='small'); ax1.grid(True, alpha=0.3)

# 2. 평면도 (Top View)
ax2.plot(xs, zs, color='#e67e22', lw=2)
ax2.axvline(x=t_base, color='red', linestyle='--', alpha=0.5)
ax2.set_ylim(-4, 4) 
ax2.invert_yaxis() # 국궁 사수 시점 반영
ax2.set_title("궤적 평면도 (Top View - 좌우 편차)")
ax2.set_xlabel("거리 (m)"); ax2.set_ylabel("좌우 (m)")
ax2.grid(True, alpha=0.3)

# 3. 정면도 (Front View - 과녁 기준)
ax3.add_patch(plt.Rectangle((-t_w/2, 0), t_w, t_h, color='#fdf2e9', ec='#c0392b', lw=3, label="Target"))
ax3.set_xlim(-2.5, 2.5); ax3.set_ylim(-0.5, 3.5); ax3.set_aspect('equal')
if 'y' in hit_data:
    marker = 'ro' if hit_data['hit'] else 'kx'
    ax3.plot(hit_data['z'], hit_data['y'], marker, markersize=8, label="Impact Point")

ax3.xaxis.set_major_locator(ticker.MultipleLocator(0.5))
ax3.set_title("과녁 탄착군 (Front View)")
ax3.set_xlabel("좌우 (m)"); ax3.set_ylabel("높이 (m)")
ax3.grid(True, linestyle=':', alpha=0.6)

plt.tight_layout()
st.pyplot(fig)

# 하단 정보 표기
st.info(f"설정된 화살 정보: {m_g}g, 직경 {d_mm}mm | 현재 버전: {VERSION}")
