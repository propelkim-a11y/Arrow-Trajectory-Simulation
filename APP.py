import streamlit as st
import math
import matplotlib.pyplot as plt

VERSION = "v1.9.1"
st.set_page_config(page_title="Jumong-Jeong", layout="centered")

# =============================
# Target Parameters
# =============================
TARGET_X = 145.0
TARGET_HEIGHT = 2.67
TARGET_WIDTH = 2.0
TARGET_TILT_DEG = 15.0   # from vertical (backward)

# =============================
# Simulation
# =============================
@st.cache_data
def simulate(v0, m_g, d_mm,
             theta_deg, phi_deg,
             h0, target_h,
             wx, wz,
             cd0, cl0):

    m = m_g / 1000
    d = d_mm / 1000
    rho = 1.225
    g = 9.80665
    dt = 0.001

    theta = math.radians(theta_deg)
    phi = math.radians(phi_deg)
    alpha = math.radians(TARGET_TILT_DEG)

    A = math.pi * (d / 2) ** 2

    vx = v0 * math.cos(theta) * math.cos(phi)
    vy = v0 * math.sin(theta)
    vz = v0 * math.cos(theta) * math.sin(phi)

    # world origin: shooter floor = target floor = y=0
    x, y, z = 0.0, h0, 0.0
    xs, ys, zs = [x], [y], [z]

    # target plane: vertical plane tilted 15° backward
    def plane_f(x, y):
        return y - (target_h + (1 / math.tan(alpha)) * (x - TARGET_X))

    prev_f = plane_f(x, y)
    hit_point = None

    while x < TARGET_X + 3 and y > -10:
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

        f = plane_f(x, y)
        if prev_f * f < 0:
            hit_point = (x, y, z)
            break
        prev_f = f

    return xs, ys, zs, hit_point

# =============================
# UI
# =============================
st.title("🏹 Jumong-Jeong")
st.caption(f"Trajectory Simulator {VERSION}")

col1, col2 = st.columns(2)
with col1:
    v0 = st.number_input("Velocity (m/s)", 30.0, 100.0, 60.0)
    m_g = st.number_input("Arrow Mass (g)", 15.0, 40.0, 26.25)
    theta = st.number_input("Launch Angle θ (deg)", 0.0, 45.0, 13.5)
    h0 = st.number_input("Launch Height h₀ (m)", 0.5, 3.0, 1.5, 0.05)

with col2:
    wx = st.slider("Head/Tail Wind (m/s)", -15.0, 15.0, 0.0)
    wz = st.slider("Crosswind (m/s)", -10.0, 10.0, 0.0)

target_h = st.number_input(
    "Target Base Height (m)",
    -2.0, 2.0, 0.0, 0.05,
    help="Absolute height of target base. Default = shooter floor height."
)

cd0 = st.number_input("Cd₀", 0.3, 2.0, 0.9, 0.05)
cl0 = st.number_input("Cl₀", 0.0, 0.2, 0.03, 0.01)

xs, ys, zs, hit = simulate(
    v0, m_g, 8.0,
    theta, 0.0,
    h0, target_h,
    wx, wz,
    cd0, cl0
)

# =============================
# Visualization
# =============================
fig = plt.figure(figsize=(14, 14))
gs = fig.add_gridspec(3, 1, height_ratios=[2, 1, 1])

# --- Side View ---
ax1 = fig.add_subplot(gs[0])
ax1.plot(xs, ys, label="Trajectory")

xt = [TARGET_X - 0.4, TARGET_X + 0.4]
yt = [
    target_h + (1 / math.tan(math.radians(15))) * (x - TARGET_X)
    for x in xt
]
ax1.plot(xt, yt, "r-", lw=4, label="Target (15° from vertical)")

ax1.set_xlim(0, max(xs) * 1.05)
ax1.set_ylim(-5, 25)
ax1.set_xlabel("X (m)")
ax1.set_ylabel("Y (m)")
ax1.set_title("Side View")
ax1.grid(True)
ax1.legend()

# --- Top View ---
ax2 = fig.add_subplot(gs[1])
ax2.plot(xs, zs)
ax2.axvline(TARGET_X, color="r", linestyle="--")
ax2.set_xlim(0, max(xs) * 1.05)
ax2.set_ylim(-2, 2)
ax2.invert_yaxis()
ax2.set_xlabel("X (m)")
ax2.set_ylabel("Z (m)")
ax2.set_title("Top View")
ax2.grid(True)

# --- Front View ---
ax3 = fig.add_subplot(gs[2])
ax3.add_patch(
    plt.Rectangle(
        (-TARGET_WIDTH / 2, 0),
        TARGET_WIDTH, TARGET_HEIGHT,
        ec="black", fc="#D2B48C", lw=3
    )
)

if hit:
    hx, hy, hz = hit
    rel_y = hy - target_h
    inside = (-TARGET_WIDTH/2 <= hz <= TARGET_WIDTH/2) and \
             (0 <= rel_y <= TARGET_HEIGHT)
    ax3.plot(hz, rel_y, "ro", ms=10)
    ax3.set_title("Front View : HIT" if inside else "Front View : MISS")
else:
    ax3.set_title("Front View : No Impact")

ax3.set_xlim(-2, 2)
ax3.set_ylim(-0.5, 3.0)
ax3.set_aspect("equal")
ax3.grid(True)

plt.tight_layout()
st.pyplot(fig)
