import streamlit as st
import math
import matplotlib.pyplot as plt

VERSION = "v1.7.2"
st.set_page_config(page_title="Jumong-Jeong", layout="centered")

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

    while y >= -5 and x <= 165:
        vrx = vx - wx
        vry = vy
        vrz = vz - wz

        v = math.sqrt(vrx**2 + vry**2 + vrz**2)
        if v < 1e-6:
            break

        Cd = cd0 * (1 + 0.15 * (v / 60) ** 2)
        Fd = 0.5 * rho * Cd * A * v**2

        ax = -Fd * vrx / (m * v)
        ay = -g - (Fd * vry / (m * v))
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

# ================= UI =================
st.title("🏹 Jumong-Jeong")
st.caption(f"Korean Archery Trajectory Simulator {VERSION}")

col1, col2 = st.columns(2)
with col1:
    v0 = st.number_input("Muzzle Velocity (m/s)", 30.0, 100.0, 60.0)
    m_g = st.number_input("Arrow Weight (g)", 15.0, 40.0, 26.25)
    theta_deg = st.number_input("Launch Angle θ (°)", 0.0, 45.0, 13.5)
    launch_h = st.number_input("Launch Height (m)", 0.0, 3.0, 1.5)

with col2:
    phi_deg = st.number_input("Azimuth Angle φ (°)", -5.0, 5.0, 0.0)
    wx = st.slider("Tail(+)/Head(-) Wind (m/s)", -15.0, 15.0, 0.0)
    wz = st.slider("Crosswind L(+)/R(-) (m/s)", -10.0, 10.0, 0.0)
    target_h = st.number_input("Target Height (m)", -5.0, 20.0, 0.0)

cd0 = st.number_input("Drag Coefficient Cd₀", 0.3, 2.0, 0.9, 0.05)

# ================= Constants =================
TARGET_X = 145.0
TARGET_HEIGHT = 2.67
TILT = math.radians(15)

def target_plane_y(x):
    return target_h + math.tan(TILT) * (x - TARGET_X)

xs, ys, zs = simulate(v0, m_g, 8.0, theta_deg, phi_deg,
                      launch_h, wx, wz, cd0)

# ================= Collision =================
hit = None
for i in range(len(xs) - 1):
    d1 = ys[i] - target_plane_y(xs[i])
    d2 = ys[i + 1] - target_plane_y(xs[i + 1])
    if d1 * d2 < 0:
        r = abs(d1) / (abs(d1) + abs(d2))
        hit = (
            xs[i] + r * (xs[i+1] - xs[i]),
            ys[i] + r * (ys[i+1] - ys[i]),
            zs[i] + r * (zs[i+1] - zs[i])
        )
        break

# ================= Visualization =================
fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(10, 16))

# Side View
ax1.plot(xs, ys, label="Trajectory")
ax1.plot(
    [TARGET_X, TARGET_X + TARGET_HEIGHT * math.tan(TILT)],
    [target_h, target_h + TARGET_HEIGHT],
    lw=4, color="saddlebrown", label="Target Plane (15° backward)"
)
if hit:
    ax1.plot(hit[0], hit[1], "ro")

ax1.set_xlim(0, 160)
ax1.set_ylim(-5, 15)
ax1.set_title("Side View")
ax1.legend()
ax1.grid(True)

# Top View
ax2.plot(xs, zs)
ax2.axvline(TARGET_X, color="r", ls="--")
ax2.set_ylim(-2, 2)
ax2.invert_yaxis()
ax2.grid(True)

# Front View
ax3.add_patch(plt.Rectangle((-1, 0), 2, TARGET_HEIGHT,
                            ec="black", fc="#C4A484", lw=2))
if hit:
    ax3.plot(hit[2], hit[1] - target_h, "ro")

ax3.set_aspect("equal")
ax3.grid(True)

plt.tight_layout()
st.pyplot(fig)
