// ========================================================
// DOM CACHING (Optimalisasi Memori & Kecepatan 60-90 FPS)
// ========================================================
window.UI = {};
document.addEventListener("DOMContentLoaded", () => {
    window.UI.xrRpm = document.getElementById('xr-rpm');
    window.UI.xrError = document.getElementById('xr-error');
    window.UI.holoRotor = document.getElementById('holo-rotor');
    window.UI.motorStator = document.getElementById('motor-stator');
    window.UI.motorGroup = document.getElementById('motor-group');
    window.UI.ambientLight = document.getElementById('ambient-light');
    window.UI.point1 = document.getElementById('point-light-1');
    window.UI.point2 = document.getElementById('point-light-2');
    window.UI.xrOver = document.getElementById('xr-over');
    window.UI.xrRise = document.getElementById('xr-rise');
    window.UI.xrSettle = document.getElementById('xr-settle');
    window.UI.liveChart = document.getElementById('live-chart');
    window.UI.xrFps = document.getElementById('xr-fps');
    window.UI.xrPing = document.getElementById('xr-ping');
    window.UI.hudRpmLabel = document.getElementById('hud-rpm-label');
    window.UI.hudModeLabel = document.getElementById('hud-mode-label');
    window.UI.hudBarFill = document.getElementById('hud-bar-fill');
});

// ========================================================
// 1. KOMPONEN UI DASAR (PANEL, TOMBOL, SLIDER)
// ========================================================
AFRAME.registerComponent('sci-fi-panel', {
    schema: { width: {type: 'number', default: 5}, height: {type: 'number', default: 5}, color: {type: 'string', default: '#0a1128'}, borderColor: {type: 'string', default: '#00e5ff'}, diagonal: {type: 'boolean', default: false} },
    init: function() {
        let canvas = document.createElement('canvas'); let res = 256; 
        canvas.width = this.data.width * res; canvas.height = this.data.height * res;
        let ctx = canvas.getContext('2d'); let w = canvas.width; let h = canvas.height; let r = 80; 

        ctx.clearRect(0,0,w,h);
        ctx.beginPath();
        ctx.moveTo(r, 0); ctx.lineTo(w-r, 0); ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h-r); ctx.quadraticCurveTo(w, h, w-r, h);
        ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h-r);
        ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();

        let grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(0, 229, 255, 0.15)'); grad.addColorStop(1, 'rgba(5, 10, 25, 0.8)');   
        ctx.fillStyle = grad; ctx.fill();

        ctx.lineWidth = 6; ctx.strokeStyle = this.data.borderColor; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(w-r, 0);
        ctx.lineWidth = 12; ctx.strokeStyle = '#ffffff'; 
        ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 30; ctx.stroke(); ctx.shadowBlur = 0; 

        if(this.data.diagonal) {
            ctx.beginPath(); ctx.moveTo(0, h * 0.65); ctx.lineTo(w, h * 0.25); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)'; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, h * 0.68); ctx.lineTo(w, h * 0.28); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255, 42, 109, 0.4)'; ctx.stroke();
        }

        let texture = new THREE.CanvasTexture(canvas);
        let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        let mesh = this.el.getObject3D('mesh');
        if(mesh) mesh.material = material; else this.el.addEventListener('model-loaded', () => this.el.getObject3D('mesh').material = material);
    }
});

AFRAME.registerComponent('mqtt-button', {
    schema: { topic: {type: 'string'}, payload: {type: 'string'}, isTest: {type: 'boolean', default: false} },
    init: function () {
        var data = this.data; var el = this.el;
        this.originalColor = el.getAttribute('material').color;
        
        el.addEventListener('mouseenter', () => { el.setAttribute('scale', '1.05 1.05 1.05'); el.setAttribute('material', 'color', '#ffffff'); });
        el.addEventListener('mouseleave', () => { el.setAttribute('scale', '1 1 1'); el.setAttribute('material', 'color', this.originalColor); });
        el.addEventListener('click', function () {
            el.setAttribute('scale', '0.9 0.9 0.9'); setTimeout(() => el.setAttribute('scale', '1.05 1.05 1.05'), 150);
            if (window.playHapticSound) window.playHapticSound('click');
            if (data.isTest) { if (window.startStepTest) window.startStepTest(); } 
            else if (window.sendMqttCommand) { window.sendMqttCommand(data.topic, data.payload); }
        });
    }
});

