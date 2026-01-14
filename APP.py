import streamlit as st
import math
import matplotlib.pyplot as plt

# =========================
# Page Config
# =========================
VERSION = "v2.0.0"
st.set_page_config(page_title="Jumong-Jeong", layout="centered")

st.title("🏹 Jumong-Jeong")
st.caption(f"Korean Archery Geometry Simulator {VERSION}")

# =========================
# Constants
# =========================
R_TARGET = 145.0            # Target distance radius (m)
TARGET_H = 2.67             # Target height (m)
TARGET_W = 2.0              # Target width (m)
TILT_DEG = 15.0             # Target tilt backward
X_MAX = 160.0

TILT = math.radians(TILT_DEG)

# =========================
# Inputs
# =========================
col1, col2 = st.columns(2)

with col1:
    launch_h = st.number_input(
        "Launch Height Y₀ (m)",
        -5.0, 5.0, 1.5
    )

with col2:
    target_center_y = st.number_input(
        "Target Center Height Y (m)",
        -20.0, 20.0, 0.0
    )

# =========================
# Target position on circle
# =========================
if abs(target_center_y) >= R_TARGET:
    st.error("Target height exceeds 145 m radius")
    st.stop()

target_x = math.sqrt(R_TARGET**2 - target_center_y**2)
target_y = target_center_y

# =========================
# Target geometry (single source of truth)
# =========================

# --- Side View (X-Y): tilted line ---
side_x = [
    target_x,
    target_x + TARGET_H * math.tan(TILT)
]
side_y = [
    target_y,
    target_y + TARGET_H
]

# --- Top View (X-Z): vertical line ---
top_x = [target_x, target_x]
top_z = [-TARGET_W / 2, TARGET_W / 2]

# --- Front View (Y-Z): rectangle ---
front_y = target_y
front_z0 = -TARGET_W / 2

# =========================
# Plot
# =========================
fig, (ax_side, ax_top, ax_front) = plt.subplots(
    3, 1, figsize=(9, 15)
)

# -------------------------
# Side View
# -------------------------
ax_side.plot(side_x, side_y, lw=4, color="brown")
ax_side.axhline(0, color="gray", ls="--", lw=1)

ax_side.set_xlim(0, X_MAX)
ax_side.set_ylim(-5, 15)
ax_side.set_title("Side View (X–Y)")
ax_side.set_xlabel("Distance X (m)")
ax_side.set_ylabel("Height Y (m)")
ax_side.grid(True)

# -------------------------
# Top View
# -------------------------
ax_top.plot(top_x, top_z, lw=4, color="brown")

ax_top.set_xlim(0, X_MAX)
ax_top.set_ylim(-2, 2)
ax_top.invert_yaxis()
ax_top.set_title("Top View (X–Z)")
ax_top.set_xlabel("Distance X (m)")
ax_top.set_ylabel("Left(+) / Right(-) Z (m)")
ax_top.grid(True)

# -------------------------
# Front View
# -------------------------
rect = plt.Rectangle(
    (front_z0, front_y),
    TARGET_W,
    TARGET_H,
    fill=False,
    lw=4,
    color="brown"
)
ax_front.add_patch(rect)

ax_front.set_xlim(-2, 2)
ax_front.set_ylim(-5, 15)
ax_front.set_aspect("equal")
ax_front.set_title("Front View (Y–Z)")
ax_front.set_xlabel("Z (m)")
ax_front.set_ylabel("Y (m)")
ax_front.grid(True)

plt.tight_layout()
st.pyplot(fig)
