import streamlit as st
import math
import matplotlib.pyplot as plt
import numpy as np

# =========================
# Page Config
# =========================
st.set_page_config(page_title="Jumong-Jeong Step2", layout="centered")
st.title("🏹 Jumong-Jeong – Trajectory + Target")

# =========================
# Constants
# =========================
G = 9.80665
R_TARGET = 145.0
TARGET_H = 2.67
TARGET_W = 2.0
TILT = math.radians(15)
DT = 0.01
X_MAX = 160

# =========================
# Inputs
# =========================
col1, col2, col3 = st.columns(3)

with col1:
    v0 = st.number_input("Launch speed (m/s)", 30.0, 100.0, 60.0)

with col2:
    angle_deg = st.number_input("Launch angle (deg)", 0.0, 45.0, 13.5)

with col3:
    launch_y = st.number_input("Launch height Y₀ (m)", -5.0, 5.0, 1.5)

target_y = st.number_input(
    "Target center height Y (m)",
    -20.0, 20.0, 0.0
)

# =========================
# Target position on circle
# =========================
if abs(target_y) >= R_TARGET:
    st.error("Target height exceeds 145 m radius")
    st.stop()

target_x = math.sqrt(R_TARGET**2 - target_y**2)

# =========================
# Target geometry
# =========================
# Side view (X-Y)
side_x = [
    target_x,
    target_x + TARGET_H * math.tan(TILT)
]
side_y = [
    target_y,
    target_y + TARGET_H
]

# Top view (X-Z)
top_x = [target_x, target_x]
top_z = [-TARGET_W / 2, TARGET_W / 2]

# Front view (Y-Z)
front_y = target_y
front_z0 = -TARGET_W / 2

# =========================
# Trajectory simulation (2D X-Y)
# =========================
theta = math.radians(angle_deg)
vx = v0 * math.cos(theta)
vy = v0 * math.sin(theta)

x, y = 0.0, launch_y
xs, ys = [x], [y]

while x <= X_MAX and y >= -10:
    vy -= G * DT
    x += vx * DT
    y += vy * DT
    xs.append(x)
    ys.append(y)

# =========================
# Plot
# =========================
fig, (ax_s, ax_t, ax_f) = plt.subplots(3, 1, figsize=(9, 15))

# --- Side View ---
ax_s.plot(xs, ys, label="Trajectory")
ax_s.plot(side_x, side_y, lw=4, label="Target")
ax_s.scatter([0], [launch_y], color="red", label="Launch")

ax_s.set_xlim(0, X_MAX)
ax_s.set_ylim(-5, 15)
ax_s.set_title("Side View (X–Y)")
ax_s.set_xlabel("Distance X (m)")
ax_s.set_ylabel("Height Y (m)")
ax_s.legend()
ax_s.grid(True)

# --- Top View ---
ax_t.plot(top_x, top_z, lw=4)
ax_t.set_xlim(0, X_MAX)
ax_t.set_ylim(-2, 2)
ax_t.invert_yaxis()
ax_t.set_title("Top View (X–Z)")
ax_t.grid(True)

# --- Front View ---
# Target
rect = plt.Rectangle(
    (front_z0, front_y),
    TARGET_W,
    TARGET_H,
    fill=False,
    lw=4
)
ax_f.add_patch(rect)

# Audience (Front view only)
aud_z = np.linspace(-6, 6, 40)
aud_y = np.zeros_like(aud_z)
ax_f.scatter(aud_z, aud_y, s=15, alpha=0.6, label="Audience")

ax_f.set_xlim(-7, 7)
ax_f.set_ylim(-5, 15)
ax_f.set_aspect("equal")
ax_f.set_title("Front View (Y–Z)")
ax_f.set_xlabel("Z (m)")
ax_f.set_ylabel("Y (m)")
ax_f.legend()
ax_f.grid(True)

plt.tight_layout()
st.pyplot(fig)
