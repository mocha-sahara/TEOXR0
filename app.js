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
            self.setValue(val); if (window.sendMqttCommand) window.sendMqttCommand(self.data.topic, self.data.isFloat ? val.toFixed(2) : val);
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
        btnMinus.addEventListener('click', () => { btnMinus.setAttribute('scale', '0.8 0.8 0.8'); setTimeout(() => btnMinus.setAttribute('scale', '1.1 1.1 1.1'), 100); let newVal = self.currentVal - self.data.step; self.setValue(newVal); if (window.sendMqttCommand) window.sendMqttCommand(self.data.topic, self.data.isFloat ? newVal.toFixed(2) : newVal); });
        btnPlus.addEventListener('click', () => { btnPlus.setAttribute('scale', '0.8 0.8 0.8'); setTimeout(() => btnPlus.setAttribute('scale', '1.1 1.1 1.1'), 100); let newVal = self.currentVal + self.data.step; self.setValue(newVal); if (window.sendMqttCommand) window.sendMqttCommand(self.data.topic, self.data.isFloat ? newVal.toFixed(2) : newVal); });
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
                    node.geometry.computeBoundingBox(); node.geometry.center();
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
// 5. GLOBAL FUNCTIONS (UI Toggles & CSV Export)
// ========================================================
window.toggleCommandPanels = function() {
    let isVisible = window.UI.motorGroup.parentElement.querySelector('#panel-group').getAttribute('visible');
    window.UI.motorGroup.parentElement.querySelector('#panel-group').setAttribute('visible', !isVisible);
    
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
    let bt = document.getElementById('explode-text');
    
    if (window.isExploded) {
        bt.setAttribute('value', 'ASSEMBLE'); bt.setAttribute('color', '#ffea00');
    } else {
        bt.setAttribute('value', 'EXPLODED VIEW'); bt.setAttribute('color', '#00e5ff');
    }

    let targetStator = window.isExploded ? "-2.2 0 0" : "0 0 0";
    let targetRotor = window.isExploded ? "2.2 0 0" : "0.7 0 0";
    
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
        
        // Kinematika Rotasi Rotor
        if (window.UI.holoRotor && window.UI.holoRotor.object3D) {
            window.UI.holoRotor.object3D.rotateX(-data.speed * 0.005 * window.currentDirectionMultiplier); 
        }

        // Dinamika Audio Spasial
        if (window.UI.motorGroup && window.UI.motorGroup.components.sound) {
            let speedRatio = Math.abs(data.speed) / 200; if (speedRatio > 1) speedRatio = 1;
            if (speedRatio > 0.02) { 
                if (!window.isSoundPlaying) { window.UI.motorGroup.components.sound.playSound(); window.isSoundPlaying = true; }
                window.UI.motorGroup.setAttribute('sound', 'volume', speedRatio * 2); 
            } else {
                window.UI.motorGroup.setAttribute('sound', 'volume', 0); window.isSoundPlaying = false;
            }
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
});
