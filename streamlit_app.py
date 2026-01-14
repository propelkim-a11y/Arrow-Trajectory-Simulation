import streamlit as st
import math
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import os

# =========================
# 버전 및 설정
# =========================
VERSION = "v1.5.1 (Fixed)"
st.set_page_config(page_title="주몽정 - 국궁 시뮬레이터", layout="wide")

def set_korean_font():
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
    m, d = m_g / 1000.0, d_mm / 1000.0
    g, rho, dt = 9.80665, 1.225, 0.01
    theta, phi = math.radians(theta_deg), math.radians(phi_deg)
    A = math.pi * (d / 2)**2
    vx, vy, vz = v0*math.cos(theta)*math.cos(phi), v0*math.sin(theta), v0*math.cos(theta)*math.sin(phi)
    x, y, z = 0.0, h0, 0.0
    
    xs, ys, zs, v_vectors = [x], [y], [z], [(vx, vy, vz)]
    
    while y >= (target_dh - 5.0) and x <= 165.0:
        vrx, vry, vrz = vx - wx, vy, vz - wz
        v = math.sqrt(vrx**2 + vry**2 + vrz**2)
        if v < 1e-6: break
        
        Fd = 0.5 * rho * (cd0 * (1 + 0.15 * (v/60.0)**2)) * A * v**2
        Fl = 0.5 * rho * cl0 * A * v**2
        
        ax = -Fd * vrx / (m * v)
        az = -Fd * vrz / (m * v)
        ay = -g - (Fd * vry / (m * v)) + (Fl / m)
        
        vx += ax * dt; vy += ay * dt; vz += az * dt
        x += vx * dt; y += vy * dt; z += vz * dt
        
        xs.append(x); ys.append(y); zs.append(z)
        v_vectors.append((vx, vy, vz))
    return xs, ys, zs, v_vectors

# =========================
# UI 구성 및 입력
# =========================
st.markdown("<h1 style='text-align: center;'>🏹 주 몽 정 (朱蒙亭)</h1>", unsafe_allow_html=True)
st.markdown(f"<p style='text-align: center; color: gray;'>국궁 탄도 시뮬레이터 {VERSION}</p>", unsafe_allow_html=True)

with st.sidebar:
    st.header("⚙️ 시뮬레이션 설정")
    v0 = st.number_input("화살 초속 (m/s)", 30.0, 100.0, 60.0)
    m_g = st.number_input("화살 무게 (g)", 15.0, 40.0, 26.25)
    theta_deg = st.number_input("수직 발사각 (°)", 0.0, 45.0, 13.0)
    phi_deg = st.number_input("좌우 발사각 (°)", -5.0, 5.0, -0.5)
    h0 = st.number_input("발시 높이 (m)", 0.0, 5.0, 1.5)
    
    st.markdown("---")
    st.subheader("🧪 물리 계수 설정")
    cd0 = st.slider("항력계수 (Cd)", 0.1, 1.5, 0.9)
    cl0 = st.slider("양력계수 (Cl)", 0.0, 0.5, 0.05)

    st.markdown("---")
    st.subheader("🌬️ 환경 변수")
    wx = st.slider("순풍(+) / 역풍(-) (m/s)", -15.0, 15.0, 11.0)
    wz = st.slider("측풍 (L:-, R:+) (m/s)", -10.0, 10.0, 8.0)
    target_dh = st.number_input("과녁 상대높이 (m)", -10.0, 10.0, 2.0)

# 시뮬레이션 실행
xs, ys, zs, vs = simulate(v0, m_g, 8.0, theta_deg, phi_deg, h0, target_dh, wx, wz, cd0, cl0)

# 데이터 분석
df = pd.DataFrame({
    'Distance_X': xs, 
    'Height_Y': ys, 
    'Lateral_Z': zs,
    'Vel_X': [v[0] for v in vs], # 튜플 인덱싱 명시적 수정
    'Vel_Y': [v[1] for v in vs],
    'Vel_Z': [v[2] for v in vs]
})

