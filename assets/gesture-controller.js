/**
 * 🖐️🖐️ BIMSmarter Gesture Controller v7
 * AUTO-INIT VERSION - Détecte automatiquement Three.js
 */

(function() {
  'use strict';

  // ============================================
  // AUTO-DETECTION DE THREE.JS
  // ============================================
  
  function findThreeJS() {
    // Cherche dans window
    if (window.THREE) return window.THREE;
    
    // Cherche dans les canvas WebGL
    const canvases = document.querySelectorAll('canvas');
    for (const canvas of canvases) {
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      if (gl && canvas.__three__) {
        return canvas.__three__;
      }
    }
    
    return null;
  }
  
  function findCameraAndControls() {
    // Méthode 1: Cherche dans window.viewer (OpenBIM pattern)
    if (window.viewer) {
      // Pattern @thatopen/components
      if (window.viewer.scene?.three) {
        const scene = window.viewer.scene.three;
        return {
          camera: scene.camera,
          controls: scene.controls,
          source: 'viewer.scene.three'
        };
      }
      // Pattern web-ifc-viewer
      if (window.viewer.context?.ifcCamera) {
        return {
          camera: window.viewer.context.ifcCamera.perspectiveCamera || window.viewer.context.ifcCamera.activeCamera,
          controls: window.viewer.context.ifcCamera.controls,
          source: 'viewer.context.ifcCamera'
        };
      }
      // Pattern IFC.js
      if (window.viewer.IFC?.context) {
        return {
          camera: window.viewer.IFC.context.ifcCamera?.perspectiveCamera,
          controls: window.viewer.IFC.context.ifcCamera?.controls,
          source: 'viewer.IFC.context'
        };
      }
    }
    
    // Méthode 2: Cherche les objets Three.js globaux
    if (window.camera && window.controls) {
      return { camera: window.camera, controls: window.controls, source: 'window globals' };
    }
    
    // Méthode 3: Cherche dans window.scene
    if (window.scene) {
      const camera = window.scene.camera || window.scene.children?.find(c => c.isCamera);
      if (camera && window.controls) {
        return { camera, controls: window.controls, source: 'window.scene' };
      }
    }
    
    // Méthode 4: Scan du DOM pour trouver le renderer Three.js
    const canvases = document.querySelectorAll('canvas');
    for (const canvas of canvases) {
      // Cherche le renderer attaché au canvas
      if (canvas._renderer || canvas.__renderer) {
        const renderer = canvas._renderer || canvas.__renderer;
        // Le renderer peut avoir une référence à la scène/caméra
        console.log('Found renderer on canvas');
      }
    }
    
    return null;
  }

  // ============================================
  // GESTURE CONTROLLER CLASS
  // ============================================
  
  class GestureController {
    constructor() {
      this.controls = null;
      this.camera = null;
      this.THREE = null;
      
      this.active = false;
      this.initialized = false;
      this.hands = null;
      this.mpCamera = null;
      
      this.videoWidth = 640;
      this.videoHeight = 480;
      
      // Tracking
      this.lastHandsDistance = null;
      this.lastHandsAngle = null;
      this.lastSingleHandPos = null;
      this.smoothSingleHand = null;
      
      // Settings
      this.settings = {
        zoomSensitivity: 0.008,
        zoomThreshold: 2,
        rotateSensitivity: 1.5,
        rotateThreshold: 0.5,
        panSensitivity: 0.012,
        panThreshold: 1,
        smoothing: 0.5
      };
      
      this.onResults = this.onResults.bind(this);
    }
    
    async init() {
      if (this.initialized) return true;
      
      // Cherche Three.js
      this.THREE = findThreeJS() || window.THREE;
      
      // Cherche camera et controls
      const found = findCameraAndControls();
      if (found) {
        this.camera = found.camera;
        this.controls = found.controls;
        console.log('🖐️ Found camera/controls via:', found.source);
      }
      
      this.injectStyles();
      this.createUI();
      this.initialized = true;
      
      console.log('🖐️🖐️ GestureController initialized');
      console.log('   Camera:', this.camera ? '✅' : '❌ (will retry on start)');
      console.log('   Controls:', this.controls ? '✅' : '❌ (will retry on start)');
      
      return true;
    }
    
    injectStyles() {
      if (document.getElementById('gesture-styles')) return;
      
      const styles = document.createElement('style');
      styles.id = 'gesture-styles';
      styles.textContent = `
        /* Header Button */
        #gesture-header-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border: 1px solid #475569;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', -apple-system, sans-serif;
          margin-left: 12px;
        }
        
        #gesture-header-btn:hover {
          background: linear-gradient(135deg, #334155 0%, #475569 100%);
          border-color: #06b6d4;
          transform: translateY(-1px);
        }
        
        #gesture-header-btn.active {
          background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
          border-color: #22d3ee;
          color: white;
        }
        
        #gesture-header-btn .icon {
          font-size: 16px;
        }
        
        /* Panel */
        #gesture-panel {
          display: none;
          position: fixed;
          top: 70px;
          right: 20px;
          width: 380px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border: 2px solid #334155;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          z-index: 10000;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        
        #gesture-panel.visible {
          display: block;
          animation: gestureSlideDown 0.3s ease;
        }
        
        @keyframes gestureSlideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        #gesture-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(0,0,0,0.3);
          border-bottom: 1px solid #334155;
        }
        
        #gesture-panel-header h4 {
          margin: 0;
          color: #22d3ee;
          font-size: 14px;
          font-weight: 600;
        }
        
        #gesture-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #94a3b8;
        }
        
        #gesture-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ef4444;
          transition: all 0.3s;
        }
        
        #gesture-status-dot.one { background: #f59e0b; }
        #gesture-status-dot.two { 
          background: #22c55e;
          animation: gesturePulse 1s infinite;
        }
        
        @keyframes gesturePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        #gesture-close-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }
        
        #gesture-close-btn:hover { color: #ef4444; }
        
        #gesture-video-container {
          position: relative;
          background: #000;
        }
        
        #gesture-video {
          width: 100%;
          display: block;
          transform: scaleX(-1);
        }
        
        #gesture-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transform: scaleX(-1);
          pointer-events: none;
        }
        
        #gesture-label {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.85);
          color: #22d3ee;
          padding: 10px 24px;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 700;
          white-space: nowrap;
          border: 1px solid rgba(34, 211, 238, 0.3);
        }
        
        #gesture-instructions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(0,0,0,0.2);
        }
        
        .gesture-instr-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 8px;
          text-align: center;
        }
        
        .gesture-instr-item .icons { font-size: 20px; }
        .gesture-instr-item .label { font-size: 11px; font-weight: 600; color: #e2e8f0; }
        .gesture-instr-item .hands { font-size: 9px; color: #94a3b8; }
        
        #gesture-feedback {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(124, 58, 237, 0.3);
          border: 3px solid #a855f7;
          border-radius: 24px;
          padding: 24px 48px;
          color: white;
          font-size: 32px;
          font-weight: 700;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s;
          z-index: 10001;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        
        #gesture-feedback.visible { opacity: 1; }
        
        #gesture-loading {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          z-index: 10002;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          gap: 20px;
        }
        
        #gesture-loading.visible { display: flex; }
        
        #gesture-loading .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #334155;
          border-top-color: #22d3ee;
          border-radius: 50%;
          animation: gestureSpin 0.8s linear infinite;
        }
        
        @keyframes gestureSpin { to { transform: rotate(360deg); } }
        
        #gesture-loading .text {
          color: #e2e8f0;
          font-size: 14px;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        
        #gesture-error {
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.2);
          border-top: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          font-size: 12px;
          display: none;
        }
        
        #gesture-error.visible { display: block; }
      `;
      document.head.appendChild(styles);
    }
    
    createUI() {
      // Crée le bouton dans le header
      this.createHeaderButton();
      
      // Crée le panel
      this.createPanel();
      
      // Crée le feedback et loading
      this.createOverlays();
    }
    
    createHeaderButton() {
      // Cherche le header - plusieurs sélecteurs possibles
      const headerSelectors = [
        'header',
        '[class*="header"]',
        '[class*="Header"]',
        '[class*="navbar"]',
        '[class*="Navbar"]',
        '[class*="topbar"]',
        'nav'
      ];
      
      let header = null;
      for (const selector of headerSelectors) {
        header = document.querySelector(selector);
        if (header) break;
      }
      
      // Si pas de header trouvé, on crée un conteneur fixe
      if (!header) {
        header = document.createElement('div');
        header.style.cssText = 'position:fixed;top:15px;right:250px;z-index:9999;';
        document.body.appendChild(header);
      }
      
      // Crée le bouton
      this.btn = document.createElement('button');
      this.btn.id = 'gesture-header-btn';
      this.btn.innerHTML = '<span class="icon">🖐️</span><span id="gesture-btn-label">Gesture</span>';
      this.btn.onclick = () => this.toggle();
      
      // Ajoute le bouton
      // Cherche un bon endroit dans le header (avant le logo BIMSmarter ou à la fin)
      const bimLogo = header.querySelector('[class*="logo"], [class*="Logo"], [class*="brand"]');
      if (bimLogo && bimLogo.parentElement === header) {
        header.insertBefore(this.btn, bimLogo);
      } else {
        // Ajoute à la fin ou avant le dernier élément
        const children = header.children;
        if (children.length > 0) {
          // Insère avant le dernier groupe (probablement le user menu)
          const lastChild = children[children.length - 1];
          header.insertBefore(this.btn, lastChild);
        } else {
          header.appendChild(this.btn);
        }
      }
      
      this.btnLabel = document.getElementById('gesture-btn-label');
    }
    
    createPanel() {
      this.panel = document.createElement('div');
      this.panel.id = 'gesture-panel';
      this.panel.innerHTML = `
        <div id="gesture-panel-header">
          <h4>🎥 Contrôle gestuel</h4>
          <div id="gesture-status">
            <span id="gesture-status-dot"></span>
            <span id="gesture-status-text">Inactif</span>
          </div>
          <button id="gesture-close-btn">✕</button>
        </div>
        <div id="gesture-video-container">
          <video id="gesture-video" playsinline autoplay muted></video>
          <canvas id="gesture-canvas"></canvas>
          <div id="gesture-label">👋 Montrez vos mains</div>
        </div>
        <div id="gesture-instructions">
          <div class="gesture-instr-item">
            <span class="icons">↔️</span>
            <span class="label">Zoom</span>
            <span class="hands">2 mains</span>
          </div>
          <div class="gesture-instr-item">
            <span class="icons">🔄</span>
            <span class="label">Rotation</span>
            <span class="hands">2 mains</span>
          </div>
          <div class="gesture-instr-item">
            <span class="icons">✋</span>
            <span class="label">Déplacer</span>
            <span class="hands">1 main</span>
          </div>
        </div>
        <div id="gesture-error"></div>
      `;
      document.body.appendChild(this.panel);
      
      // Get refs
      this.video = document.getElementById('gesture-video');
      this.canvas = document.getElementById('gesture-canvas');
      this.statusDot = document.getElementById('gesture-status-dot');
      this.statusText = document.getElementById('gesture-status-text');
      this.gestureLabel = document.getElementById('gesture-label');
      this.errorDiv = document.getElementById('gesture-error');
      
      document.getElementById('gesture-close-btn').onclick = () => this.stop();
    }
    
    createOverlays() {
      // Feedback
      this.feedback = document.createElement('div');
      this.feedback.id = 'gesture-feedback';
      document.body.appendChild(this.feedback);
      
      // Loading
      this.loading = document.createElement('div');
      this.loading.id = 'gesture-loading';
      this.loading.innerHTML = '<div class="spinner"></div><div class="text" id="gesture-loading-text">Chargement...</div>';
      document.body.appendChild(this.loading);
      
      this.loadingText = document.getElementById('gesture-loading-text');
    }
    
    async toggle() {
      if (this.active) {
        this.stop();
      } else {
        await this.start();
      }
    }
    
    async start() {
      try {
        this.loading.classList.add('visible');
        this.loadingText.textContent = 'Recherche du viewer 3D...';
        
        // Re-cherche camera/controls (au cas où le viewer a été chargé après)
        if (!this.camera || !this.controls) {
          const found = findCameraAndControls();
          if (found) {
            this.camera = found.camera;
            this.controls = found.controls;
            console.log('🖐️ Found camera/controls via:', found.source);
          }
        }
        
        // Cherche THREE
        if (!this.THREE) {
          this.THREE = window.THREE;
        }
        
        if (!this.camera || !this.controls || !this.THREE) {
          throw new Error('Viewer 3D non trouvé. Chargez un fichier IFC d\'abord.');
        }
        
        this.loadingText.textContent = 'Chargement MediaPipe...';
        
        if (typeof Hands === 'undefined') {
          await this.loadMediaPipeScripts();
        }
        
        this.loadingText.textContent = 'Initialisation...';
        
        this.hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        this.hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5
        });
        
        this.hands.onResults(this.onResults);
        
        this.loadingText.textContent = 'Accès caméra...';
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        
        this.video.srcObject = stream;
        
        await new Promise((resolve) => {
          this.video.onloadedmetadata = () => {
            this.video.play();
            resolve();
          };
        });
        
        this.videoWidth = this.video.videoWidth;
        this.videoHeight = this.video.videoHeight;
        this.canvas.width = this.videoWidth;
        this.canvas.height = this.videoHeight;
        this.ctx = this.canvas.getContext('2d');
        
        this.loadingText.textContent = 'Démarrage...';
        
        this.mpCamera = new Camera(this.video, {
          onFrame: async () => {
            if (this.hands && this.active) {
              await this.hands.send({ image: this.video });
            }
          },
          width: this.videoWidth,
          height: this.videoHeight
        });
        
        await this.mpCamera.start();
        
        this.active = true;
        this.btn.classList.add('active');
        this.btnLabel.textContent = 'Stop';
        this.panel.classList.add('visible');
        this.loading.classList.remove('visible');
        this.errorDiv.classList.remove('visible');
        
        console.log('🖐️🖐️ Gesture control started');
        
      } catch (error) {
        console.error('Gesture control error:', error);
        this.loading.classList.remove('visible');
        
        let message = error.message;
        if (error.name === 'NotAllowedError') {
          message = 'Accès caméra refusé. Autorisez l\'accès dans les paramètres du navigateur.';
        } else if (error.name === 'NotFoundError') {
          message = 'Aucune caméra détectée.';
        }
        
        this.errorDiv.textContent = '⚠️ ' + message;
        this.errorDiv.classList.add('visible');
        this.panel.classList.add('visible');
      }
    }
    
    async loadMediaPipeScripts() {
      const scripts = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
      ];
      
      for (const src of scripts) {
        if (document.querySelector(`script[src="${src}"]`)) continue;
        
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.crossOrigin = 'anonymous';
          script.onload = resolve;
          script.onerror = () => reject(new Error(`Erreur chargement ${src}`));
          document.head.appendChild(script);
        });
      }
    }
    
    stop() {
      this.active = false;
      
      if (this.mpCamera) {
        this.mpCamera.stop();
        this.mpCamera = null;
      }
      
      if (this.video && this.video.srcObject) {
        this.video.srcObject.getTracks().forEach(track => track.stop());
        this.video.srcObject = null;
      }
      
      this.hands = null;
      this.btn.classList.remove('active');
      this.btnLabel.textContent = 'Gesture';
      this.panel.classList.remove('visible');
      this.statusDot.className = '';
      this.statusText.textContent = 'Inactif';
      this.reset();
      
      console.log('🖐️🖐️ Gesture control stopped');
    }
    
    reset() {
      this.lastHandsDistance = null;
      this.lastHandsAngle = null;
      this.lastSingleHandPos = null;
      this.smoothSingleHand = null;
      this.feedback.classList.remove('visible');
    }
    
    onResults(results) {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.videoWidth, this.videoHeight);
      
      const numHands = results.multiHandLandmarks?.length || 0;
      
      this.statusDot.className = numHands === 0 ? '' : (numHands === 1 ? 'one' : 'two');
      this.statusText.textContent = numHands === 0 ? 'Aucune main' : 
                                    numHands === 1 ? '1 main' : '2 mains';
      
      if (numHands === 0) {
        this.gestureLabel.textContent = '👋 Montrez vos mains';
        this.reset();
        return;
      }
      
      results.multiHandLandmarks.forEach((lm, idx) => this.drawHand(lm, idx));
      
      if (numHands === 2) {
        this.processTwoHands(results.multiHandLandmarks[0], results.multiHandLandmarks[1]);
      } else {
        this.processOneHand(results.multiHandLandmarks[0]);
        this.lastHandsDistance = null;
        this.lastHandsAngle = null;
      }
    }
    
    drawHand(lm, idx) {
      const ctx = this.ctx;
      const w = this.videoWidth;
      const h = this.videoHeight;
      const color = idx === 0 ? '#22d3ee' : '#a855f7';
      
      const connections = [
        [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]
      ];
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      connections.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(lm[a].x * w, lm[a].y * h);
        ctx.lineTo(lm[b].x * w, lm[b].y * h);
        ctx.stroke();
      });
      
      lm.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, [4,8,12,16,20].includes(i) ? 8 : 4, 0, Math.PI * 2);
        ctx.fillStyle = [4,8,12,16,20].includes(i) ? '#fff' : color;
        ctx.fill();
      });
    }
    
    processTwoHands(hand1, hand2) {
      if (!this.controls || !this.camera || !this.THREE) return;
      
      const palm1 = this.getPalmCenter(hand1);
      const palm2 = this.getPalmCenter(hand2);
      
      const distance = Math.hypot(palm2.x - palm1.x, palm2.y - palm1.y);
      const angle = Math.atan2(palm2.y - palm1.y, palm2.x - palm1.x);
      
      // Draw connection
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([8, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(palm1.x, palm1.y);
      this.ctx.lineTo(palm2.x, palm2.y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      
      if (this.lastHandsDistance !== null && this.lastHandsAngle !== null) {
        const distDelta = distance - this.lastHandsDistance;
        if (Math.abs(distDelta) > this.settings.zoomThreshold) {
          this.applyZoom(distDelta);
          this.gestureLabel.textContent = distDelta > 0 ? '↔️ ZOOM OUT' : '↔️ ZOOM IN';
          this.showFeedback(distDelta > 0 ? '🔍- Zoom Out' : '🔍+ Zoom In');
        }
        
        let angleDelta = angle - this.lastHandsAngle;
        if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
        if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
        
        const angleDeltaDeg = angleDelta * 180 / Math.PI;
        if (Math.abs(angleDeltaDeg) > this.settings.rotateThreshold) {
          this.applyRotation(angleDelta);
          this.gestureLabel.textContent = '🔄 ROTATION';
          this.showFeedback('🔄 Rotation');
        }
      }
      
      this.lastHandsDistance = distance;
      this.lastHandsAngle = angle;
      this.lastSingleHandPos = null;
      this.smoothSingleHand = null;
    }
    
    processOneHand(hand) {
      if (!this.controls || !this.camera || !this.THREE) return;
      
      this.gestureLabel.textContent = '✋ DÉPLACER';
      
      const palm = this.getPalmCenter(hand);
      
      if (this.smoothSingleHand === null) {
        this.smoothSingleHand = { ...palm };
      } else {
        this.smoothSingleHand.x += (palm.x - this.smoothSingleHand.x) * this.settings.smoothing;
        this.smoothSingleHand.y += (palm.y - this.smoothSingleHand.y) * this.settings.smoothing;
      }
      
      if (this.lastSingleHandPos !== null) {
        const dx = this.smoothSingleHand.x - this.lastSingleHandPos.x;
        const dy = this.smoothSingleHand.y - this.lastSingleHandPos.y;
        
        if (Math.abs(dx) > this.settings.panThreshold || Math.abs(dy) > this.settings.panThreshold) {
          this.applyPan(dx, dy);
          this.showFeedback('✋ Pan');
        }
      }
      
      this.lastSingleHandPos = { ...this.smoothSingleHand };
    }
    
    getPalmCenter(lm) {
      const indices = [0, 5, 9, 13, 17];
      const x = indices.reduce((s, i) => s + lm[i].x, 0) / indices.length * this.videoWidth;
      const y = indices.reduce((s, i) => s + lm[i].y, 0) / indices.length * this.videoHeight;
      return { x, y };
    }
    
    applyZoom(distDelta) {
      const THREE = this.THREE;
      const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
      const amount = distDelta * this.settings.zoomSensitivity;
      
      this.camera.position.addScaledVector(dir, amount);
      
      const dist = this.camera.position.distanceTo(this.controls.target);
      if (dist < 1) this.camera.position.copy(this.controls.target).addScaledVector(dir, 1);
      if (dist > 500) this.camera.position.copy(this.controls.target).addScaledVector(dir, 500);
      
      this.controls.update();
    }
    
    applyRotation(angleDelta) {
      const THREE = this.THREE;
      const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      
      spherical.theta -= angleDelta * this.settings.rotateSensitivity;
      
      offset.setFromSpherical(spherical);
      this.camera.position.copy(this.controls.target).add(offset);
      this.camera.lookAt(this.controls.target);
      this.controls.update();
    }
    
    applyPan(dx, dy) {
      const THREE = this.THREE;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      this.camera.matrix.extractBasis(right, up, new THREE.Vector3());
      
      const offset = new THREE.Vector3()
        .addScaledVector(right, dx * this.settings.panSensitivity)
        .addScaledVector(up, -dy * this.settings.panSensitivity);
      
      this.controls.target.add(offset);
      this.camera.position.add(offset);
      this.controls.update();
    }
    
    showFeedback(text) {
      this.feedback.textContent = text;
      this.feedback.classList.add('visible');
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = setTimeout(() => this.feedback.classList.remove('visible'), 250);
    }
    
    // Public API
    setControls(controls) { this.controls = controls; }
    setCamera(camera) { this.camera = camera; }
    setSetting(key, value) {
      if (this.settings.hasOwnProperty(key)) {
        this.settings[key] = value;
      }
    }
  }

  // ============================================
  // AUTO-INIT AU CHARGEMENT
  // ============================================
  
  window.GestureController = GestureController;
  
  function autoInit() {
    if (window.gestureController) return;
    
    window.gestureController = new GestureController();
    window.gestureController.init();
  }
  
  // Init quand le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(autoInit, 1000));
  } else {
    setTimeout(autoInit, 1000);
  }
  
  // Re-init si nécessaire après chargement complet
  window.addEventListener('load', () => setTimeout(autoInit, 2000));
  
  console.log('🖐️🖐️ BIMSmarter Gesture Controller v7 loaded (auto-init)');

})();
