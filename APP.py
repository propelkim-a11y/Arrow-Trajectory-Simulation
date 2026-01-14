import streamlit as st
import math
import matplotlib.pyplot as plt

# =========================
# 1. Page Configuration
# =========================
VERSION = "v1.7.0"
st.set_page_config(page_title="Jumong-Jeong", layout="centered")

# =========================
# 2. Physics Simulation
# =========================
@st.cache_data
def simulate(v0, m_g, d_mm, theta_deg, phi_deg,
             h0, target_dh, wx, wz,
             cd0, cl0):

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

    x, y, z = 0.0, h0, 0.0
    xs, ys, zs = [x], [y], [z]

    while y >= (target_dh - 5.0) and x <= 170.0:
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

    return xs, ys, zs

# =========================
# 3. Auto Angle Solver (145 m)
# =========================
def solve_angle_for_range(target_x,
                          v0, m_g, d_mm,
                          h0, target_dh,
                          wx, wz,
                          cd0, cl0):

    th_min, th_max = 2.0, 25.0
    tol = 0.05

    for _ in range(25):
        th_mid = 0.5 * (th_min + th_max)

        xs, ys, _ = simulate(
            v0, m_g, d_mm,
            th_mid, 0.0,
            h0, target_dh,
            wx, wz,
            cd0, cl0
        )

        err = xs[-1] - target_x
        if abs(err) < tol:
            return th_mid

        if err > 0:
            th_max = th_mid
        else:
            th_min = th_mid

    return th_mid

# =========================
# 4. UI Inputs
# =========================
st.title("🏹 Jumong-Jeong")
st.caption(f"Korean Archery Trajectory Simulator {VERSION}")

col1, col2 = st.columns(2)
with col1:
    v0 = st.number_input("Muzzle Velocity (m/s)", 30.0, 100.0, 60.0)
    m_g = st.number_input("Arrow Weight (g)", 15.0, 40.0, 26.25)
    theta_deg = st.number_input("Launch Angle θ (deg)", 0.0, 45.0, 13.5)
    h0 = st.number_input("Launch Height (m)", 0.5, 3.0, 1.5, 0.05)

with col2:
    wx = st.slider("Tail(+) / Head(-) Wind (m/s)", -15.0, 15.0, 0.0)
    wz = st.slider("Crosswind L(+)/R(-) (m/s)", -10.0, 10.0, 0.0)

target_dh = st.number_input("Target Height Offset (m)", -5.0, 5.0, 0.0)
cd0 = st.number_input("Drag Coeff Cd₀ (assumed)", 0.3, 2.0, 0.9, 0.05)
cl0 = st.number_input("Lateral Lift Cl₀ (assumed)", 0.0, 0.2, 0.03, 0.01)

if st.button("🎯 Auto Solve Angle for 145 m"):
    theta_deg = solve_angle_for_range(
        145.0, v0, m_g, 8.0,
        h0, target_dh,
        wx, wz,
        cd0, cl0
    )
    st.success(f"Auto-computed Launch Angle: {theta_deg:.2f}°")

# =========================
# 5. Run Simulation
# =========================
xs, ys, zs = simulate(
    v0, m_g, 8.0,
    theta_deg, 0.0,
    h0, target_dh,
    wx, wz,
    cd0, cl0
)

# =========================
# 6. Key Metrics
# =========================
x_hit = xs[-1]
y_hit = ys[-1]
y_max = max(ys)

# =========================
# 7. Visualization
# =========================
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 8))

# Side View
ax1.plot(xs, ys)
ax1.plot(x_hit, y_hit, "ro")
ax1.plot(xs[ys.index(y_max)], y_max, "go")
ax1.text(x_hit, y_hit, f" Impact\nX={x_hit:.1f} m\nY={y_hit:.1f} m")
ax1.text(xs[ys.index(y_max)], y_max, f" Max Y={y_max:.1f} m")

ax1.set_ylim(-5, 25)
ax1.set_xlim(0, max(xs) * 1.05)
ax1.set_title("Side View")
ax1.set_xlabel("X (m)")
ax1.set_ylabel("Y (m)")
ax1.grid(True)

# Top View
ax2.plot(xs, zs)
ax2.axhspan(-1.0, 1.0, color="orange", alpha=0.2, label="Target Width ±1 m")
ax2.axvline(145.0, color="r", linestyle="--")
ax2.set_ylim(-2, 2)
ax2.invert_yaxis()
ax2.set_xlim(0, max(xs) * 1.05)
ax2.set_title("Top View")
ax2.set_xlabel("X (m)")
ax2.set_ylabel("Z (m)")
ax2.grid(True)
ax2.legend()

plt.tight_layout()
st.pyplot(fig)
