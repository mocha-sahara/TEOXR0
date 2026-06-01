# 🛰️ TEO-XR Web - Command Cockpit & Digital Twin

Welcome to the **TEO-XR Command Center**, Next-Gen Web3D/WebXR industrial digital-twin built for real-time monitoring, telemetry tracking, and physical simulations of high-performance DC motors in real-time.

---

## 🎨 Immersive Experience Overview

TEO-XR offers a responsive, high-end virtual laboratory and control cockpit, bringing hardware telemetry straight to the web browser:
1. **Physical Sound Modeling**: Real-time synthesized spatial acoustics and audio engines that adjust pitch, frequency curves, lowpass filtration, and volume dynamically using simulated motor speed (RPM).
2. **Interactive 3D Digital Twin**: Built on A-Frame and Three.js with highly optimized GLTF assets (`stator.glb`, `rotor.glb`, `bun.glb`) featuring reflective, realistic metallic finishes.
3. **Telemetry & Real-Time Diagnostics**:
   - Spatially bound **Diagnostics HUD Panel** displaying live parameters like Velocity, Current, Temperature, Torque, and Efficiency.
   - Dynamic **Heatmap Shading Component** that shifts stator color from technical gray to extreme thermal warning orange-red when overheating is detected.
   - Intelligent **Alarm & Interlock Systems** triggers physical sparks and safety shutdowns (Emergency Brakes) if the safety envelope is breached.

---

## ✨ Features Checklist

* [x] **WebXR & Quest Hand-Tracking**: Complete support for untethered hand-tracking in VR/XR headsets (like Meta Quest 3).
* [x] **Dynamic Sound Synthesis**: Robust Web Audio API synth oscillators dynamically mapped to live mathematical speed calculations.
* [x] **Industrial SCADA UI Controls**: Accurate sliders, CSV Telemetry Exporter, layout grid toggles, and motor status indicators.
* [x] **Surgical 3D Precision**: All assets migrated to modern bin-packed WebGL standard GLB files.

---

## 🚀 How to Run Locally

You can launch the developer server inside the modern Vite sandbox instantly.

```bash
# 1. Install dependencies
npm install

# 2. Launch Development Server
npm run dev

# 3. Build Production Bundles
npm run build
```