@st.cache_data
def convert_df(df):
    return df.to_csv(index=False).encode('utf-8-sig')

csv_data = convert_df(df)
st.sidebar.download_button(label="📥 데이터(CSV) 다운로드", data=csv_data, file_name='jumong_trajectory.csv', mime='text/csv')

# =========================
# 메인 레이아웃 (에러 수정 지점)
# =========================
top_col1, top_col2 = st.columns(2) # 명시적으로 2개의 컬럼 생성하도록 수정

with top_col1:
    st.subheader("바람 방향")
    fig_wind, ax_wind = plt.subplots(figsize=(3, 3))
    ax_wind.quiver(0, 0, wx, wz, angles='xy', scale_units='xy', scale=1, color='#3498db', width=0.1)
    ax_wind.set_xlim(-15, 15); ax_wind.set_ylim(-15, 15)
    ax_wind.axhline(0, color='black', lw=0.5); ax_wind.axvline(0, color='black', lw=0.5)
    ax_wind.set_xlabel("Tail/Head Wind"); ax_wind.set_ylabel("Crosswind")
    ax_wind.set_title("Wind Vector")
    ax_wind.grid(True, linestyle='--', alpha=0.6)
    st.pyplot(fig_wind)

# 판정 로직
t_base, t_h, t_w, tilt = 145.0, 2.67, 2.0, math.radians(15)
hit_data = {}
for i in range(len(xs)-1):
    tx = t_base + (ys[i] - target_dh) * math.tan(tilt)
    if xs[i] <= tx <= xs[i+1]:
        ay = (ys[i] - target_dh) / math.cos(tilt)
        hit_data = {'y': ay, 'z': zs[i], 'hit': (0 <= ay <= t_h and abs(zs[i]) <= t_w/2)}
        break

with top_col2:
    if hit_data.get('hit'):
        st.success(f"🎯 **관중!** (착탄 위치: 높이 {hit_data['y']:.2f}m, 좌우 {hit_data['z']:.2f}m)")
    else:
        st.error("❌ **빗나감**")

# 그래프 시각화 (캡션 영어)
fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(10, 18))

# 1. Side View
ax1.plot(xs, ys, color='#2ecc71', lw=2, label="Arrow Path")
ax1.plot([0, t_base], [0, target_dh], color='#95a5a6', linestyle='--', lw=1.5, label="Ground Line")
ax1.plot([t_base, t_base + t_h*math.sin(tilt)], [target_dh, target_dh + t_h*math.cos(tilt)], 'r-', lw=5, label="Target")
ax1.set_title("Flight Trajectory (Side View)")
ax1.set_xlabel("Distance (m)"); ax1.set_ylabel("Height (m)")
ax1.legend(); ax1.grid(True)

# 2. Top View
ax2.plot(xs, zs, color='#e67e22', lw=2)
ax2.axvline(x=t_base, color='red', linestyle='--', alpha=0.5)
ax2.set_ylim(-10, 10)
ax2.set_title("Flight Path (Top View)")
ax2.set_xlabel("Distance (m)"); ax2.set_ylabel("Lateral Deviation (m)")
ax2.grid(True)

# 3. Front View
ax3.add_patch(plt.Rectangle((-t_w/2, 0), t_w, t_h, color='#fdf2e9', ec='#c0392b', lw=3))
ax3.set_xlim(-5, 5); ax3.set_ylim(-0.5, 3.5); ax3.set_aspect('equal')
if 'y' in hit_data:
    ax3.plot(hit_data['z'], hit_data['y'], 'ro' if hit_data['hit'] else 'kx', markersize=15)
ax3.set_title("Impact Point (Front View)")
ax3.set_xlabel("Width (m)"); ax3.set_ylabel("Height (m)")
ax3.grid(True)

plt.tight_layout()
st.pyplot(fig)