AFRAME.registerComponent('xr-slider', {
    schema: { topic: {type: 'string'}, min: {type: 'number', default: 0}, max: {type: 'number', default: 100}, width: {type: 'number', default: 2.2}, value: {type: 'number', default: 0}, label: {type: 'string', default: 'VAL'}, isFloat: {type: 'boolean', default: false}, step: {type: 'number', default: 1} },
    init: function () {
        this.currentVal = this.data.value;
        this.track = document.createElement('a-plane'); this.track.setAttribute('width', this.data.width); this.track.setAttribute('height', '0.12'); this.track.setAttribute('color', '#0a1128'); this.track.setAttribute('opacity', '0.8');
        this.trackBorder = document.createElement('a-entity'); this.trackBorder.setAttribute('geometry', `primitive: plane; width: ${this.data.width + 0.04}; height: 0.16`); this.trackBorder.setAttribute('material', 'color: #00e5ff; opacity: 0.3; wireframe: true'); this.trackBorder.setAttribute('position', '0 0 -0.01');
        this.track.appendChild(this.trackBorder); this.track.classList.add('clickable');
        this.fill = document.createElement('a-plane'); this.fill.setAttribute('height', '0.12'); this.fill.setAttribute('color', '#00e5ff');
        this.text = document.createElement('a-text'); this.text.setAttribute('position', '0 0.25 0'); this.text.setAttribute('align', 'center'); this.text.setAttribute('color', '#ffffff'); this.text.setAttribute('width', '4'); this.text.setAttribute('font', 'monoid');
        this.el.appendChild(this.track); this.el.appendChild(this.fill); this.el.appendChild(this.text);
        
        let self = this;
        this.track.addEventListener('click', function (evt) {
            let localPoint = self.el.object3D.worldToLocal(evt.detail.intersection.point.clone());
            let percent = (localPoint.x + self.data.width / 2) / self.data.width;
            if (percent < 0) percent = 0; if (percent > 1) percent = 1;
            let val = percent * (self.data.max - self.data.min) + self.data.min; val = Math.round(val / self.data.step) * self.data.step; 
            self.setValue(val); 
            if (window.playHapticSound) window.playHapticSound('click');
            if (window.sendMqttCommand) window.sendMqttCommand(self.data.topic, self.data.isFloat ? val.toFixed(2) : val);
        });

        const createControlBtn = (labelStr, offsetX) => {
            let btn = document.createElement('a-entity'); btn.setAttribute('position', `${offsetX} 0 0.01`); btn.classList.add('clickable');
            let bg = document.createElement('a-plane'); bg.setAttribute('width', '0.22'); bg.setAttribute('height', '0.22'); bg.setAttribute('color', '#0a1128'); bg.setAttribute('opacity', '0.9');
            let border = document.createElement('a-entity'); border.setAttribute('geometry', 'primitive: plane; width: 0.26; height: 0.26'); border.setAttribute('material', 'color: #00e5ff; opacity: 0.6; wireframe: true'); border.setAttribute('position', '0 0 -0.01');
            let txt = document.createElement('a-text'); txt.setAttribute('value', labelStr); txt.setAttribute('align', 'center'); txt.setAttribute('position', '0 0.01 0.02'); txt.setAttribute('width', '4'); txt.setAttribute('color', '#00e5ff'); txt.setAttribute('font', 'monoid');
            bg.appendChild(border); bg.appendChild(txt); btn.appendChild(bg);
            btn.addEventListener('mouseenter', () => { btn.setAttribute('scale', '1.1 1.1 1.1'); txt.setAttribute('color', '#ffffff'); border.setAttribute('material', 'color', '#ffffff'); });
            btn.addEventListener('mouseleave', () => { btn.setAttribute('scale', '1 1 1'); txt.setAttribute('color', '#00e5ff'); border.setAttribute('material', 'color', '#00e5ff'); });
            this.el.appendChild(btn); return btn;
        };

        let btnMinus = createControlBtn('-', -(this.data.width / 2) - 0.25); let btnPlus  = createControlBtn('+', (this.data.width / 2) + 0.25);
        btnMinus.addEventListener('click', () => { btnMinus.setAttribute('scale', '0.8 0.8 0.8'); setTimeout(() => btnMinus.setAttribute('scale', '1.1 1.1 1.1'), 100); let newVal = self.currentVal - self.data.step; self.setValue(newVal); if (window.playHapticSound) window.playHapticSound('click'); if (window.sendMqttCommand) window.sendMqttCommand(self.data.topic, self.data.isFloat ? newVal.toFixed(2) : newVal); });
        btnPlus.addEventListener('click', () => { btnPlus.setAttribute('scale', '0.8 0.8 0.8'); setTimeout(() => btnPlus.setAttribute('scale', '1.1 1.1 1.1'), 100); let newVal = self.currentVal + self.data.step; self.setValue(newVal); if (window.playHapticSound) window.playHapticSound('click'); if (window.sendMqttCommand) window.sendMqttCommand(self.data.topic, self.data.isFloat ? newVal.toFixed(2) : newVal); });
        this.setValue(this.data.value);
    },
    setValue: function(val) {
        val = Math.round(val * 1000) / 1000; 
        if (val < this.data.min) val = this.data.min; if (val > this.data.max) val = this.data.max; this.currentVal = val; 
        let percent = (val - this.data.min) / (this.data.max - this.data.min); let fillWidth = percent * this.data.width; let fillX = (-this.data.width / 2) + (fillWidth / 2);
        this.fill.setAttribute('width', fillWidth); this.fill.setAttribute('position', fillX + ' 0 0.01');
        let displayVal = this.data.isFloat ? val.toFixed(2) : Math.round(val); this.text.setAttribute('value', `${this.data.label}: ${displayVal}`);
        if (this.data.label === "Kp") window.currentKp = val; if (this.data.label === "Ki") window.currentKi = val; if (this.data.label === "Kd") window.currentKd = val;
        if (this.data.label === "TARGET RPM") window.currentSetpoint = val; if (this.data.label === "RAW PWM") window.currentPwm = val;
    }
});

// ========================================================
// 2. KOMPONEN MONITOR & CHART (FPS, GRAFIK)
// ========================================================
AFRAME.registerComponent('system-monitor', {
    init: function() { this.frames = 0; this.lastTime = Date.now(); },
    tick: function() {
        this.frames++; let now = Date.now();
        if (now - this.lastTime >= 1000) {
            if (window.UI && window.UI.xrFps) {
                let fps = this.frames; window.UI.xrFps.setAttribute('value', fps);
                window.UI.xrFps.setAttribute('color', fps < 45 ? '#ff2a6d' : '#00e5ff');
            }
            this.frames = 0; this.lastTime = now;
        }
    }
});

