import streamlit as st
import math
import matplotlib.pyplot as plt

st.set_page_config(page_title="Target Geometry Check", layout="centered")
st.title("🎯 Target Geometry – Consistency Check")

# =========================
# Constants
# =========================
R = 145.0
TARGET_H = 2.67
TARGET_W = 2.0
TILT = math.radians(15)

# =========================
# Input
# =========================
target_y = st.number_input(
    "Target center height Y (m)",
    -20.0, 20.0, 0.0
)

if abs(target_y) >= R:
    st.error("Invalid height for 145 m radius")
    st.stop()

# =========================
# Target center on circle
# =========================
target_x = math.sqrt(R**2 - target_y**2)

# =========================
# Target geometry
# =========================
# Side view (X–Y): tilted line
sx = [
    target_x,
    target_x + TARGET_H * math.tan(TILT)
]
sy = [
    target_y,
    target_y + TARGET_H
]

# Top view (X–Z): vertical line
tx = [target_x, target_x]
tz = [-TARGET_W / 2, TARGET_W / 2]

# Front view (Y–Z): rectangle
fy = target_y
fz0 = -TARGET_W / 2

# =========================
# Plot
# =========================
fig, (ax_s, ax_t, ax_f) = plt.subplots(3, 1, figsize=(9, 15))

# Side
ax_s.plot(sx, sy, lw=4)
ax_s.set_xlim(0, 160)
ax_s.set_ylim(-5, 15)
ax_s.set_title("Side View (X–Y)")
ax_s.grid(True)

# Top
ax_t.plot(tx, tz, lw=4)
ax_t.set_xlim(0, 160)
ax_t.set_ylim(-2, 2)
ax_t.invert_yaxis()
ax_t.set_title("Top View (X–Z)")
ax_t.grid(True)

# Front
rect = plt.Rectangle(
    (fz0, fy),
    TARGET_W,
    TARGET_H,
    fill=False,
    lw=4
)
ax_f.add_patch(rect)
ax_f.set_xlim(-2, 2)
ax_f.set_ylim(-5, 15)
ax_f.set_aspect("equal")
ax_f.set_title("Front View (Y–Z)")
ax_f.grid(True)

plt.tight_layout()
st.pyplot(fig)
