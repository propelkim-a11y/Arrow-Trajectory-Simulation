import streamlit as st
import math
import matplotlib.pyplot as plt

VERSION = "v2.2.0"
st.set_page_config(page_title="Jumong-Jeong", layout="centered")

# =========================
# Physics Simulation
# =========================
@st.cache_data
def simulate(v0, m_g, d_mm, theta_deg, phi_deg,
             launch_h, wx, wz, cd0):

    m = m_g / 1000.0
    d = d_mm / 1000.0
    g = 9.80665
    rho = 1.225
    dt = 0.001

    theta = math.radians(theta_deg)
    phi = math.radians(phi_deg)
    A = math.pi * (d / 2) ** 2

    vx = v0 * math.cos(theta) * math.cos(phi)
    vy = v0 * math.sin(theta)
    vz = v0 * math.cos(theta) * math.sin(phi)

    x, y, z = 0.0, launch_h, 0.0
    xs, ys, zs = [x], [y], [z]

    while y >= -5 and x <= 160:
        vrx, vry, vrz = vx - wx, vy, vz - wz
        v = math.sqrt(vrx**2 + vry**2 + vrz**2)
        if v < 1e-6:
            break

        Cd = cd0 * (1 + 0.15 * (v / 60) ** 2)
        Fd = 0.5 * rho * Cd * A * v**2

        ax = -Fd * vrx / (m * v)
        ay = -g - Fd * vry / (m * v)
        az = -Fd * vrz / (m * v)

        vx += ax * dt
        vy += ay * dt
        vz += az * dt

        x += vx * dt
        y += vy * dt
        z += vz * dt

        xs.append(x)
        ys.append(y)
        zs.append(z)

    return xs, ys, zs

# =========================
# UI
# =========================
st.title("🏹 Jumong-Jeong")
st.caption(f"Trajectory Simulator {VERSION}")

col1, col2 = st.columns(2)
with col1:
    v0 = st.number_input("Velocity (m/s)", 30.0, 100.0, 60.0)
    m_g = st.number_input("Arrow Weight (g)", 15.0, 40.0, 26.25)
    theta = st.number_input("Launch Angle θ (°)", 0.0, 45.0, 13.5)
    launch_h = st.number_input("Launch Height (m)", 0.0, 3.0, 1.5)

with col2:
    phi = st.number_input("Azimuth φ (°)", -5.0, 5.0, 0.0)
    wx = st.slider("Head/Tail Wind (m/s)", -15.0, 15.0, 0.0)
    wz = st.slider("Crosswind (m/s)", -10.0, 10.0, 0.0)
    target_y = st.number_input("Target Height Y (m)", -10.0, 10.0, 0.0)

cd0 = st.number_input("Drag Coefficient Cd₀", 0.3, 2.0, 0.9)

# =========================
# Target Geometry (Single Definition)
# =========================
R = 145.0
TILT = math.radians(15)
TARGET_H = 2.67
TARGET_W = 2.0
X_MAX = 160

target_x = math.sqrt(R**2 - target_y**2)

def target_plane_y(x):
    return target_y + math.tan(TILT) * (x - target_x)

# =========================
# Simulation
# =========================
xs, ys, zs = simulate(
    v0, m_g, 8.0, theta, phi,
    launch_h, wx, wz, cd0
)

# =========================
# Collision Detection
# =========================
hit = None
for i in range(len(xs) - 1):
    d1 = ys[i] - target_plane_y(xs[i])
    d2 = ys[i + 1] - target_plane_y(xs[i + 1])
    if d1 * d2 < 0:
        r = abs(d1) / (abs(d1) + abs(d2))
        hit = (
            xs[i] + r * (xs[i + 1] - xs[i]),
            ys[i] + r * (ys[i + 1] - ys[i]),
            zs[i] + r * (zs[i + 1] - zs[i])
        )
        break

# =========================
# Visualization
# =========================
fig, (ax_s, ax_t, ax_f) = plt.subplots(3, 1, figsize=(10, 16))

# --- Side View ---
ax_s.plot(xs, ys)
ax_s.plot(
    [target_x, target_x + TARGET_H * math.tan(TILT)],
    [target_y, target_y + TARGET_H],
    lw=4
)
ax_s.set_xlim(0, X_MAX)
ax_s.set_ylim(-5, 15)
ax_s.set_title("Side View")
ax_s.grid(True)

# --- Top View (폭 반영) ---
ax_t.plot(xs, zs)
ax_t.axvline(target_x, linestyle="--")
ax_t.set_xlim(0, X_MAX)
ax_t.set_ylim(-2, 2)
ax_t.set_title("Top View")
ax_t.invert_yaxis()
ax_t.grid(True)

# --- Front View ---
ax_f.add_patch(
    plt.Rectangle(
        (-TARGET_W/2, 0),
        TARGET_W,
        TARGET_H,
        fill=False,
        lw=3
    )
)

if hit:
    ax_f.plot(hit[2], hit[1] - target_y, "ro", ms=10)

ax_f.set_xlim(-2, 2)
ax_f.set_ylim(-0.5, 3.5)
ax_f.set_aspect("equal")
ax_f.set_title("Front View")
ax_f.grid(True)

st.pyplot(fig)