AFRAME.registerComponent('xr-chart', {
    schema: { width: {type: 'number', default: 1024}, height: {type: 'number', default: 512} },
    init: function() {
        this.canvas = document.createElement('canvas'); this.canvas.width = this.data.width; this.canvas.height = this.data.height; this.ctx = this.canvas.getContext('2d');
        this.dataPoints = []; this.targetPoints = []; this.maxPoints = 80;
        this.texture = new THREE.CanvasTexture(this.canvas); this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
        let mesh = this.el.getObject3D('mesh');
        if (mesh) { mesh.material = this.material; } else { this.el.addEventListener('model-loaded', () => { this.el.getObject3D('mesh').material = this.material; }); }
        this.needsUpdate = true;
    },
    updateData: function(realVal, targetVal) { this.dataPoints.push(realVal); this.targetPoints.push(targetVal); if(this.dataPoints.length > this.maxPoints) { this.dataPoints.shift(); this.targetPoints.shift(); } this.needsUpdate = true; },
    tick: function () { if (this.needsUpdate) { this.drawChart(); this.needsUpdate = false; } },
    drawChart: function() {
        let ctx = this.ctx; let w = this.canvas.width; let h = this.canvas.height;
        ctx.clearRect(0, 0, w, h); ctx.fillStyle = 'rgba(5, 9, 20, 0.6)'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.1)'; ctx.lineWidth = 1; for(let i=1; i<5; i++) { ctx.beginPath(); ctx.moveTo(0, h * (i/5)); ctx.lineTo(w, h * (i/5)); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, w, h);
        if(this.dataPoints.length > 1) {
            let step = w / (this.maxPoints - 1);
            ctx.beginPath(); ctx.strokeStyle = 'rgba(255, 42, 109, 0.8)'; ctx.lineWidth = 4; ctx.setLineDash([15, 15]); 
            for(let i = 0; i < this.targetPoints.length; i++) { let x = i * step; let y = h - ((this.targetPoints[i] / 200) * h); if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
            ctx.beginPath(); ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 8;
            for(let i = 0; i < this.dataPoints.length; i++) { let x = i * step; let y = h - ((this.dataPoints[i] / 200) * h); if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
        }
        if(this.texture) this.texture.needsUpdate = true;
    }
});

// ========================================================
// 3. KOMPONEN INTERAKSI SPASIAL (ZOOM & ROTATE)
// ========================================================
AFRAME.registerComponent('smart-zoom', {
    init: function () {
        let camEl = this.el; let currentFov = 80;
        window.addEventListener('wheel', function (e) { currentFov += Math.sign(e.deltaY) * 5; currentFov = Math.max(30, Math.min(110, currentFov)); camEl.setAttribute('camera', 'fov', currentFov); });
    }
});

AFRAME.registerComponent('universal-rotate', {
    schema: { speed: { default: 1 } },
    init: function () {
        this.isDragging = false; this.lastX = 0; this.lastY = 0;
        this.el.addEventListener('mousedown', (e) => { this.isDragging = true; this.lastX = e.detail.mouseEvent ? e.detail.mouseEvent.clientX : e.clientX; this.lastY = e.detail.mouseEvent ? e.detail.mouseEvent.clientY : e.clientY; });
        document.addEventListener('mouseup', () => { this.isDragging = false; });
        document.addEventListener('mousemove', (e) => { if (!this.isDragging) return; let dx = e.clientX - this.lastX; let dy = e.clientY - this.lastY; this.rotateObject(dx, dy, 0.01); this.lastX = e.clientX; this.lastY = e.clientY; });
        this.el.addEventListener('touchstart', (e) => { this.isDragging = true; this.lastX = e.touches[0].clientX; this.lastY = e.touches[0].clientY; });
        document.addEventListener('touchend', () => { this.isDragging = false; });
        document.addEventListener('touchmove', (e) => { if (!this.isDragging) return; let dx = e.touches[0].clientX - this.lastX; let dy = e.touches[0].clientY - this.lastY; this.rotateObject(dx, dy, 0.01); this.lastX = e.touches[0].clientX; this.lastY = e.touches[0].clientY; });
        this.el.sceneEl.addEventListener('axismove', (e) => {
            let joyX = e.detail.axis[0]; let joyY = e.detail.axis[1];
            if (Math.abs(joyX) > 0.1 || Math.abs(joyY) > 0.1) { this.rotateObject(joyX, joyY, 0.05); }
        });
    },
    rotateObject: function(deltaX, deltaY, multiplier) {
        if (this.data.speed === 0) return; 
        this.el.object3D.rotation.y += deltaX * multiplier * this.data.speed;
        this.el.object3D.rotation.x += deltaY * multiplier * this.data.speed;
    }
});

// ========================================================
// 4. KOMPONEN VISUAL MOTOR (HEATMAP & SPARKS)
// ========================================================
AFRAME.registerComponent('solid-material', {
    schema: { color: {type: 'color', default: '#888888'} },
    init: function () {
        this.materials = [];
        this.el.addEventListener('model-loaded', () => {
            const obj = this.el.getObject3D('mesh');
            if (!obj) return;
            obj.traverse((node) => {
                if (node.isMesh) {
                    let mat = new THREE.MeshStandardMaterial({ color: this.data.color, metalness: 0.6, roughness: 0.4 });
                    node.material = mat; this.materials.push(mat);
                }
            });
        });
    },
    update: function (oldData) {
        if (this.data.color !== oldData.color) {
            this.materials.forEach(mat => {
                mat.color.set(this.data.color);
                if (this.data.color !== '#888888' && this.data.color !== '#cccccc') {
                    mat.emissive.set(this.data.color); mat.emissiveIntensity = 0.5;
                } else {
                    mat.emissive.setHex(0x000000);
                }
            });
        }
    }
});

AFRAME.registerComponent('auto-center-yz', {
    init: function () {
        this.el.addEventListener('model-loaded', () => {
            const model = this.el.getObject3D('mesh');
            if (!model) return;
            
            // Perbarui matrix global model untuk kalkulasi bounding box yang presisi
            model.updateMatrixWorld(true);
            
            const box = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            box.getCenter(center);
            
            // Konversi dari koordinat dunia (world coordinates) ke koordinat lokal entity
            const localCenter = this.el.object3D.worldToLocal(center.clone());
            
            // Geser model secara lokal pada sumbu Y dan Z agar sumbu putarnya 
            // sejajar sempurna dengan sumbu lokal X (Y=0, Z=0) tanpa mempengaruhi pergeseran longitudinal X
            model.position.y -= localCenter.y;
            model.position.z -= localCenter.z;
            
            console.log(`[AutoCenterYZ] Meluruskan model ${this.el.id}: pergeseran Y sebesar ${-localCenter.y}, Z sebesar ${-localCenter.z}`);
        });
    }
});

AFRAME.registerComponent('spark-system', {
    schema: { active: {default: false} },
    init: function() {
        this.sparks = [];
        for(let i=0; i<15; i++) {
            let s = document.createElement('a-box');
            s.setAttribute('width', '0.02'); s.setAttribute('height', '0.02'); s.setAttribute('depth', '0.1');
            s.setAttribute('material', 'color: #ffea00; emissive: #ff003c; emissiveIntensity: 2');
            s.setAttribute('visible', 'false'); this.el.appendChild(s);
            this.sparks.push({el: s, life: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3()});
        }
    },
    tick: function(time, delta) {
        if(!this.data.active) { this.sparks.forEach(s => { if(s.life > 0) { s.el.setAttribute('visible', 'false'); s.life = 0; } }); return; }
        let dt = delta / 1000;
        this.sparks.forEach(s => {
            if(s.life <= 0 && Math.random() < 0.1) {
                s.life = 0.3 + Math.random() * 0.5; s.pos.set(0, 0, 0); 
                s.vel.set((Math.random()-0.5)*4, Math.random()*4 + 1, (Math.random()-0.5)*4); 
                s.el.setAttribute('visible', 'true');
            }
            if(s.life > 0) {
                s.life -= dt; s.vel.y -= 6 * dt; s.pos.addScaledVector(s.vel, dt);
                s.el.object3D.position.copy(s.pos); s.el.object3D.lookAt(s.pos.clone().add(s.vel));
                if(s.life <= 0) s.el.setAttribute('visible', 'false');
            }
        });
    }
});

// ========================================================
// EXTRA SHADERS & SPATIAL INTERACTION (IMMERSION SUITE)
// ========================================================
AFRAME.registerComponent('field-flux', {
    init: function() {
        this.particles = [];
        this.count = 25;
        for (let i = 0; i < this.count; i++) {
            let p = document.createElement('a-sphere');
            p.setAttribute('radius', '0.016');
            p.setAttribute('material', 'color: #00e5ff; emissive: #00e5ff; emissiveIntensity: 2.0; opacity: 0.8; transparent: true');
            this.el.appendChild(p);
            this.particles.push({
                el: p,
                angle: (i / this.count) * Math.PI * 2,
                phase: Math.random(),
                speed: 0.4 + Math.random() * 0.6
            });
        }
    },
    tick: function(time, delta) {
        let speed = window.lastReceivedSpeed || 0;

        let dt = delta / 1000;
        let flowRate = Math.min(speed / 90, 4.5); 
        
        let statorEl = document.getElementById('motor-stator');
        let rotorEl = document.getElementById('holo-rotor');
        if (!statorEl || !rotorEl) return;

        let statorPos = statorEl.object3D.position;
        let rotorPos = rotorEl.object3D.position;

        this.particles.forEach((p) => {
            p.phase += p.speed * flowRate * dt;
            if (p.phase > 1) {
                p.phase = 0;
                p.angle = Math.random() * Math.PI * 2;
            }

            let posX = statorPos.x + (rotorPos.x - statorPos.x) * p.phase;
            let radius = 0.35 + Math.sin(p.phase * Math.PI) * 0.25; 
            let rotAngle = p.angle + (speed * 0.015 * p.phase); 
            let posY = Math.sin(rotAngle) * radius;
            let posZ = Math.cos(rotAngle) * radius;

            p.el.object3D.position.set(posX, posY, posZ);

            if (speed < 4) {
                p.el.setAttribute('visible', 'false');
            } else {
                p.el.setAttribute('visible', 'true');
                let err = Math.abs(window.lastReceivedError || 0);
                if (err > 40) {
                    p.el.setAttribute('material', 'color: #ff003c; emissive: #ff003c; emissiveIntensity: 2');
                } else if (err > 15) {
                    p.el.setAttribute('material', 'color: #ffea00; emissive: #ffea00; emissiveIntensity: 1.5');
                } else {
                    p.el.setAttribute('material', 'color: #00e5ff; emissive: #00e5ff; emissiveIntensity: 1.5');
                }
            }
        });
    }
});

// ========================================================
// 2.3 SPATIAL LIGHT & HOLOGRAPHIC PROJECTION SYSTEM
// ========================================================
AFRAME.registerComponent('spatial-projection', {
    init: function() {
        this.currentAngle1 = 0;
        this.currentAngle2 = 0;

        // Container offset to place elements flat on top of the tabletop mesh
        this.container = document.createElement('a-entity');
        this.container.setAttribute('position', '0 1.15 1.034'); // Aligns exactly below the motor group
        this.container.setAttribute('rotation', '-90 0 0'); // Lying flat horizontally on tabletop
        this.el.appendChild(this.container);

        // 1. Dynamic Point Light (casts immersive state glow onto the table surface)
        this.light = document.createElement('a-light');
        this.light.setAttribute('type', 'point');
        this.light.setAttribute('distance', '3.5');
        this.light.setAttribute('decay', '1.8');
        this.light.setAttribute('intensity', '1.5');
        this.light.setAttribute('color', '#00e5ff');
        this.light.setAttribute('position', '0 0 0.1'); // Slightly suspended above projection plane
        this.container.appendChild(this.light);

        // 2. Outer Concentric Holographic Ring
        this.outerRing = document.createElement('a-ring');
        this.outerRing.setAttribute('radius-inner', '1.4');
        this.outerRing.setAttribute('radius-outer', '1.43');
        this.outerRing.setAttribute('color', '#00e5ff');
        this.outerRing.setAttribute('opacity', '0.4');
        this.outerRing.setAttribute('transparent', 'true');
        this.outerRing.setAttribute('material', 'emissive: #00e5ff; emissiveIntensity: 1.0; side: double');
        this.container.appendChild(this.outerRing);

        // 3. Middle Segmented Vector/Flux Ring
        this.midRing = document.createElement('a-ring');
        this.midRing.setAttribute('radius-inner', '1.0');
        this.midRing.setAttribute('radius-outer', '1.25');
        this.midRing.setAttribute('color', '#00e5ff');
        this.midRing.setAttribute('opacity', '0.18');
        this.midRing.setAttribute('transparent', 'true');
        this.midRing.setAttribute('theta-length', '240'); // partial segment for scifi dials
        this.midRing.setAttribute('material', 'side: double');
        this.container.appendChild(this.midRing);

        // 4. Inner Complementary Polar Ring
        this.innerRing = document.createElement('a-ring');
        this.innerRing.setAttribute('radius-inner', '0.55');
        this.innerRing.setAttribute('radius-outer', '0.6');
        this.innerRing.setAttribute('color', '#ff2a6d');
        this.innerRing.setAttribute('opacity', '0.45');
        this.innerRing.setAttribute('transparent', 'true');
        this.innerRing.setAttribute('theta-length', '120'); 
        this.innerRing.setAttribute('material', 'emissive: #ff2a6d; emissiveIntensity: 1.2; side: double');
        this.container.appendChild(this.innerRing);

        // 5. Holographic Decal / Status Text projected on the surface
        this.projectionText = document.createElement('a-text');
        this.projectionText.setAttribute('value', 'FLUX LOOP - NOMINAL');
        this.projectionText.setAttribute('font', 'monoid');
        this.projectionText.setAttribute('color', '#00e5ff');
        this.projectionText.setAttribute('width', '2.8');
        this.projectionText.setAttribute('align', 'center');
        this.projectionText.setAttribute('anchor', 'center');
        this.projectionText.setAttribute('position', '0 -1.25 0.01'); // centered at lower edge
        this.container.appendChild(this.projectionText);
    },
    tick: function(time, delta) {
        let speed = window.lastReceivedSpeed || 0;
        let err = Math.abs(window.lastReceivedError || 0);
        let dt = delta / 1000;

        // Drive rotation speed of holographic projection segments using actual RPM
        let speedMultiplier = Math.min(Math.abs(speed) / 100, 3.5); 
        let dir = window.currentDirectionMultiplier || 1;

        this.currentAngle1 += 0.8 * speedMultiplier * dir * dt;
        this.currentAngle2 -= 1.6 * speedMultiplier * dir * dt;

        if (this.midRing && this.midRing.object3D) {
            this.midRing.object3D.rotation.z = this.currentAngle1;
        }
        if (this.innerRing && this.innerRing.object3D) {
            this.innerRing.object3D.rotation.z = this.currentAngle2;
        }

        // Establish dynamic color envelope matching warning levels
        let activeColor = '#00e5ff';
        let subColor = '#ff2a6d';
        let pulseRate = 0.003; 

        if (err > 40) {
            activeColor = '#ff003c';
            subColor = '#ffea00';
            pulseRate = 0.025; // rapid alarm flashing
        } else if (err > 15) {
            activeColor = '#ffea00';
            subColor = '#ff2a6d';
            pulseRate = 0.008; // warning pulse rate
        }

        // Periodic micro-pulsing wave
        let pulseIntensity = 1.0 + 0.6 * Math.sin(time * pulseRate);
        
        // Critical alert flickers
        if (err > 40 && Math.random() < 0.12) {
            pulseIntensity *= 0.35;
        }

        // Project updates to nodes
        if (this.light) {
            this.light.setAttribute('color', activeColor);
            this.light.setAttribute('intensity', (pulseIntensity * (1.2 + speedMultiplier * 0.4)).toFixed(2));
        }

        if (this.outerRing) {
            this.outerRing.setAttribute('color', activeColor);
            this.outerRing.setAttribute('opacity', (0.3 + 0.2 * Math.sin(time * pulseRate)).toFixed(2));
        }

        if (this.midRing) {
            this.midRing.setAttribute('color', activeColor);
            this.midRing.setAttribute('opacity', (0.15 + 0.15 * Math.sin(time * pulseRate * 0.8)).toFixed(2));
        }

        if (this.innerRing) {
            this.innerRing.setAttribute('color', subColor);
            this.innerRing.setAttribute('opacity', (0.35 + 0.25 * Math.sin(time * pulseRate * 1.2)).toFixed(2));
        }

        if (this.projectionText) {
            this.projectionText.setAttribute('color', activeColor);
            let stateStr = "TELEMETRY : NOMINAL";
            if (err > 40) stateStr = "ALERT : SYSTEM CRITICAL";
            else if (err > 15) stateStr = "WARNING : ENVELOPE BREACH";
            else if (Math.abs(speed) < 1) stateStr = "TELEMETRY : STANDBY";

            this.projectionText.setAttribute('value', `FLUX LOOP - ${stateStr}`);
        }
    }
});

window.playHapticSound = function(type) {
    try {
        let ctx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!window.audioCtx) window.audioCtx = ctx;
        if (ctx.state === 'suspended') ctx.resume();

        let osc = ctx.createOscillator();
        let gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'click') {
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } else if (type === 'success') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08);
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.16);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.24);
            gain.gain.setValueAtTime(0.07, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
        } else if (type === 'scan') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch(e) {}
};

