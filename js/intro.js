/**
 * ISHAN - CINEMATIC INTRO ANIMATION
 * Particle Vortex -> Shockwave Flash -> Neon Text Reveal -> Camera Dive
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'ishan_portfolio_intro_seen';
  const overlay = document.getElementById('intro-overlay');
  const skipBtn = document.getElementById('skip-intro-btn');
  const canvas = document.getElementById('intro-canvas');
  const flashEl = document.getElementById('intro-flash');
  const contentEl = document.getElementById('intro-content');
  const letters = document.querySelectorAll('.intro-letter');
  const typewriterEl = document.getElementById('intro-typewriter');
  const introLine = document.querySelector('.intro-line');
  const introSweep = document.querySelector('.intro-sweep');

  // Check Reduced Motion or Session Storage
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const alreadySeen = sessionStorage.getItem(STORAGE_KEY) === 'true';

  function completeIntroImmediately() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    document.body.classList.remove('intro-active');
    sessionStorage.setItem(STORAGE_KEY, 'true');
    window.dispatchEvent(new CustomEvent('introComplete'));
  }

  // If already seen, reduced motion requested, or missing overlay, skip immediately
  if (!overlay || prefersReducedMotion || alreadySeen) {
    completeIntroImmediately();
    return;
  }

  // Lock scroll
  document.body.classList.add('intro-active');

  // Check GSAP availability fallback
  const hasGSAP = typeof window.gsap !== 'undefined';
  if (!hasGSAP) {
    // If GSAP CDN is blocked or failed to load, skip intro to ensure portfolio is usable
    completeIntroImmediately();
    return;
  }

  // Setup Canvas & Particle System
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);
  let cx = width / 2;
  let cy = height / 2;

  let animFrameId = null;
  let introTimeline = null;
  let isCleanedUp = false;

  const isMobile = window.innerWidth < 768;
  const PARTICLE_COUNT = isMobile ? 320 : 850;

  // Particle Class
  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      // Cylindrical / radial distribution
      this.angle = Math.random() * Math.PI * 2;
      const maxDist = Math.hypot(cx, cy);
      this.dist = initial ? Math.random() * maxDist * 1.1 : maxDist * (0.8 + Math.random() * 0.4);
      this.initialDist = this.dist;

      // Angular velocity
      this.angularSpeed = (Math.random() - 0.5) * 0.015;
      this.radialSpeed = 0.5 + Math.random() * 1.5;

      // Drift in Phase 1
      this.vx = (Math.random() - 0.5) * 1.2;
      this.vy = (Math.random() - 0.5) * 1.2;

      // Visuals
      this.size = Math.random() * 2.2 + 0.8;
      this.baseAlpha = Math.random() * 0.7 + 0.3;
      this.alpha = this.baseAlpha;

      const colors = ['#00e5ff', '#8a2be2', '#ff3df2', '#ffffff'];
      this.color = colors[Math.floor(Math.random() * colors.length)];

      this.prevX = cx + Math.cos(this.angle) * this.dist;
      this.prevY = cy + Math.sin(this.angle) * this.dist;
    }

    update(elapsed, vortexFactor, cameraScale) {
      const currentX = cx + Math.cos(this.angle) * this.dist;
      const currentY = cy + Math.sin(this.angle) * this.dist;

      this.prevX = currentX;
      this.prevY = currentY;

      if (elapsed < 1.2) {
        // Phase 1A: Floating cosmic dust & drift
        this.angle += this.angularSpeed * 0.5;
        this.dist += (Math.random() - 0.5) * 0.6;
      } else if (elapsed < 3.2) {
        // Phase 1B: Vortex convergence into singularity
        const progress = Math.min((elapsed - 1.2) / 1.8, 1);
        const spinMultiplier = 1 + progress * 8;
        this.angle += this.angularSpeed * spinMultiplier + 0.02 * progress;

        const inwardPull = (this.radialSpeed + progress * 14) * (1 + (this.dist / 200));
        this.dist -= inwardPull;

        // Increase streakiness and alpha
        this.alpha = Math.min(1, this.baseAlpha + progress * 0.5);

        if (this.dist < 8) {
          this.dist = 4;
          this.alpha = 0;
        }
      } else {
        // Post-collapse: particles dispersed or invisible
        this.alpha *= 0.88;
      }
    }

    draw(ctx, cameraScale) {
      if (this.alpha <= 0.01) return;

      const px = cx + (Math.cos(this.angle) * this.dist) * cameraScale;
      const py = cy + (Math.sin(this.angle) * this.dist) * cameraScale;

      const ppx = cx + (Math.cos(this.angle - 0.05) * (this.dist + 5)) * cameraScale;
      const ppy = cy + (Math.sin(this.angle - 0.05) * (this.dist + 5)) * cameraScale;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
      ctx.strokeStyle = this.color;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;

      // Streak line
      ctx.lineWidth = this.size * cameraScale;
      ctx.beginPath();
      ctx.moveTo(ppx, ppy);
      ctx.lineTo(px, py);
      ctx.stroke();

      // Core point
      ctx.beginPath();
      ctx.arc(px, py, (this.size * 0.8) * cameraScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // Shockwave Ring on Canvas
  const shockwave = {
    radius: 0,
    maxRadius: Math.hypot(cx, cy) * 1.3,
    alpha: 0,
    active: false,
    lineWidth: 8
  };

  const particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());

  // Camera scale and timing
  let startTime = null;
  let cameraZoom = 1.0;

  function render(timestamp) {
    if (isCleanedUp) return;
    if (!startTime) startTime = timestamp;
    const elapsed = (timestamp - startTime) / 1000;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Zoom camera slightly during vortex (0 -> 3s: 1.0 -> 1.35)
    if (elapsed < 3.0) {
      cameraZoom = 1.0 + Math.pow(elapsed / 3.0, 2) * 0.35;
    }

    // Update and draw particles
    const vortexFactor = Math.max(0, Math.min(1, (elapsed - 1.2) / 1.8));
    for (let i = 0; i < particles.length; i++) {
      particles[i].update(elapsed, vortexFactor, cameraZoom);
      particles[i].draw(ctx, cameraZoom);
    }

    // Singularity center point glowing before collapse
    if (elapsed > 2.2 && elapsed < 3.3) {
      const coreProgress = (elapsed - 2.2) / 1.0;
      const coreRadius = Math.max(1, 30 * (1 - coreProgress));
      const coreAlpha = Math.min(1, coreProgress * 1.5);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 2);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(0, 229, 255, 0.9)');
      grad.addColorStop(0.8, 'rgba(138, 43, 226, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = coreAlpha;
      ctx.shadowBlur = 40;
      ctx.shadowColor = '#00e5ff';
      ctx.fill();
      ctx.restore();
    }

    // Draw shockwave ring
    if (shockwave.active && shockwave.alpha > 0.01) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, shockwave.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 229, 255, ${shockwave.alpha})`;
      ctx.lineWidth = shockwave.lineWidth;
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#00e5ff';
      ctx.stroke();

      // Secondary chromatic trailing ring
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, shockwave.radius - 12), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 61, 242, ${shockwave.alpha * 0.7})`;
      ctx.lineWidth = shockwave.lineWidth * 0.6;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff3df2';
      ctx.stroke();

      ctx.restore();
    }

    animFrameId = requestAnimationFrame(render);
  }

  // Resize handler
  function handleResize() {
    if (!canvas || isCleanedUp) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cx = width / 2;
    cy = height / 2;
    shockwave.maxRadius = Math.hypot(cx, cy) * 1.3;
  }
  window.addEventListener('resize', handleResize);

  // Typewriter effect function for intro subtitle
  function typeIntroSubtitle(text, targetEl, onComplete) {
    targetEl.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
      if (isCleanedUp) {
        clearInterval(interval);
        return;
      }
      if (i < text.length) {
        targetEl.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(interval);
        if (typeof onComplete === 'function') onComplete();
      }
    }, 70);
  }

  // Build Master GSAP Timeline (~9 seconds total)
  introTimeline = gsap.timeline({
    onComplete: () => {
      cleanupIntro();
    }
  });

  // Storyboard Timing:
  // 0.0s – 3.0s: Canvas particles spinning into vortex
  // 3.0s – 4.5s: Collapse & shockwave + bright lens-flare flash
  introTimeline.add('collapse', 3.0);

  introTimeline.to(flashEl, {
    opacity: 1,
    duration: 0.15,
    ease: 'power4.in',
    onStart: () => {
      shockwave.active = true;
      shockwave.radius = 5;
      shockwave.alpha = 1;
      shockwave.lineWidth = 12;
    }
  }, 'collapse');

  // Shockwave expansion
  introTimeline.to(shockwave, {
    radius: () => shockwave.maxRadius,
    alpha: 0,
    lineWidth: 1,
    duration: 1.2,
    ease: 'power3.out'
  }, 'collapse+=0.1');

  // Flash fadeout to reveal clean void for typography
  introTimeline.to(flashEl, {
    opacity: 0,
    duration: 1.1,
    ease: 'power2.out'
  }, 'collapse+=0.18');

  // 4.5s – 7.5s: Name "ISHAN" materializes in huge letters at center
  introTimeline.add('textReveal', 4.5);

  introTimeline.set(contentEl, {
    opacity: 1,
    visibility: 'visible'
  }, 'textReveal');

  // Letters reveal one-by-one with glitch + blur-to-sharp effect
  introTimeline.to(letters, {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    duration: 0.55,
    stagger: 0.14,
    ease: 'back.out(1.8)'
  }, 'textReveal');

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
    }, 'textReveal+=0.7');
  }

  // "CS & AI STUDENT" types in with blinking cursor
  introTimeline.add(() => {
    if (!isCleanedUp && typewriterEl) {
      typeIntroSubtitle('CS & AI STUDENT', typewriterEl);
    }
  }, 'textReveal+=0.6');

  // Thin animated line / loading bar under text expands
  if (introLine) {
    introTimeline.to(introLine, {
      scaleX: 1,
      duration: 1.6,
      ease: 'power2.out'
    }, 'textReveal+=0.7');
  }

  // 7.5s – 9.0s: Hold briefly, camera dives through letters (scale up + fade)
  introTimeline.add('diveThrough', 7.5);

  introTimeline.to(contentEl, {
    scale: 8.5,
    filter: 'blur(20px)',
    opacity: 0,
    duration: 1.1,
    ease: 'power3.in'
  }, 'diveThrough');

  introTimeline.to(overlay, {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    duration: 0.8,
    ease: 'power2.inOut'
  }, 'diveThrough+=0.4');

  // Start canvas loop
  animFrameId = requestAnimationFrame(render);

  // Cleanup helper
  function cleanupIntro() {
    if (isCleanedUp) return;
    isCleanedUp = true;

    window.removeEventListener('resize', handleResize);
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (introTimeline) {
      introTimeline.kill();
    }

    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }

    document.body.classList.remove('intro-active');
    sessionStorage.setItem(STORAGE_KEY, 'true');

    // Dispatch event to kick off main site entrance animations
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

  // Allow Esc key to skip intro
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !isCleanedUp) {
      cleanupIntro();
    }
  });

})();

