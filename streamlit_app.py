import streamlit as st
import math
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import matplotlib.ticker as ticker
import os
import numpy as np

# =========================
# VERSION & CONFIG
# =========================
VERSION = "v1.7.1 (English Labels)"
st.set_page_config(page_title="Jumong-jeong - Gungdo Simulator", layout="wide")

# No special Korean font needed for English labels, using default sans-serif
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['axes.unicode_minus'] = False

# =========================
# PHYSICS ENGINE
# =========================
def simulate(v0, m_g, d_mm, theta_deg, phi_deg, h0, target_dh, wx, wz, cd0, cl0):
    m, d = m_g / 1000.0, d_mm / 1000.0
    g, rho, dt = 9.80665, 1.225, 0.01
    theta, phi = math.radians(theta_deg), math.radians(phi_deg)
    A = math.pi * (d / 2.0)**2
    
    vx = v0 * math.cos(theta) * math.cos(phi)
    vy = v0 * math.sin(theta)
    vz = v0 * math.cos(theta) * math.sin(phi)
    
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
# UI LAYOUT
# =========================
st.markdown("<h1 style='text-align: center;'>🏹 JUMONG-JEONG (朱蒙亭)</h1>", unsafe_allow_html=True)

with st.sidebar:
    st.header("⚙️ Simulation Settings")
    v0 = st.number_input("Velocity (m/s)", 30.0, 100.0, 60.0)
    m_g = st.number_input("Weight (g)", 15.0, 40.0, 26.25)
    d_mm = st.number_input("Diameter (mm)", 5.0, 15.0, 8.0, step=0.1)
    theta_deg = st.number_input("Vertical Angle (°)", 0.0, 45.0, 13.0)
    phi_deg = st.number_input("Horizontal Angle (°)", -5.0, 5.0, -0.5)
    h0 = st.number_input("Release Height (m)", 0.0, 5.0, 1.5)
    
    st.markdown("---")
    st.subheader("🖼️ Visualization")
    graph_height = st.slider("Graph Height", 6, 20, 10)
    
    st.markdown("---")
    st.subheader("🧪 Environment")
    cd0 = st.slider("Drag Coeff (Cd)", 0.1, 1.5, 0.9)
    cl0 = st.slider("Lift Coeff (Cl)", 0.0, 0.5, 0.05)
    wx = st.slider("Tail(+) / Head(-) Wind (m/s)", -15.0, 15.0, 11.0)
    wz = st.slider("Cross Wind (L:-, R:+) (m/s)", -10.0, 10.0, 8.0)
    target_dh = st.number_input("Target Relative Height (m)", -10.0, 10.0, 2.0)

# Wind Vector Visualization
norm = math.sqrt(wx**2 + wz**2)
n_wx, n_wz = (wx/norm, wz/norm) if norm > 0 else (0, 0)

# Run Simulation
xs, ys, zs, vs = simulate(v0, m_g, d_mm, theta_deg, phi_deg, h0, target_dh, wx, wz, cd0, cl0)

# Hit Detection
t_base, t_h, t_w, tilt = 145.0, 2.67, 2.0, math.radians(15)
hit_data = {}
for i in range(len(xs)-1):
    tx = t_base + (ys[i] - target_dh) * math.tan(tilt)
    if xs[i] <= tx <= xs[i+1]:
        ay = (ys[i] - target_dh) / math.cos(tilt)
        hit_data = {'y': ay, 'z': zs[i], 'hit': (0 <= ay <= t_h and abs(zs[i]) <= t_w/2)}
        break

# Top Display
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
        st.success(f"🎯 **HIT!** (Height: {hit_data['y']:.2f}m, Lateral: {hit_data['z']:.2f}m)")
    else:
        st.error("❌ **MISS**")

# =========================
# GRAPH VISUALIZATION
# =========================
fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(10, graph_height), gridspec_kw={'height_ratios': [1, 1, 1.2]})

# 1. Side View
ax1.plot(xs, ys, color='#2ecc71', lw=2, label="Arrow Path")
ax1.plot([0, t_base], [0, target_dh], color='#95a5a6', linestyle='--', alpha=0.5)
ax1.plot([t_base, t_base + t_h*math.sin(tilt)], [target_dh, target_dh + t_h*math.cos(tilt)], 'r-', lw=5, label="Target")
ax1.set_ylim(-2, max(ys)*1.2 if len(ys)>0 else 15)
ax1.set_title("Flight Trajectory (Side View)")
ax1.set_xlabel("Distance (m)"); ax1.set_ylabel("Height (m)")
ax1.legend(loc='upper right', fontsize='small'); ax1.grid(True, alpha=0.3)

# 2. Top View
ax2.plot(xs, zs, color='#e67e22', lw=2)
ax2.axvline(x=t_base, color='red', linestyle='--', alpha=0.5)
ax2.set_ylim(-4, 4) 
ax2.invert_yaxis() 
ax2.set_title("Flight Path (Top View)")
ax2.set_xlabel("Distance (m)"); ax2.set_ylabel("Lateral (m)")
ax2.grid(True, alpha=0.3)

# 3. Front View
ax3.add_patch(plt.Rectangle((-t_w/2, 0), t_w, t_h, color='#fdf2e9', ec='#c0392b', lw=3, label="Target"))
ax3.set_xlim(-2.5, 2.5); ax3.set_ylim(-0.5, 3.5); ax3.set_aspect('equal')
if 'y' in hit_data:
    marker = 'ro' if hit_data['hit'] else 'kx'
    ax3.plot(hit_data['z'], hit_data['y'], marker, markersize=8, label="Impact Point")

ax3.xaxis.set_major_locator(ticker.MultipleLocator(0.5))
ax3.set_title("Impact Analysis (Front View)")
ax3.set_xlabel("Width (m)"); ax3.set_ylabel("Height (m)")
ax3.grid(True, linestyle=':', alpha=0.6)

plt.tight_layout()
st.pyplot(fig)

st.info(f"Arrow Specs: {m_g}g, Diameter {d_mm}mm | {VERSION}")