window.updateHolographicHUD = function(speed, error, modeName) {
    if (window.UI.hudRpmLabel) {
        window.UI.hudRpmLabel.setAttribute('value', `SPEED: ${speed.toFixed(1)} RPM`);
    }
    if (window.UI.hudModeLabel) {
        let isOnline = (client && client.isConnected() ? "ONLINE" : "OFFLINE");
        let statusColor = isOnline === "OFFLINE" ? "#ff2a6d" : "#00e5ff";
        
        if (Math.abs(error) > 40 && speed > 5) {
            window.UI.hudModeLabel.setAttribute('value', "WARN: OVERLOAD WARN");
            window.UI.hudModeLabel.setAttribute('color', "#ff003c");
        } else {
            window.UI.hudModeLabel.setAttribute('value', `STATUS: ${isOnline} [${modeName || "DIRECT"}]`);
            window.UI.hudModeLabel.setAttribute('color', statusColor);
        }
    }
    if (window.UI.hudBarFill) {
        let pct = Math.min(Math.abs(speed) / 200, 1.0);
        let fillWidth = 2.0 * pct;
        let posX = -1.0 + (fillWidth / 2);
        window.UI.hudBarFill.setAttribute('width', Math.max(0.01, fillWidth));
        window.UI.hudBarFill.setAttribute('position', `${posX} 0 0.005`);
        let energyColor = pct > 0.8 ? '#ff003c' : (pct > 0.5 ? '#ffea00' : '#00e5ff');
        window.UI.hudBarFill.setAttribute('color', energyColor);
    }
};

