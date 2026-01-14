import streamlit as st
import math
import matplotlib.pyplot as plt

# =========================
# Page Config
# =========================
VERSION = "v1.9.3"
st.set_page_config(page_title="Jumong-Jeong", layout="centered")

# =========================
# Physics Simulation
# =========================
@st.cache_data
def simulate(v0, m_g, d_mm, theta_deg, phi_deg,
             launch_h, target_h, wx, wz,
             cd0, cl0):

    m = m_g / 1000
    d = d_mm / 1000
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

    while y >= -5 and x <= 165:
        vrx = vx - wx
        vry = vy
        vrz = vz - wz

        v = math.sqrt(vrx**2 + vry**2 + vrz**2)
        if v < 1e-6:
            break

        Cd = cd0 * (1 + 0.15 * (v / 60) ** 2)
        Fd = 0.5 * rho * Cd * A * v**2
        Fl = 0.5 * rho * cl0 * A * v**2

        ax = -Fd * vrx / (m * v)
        az = -Fd * vrz / (m * v)
        ay = -g - (Fd * vry / (m * v)) + (Fl / m)

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
st.caption(f"Korean Archery Trajectory Simulator {VERSION}")

col1, col2 = st.columns(2)
with col1:
    v0 = st.number_input("Muzzle Velocity (m/s)", 30.0, 100.0, 60.0)
    m_g = st.number_input("Arrow Weight (g)", 15.0, 40.0, 26.25)
    theta_deg = st.number_input("Launch Angle θ (°)", 0.0, 45.0, 13.5)
    launch_h = st.number_input("Launch Height (m)", 0.0, 2.0, 1.5)

with col2:
    phi_deg = st.number_input("Azimuth Angle φ (°)", -5.0, 5.0, 0.0)
    wx = st.slider("Head(-) / Tail(+) Wind (m/s)", -15.0, 15.0, 0.0)
    wz = st.slider("Crosswind L(+) / R(-) (m/s)", -10.0, 10.0, 0.0)

target_h = st.number_input("Target Base Height (m)", -2.0, 2.0, 0.0)
cd0 = st.number_input("Drag Coefficient Cd₀", 0.3, 2.0, 0.9, 0.05)
cl0 = st.number_input("Lift Coefficient Cl₀", 0.0, 0.3, 0.05, 0.01)

# =========================
# Run Simulation
# =========================
xs, ys, zs = simulate(
    v0, m_g, 8.0,
    theta_deg, phi_deg,
    launch_h, target_h,
    wx, wz, cd0, cl0
)

# =========================
# Target Definition
# =========================
TARGET_X = 145.0
TARGET_H = 2.67
TARGET_W = 2.0
TILT = math.radians(15)

# =========================
# Hit Detection
# =========================
hit = None

def target_plane_y(x):
    return target_h - math.tan(TILT) * (x - TARGET_X)

for i in range(len(xs) - 1):
    y_plane = target_plane_y(xs[i])
    if ys[i] >= y_plane and ys[i+1] <= y_plane:
        r = (y_plane - ys[i]) / (ys[i+1] - ys[i])
        hit = {
            "x": xs[i] + r * (xs[i+1] - xs[i]),
            "y": ys[i] + r * (ys[i+1] - ys[i]),
            "z": zs[i] + r * (zs[i+1] - zs[i])
        }
        break

# =========================
# Visualization
# =========================
fig, (ax1, ax2, ax3) = plt.subplots(
    3, 1, figsize=(12, 14),
    gridspec_kw={"height_ratios": [2, 1, 1]}
)

# --- Side View ---
ax1.plot(xs, ys, label="Trajectory")

xt = [TARGET_X - 2, TARGET_X + 2]
yt = [target_plane_y(x) for x in xt]
ax1.plot(xt, yt, "r-", lw=4, label="Target (15° tilt)")

ax1.axhline(0, color="gray", ls="--", lw=1)
ax1.set_xlim(0, 160)
ax1.set_ylim(-5, 15)
ax1.set_xlabel("Distance X (m)")
ax1.set_ylabel("Height Y (m)")
ax1.set_title("Side View")
ax1.legend()
ax1.grid(True)

# --- Top View ---
ax2.plot(xs, zs, label="Trajectory")
ax2.axvline(TARGET_X, color="r", ls="--")
ax2.set_xlim(0, 160)
ax2.set_ylim(-2, 2)
ax2.set_xlabel("Distance X (m)")
ax2.set_ylabel("Z (m)")
ax2.set_title("Top View")
ax2.invert_yaxis()
ax2.grid(True)

# --- Front View ---
ax3.add_patch(
    plt.Rectangle(
        (-TARGET_W / 2, target_h),
        TARGET_W, TARGET_H,
        ec="black", fc="#D2B48C", lw=3
    )
)

if hit:
    ax3.plot(hit["z"], hit["y"], "ro", ms=10)
    inside = (
        -TARGET_W / 2 <= hit["z"] <= TARGET_W / 2 and
        target_h <= hit["y"] <= target_h + TARGET_H
    )
    ax3.set_title("Front View - HIT" if inside else "Front View - MISS")
else:
    ax3.set_title("Front View")

ax3.set_xlim(-2, 2)
ax3.set_ylim(target_h - 0.5, target_h + TARGET_H + 0.5)
ax3.set_aspect("equal")
ax3.grid(True)

plt.tight_layout()
st.pyplot(fig)
