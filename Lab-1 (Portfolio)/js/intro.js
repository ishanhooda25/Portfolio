/**
 * ISHAN - CINEMATIC INTRO ANIMATION (PHASE 2 UPGRADE)
 * 5-Scene Master GSAP Timeline (~12s):
 * 1. Boot Sequence (Terminal typing, progress bar, CRT scanlines)
 * 2. Code Rain to Particles (Matrix code columns shattering into particles)
 * 3. Vortex & Singularity (Logarithmic spiral warp tunnel, camera zoom)
 * 4. Explosion & Particle Text (RGB split flash, camera shake, magnetic "ISHAN" formation)
 * 5. Name Reveal & Hologram (Letter scramble, neon sweep, orbiting satellites, subtitle)
 * Transition: Circular aperture clip-path wipe to main site
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'ishan_portfolio_intro_seen';
  const overlay = document.getElementById('intro-overlay');
  const wipeLayer = document.getElementById('intro-wipe-layer');
  const skipBtn = document.getElementById('skip-intro-btn');
  const canvas = document.getElementById('intro-canvas');
  const progressBar = document.getElementById('intro-progress-bar');
  const terminalBox = document.getElementById('intro-terminal');
  const flashEl = document.getElementById('intro-flash');
  const chromaticEl = document.getElementById('intro-chromatic');
  const contentEl = document.getElementById('intro-content');
  const letters = document.querySelectorAll('.intro-letter');
  const typewriterEl = document.getElementById('intro-typewriter');
  const introLine = document.querySelector('.intro-line');
  const introSweep = document.querySelector('.intro-sweep');
  const orbitDots = document.querySelectorAll('.intro-orbit-dot');

  // Check Reduced Motion or Session Storage
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const alreadySeen = sessionStorage.getItem(STORAGE_KEY) === 'true';

  function completeIntroImmediately() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (wipeLayer && wipeLayer.parentNode) {
      wipeLayer.parentNode.removeChild(wipeLayer);
    }
    document.body.classList.remove('intro-active');
    sessionStorage.setItem(STORAGE_KEY, 'true');
    window.dispatchEvent(new CustomEvent('introComplete'));
  }

  // Skip immediately if seen or reduced motion requested
  if (!overlay || prefersReducedMotion || alreadySeen) {
    completeIntroImmediately();
    return;
  }

  // Lock scroll
  document.body.classList.add('intro-active');

  // Check GSAP availability fallback
  const hasGSAP = typeof window.gsap !== 'undefined';
  if (!hasGSAP) {
    completeIntroImmediately();
    return;
  }

  // Pre-load check: wait for fonts and window load
  let isWindowLoaded = false;
  window.addEventListener('load', () => { isWindowLoaded = true; });

  // Canvas & High-DPI Context Setup
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = (canvas.width = window.innerWidth * dpr);
  let height = (canvas.height = window.innerHeight * dpr);
  let cssWidth = window.innerWidth;
  let cssHeight = window.innerHeight;
  let cx = width / 2;
  let cy = height / 2;

  const isMobile = window.innerWidth < 768;
  const PARTICLE_COUNT = isMobile ? 650 : 1500;

  // Pre-render soft glowing particle sprites (No expensive shadowBlur per frame!)
  const colorMap = {
    cyan: 'rgba(0, 229, 255, 1)',
    violet: 'rgba(138, 43, 226, 1)',
    magenta: 'rgba(255, 61, 242, 1)',
    white: 'rgba(255, 255, 255, 1)',
    green: 'rgba(0, 255, 119, 1)'
  };

  const spriteCanvases = {};
  function initSprites() {
    Object.keys(colorMap).forEach(key => {
      const size = 32 * dpr;
      const sc = document.createElement('canvas');
      sc.width = size;
      sc.height = size;
      const sctx = sc.getContext('2d');
      const grad = sctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      const col = colorMap[key];
      grad.addColorStop(0, col);
      grad.addColorStop(0.25, col);
      grad.addColorStop(0.65, col.replace('1)', '0.35)'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, size, size);
      spriteCanvases[key] = sc;
    });
  }
  initSprites();

  // Code rain columns
  const codeChars = ['0', '1', '{', '}', '<', '>', '/', 'def', 'import', 'return', 'class', 'lambda', 'AI', 'var', ';'];
  const COLUMN_COUNT = Math.floor(cssWidth / (isMobile ? 24 : 32));
  const columns = Array.from({ length: COLUMN_COUNT }, (_, i) => ({
    x: (i * (cssWidth / COLUMN_COUNT) + 12) * dpr,
    y: (Math.random() * -height) * 0.5,
    speed: (Math.random() * 6 + 4) * dpr,
    chars: Array.from({ length: 12 }, () => codeChars[Math.floor(Math.random() * codeChars.length)]),
    alpha: Math.random() * 0.7 + 0.3
  }));

  // Sample "ISHAN" letter positions from offscreen canvas for Scene 4
  let targetTextPoints = [];
  function generateTextTargets() {
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const octx = offscreen.getContext('2d');
    const fontSize = Math.min(width * 0.16, 220 * dpr);
    octx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#ffffff';
    octx.fillText('ISHAN', cx, cy - 20 * dpr);

    const imgData = octx.getImageData(0, 0, width, height).data;
    const pts = [];
    const step = isMobile ? 12 : 8;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const alpha = imgData[(y * width + x) * 4 + 3];
        if (alpha > 128) {
          pts.push({ x, y });
        }
      }
    }
    targetTextPoints = pts;
  }
  generateTextTargets();

  // Particle Class
  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.angle = Math.random() * Math.PI * 2;
      const maxDist = Math.hypot(cx, cy);
      this.dist = initial ? Math.random() * maxDist * 1.2 : maxDist * (0.8 + Math.random() * 0.4);
      this.initialDist = this.dist;

      this.angularSpeed = (Math.random() - 0.5) * 0.02;
      this.radialSpeed = 0.8 + Math.random() * 2.2;

      this.x = cx + Math.cos(this.angle) * this.dist;
      this.y = cy + Math.sin(this.angle) * this.dist;
      this.vx = (Math.random() - 0.5) * 2 * dpr;
      this.vy = (Math.random() - 0.5) * 2 * dpr;

      this.size = (Math.random() * 2.2 + 1.2) * dpr;
      this.baseAlpha = Math.random() * 0.7 + 0.3;
      this.alpha = 0; // Starts hidden during Scene 1

      const keys = ['cyan', 'violet', 'magenta', 'white'];
      this.colorKey = keys[Math.floor(Math.random() * keys.length)];

      this.targetX = null;
      this.targetY = null;
      this.inTextFormation = false;
    }

    update(dt, currentScene, sceneProgress, cameraScale) {
      if (currentScene === 1) {
        // Boot sequence - particles invisible
        this.alpha = 0;
        return;
      }

      if (currentScene === 2) {
        // Code rain dissolving into particles (2.5s - 5s)
        this.alpha = Math.min(1, sceneProgress * 1.5 * this.baseAlpha);
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
        // Subtle drift toward center as progress approaches 1
        if (sceneProgress > 0.5) {
          const pull = (sceneProgress - 0.5) * 2;
          this.x += (cx - this.x) * 0.03 * pull;
          this.y += (cy - this.y) * 0.03 * pull;
        }
      } else if (currentScene === 3) {
        // Vortex & Singularity (5s - 7s)
        this.alpha = Math.min(1, this.baseAlpha + sceneProgress * 0.4);
        const spinMultiplier = 1 + sceneProgress * 12;
        this.angle += (this.angularSpeed * spinMultiplier + 0.025 * sceneProgress) * (dt * 60);

        const inwardSpeed = (this.radialSpeed + sceneProgress * 18 * dpr) * (1 + this.dist / (300 * dpr));
        this.dist -= inwardSpeed * (dt * 60);

        this.x = cx + Math.cos(this.angle) * this.dist;
        this.y = cy + Math.sin(this.angle) * this.dist;

        if (this.dist < 10 * dpr) {
          this.dist = 5 * dpr;
          this.alpha = 0;
        }
      } else if (currentScene === 4) {
        // Explosion & Particle Text Formation (7s - 8s)
        if (this.targetX !== null && this.targetY !== null) {
          // Magnetically pull into letter shapes
          this.alpha = Math.min(1, this.baseAlpha + 0.3);
          const ease = 0.12 * (dt * 60);
          this.x += (this.targetX - this.x) * ease;
          this.y += (this.targetY - this.y) * ease;
        } else {
          // Disperse outward from center explosion
          this.alpha *= Math.pow(0.96, dt * 60);
          this.x += this.vx * 3 * (dt * 60);
          this.y += this.vy * 3 * (dt * 60);
        }
      } else if (currentScene >= 5) {
        // Name reveal - particles smoothly dissolve as crisp typography emerges
        this.alpha *= Math.pow(0.88, dt * 60);
      }
    }

    draw(ctx, cameraScale) {
      if (this.alpha <= 0.02) return;
      const sprite = spriteCanvases[this.colorKey];
      if (!sprite) return;

      const px = cx + (this.x - cx) * cameraScale;
      const py = cy + (this.y - cy) * cameraScale;
      const drawSize = this.size * cameraScale * 4;

      ctx.save();
      ctx.globalAlpha = Math.min(1, this.alpha);
      ctx.drawImage(sprite, px - drawSize / 2, py - drawSize / 2, drawSize, drawSize);
      ctx.restore();
    }
  }

  const particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());

  // Assign text targets to a subset of particles
  function assignTextTargets() {
    if (targetTextPoints.length === 0) return;
    const shuffled = [...targetTextPoints].sort(() => 0.5 - Math.random());
    for (let i = 0; i < particles.length; i++) {
      if (i < shuffled.length) {
        particles[i].targetX = shuffled[i].x;
        particles[i].targetY = shuffled[i].y;
        // Start from center explosion origin
        particles[i].x = cx + (Math.random() - 0.5) * 40 * dpr;
        particles[i].y = cy + (Math.random() - 0.5) * 40 * dpr;
        particles[i].colorKey = (i % 3 === 0) ? 'cyan' : (i % 3 === 1) ? 'violet' : 'magenta';
      } else {
        particles[i].targetX = null;
        particles[i].targetY = null;
      }
    }
  }

  // Shockwave Ring State
  const shockwaves = [];
  function addShockwave(color, maxRadius, maxLineWidth) {
    shockwaves.push({
      radius: 0,
      maxRadius: maxRadius * dpr,
      alpha: 1,
      lineWidth: maxLineWidth * dpr,
      color: color
    });
  }

  // Master State Machine
  let currentScene = 1;
  let sceneProgress = 0;
  let masterElapsed = 0;
  let cameraZoom = 1.0;
  let lastTime = performance.now();
  let isCleanedUp = false;
  let introTimeline = null;

  // Single Shared Ticker / Render Loop with Delta Time
  function renderIntro(timestamp) {
    if (isCleanedUp) return;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Scene 2: Code Rain drawing (2.5s - 5s)
    if (currentScene === 2) {
      ctx.save();
      ctx.font = `600 ${14 * dpr}px "SF Mono", "Fira Code", monospace`;
      const fadeFactor = 1 - Math.max(0, (sceneProgress - 0.6) / 0.4);

      columns.forEach(col => {
        col.y += col.speed * (dt * 60);
        if (col.y > height) col.y = -col.chars.length * 20 * dpr;

        col.chars.forEach((char, idx) => {
          const cyPos = col.y + idx * 20 * dpr;
          if (cyPos > 0 && cyPos < height) {
            const charAlpha = (idx === col.chars.length - 1 ? 1 : (idx / col.chars.length) * 0.7) * col.alpha * fadeFactor;
            ctx.fillStyle = (idx === col.chars.length - 1) ? '#ffffff' : `rgba(0, 229, 255, ${charAlpha})`;
            ctx.fillText(char, col.x, cyPos);
          }
        });
      });
      ctx.restore();
    }

    // Draw Particles with Composite Operation
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < particles.length; i++) {
      particles[i].update(dt, currentScene, sceneProgress, cameraZoom);
      particles[i].draw(ctx, cameraZoom);
    }
    ctx.restore();

    // Singularity Energy Core Glow in Scene 3
    if (currentScene === 3 && sceneProgress > 0.4) {
      const coreProgress = (sceneProgress - 0.4) / 0.6;
      const coreR = Math.max(2, 40 * (1 - coreProgress) * dpr);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(0, 229, 255, 0.9)');
      grad.addColorStop(0.8, 'rgba(138, 43, 226, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = Math.min(1, coreProgress * 1.5);
      ctx.fill();
      ctx.restore();
    }

    // Shockwave Rings
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.08 * (dt * 60);
      sw.alpha -= 0.03 * (dt * 60);
      if (sw.alpha <= 0.01) {
        shockwaves.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color.replace('1)', `${sw.alpha})`);
      ctx.lineWidth = sw.lineWidth * sw.alpha;
      ctx.stroke();
      ctx.restore();
    }

    // Update Intro Progress Bar (0% to 100% over 12s)
    if (progressBar) {
      const pct = Math.min(100, (masterElapsed / 11.5) * 100);
      progressBar.style.width = `${pct}%`;
    }
  }

  // Hook into GSAP Ticker for single unified frame loop
  gsap.ticker.add((time, deltaTime) => {
    if (!isCleanedUp) {
      renderIntro(time * 1000);
    }
  });

  // Debounced Resize Handler
  let resizeTimeout = null;
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (!canvas || isCleanedUp) return;
      cssWidth = window.innerWidth;
      cssHeight = window.innerHeight;
      width = canvas.width = cssWidth * dpr;
      height = canvas.height = cssHeight * dpr;
      cx = width / 2;
      cy = height / 2;
      generateTextTargets();
    }, 150);
  }
  window.addEventListener('resize', handleResize, { passive: true });

  // Terminal Typing Helper
  function typeLine(el, text, speed = 35) {
    return new Promise(resolve => {
      let idx = 0;
      el.textContent = '';
      const timer = setInterval(() => {
        if (isCleanedUp) { clearInterval(timer); resolve(); return; }
        if (idx < text.length) {
          el.textContent += text.charAt(idx);
          idx++;
        } else {
          clearInterval(timer);
          resolve();
        }
      }, speed);
    });
  }

  // Letter Scramble Helper for Scene 5
  const cypherChars = '!<>-_\\/[]{}—=+*^?#________0123456789';
  function scrambleLetter(el, targetChar, duration = 0.8) {
    let elapsed = 0;
    const interval = setInterval(() => {
      if (isCleanedUp) { clearInterval(interval); return; }
      elapsed += 0.05;
      if (elapsed >= duration) {
        clearInterval(interval);
        el.textContent = targetChar;
      } else {
        el.textContent = cypherChars[Math.floor(Math.random() * cypherChars.length)];
      }
    }, 45);
  }

  // BUILD MASTER GSAP TIMELINE (~12 SECONDS TOTAL)
  introTimeline = gsap.timeline({
    onComplete: () => {
      cleanupIntro();
    }
  });

  // Track master time and update progress
  introTimeline.to({}, {
    duration: 12.0,
    onUpdate: function () {
      masterElapsed = this.time();
    }
  }, 0);

  // -------------------------------------------------------------------------
  // SCENE 1: BOOT SEQUENCE (0.0s – 2.5s)
  // -------------------------------------------------------------------------
  introTimeline.add('scene1', 0.0);
  introTimeline.call(() => {
    currentScene = 1;
    sceneProgress = 0;
  }, null, 'scene1');

  // Terminal boot lines type out
  introTimeline.call(async () => {
    const l1 = document.getElementById('term-line-1');
    const l2 = document.getElementById('term-line-2');
    const l3 = document.getElementById('term-line-3');
    const l4 = document.getElementById('term-line-4');
    const bootBar = document.getElementById('term-boot-bar');

    if (l1) await typeLine(l1, 'initializing portfolio kernel v2.6...', 25);
    if (bootBar) gsap.to(bootBar, { width: '35%', duration: 0.4 });
    if (l2) await typeLine(l2, 'loading python & neural modules...', 25);
    if (bootBar) gsap.to(bootBar, { width: '70%', duration: 0.4 });
    if (l3) await typeLine(l3, 'compiling creativity & algorithms...', 25);
    if (bootBar) gsap.to(bootBar, { width: '100%', duration: 0.3 });
    if (l4) await typeLine(l4, 'hello, world.', 35);
  }, null, 'scene1+=0.1');

  // Terminal window fade/collapse at end of Scene 1
  introTimeline.to(terminalBox, {
    scale: 0.85,
    opacity: 0,
    duration: 0.45,
    ease: 'power3.in'
  }, 'scene1+=2.1');

  // -------------------------------------------------------------------------
  // SCENE 2: CODE RAIN TO PARTICLES (2.5s – 5.0s)
  // -------------------------------------------------------------------------
  introTimeline.add('scene2', 2.5);
  introTimeline.call(() => {
    currentScene = 2;
  }, null, 'scene2');

  introTimeline.to({ p: 0 }, {
    p: 1,
    duration: 2.5,
    ease: 'power1.inOut',
    onUpdate: function () {
      sceneProgress = this.targets()[0].p;
    }
  }, 'scene2');

  // -------------------------------------------------------------------------
  // SCENE 3: VORTEX & SINGULARITY (5.0s – 7.0s)
  // -------------------------------------------------------------------------
  introTimeline.add('scene3', 5.0);
  introTimeline.call(() => {
    currentScene = 3;
  }, null, 'scene3');

  introTimeline.to({ p: 0 }, {
    p: 1,
    duration: 2.0,
    ease: 'power2.in',
    onUpdate: function () {
      sceneProgress = this.targets()[0].p;
      cameraZoom = 1.0 + Math.pow(sceneProgress, 2) * 0.4;
    }
  }, 'scene3');

  // -------------------------------------------------------------------------
  // SCENE 4: EXPLOSION & PARTICLE TEXT (7.0s – 8.0s)
  // -------------------------------------------------------------------------
  introTimeline.add('scene4', 7.0);
  introTimeline.call(() => {
    currentScene = 4;
    sceneProgress = 0;
    assignTextTargets();
    addShockwave('rgba(0, 229, 255, 1)', Math.hypot(cx, cy) * 1.2, 14);
    addShockwave('rgba(255, 61, 242, 1)', Math.hypot(cx, cy) * 0.9, 8);
  }, null, 'scene4');

  // RGB Split / Chromatic Flash burst
  introTimeline.to(flashEl, {
    opacity: 1,
    duration: 0.1,
    ease: 'power4.in'
  }, 'scene4');
  introTimeline.to(chromaticEl, {
    opacity: 0.7,
    duration: 0.15,
    ease: 'power4.in'
  }, 'scene4');

  // Short camera shake
  introTimeline.to(canvas, {
    x: '+=8',
    y: '-=6',
    duration: 0.05,
    repeat: 4,
    yoyo: true,
    ease: 'none'
  }, 'scene4');

  // Flash fade out to reveal particle text formation
  introTimeline.to(flashEl, {
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  }, 'scene4+=0.1');
  introTimeline.to(chromaticEl, {
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out'
  }, 'scene4+=0.1');

  // -------------------------------------------------------------------------
  // SCENE 5: NAME REVEAL & HOLOGRAM (8.0s – 11.0s)
  // -------------------------------------------------------------------------
  introTimeline.add('scene5', 8.0);
  introTimeline.call(() => {
    currentScene = 5;
  }, null, 'scene5');

  // Reveal HTML Typography & trigger Letter Scramble
  introTimeline.set(contentEl, {
    opacity: 1,
    visibility: 'visible'
  }, 'scene5');

  introTimeline.to(letters, {
    opacity: 1,
    scale: 1,
    duration: 0.6,
    stagger: 0.12,
    ease: 'back.out(2)',
    onStart: () => {
      letters.forEach((l, i) => {
        const char = l.getAttribute('data-char') || l.textContent;
        scrambleLetter(l, char, 0.4 + i * 0.12);
      });
    }
  }, 'scene5');

  // Orbiting satellite dots around name
  introTimeline.to(orbitDots, {
    opacity: 1,
    duration: 0.6,
    ease: 'power2.out',
    onStart: () => {
      gsap.to('.dot-1', {
        x: 180,
        y: 40,
        repeat: -1,
        yoyo: true,
        duration: 2.2,
        ease: 'sine.inOut'
      });
      gsap.to('.dot-2', {
        x: -180,
        y: -40,
        repeat: -1,
        yoyo: true,
        duration: 2.5,
        ease: 'sine.inOut'
      });
    }
  }, 'scene5+=0.3');

  // Light sweep glint across letters
  if (introSweep) {
    introTimeline.fromTo(introSweep, {
      left: '-100%',
      opacity: 0
    }, {
      left: '140%',
      opacity: 0.85,
      duration: 0.9,
      ease: 'power2.inOut'
    }, 'scene5+=0.5');
  }

  // Typewriter for "CS & AI STUDENT"
  introTimeline.call(async () => {
    if (typewriterEl) {
      await typeLine(typewriterEl, 'CS & AI STUDENT', 45);
    }
  }, null, 'scene5+=0.5');

  // Expanding neon gradient line
  if (introLine) {
    introTimeline.to(introLine, {
      scaleX: 1,
      duration: 1.4,
      ease: 'power2.out'
    }, 'scene5+=0.6');
  }

  // -------------------------------------------------------------------------
  // TRANSITION: CIRCULAR APERTURE CLIP-PATH WIPE (11.0s – 12.0s)
  // -------------------------------------------------------------------------
  introTimeline.add('transition', 11.0);

  // Aperture circular wipe revealing main site
  introTimeline.to(overlay, {
    clipPath: 'circle(0% at 50% 50%)',
    duration: 1.0,
    ease: 'expo.inOut'
  }, 'transition');

  // Cleanup helper
  function cleanupIntro() {
    if (isCleanedUp) return;
    isCleanedUp = true;

    window.removeEventListener('resize', handleResize);
    if (introTimeline) {
      introTimeline.kill();
    }

    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (wipeLayer && wipeLayer.parentNode) {
      wipeLayer.parentNode.removeChild(wipeLayer);
    }

    document.body.classList.remove('intro-active');
    sessionStorage.setItem(STORAGE_KEY, 'true');

    // Trigger main site entrance animations
    window.dispatchEvent(new CustomEvent('introComplete'));
  }

  // Skip button click handler
  if (skipBtn) {
    skipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      cleanupIntro();
    });
  }

  // Esc key skips intro
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !isCleanedUp) {
      cleanupIntro();
    }
  });

})();
