import streamlit as st
import math
import matplotlib.pyplot as plt

# =========================
# Config
# =========================
R = 145.0
TILT = math.radians(15)
TARGET_H = 2.67
TARGET_W = 2.0
X_MAX = 160

st.title("🏹 Trajectory + Target Geometry")

target_h = st.number_input(
    "Target center height Y (m)",
    -50.0, 50.0, 0.0
)

# =========================
# Target center on circle
# =========================
if abs(target_h) >= R:
    st.error("Target height exceeds circle radius (145 m)")
    st.stop()

target_x = math.sqrt(R**2 - target_h**2)
target_y = target_h

# =========================
# Target geometry (single definition)
# =========================
# Side view bottom edge
sx = [
    target_x,
    target_x + TARGET_H * math.tan(TILT)
]
sy = [
    target_y,
    target_y + TARGET_H
]

# =========================
# Plot
# =========================
fig, (ax_s, ax_t, ax_f) = plt.subplots(3, 1, figsize=(10, 15))

# --- Side View ---
ax_s.plot(sx, sy, lw=4)
ax_s.set_xlim(0, X_MAX)
ax_s.set_ylim(-20, 20)
ax_s.set_title("Side View (X–Y)")
ax_s.grid(True)

# --- Top View ---
ax_t.plot(
    [target_x, target_x],
    [-TARGET_W/2, TARGET_W/2],
    lw=4
)
ax_t.set_xlim(0, X_MAX)
ax_t.set_ylim(-3, 3)
ax_t.set_title("Top View (X–Z)")
ax_t.invert_yaxis()
ax_t.grid(True)

# --- Front View ---
ax_f.add_patch(
    plt.Rectangle(
        (-TARGET_W/2, target_y),
        TARGET_W,
        TARGET_H,
        fill=False,
        lw=4
    )
)
ax_f.set_xlim(-3, 3)
ax_f.set_ylim(-20, 20)
ax_f.set_aspect("equal")
ax_f.set_title("Front View (Y–Z)")
ax_f.grid(True)

st.pyplot(fig)
