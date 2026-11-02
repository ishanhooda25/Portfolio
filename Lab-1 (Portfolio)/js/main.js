/**
 * ISHAN - MAIN PORTFOLIO SCRIPTS (PHASE 1 & PHASE 3 UPGRADE)
 * Unified Lenis Smooth Scroll + GSAP Ticker Master Loop
 * Features:
 * - Spatial Grid Hero Particle Network (O(N) performance, no shadowBlur)
 * - Single Shared Master Ticker (Cursor, Lerp, Tilt, Spotlight, Parallax, Confetti)
 * - Marquee with Scroll Velocity speedup & direction flip
 * - Scroll-velocity container skew
 * - Word-by-word scroll-scrubbed About bio
 * - Circular SVG progress meters & odometer stats
 * - Alternating 3D project card reveals with cursor "VIEW" bubble
 * - Floating label form & button morph with canvas confetti
 * - Easter egg: 'K' key or typing "ishan" triggers confetti burst
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  const hasLenis = typeof window.Lenis !== 'undefined';

  if (hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // =========================================================================
  // 1. LENIS SMOOTH SCROLLING (CONNECTED TO GSAP TICKER)
  // =========================================================================
  let lenis = null;
  if (hasLenis && !prefersReducedMotion) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5
    });

    lenis.on('scroll', () => {
      if (hasScrollTrigger) ScrollTrigger.update();
      updateScrollProgress();
      updateActiveNavLink();
    });

    // Drive Lenis from GSAP ticker with lagSmoothing(0)
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  } else {
    // Native scroll listener fallback
    window.addEventListener('scroll', () => {
      updateScrollProgress();
      updateActiveNavLink();
    }, { passive: true });
  }

  // =========================================================================
  // 2. SHARED MOUSE & SCROLL STATE STORE (Passive Listeners Only)
  // =========================================================================
  const mouse = {
    x: -200,
    y: -200,
    targetX: -200,
    targetY: -200,
    speed: 0,
    prevX: -200,
    prevY: -200
  };

  window.addEventListener('mousemove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    mouse.targetX = -200;
    mouse.targetY = -200;
  }, { passive: true });

  // Scroll Progress Bar
  const scrollProgressBar = document.getElementById('scroll-progress');
  function updateScrollProgress() {
    if (!scrollProgressBar) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
    scrollProgressBar.style.width = `${pct}%`;
    scrollProgressBar.setAttribute('aria-valuenow', Math.round(pct));
  }

  // =========================================================================
  // 3. CUSTOM GLOWING CURSOR, "VIEW" BUBBLE & TRAIL
  // =========================================================================
  const cursorDot = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');
  const cursorParticles = [];

  class CursorSpark {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 3 + 1.5;
      this.alpha = 0.6;
      this.color = Math.random() > 0.5 ? '#00e5ff' : '#ff3df2';
    }
    update(dt) {
      this.alpha -= 0.04 * (dt * 60);
      this.size *= 0.95;
    }
  }

  let isCursorActive = false;
  let ringX = -200;
  let ringY = -200;

  function initCursor() {
    if (!cursorDot || !cursorRing || prefersReducedMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    window.addEventListener('mousemove', () => {
      if (!isCursorActive) {
        isCursorActive = true;
        cursorDot.style.opacity = '1';
        cursorRing.style.opacity = '1';
      }
    }, { once: true });

    // Interactive Hover Listeners
    const interactiveSelectors = 'a, button, input, textarea, .magnetic-btn, .scramble-hover';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactiveSelectors)) {
        document.body.classList.add('cursor-hover');
      }
      if (e.target.closest('[data-card-hover="project"]')) {
        document.body.classList.add('cursor-view');
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactiveSelectors)) {
        document.body.classList.remove('cursor-hover');
      }
      if (e.target.closest('[data-card-hover="project"]')) {
        document.body.classList.remove('cursor-view');
      }
    });
  }
  initCursor();

  // =========================================================================
  // 4. HERO SPATIAL-GRID PARTICLE NETWORK (O(N) PERFORMANCE, PRE-RENDERED GLOW)
  // =========================================================================
  const heroCanvas = document.getElementById('hero-network-canvas');
  let heroCtx = null;
  let heroWidth = 0;
  let heroHeight = 0;
  let heroVisible = true;

  const isMobile = window.innerWidth < 768;
  const NODE_COUNT = isMobile ? 35 : 80;
  const CELL_SIZE = 140;
  let nodes = [];
  let spatialGrid = new Map();

  // Pre-render glowing node sprite
  let nodeSpriteCyan = null;
  let nodeSpriteViolet = null;
  function initNodeSprites() {
    const makeSprite = (col) => {
      const c = document.createElement('canvas');
      c.width = 24;
      c.height = 24;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
      grad.addColorStop(0, col);
      grad.addColorStop(0.3, col);
      grad.addColorStop(0.8, col.replace('1)', '0.2)'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 24, 24);
      return c;
    };
    nodeSpriteCyan = makeSprite('rgba(0, 229, 255, 1)');
    nodeSpriteViolet = makeSprite('rgba(138, 43, 226, 1)');
  }
  initNodeSprites();

  class HeroNode {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * (heroWidth || window.innerWidth);
      this.y = Math.random() * (heroHeight || window.innerHeight);
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = (Math.random() - 0.5) * 0.8;
      this.radius = Math.random() * 2 + 1.2;
      this.sprite = Math.random() > 0.4 ? nodeSpriteCyan : nodeSpriteViolet;
    }
    update(dt) {
      this.x += this.vx * (dt * 60);
      this.y += this.vy * (dt * 60);

      if (this.x < 0) { this.x = 0; this.vx *= -1; }
      if (this.x > heroWidth) { this.x = heroWidth; this.vx *= -1; }
      if (this.y < 0) { this.y = 0; this.vy *= -1; }
      if (this.y > heroHeight) { this.y = heroHeight; this.vy *= -1; }

      // Mouse push/pull
      if (mouse.x > 0 && mouse.y > 0 && mouse.y < heroHeight + 100) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 140) {
          const force = (140 - dist) / 140;
          this.x -= (dx / dist) * force * 3 * (dt * 60);
          this.y -= (dy / dist) * force * 3 * (dt * 60);
        }
      }
    }
  }

  function resizeHeroCanvas() {
    if (!heroCanvas) return;
    heroWidth = heroCanvas.width = heroCanvas.offsetWidth;
    heroHeight = heroCanvas.height = heroCanvas.offsetHeight;
    nodes.forEach(n => {
      if (n.x > heroWidth) n.x = Math.random() * heroWidth;
      if (n.y > heroHeight) n.y = Math.random() * heroHeight;
    });
  }

  if (heroCanvas) {
    heroCtx = heroCanvas.getContext('2d');
    resizeHeroCanvas();
    nodes = Array.from({ length: NODE_COUNT }, () => new HeroNode());

    // Pause when hero is off-screen using IntersectionObserver
    const heroObserver = new IntersectionObserver((entries) => {
      heroVisible = entries[0].isIntersecting;
    }, { threshold: 0.05 });
    heroObserver.observe(heroCanvas);
  }

  // Draw Hero Particle Network with Spatial Grid Partitioning (O(N))
  function drawHeroNetwork(dt) {
    if (!heroCanvas || !heroCtx || !heroVisible) return;
    heroCtx.clearRect(0, 0, heroWidth, heroHeight);

    // Populate Spatial Grid Buckets
    spatialGrid.clear();
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].update(dt);
      const cellX = Math.floor(nodes[i].x / CELL_SIZE);
      const cellY = Math.floor(nodes[i].y / CELL_SIZE);
      const key = `${cellX},${cellY}`;
      if (!spatialGrid.has(key)) spatialGrid.set(key, []);
      spatialGrid.get(key).push(nodes[i]);
    }

    // Connect lines between neighboring buckets only
    heroCtx.save();
    heroCtx.lineWidth = 1;
    const maxDist = CELL_SIZE;

    spatialGrid.forEach((bucket, key) => {
      const [cxStr, cyStr] = key.split(',');
      const cellX = parseInt(cxStr, 10);
      const cellY = parseInt(cyStr, 10);

      // Check current cell and 4 forward neighbor cells to avoid duplicate comparisons
      const neighborKeys = [
        `${cellX},${cellY}`,
        `${cellX + 1},${cellY}`,
        `${cellX - 1},${cellY + 1}`,
        `${cellX},${cellY + 1}`,
        `${cellX + 1},${cellY + 1}`
      ];

      bucket.forEach((nodeA) => {
        neighborKeys.forEach(nKey => {
          const neighborBucket = spatialGrid.get(nKey);
          if (!neighborBucket) return;
          neighborBucket.forEach(nodeB => {
            if (nodeA === nodeB) return;
            const dx = nodeA.x - nodeB.x;
            const dy = nodeA.y - nodeB.y;
            const dist = Math.hypot(dx, dy);
            if (dist < maxDist) {
              const alpha = (1 - dist / maxDist) * 0.28;
              heroCtx.beginPath();
              heroCtx.moveTo(nodeA.x, nodeA.y);
              heroCtx.lineTo(nodeB.x, nodeB.y);
              heroCtx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
              heroCtx.stroke();
            }
          });
        });
      });
    });

    // Draw pre-rendered glowing nodes
    nodes.forEach(n => {
      heroCtx.drawImage(n.sprite, n.x - 12, n.y - 12, 24, 24);
    });
    heroCtx.restore();
  }

  // =========================================================================
  // 5. CONFETTI BURST ENGINE (Contact Submit & 'K' Easter Egg)
  // =========================================================================
  const confettiCanvas = document.getElementById('confetti-canvas');
  let confettiCtx = null;
  const confettiPieces = [];

  if (confettiCanvas) {
    confettiCtx = confettiCanvas.getContext('2d');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    });
  }

  function triggerConfettiBurst(originX = window.innerWidth / 2, originY = window.innerHeight / 2, count = 90) {
    if (!confettiCtx) return;
    const colors = ['#00e5ff', '#8a2be2', '#ff3df2', '#ffffff', '#ffd700'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      confettiPieces.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: Math.random() * 7 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        alpha: 1
      });
    }
  }

  function updateAndDrawConfetti(dt) {
    if (!confettiCtx || confettiPieces.length === 0) return;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (let i = confettiPieces.length - 1; i >= 0; i--) {
      const p = confettiPieces[i];
      p.x += p.vx * (dt * 60);
      p.y += p.vy * (dt * 60);
      p.vy += 0.35 * (dt * 60); // gravity
      p.vx *= 0.98;
      p.rotation += p.rotSpeed * (dt * 60);
      p.alpha -= 0.016 * (dt * 60);

      if (p.alpha <= 0 || p.y > confettiCanvas.height + 20) {
        confettiPieces.splice(i, 1);
        continue;
      }

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.globalAlpha = p.alpha;
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx.restore();
    }
  }

  // =========================================================================
  // 6. MASTER TICKER LOOP (ONE SHARED LOOP FOR ALL MOTIONS)
  // =========================================================================
  let lastTime = performance.now();
  const skewWrapper = document.getElementById('skew-wrapper');
  const marquee1 = document.getElementById('marquee-track-1');
  const marquee2 = document.getElementById('marquee-track-2');
  let marqueePos1 = 0;
  let marqueePos2 = 0;

  // Magnetic buttons cache
  const magneticElements = Array.from(document.querySelectorAll('.magnetic-btn')).map(btn => ({
    el: btn,
    strength: parseFloat(btn.getAttribute('data-strength')) || 25,
    curX: 0,
    curY: 0,
    targetX: 0,
    targetY: 0
  }));

  magneticElements.forEach(item => {
    item.el.addEventListener('mousemove', (e) => {
      const rect = item.el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      item.targetX = (e.clientX - centerX) * (item.strength * 0.015);
      item.targetY = (e.clientY - centerY) * (item.strength * 0.015);
    }, { passive: true });

    item.el.addEventListener('mouseleave', () => {
      item.targetX = 0;
      item.targetY = 0;
    }, { passive: true });
  });

  // 3D Tilt Cards cache
  const tiltElements = Array.from(document.querySelectorAll('.tilt-card')).map(card => ({
    el: card,
    curRotX: 0,
    curRotY: 0,
    targetRotX: 0,
    targetRotY: 0
  }));

  tiltElements.forEach(item => {
    item.el.addEventListener('mousemove', (e) => {
      const rect = item.el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      item.targetRotX = -((y - centerY) / centerY) * 9;
      item.targetRotY = ((x - centerX) / centerX) * 9;
      item.el.style.setProperty('--glare-x', `${x}px`);
      item.el.style.setProperty('--glare-y', `${y}px`);
    }, { passive: true });

    item.el.addEventListener('mouseleave', () => {
      item.targetRotX = 0;
      item.targetRotY = 0;
    }, { passive: true });
  });

  // Spotlight cards cache
  const spotlightCards = document.querySelectorAll('.spotlight-card');
  spotlightCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    }, { passive: true });
  });

  // Parallax floating code tags cache
  const codeTags = Array.from(document.querySelectorAll('.hero-floating-code')).map(tag => ({
    el: tag,
    depth: parseFloat(tag.getAttribute('data-depth')) || 0.2,
    curX: 0,
    curY: 0
  }));

  // Master frame callback
  function masterTick(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Pause heavy updates if tab is hidden
    if (document.hidden) return;

    // 1. Mouse & Cursor Lerp
    mouse.x += (mouse.targetX - mouse.x) * 0.15;
    mouse.y += (mouse.targetY - mouse.y) * 0.15;

    if (cursorDot && cursorRing && isCursorActive) {
      cursorDot.style.transform = `translate3d(${mouse.targetX}px, ${mouse.targetY}px, 0) translate(-50%, -50%)`;
      ringX += (mouse.targetX - ringX) * 0.14;
      ringY += (mouse.targetY - ringY) * 0.14;
      cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
    }

    // 2. Magnetic Buttons Spring
    magneticElements.forEach(item => {
      item.curX += (item.targetX - item.curX) * 0.18;
      item.curY += (item.targetY - item.curY) * 0.18;
      if (Math.abs(item.curX) > 0.01 || Math.abs(item.curY) > 0.01) {
        item.el.style.transform = `translate3d(${item.curX.toFixed(2)}px, ${item.curY.toFixed(2)}px, 0)`;
      }
    });

    // 3. 3D Tilt Cards Spring
    tiltElements.forEach(item => {
      item.curRotX += (item.targetRotX - item.curRotX) * 0.14;
      item.curRotY += (item.targetRotY - item.curRotY) * 0.14;
      if (Math.abs(item.curRotX) > 0.01 || Math.abs(item.curRotY) > 0.01) {
        item.el.style.transform = `perspective(1000px) rotateX(${item.curRotX.toFixed(2)}deg) rotateY(${item.curRotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
      }
    });

    // 4. Parallax Floating Code Tags
    if (mouse.x > 0 && mouse.y > 0) {
      const normX = (mouse.x - window.innerWidth / 2);
      const normY = (mouse.y - window.innerHeight / 2);
      codeTags.forEach(tag => {
        const targetX = normX * tag.depth;
        const targetY = normY * tag.depth;
        tag.curX += (targetX - tag.curX) * 0.08;
        tag.curY += (targetY - tag.curY) * 0.08;
        tag.el.style.transform = `translate3d(${tag.curX.toFixed(1)}px, ${tag.curY.toFixed(1)}px, 0)`;
      });
    }

    // 5. Scroll Velocity Skew & Marquee Speedup
    const velocity = (lenis ? lenis.velocity : 0) || 0;
    if (skewWrapper && !prefersReducedMotion) {
      const targetSkew = Math.max(-3.5, Math.min(3.5, velocity * 0.035));
      skewWrapper.style.transform = `skewY(${targetSkew.toFixed(2)}deg)`;
    }

    // Marquee movement
    const baseSpeed = 1.0;
    const scrollBonus = Math.abs(velocity) * 0.25;
    if (marquee1) {
      marqueePos1 -= (baseSpeed + scrollBonus) * (dt * 60);
      if (marqueePos1 < -1200) marqueePos1 = 0;
      marquee1.style.transform = `translate3d(${marqueePos1.toFixed(1)}px, 0, 0)`;
    }
    if (marquee2) {
      marqueePos2 += (baseSpeed + scrollBonus) * (dt * 60);
      if (marqueePos2 > 0) marqueePos2 = -1200;
      marquee2.style.transform = `translate3d(${marqueePos2.toFixed(1)}px, 0, 0)`;
    }

    // 6. Hero Particle Network Canvas
    drawHeroNetwork(dt);

    // 7. Confetti Canvas
    updateAndDrawConfetti(dt);
  }

  // Register master loop on GSAP ticker
  if (hasGSAP) {
    gsap.ticker.add((time) => {
      masterTick(time * 1000);
    });
  } else {
    function fallbackLoop(ts) {
      masterTick(ts);
      requestAnimationFrame(fallbackLoop);
    }
    requestAnimationFrame(fallbackLoop);
  }

  // =========================================================================
  // 7. HERO TYPEWRITER (CYCLING ROLES)
  // =========================================================================
  const heroTypingEl = document.getElementById('hero-typing');
  if (heroTypingEl) {
    const roles = [
      'CS & AI Student',
      'Problem Solver',
      'Python Learner',
      'Future Developer'
    ];
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingDelay = 110;

    function handleHeroTyping() {
      const currentRole = roles[roleIndex];
      if (isDeleting) {
        heroTypingEl.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
        typingDelay = 55;
      } else {
        heroTypingEl.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
        typingDelay = 110;
      }

      if (!isDeleting && charIndex === currentRole.length) {
        isDeleting = true;
        typingDelay = 1900;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        typingDelay = 400;
      }
      setTimeout(handleHeroTyping, typingDelay);
    }
    setTimeout(handleHeroTyping, 600);
  }

  // =========================================================================
  // 8. LETTER SCRAMBLE HOVER EFFECT (.scramble-hover)
  // =========================================================================
  const scrambleElements = document.querySelectorAll('.scramble-hover');
  const scrambleChars = '!<>-_\\/[]{}—=+*^?#0123456789';

  scrambleElements.forEach(el => {
    const originalText = el.getAttribute('data-text') || el.textContent;
    let scrambleInterval = null;

    el.addEventListener('mouseenter', () => {
      let iteration = 0;
      clearInterval(scrambleInterval);

      scrambleInterval = setInterval(() => {
        el.textContent = originalText
          .split('')
          .map((char, index) => {
            if (index < iteration) return originalText[index];
            return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
          })
          .join('');

        if (iteration >= originalText.length) {
          clearInterval(scrambleInterval);
        }
        iteration += 1 / 2;
      }, 35);
    });
  });

  // =========================================================================
  // 9. ABOUT BIO SCROLL-SCRUBBED TEXT COLOR REVEAL
  // =========================================================================
  const scrubBioEl = document.getElementById('about-scrub-bio');
  if (scrubBioEl && hasScrollTrigger && !prefersReducedMotion) {
    // Wrap words into spans while preserving highlight classes
    const childNodes = Array.from(scrubBioEl.childNodes);
    scrubBioEl.innerHTML = '';

    childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const words = node.textContent.split(/\s+/).filter(Boolean);
        words.forEach(w => {
          const span = document.createElement('span');
          span.className = 'word';
          span.textContent = w;
          scrubBioEl.appendChild(span);
          scrubBioEl.appendChild(document.createTextNode(' '));
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const words = node.textContent.split(/\s+/).filter(Boolean);
        words.forEach(w => {
          const span = document.createElement('span');
          span.className = `word ${node.className}`;
          span.textContent = w;
          scrubBioEl.appendChild(span);
          scrubBioEl.appendChild(document.createTextNode(' '));
        });
      }
    });

    const bioWords = scrubBioEl.querySelectorAll('.word');
    gsap.fromTo(bioWords, {
      opacity: 0.35
    }, {
      opacity: 1,
      stagger: 0.05,
      ease: 'none',
      scrollTrigger: {
        trigger: scrubBioEl,
        start: 'top 75%',
        end: 'bottom 45%',
        scrub: 0.5
      }
    });
  }

  // =========================================================================
  // 10. SKILLS CIRCULAR SVG PROGRESS & COUNTER ANIMATION
  // =========================================================================
  const skillCards = document.querySelectorAll('.skill-card');

  function triggerSkillAnimations(card) {
    const circle = card.querySelector('.circle-progress');
    const bar = card.querySelector('.skill-bar-fill');
    const percentEl = card.querySelector('.skill-percentage');
    if (!circle || !percentEl) return;

    const targetPct = parseInt(circle.getAttribute('data-percent'), 10) || 0;
    const circumference = 157.08; // 2 * PI * 25
    const offset = circumference - (targetPct / 100) * circumference;

    // Draw circular ring stroke
    circle.style.strokeDashoffset = offset;

    // Animate scaleX bar
    if (bar) {
      const progressVal = bar.getAttribute('data-progress') || '0';
      bar.style.transform = `scaleX(${progressVal})`;
    }

    // Number counter
    let current = 0;
    const duration = 1200;
    const stepTime = Math.max(15, Math.floor(duration / targetPct));
    const timer = setInterval(() => {
      current += 1;
      if (current >= targetPct) {
        current = targetPct;
        clearInterval(timer);
      }
      percentEl.textContent = `${current}%`;
    }, stepTime);
  }

  if (window.IntersectionObserver) {
    const skillObs = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          triggerSkillAnimations(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    skillCards.forEach(c => skillObs.observe(c));
  } else {
    skillCards.forEach(c => triggerSkillAnimations(c));
  }

  // =========================================================================
  // 11. CONTACT FORM VALIDATION & MORPHING BUTTON & CONFETTI
  // =========================================================================
  const contactForm = document.getElementById('contact-form');
  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const messageInput = document.getElementById('contact-message');
  const nameError = document.getElementById('name-error');
  const emailError = document.getElementById('email-error');
  const messageError = document.getElementById('message-error');
  const submitBtn = document.getElementById('submit-btn');
  const formSuccess = document.getElementById('form-success');
  const sendAnotherBtn = document.getElementById('send-another-btn');

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let isValid = true;

      if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
        nameInput.classList.add('error');
        nameError.textContent = 'Please enter your name (at least 2 characters).';
        isValid = false;
      } else {
        nameInput.classList.remove('error');
        nameError.textContent = '';
      }

      if (!validateEmail(emailInput.value.trim())) {
        emailInput.classList.add('error');
        emailError.textContent = 'Please provide a valid email address.';
        isValid = false;
      } else {
        emailInput.classList.remove('error');
        emailError.textContent = '';
      }

      if (!messageInput.value.trim() || messageInput.value.trim().length < 8) {
        messageInput.classList.add('error');
        messageError.textContent = 'Please write a message of at least 8 characters.';
        isValid = false;
      } else {
        messageInput.classList.remove('error');
        messageError.textContent = '';
      }

      if (isValid) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        setTimeout(() => {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
          contactForm.reset();
          if (formSuccess) formSuccess.classList.add('show');

          // Trigger Confetti Celebration Burst!
          const btnRect = submitBtn.getBoundingClientRect();
          triggerConfettiBurst(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2, 100);
        }, 750);
      }
    });

    [nameInput, emailInput, messageInput].forEach(inp => {
      if (!inp) return;
      inp.addEventListener('input', () => {
        inp.classList.remove('error');
        const errSpan = document.getElementById(`${inp.name}-error`);
        if (errSpan) errSpan.textContent = '';
      });
    });

    if (sendAnotherBtn && formSuccess) {
      sendAnotherBtn.addEventListener('click', () => {
        formSuccess.classList.remove('show');
      });
    }
  }

  // Copy Email to Clipboard
  const copyBtn = document.getElementById('copy-email-btn');
  const copyText = document.getElementById('copy-btn-text');
  const emailTextEl = document.getElementById('contact-email-text');

  if (copyBtn && emailTextEl && copyText) {
    copyBtn.addEventListener('click', async () => {
      const emailToCopy = emailTextEl.textContent.trim();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(emailToCopy);
        } else {
          const temp = document.createElement('textarea');
          temp.value = emailToCopy;
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          document.body.removeChild(temp);
        }
        copyText.textContent = 'Copied!';
        copyBtn.style.borderColor = 'var(--cyan)';
        setTimeout(() => {
          copyText.textContent = 'Copy';
          copyBtn.style.borderColor = '';
        }, 2200);
      } catch (err) {
        copyText.textContent = 'Copied!';
        setTimeout(() => { copyText.textContent = 'Copy'; }, 2000);
      }
    });
  }

  // =========================================================================
  // 12. NAVBAR & ACTIVE LINK TRACKING
  // =========================================================================
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('main > section');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      navToggle.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        navMenu.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');

        // Smooth scroll with Lenis if active
        const targetId = link.getAttribute('href');
        if (targetId && targetId.startsWith('#') && lenis) {
          e.preventDefault();
          const targetSection = document.querySelector(targetId);
          if (targetSection) lenis.scrollTo(targetSection, { offset: -70 });
        }
      });
    });
  }

  function updateActiveNavLink() {
    const scrollPos = (window.scrollY || document.documentElement.scrollTop) + 140;
    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      const id = sec.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  // Back to Top Button
  const backToTopBtn = document.getElementById('back-to-top-btn');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  // =========================================================================
  // 13. SCROLLTRIGGER REVEALS & HERO ENTRANCE (SYNCHRONIZED WITH INTRO)
  // =========================================================================
  function initHeroEntrance() {
    if (prefersReducedMotion || !hasGSAP) {
      document.querySelectorAll('.hero-reveal, .hero-line-inner').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    // Masked Title Lines Rise Up
    gsap.fromTo('.hero-line-inner', {
      yPercent: 120,
      opacity: 0
    }, {
      yPercent: 0,
      opacity: 1,
      duration: 1.1,
      stagger: 0.15,
      ease: 'expo.out'
    });

    // Badge, Typing & Buttons
    gsap.fromTo('.hero-reveal', {
      opacity: 0,
      y: 35
    }, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: 'power3.out'
    });
  }

  function initScrollTriggers() {
    if (prefersReducedMotion || !hasScrollTrigger) {
      document.querySelectorAll('.scroll-reveal, .project-card-wrap').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    // Section Titles Wipe & Underline
    document.querySelectorAll('.section-header').forEach(header => {
      ScrollTrigger.create({
        trigger: header,
        start: 'top 85%',
        onEnter: () => header.classList.add('active')
      });
    });

    // General scroll reveals
    document.querySelectorAll('.scroll-reveal').forEach(el => {
      gsap.fromTo(el, {
        opacity: 0,
        y: 45
      }, {
        opacity: 1,
        y: 0,
        duration: 0.85,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      });
    });

    // Alternating side entrance for project cards
    const leftCard = document.querySelector('.project-reveal-left');
    const centerCard = document.querySelector('.project-reveal-center');
    const rightCard = document.querySelector('.project-reveal-right');

    if (leftCard) {
      gsap.fromTo(leftCard, { opacity: 0, x: -70 }, {
        opacity: 1, x: 0, duration: 1.0, ease: 'expo.out',
        scrollTrigger: { trigger: leftCard, start: 'top 85%' }
      });
    }
    if (centerCard) {
      gsap.fromTo(centerCard, { opacity: 0, y: 70 }, {
        opacity: 1, y: 0, duration: 1.0, ease: 'expo.out',
        scrollTrigger: { trigger: centerCard, start: 'top 85%' }
      });
    }
    if (rightCard) {
      gsap.fromTo(rightCard, { opacity: 0, x: 70 }, {
        opacity: 1, x: 0, duration: 1.0, ease: 'expo.out',
        scrollTrigger: { trigger: rightCard, start: 'top 85%' }
      });
    }
  }

  // =========================================================================
  // 14. EASTER EGG ('K' KEY OR TYPING "ishan")
  // =========================================================================
  let keySequence = '';
  window.addEventListener('keydown', (e) => {
    // Single key 'K' or 'k'
    if (e.key === 'k' || e.key === 'K') {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      triggerConfettiBurst(window.innerWidth / 2, window.innerHeight / 2, 120);
    }

    // Secret keyword "ishan"
    keySequence += e.key.toLowerCase();
    if (keySequence.length > 10) keySequence = keySequence.slice(-10);
    if (keySequence.endsWith('ishan')) {
      triggerConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 150);
      keySequence = '';
    }
  });

  // Start Main Entrance when Intro finishes
  window.addEventListener('introComplete', () => {
    initHeroEntrance();
    initScrollTriggers();
  });

  // If intro overlay was already absent
  const introOverlay = document.getElementById('intro-overlay');
  if (!introOverlay) {
    initHeroEntrance();
    initScrollTriggers();
  }

})();