window.updateMotorSound = function(speed) {
    let absSpeed = Math.abs(speed);
    let speedRatio = absSpeed / 200;
    if (speedRatio > 1) speedRatio = 1;

    // 1. Web Audio API Synth Engine (immensely robust, pitch-bent, sounds futuristic)
    try {
        let ctx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!window.audioCtx) window.audioCtx = ctx;

        if (speedRatio > 0.01) {
            if (ctx.state === 'suspended') ctx.resume().catch(e => {});
            if (!window.motorSynthActive) {
                // Initialize nodes
                window.motorGain = ctx.createGain();
                window.motorGain.gain.setValueAtTime(0, ctx.currentTime);
                window.motorGain.connect(ctx.destination);

                window.motorOsc1 = ctx.createOscillator();
                window.motorOsc1.type = 'sawtooth';
                window.motorOsc1.frequency.setValueAtTime(40, ctx.currentTime);

                window.motorOsc2 = ctx.createOscillator();
                window.motorOsc2.type = 'triangle';
                window.motorOsc2.frequency.setValueAtTime(20, ctx.currentTime);

                window.motorFilter = ctx.createBiquadFilter();
                window.motorFilter.type = 'lowpass';
                window.motorFilter.frequency.setValueAtTime(120, ctx.currentTime);

                window.motorOsc1.connect(window.motorFilter);
                window.motorOsc2.connect(window.motorFilter);
                window.motorFilter.connect(window.motorGain);

                window.motorOsc1.start(0);
                window.motorOsc2.start(0);
                window.motorSynthActive = true;
            }

            // Adjust frequency pitch based on RPM
            let pitchSaw = 35 + (speedRatio * 185); // 35Hz to 220Hz
            let pitchTri = 17.5 + (speedRatio * 92.5); // 17.5Hz to 110Hz
            let filterFreq = 110 + (speedRatio * 550); // Cutoff frequency increases with speed

            window.motorOsc1.frequency.setTargetAtTime(pitchSaw, ctx.currentTime, 0.08);
            window.motorOsc2.frequency.setTargetAtTime(pitchTri, ctx.currentTime, 0.08);
            window.motorFilter.frequency.setTargetAtTime(filterFreq, ctx.currentTime, 0.08);

            // Volume curves up
            let targetVol = speedRatio * 0.22;
            window.motorGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.12);
        } else {
            // Fade out smoothly
            if (window.motorSynthActive && window.motorGain) {
                window.motorGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
            }
        }
    } catch(e) {
        console.warn("Synth sound generation error:", e);
    }

    // 2. Playback of the spatial audio using A-Frame sound component on #motor-group
    try {
        if (window.UI.motorGroup && window.UI.motorGroup.components.sound) {
            let soundComp = window.UI.motorGroup.components.sound;
            if (speedRatio > 0.01) {
                if (!window.isSoundPlaying) {
                    soundComp.playSound();
                    window.isSoundPlaying = true;
                }
                // Set the volume dynamically based on speedRatio
                window.UI.motorGroup.setAttribute('sound', 'volume', speedRatio * 2.5);
            } else {
                window.UI.motorGroup.setAttribute('sound', 'volume', 0);
                window.isSoundPlaying = false;
            }
        }
    } catch(e) {
        console.warn("A-Frame spatial audio adjustment error:", e);
    }
};

