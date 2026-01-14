import streamlit as st
import math
import matplotlib.pyplot as plt

VERSION = "v1.7.2"
st.set_page_config(page_title="Jumong-Jeong", layout="centered")

TARGET_X = 145.0
TARGET_TILT_DEG = 15.0   # ✅ 타겟 뒤로 기울기

@st.cache_data
def simulate(v0, m_g, d_mm,
             theta_deg, phi_deg,
             h0, target_dh,
             wx, wz,
             cd0, cl0):

    m = m_g / 1000.0
    d = d_mm / 1000.0
    g = 9.80665
    rho = 1.225
    dt = 0.001

    theta = math.radians(theta_deg)
    phi = math.radians(phi_deg)
    alpha = math.radians(TARGET_TILT_DEG)

    A = math.pi * (d / 2) ** 2

    vx = v0 * math.cos(theta) * math.cos(phi)
    vy = v0 * math.sin(theta)
    vz = v0 * math.cos(theta) * math.sin(phi)

    x, y, z = 0.0, h0, 0.0
    xs, ys, zs = [x], [y], [z]

    def target_line(x):
        return target_dh + math.tan(alpha) * (x - TARGET_X)

    prev_f = y - target_line(x)

    hit = False

    while x <= TARGET_X + 5.0 and y > -10.0:
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
        ay = -g - (Fd * vry / (m * v))
        az = -Fd * vrz / (m * v) + Fl / m

        vx += ax * dt
        vy += ay * dt
        vz += az * dt

        x += vx * dt
        y += vy * dt
        z += vz * dt

        xs.append(x)
        ys.append(y)
        zs.append(z)

        f = y - target_line(x)
        if prev_f * f < 0:
            hit = True
            break
        prev_f = f

    return xs, ys, zs, hit


# ================= UI =================
st.title("🏹 Jumong-Jeong")
st.caption(f"Trajectory Simulator {VERSION}")

col1, col2 = st.columns(2)
with col1:
    v0 = st.number_input("Velocity (m/s)", 30.0, 100.0, 60.0)
    m_g = st.number_input("Arrow Mass (g)", 15.0, 40.0, 26.25)
    theta_deg = st.number_input("Launch Angle θ (deg)", 0.0, 45.0, 13.5)
    h0 = st.number_input("Launch Height (m)", 0.5, 3.0, 1.5, 0.05)

with col2:
    wx = st.slider("Head/Tail Wind (m/s)", -15.0, 15.0, 0.0)
    wz = st.slider("Crosswind (m/s)", -10.0, 10.0, 0.0)

target_dh = st.number_input("Target Height Offset (m)", -5.0, 5.0, 0.0)
cd0 = st.number_input("Cd₀", 0.3, 2.0, 0.9, 0.05)
cl0 = st.number_input("Cl₀", 0.0, 0.2, 0.03, 0.01)

xs, ys, zs, hit = simulate(
    v0, m_g, 8.0,
    theta_deg, 0.0,
    h0, target_dh,
    wx, wz,
    cd0, cl0
)

# ================= Plot =================
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 8))

# --- Side View ---
ax1.plot(xs, ys, label="Trajectory")

xt = [TARGET_X - 3, TARGET_X + 3]
yt = [
    target_dh + math.tan(math.radians(TARGET_TILT_DEG)) * (x - TARGET_X)
    for x in xt
]
ax1.plot(xt, yt, "r--", linewidth=2,
         label="Target Plane (15° Tilt)")

ax1.set_ylim(-5, 25)
ax1.set_xlim(0, max(xs) * 1.05)
ax1.set_title("Side View")
ax1.set_xlabel("X (m)")
ax1.set_ylabel("Y (m)")
ax1.grid(True)
ax1.legend()

# --- Top View ---
ax2.plot(xs, zs)
ax2.axvline(TARGET_X, color="r", linestyle="--")
ax2.set_ylim(-2, 2)
ax2.invert_yaxis()
ax2.set_xlim(0, max(xs) * 1.05)
ax2.set_title("Top View")
ax2.set_xlabel("X (m)")
ax2.set_ylabel("Z (m)")
ax2.grid(True)

st.pyplot(fig)

if hit:
    st.success("🎯 TARGET HIT (Tilted Plane)")
else:
    st.warning("❌ MISS (No plane intersection)")