// ========================================================
// 5. GLOBAL FUNCTIONS (UI Toggles & CSV Export)
// ========================================================
window.toggleCommandPanels = function() {
    let isVisible = window.UI.motorGroup.parentElement.querySelector('#panel-group').getAttribute('visible');
    window.UI.motorGroup.parentElement.querySelector('#panel-group').setAttribute('visible', !isVisible);
    
    if (window.playHapticSound) window.playHapticSound('scan');
    
    let btnText = document.getElementById('btn-text');
    if (!isVisible) {
        btnText.setAttribute('value', 'CLOSE PANEL'); btnText.setAttribute('color', '#ff2a6d');
        window.UI.motorGroup.setAttribute('universal-rotate', 'speed', 0);
    } else {
        btnText.setAttribute('value', 'OPEN COMMAND'); btnText.setAttribute('color', '#00e5ff');
        window.UI.motorGroup.setAttribute('universal-rotate', 'speed', 1);
    }
};

window.isExploded = false;
window.toggleExplodeView = function() {
    window.isExploded = !window.isExploded;
    
    if (window.playHapticSound) window.playHapticSound('scan');
    
    let bt = document.getElementById('explode-text');
    
    if (window.isExploded) {
        bt.setAttribute('value', 'ASSEMBLE'); bt.setAttribute('color', '#ffea00');
    } else {
        bt.setAttribute('value', 'EXPLODED VIEW'); bt.setAttribute('color', '#00e5ff');
    }

    let targetStator = window.isExploded ? "-2.2 0 0" : "0 0 0";
    let targetRotor = window.isExploded ? "2.36 0 0" : "-0.24 0 0";
    
    window.UI.motorStator.setAttribute('animation', `property: position; to: ${targetStator}; dur: 800; easing: easeInOutQuad`);
    window.UI.holoRotor.setAttribute('animation', `property: position; to: ${targetRotor}; dur: 800; easing: easeInOutQuad`);
};

window.exportCSV = function() {
    const chartEl = window.UI.liveChart;
    if(!chartEl || !chartEl.components['xr-chart']) return;
    const dataPoints = chartEl.components['xr-chart'].dataPoints;
    const targetPoints = chartEl.components['xr-chart'].targetPoints;

    if (dataPoints.length === 0) { alert("Belum ada data untuk di-download."); return; }

    let csvContent = "data:text/csv;charset=utf-8,Waktu_Relative,Target_RPM,Actual_RPM,Error\n";
    for(let i=0; i<dataPoints.length; i++) {
        let errorVal = Math.abs(targetPoints[i] - dataPoints[i]).toFixed(2);
        csvContent += `${i},${targetPoints[i]},${dataPoints[i]},${errorVal}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "TEOXR_StepTest_Data.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);

    let btnCSV = document.querySelector('#btn-csv a-text');
    if(btnCSV) {
        let oldVal = btnCSV.getAttribute('value'); let oldColor = btnCSV.getAttribute('color');
        btnCSV.setAttribute('value', 'FILE SAVED!'); btnCSV.setAttribute('color', '#ffea00');
        setTimeout(() => { btnCSV.setAttribute('value', oldVal); btnCSV.setAttribute('color', oldColor); }, 3000);
    }
};

// ========================================================
// 6. MQTT & SISTEM STATE LOGIC
// ========================================================
const mqttServer = "3ed3ff9607bb421593226daf3b27b6f4.s1.eu.hivemq.cloud";
const mqttPort = 8884; 
const mqttUser = "teoxr";
const mqttPass = "TEOxr073";
const clientId = "WebXR-Cockpit-" + Math.random().toString(16).substr(2, 8);

const client = new Paho.MQTT.Client(mqttServer, mqttPort, clientId);
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

// Default Parameters
window.currentKp = 1.5; window.currentKi = 0.05; window.currentKd = 0.1;
window.currentSetpoint = 120; window.currentPwm = 0;
window.currentDirectionMultiplier = 1; // 1 = Forward, -1 = Backward

window.isStepActive = false; window.stepStartTime = 0; window.maxRpm = 0;
window.riseTimeFound = false; window.settleTimeFound = false; window.settleStartTime = null;
window.isRedAlert = false; window.isSoundPlaying = false;

window.sendMqttCommand = function(topic, payload) {
    if (topic === "robot1/config") {
        sendSingle("robot1/pid/kp", window.currentKp); sendSingle("robot1/pid/ki", window.currentKi); sendSingle("robot1/pid/kd", window.currentKd);
        sendSingle("robot1/setpoint", window.currentSetpoint); sendSingle("robot1/manual_pwm", window.currentPwm);
    } else {
        if (topic === "robot1/direction") { window.currentDirectionMultiplier = (payload === "FORWARD") ? 1 : -1; }
        if (topic === "robot1/mode") { window.currentModeName = payload; }
        sendSingle(topic, payload);
    }
};

function sendSingle(t, p) {
    if (client.isConnected()) {
        const message = new Paho.MQTT.Message(p.toString()); message.destinationName = t; client.send(message);
    }
}

window.startStepTest = function() {
    window.isStepActive = true; window.stepStartTime = Date.now(); window.maxRpm = 0; window.riseTimeFound = false; window.settleTimeFound = false; window.settleStartTime = null;
    if(window.UI.xrRise) window.UI.xrRise.setAttribute('value', '...');
    if(window.UI.xrOver) window.UI.xrOver.setAttribute('value', '0.0%');
    if(window.UI.xrSettle) window.UI.xrSettle.setAttribute('value', '...');
    sendSingle("robot1/mode", "PID"); sendSingle("robot1/config", "TRIGGER"); 
};

function connectMQTT() {
    client.connect({ userName: mqttUser, password: mqttPass, useSSL: true, onSuccess: onConnect, onFailure: (err) => { setTimeout(connectMQTT, 5000); } });
}

function onConnect() {
    const statusEl = document.getElementById('xr-status');
    if(statusEl) { statusEl.setAttribute('value', 'ONLINE'); statusEl.setAttribute('color', '#00e5ff'); }
    client.subscribe("robot1/response");
    client.subscribe("robot1/ping"); // Subscribe loopback ping
}

function onConnectionLost() {
    const statusEl = document.getElementById('xr-status');
    if(statusEl) { statusEl.setAttribute('value', 'OFFLINE'); statusEl.setAttribute('color', '#ff2a6d'); }
    setTimeout(connectMQTT, 3000);
}

function onMessageArrived(message) {
    if (window.isSimulatorActive) return;
    // 1. PING RESPONSE CATCHER
    if (message.destinationName === "robot1/ping") {
        let latency = Date.now() - parseInt(message.payloadString);
        if(window.UI.xrPing) {
            window.UI.xrPing.setAttribute('value', latency + ' ms');
            window.UI.xrPing.setAttribute('color', latency > 300 ? '#ff2a6d' : (latency > 150 ? '#ffb700' : '#00e5ff'));
        }
        return; 
    }

    // 2. MAIN TELEMETRY DATA CATCHER
    if (message.destinationName === "robot1/response") {
        const data = JSON.parse(message.payloadString);
        
        if(window.UI.xrRpm) window.UI.xrRpm.setAttribute('value', data.speed.toFixed(1));
        if(window.UI.xrError) window.UI.xrError.setAttribute('value', data.error.toFixed(1));

        window.lastReceivedSpeed = data.speed;
        window.lastReceivedError = data.error;

        if (window.updateHolographicHUD) {
            window.updateHolographicHUD(data.speed, data.error, window.currentModeName || "LIVE");
        }
        
        // Kinematika Rotasi Rotor (Direct Local Object3D Rotation)
        if (window.UI.holoRotor && window.UI.holoRotor.object3D) {
            if (window.holoRotorAngle === undefined) {
                window.holoRotorAngle = 0;
            }
            window.holoRotorAngle -= (data.speed * 0.005 * (window.currentDirectionMultiplier || 1));
            // Rotasi murni pada sumbu lokal X
            window.UI.holoRotor.object3D.rotation.x = window.holoRotorAngle;
            window.UI.holoRotor.object3D.rotation.y = 0;
            window.UI.holoRotor.object3D.rotation.z = 0;
        }

        // Dinamika Audio Spasial & Sintetis
        if (window.updateMotorSound) {
            window.updateMotorSound(data.speed);
        }

        // Evaluasi Heatmap & Red Alert
        if (window.UI.motorStator) {
            let err = Math.abs(data.error);
            let heatColor = err > 40 ? '#ff003c' : (err > 15 ? '#ffb700' : '#888888');
            window.UI.motorStator.setAttribute('solid-material', 'color', heatColor);

            if (err > 40) {
                window.UI.motorGroup.setAttribute('spark-system', 'active', true);
                if (!window.isRedAlert && window.UI.ambientLight) {
                    window.isRedAlert = true;
                    window.UI.ambientLight.setAttribute('color', '#550000');
                    window.UI.ambientLight.setAttribute('animation', 'property: intensity; to: 2.0; dir: alternate; loop: true; dur: 400; easing: easeInOutSine');
                    window.UI.point1.setAttribute('color', '#ff003c'); window.UI.point2.setAttribute('color', '#ff0000');
                }
            } else {
                window.UI.motorGroup.setAttribute('spark-system', 'active', false);
                if (window.isRedAlert && window.UI.ambientLight) {
                    window.isRedAlert = false;
                    window.UI.ambientLight.setAttribute('color', '#333');
                    window.UI.ambientLight.removeAttribute('animation'); window.UI.ambientLight.setAttribute('intensity', '1'); 
                    window.UI.point1.setAttribute('color', '#00e5ff'); window.UI.point2.setAttribute('color', '#ff2a6d');
                }
            }
        }

        // Live Chart Update
        if(window.UI.liveChart && window.UI.liveChart.components['xr-chart']) {
            let target = (document.getElementById('xr-status').getAttribute('value') === 'ONLINE' && window.currentSetpoint > 0) ? window.currentSetpoint : 0;
            window.UI.liveChart.components['xr-chart'].updateData(data.speed, target); 
        }

        // Logika Pengujian Step Test (Mencari Rise, Overshoot, Settling)
        if (window.isStepActive) {
            let timeElapsed = (Date.now() - window.stepStartTime) / 1000;
            let target = window.currentSetpoint;

            if (data.speed > window.maxRpm) {
                window.maxRpm = data.speed;
                if (window.maxRpm > target && target > 0) {
                    let os = ((window.maxRpm - target) / target) * 100;
                    if(window.UI.xrOver) window.UI.xrOver.setAttribute('value', os.toFixed(1) + '%');
                }
            }

            if (!window.riseTimeFound && data.speed >= target * 0.95 && target > 0) {
                if(window.UI.xrRise) window.UI.xrRise.setAttribute('value', timeElapsed.toFixed(2) + 's');
                window.riseTimeFound = true;
            }

            if (window.riseTimeFound && !window.settleTimeFound) {
                let errLog = Math.abs(target - data.speed);
                if (errLog <= (target * 0.05)) { 
                    if (window.settleStartTime === null) { window.settleStartTime = timeElapsed; } 
                    else if ((timeElapsed - window.settleStartTime) >= 1.0) { 
                        if(window.UI.xrSettle) window.UI.xrSettle.setAttribute('value', window.settleStartTime.toFixed(2) + 's');
                        window.settleTimeFound = true;
                    }
                } else { window.settleStartTime = null; }
            }
        }
    }
}

// Inisialisasi Otomatis saat Web Siap
document.addEventListener("DOMContentLoaded", function() {
    connectMQTT();
    
    // Interval Ping Network (Dikirim setiap 2 detik)
    setInterval(() => {
        if (client.isConnected()) {
            sendSingle("robot1/ping", Date.now().toString());
        }
    }, 2000);

    // Gestur untuk mengaktifkan & meng-unblock audio browser (multi-gesture, non-exclusive)
    function resumeAllAudio() {
        let ctx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!window.audioCtx) window.audioCtx = ctx;
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(err => {});
        }

        const sceneEl = document.querySelector('a-scene');
        if (sceneEl && sceneEl.audioListener && sceneEl.audioListener.context) {
            const contextAFrame = sceneEl.audioListener.context;
            if (contextAFrame && contextAFrame.state === 'suspended') {
                contextAFrame.resume().catch(err => {});
            }
        }
    }
    
    document.addEventListener("click", resumeAllAudio);
    document.addEventListener("touchstart", resumeAllAudio);
    document.addEventListener("pointerdown", resumeAllAudio);
});


