/**
 * ISHAN - MAIN PORTFOLIO SCRIPTS
 * Hero particle network, typewriter, magnetic buttons, 3D tilt,
 * ScrollTrigger reveals, skill counters, form validation & custom cursor.
 */

(function () {
  'use strict';

  // State
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== 'undefined';

  if (hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // =========================================================================
  // 1. SCROLL PROGRESS BAR
  // =========================================================================
  const scrollProgress = document.getElementById('scroll-progress');

  function updateScrollProgress() {
    if (!scrollProgress) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    scrollProgress.style.width = `${percent}%`;
    scrollProgress.setAttribute('aria-valuenow', Math.round(percent));
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });

  // =========================================================================
  // 2. CUSTOM GLOWING CURSOR (FLUID LERP)
  // =========================================================================
  const cursorDot = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');

  if (cursorDot && cursorRing && !prefersReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let isCursorVisible = false;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isCursorVisible) {
        isCursorVisible = true;
        cursorDot.style.opacity = '1';
        cursorRing.style.opacity = '1';
      }
      cursorDot.style.left = `${mouseX}px`;
      cursorDot.style.top = `${mouseY}px`;
    });

    window.addEventListener('mouseleave', () => {
      isCursorVisible = false;
      cursorDot.style.opacity = '0';
      cursorRing.style.opacity = '0';
    });

    // Smooth lerp loop for outer ring
    function renderCursor() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorRing.style.left = `${ringX}px`;
      cursorRing.style.top = `${ringY}px`;
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    // Hover detection for interactive elements
    const interactiveSelectors = 'a, button, input, textarea, .project-card, .skill-card, .magnetic-btn';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactiveSelectors)) {
        document.body.classList.add('cursor-hover');
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactiveSelectors)) {
        document.body.classList.remove('cursor-hover');
      }
    });
  }

  // =========================================================================
  // 3. STICKY NAVBAR & MOBILE MENU & ACTIVE LINK
  // =========================================================================
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('main > section');

  // Sticky nav background styling
  function handleNavScroll() {
    if (!navbar) return;
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', handleNavScroll, { passive: true });

  // Mobile menu toggle
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      navToggle.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close when clicking nav link
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('open') && !navMenu.contains(e.target) && !navToggle.contains(e.target)) {
        navMenu.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Active section indicator on scroll
  function updateActiveNavLink() {
    const scrollPos = window.scrollY + 120;
    sections.forEach((section) => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach((link) => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }
  window.addEventListener('scroll', updateActiveNavLink, { passive: true });

  // =========================================================================
  // 4. HERO INTERACTIVE PARTICLE NETWORK CANVAS
  // =========================================================================
  const heroCanvas = document.getElementById('hero-network-canvas');
  if (heroCanvas) {
    const ctx = heroCanvas.getContext('2d');
    let width = (heroCanvas.width = heroCanvas.offsetWidth);
    let height = (heroCanvas.height = heroCanvas.offsetHeight);

    const isMobile = window.innerWidth < 768;
    const NODE_COUNT = isMobile ? 35 : 75;
    const MAX_DISTANCE = isMobile ? 95 : 140;

    let mouse = { x: null, y: null, radius: 140 };

    window.addEventListener('mousemove', (e) => {
      const rect = heroCanvas.getBoundingClientRect();
      if (e.clientY <= rect.bottom && e.clientY >= rect.top) {
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
      } else {
        mouse.x = null;
        mouse.y = null;
      }
    });

    window.addEventListener('mouseleave', () => {
      mouse.x = null;
      mouse.y = null;
    });

    class NetworkNode {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.7;
        this.vy = (Math.random() - 0.5) * 0.7;
        this.radius = Math.random() * 2 + 1.2;

        const colors = ['#00e5ff', '#8a2be2', '#ff3df2'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce at boundaries
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse interaction
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            const angle = Math.atan2(dy, dx);
            this.x -= Math.cos(angle) * force * 3;
            this.y -= Math.sin(angle) * force * 3;
          }
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();
      }
    }

    const nodes = Array.from({ length: NODE_COUNT }, () => new NetworkNode());

    function animateNetwork() {
      ctx.clearRect(0, 0, width, height);

      // Draw connecting lines between close nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);

          if (dist < MAX_DISTANCE) {
            const alpha = (1 - dist / MAX_DISTANCE) * 0.28;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((node) => {
        node.update();
        node.draw();
      });

      requestAnimationFrame(animateNetwork);
    }

    requestAnimationFrame(animateNetwork);

    window.addEventListener('resize', () => {
      width = heroCanvas.width = heroCanvas.offsetWidth;
      height = heroCanvas.height = heroCanvas.offsetHeight;
    });
  }

  // =========================================================================
  // 5. HERO TYPEWRITER (CYCLING ROLES)
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
        // Pause at full word
        isDeleting = true;
        typingDelay = 1900;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        typingDelay = 400;
      }

      setTimeout(handleHeroTyping, typingDelay);
    }

    // Start cycling
    setTimeout(handleHeroTyping, 600);
  }

  // =========================================================================
  // 6. MAGNETIC BUTTONS
  // =========================================================================
  if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
    const magneticBtns = document.querySelectorAll('.magnetic-btn');

    magneticBtns.forEach((btn) => {
      const strength = parseFloat(btn.getAttribute('data-strength')) || 25;

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) / (rect.width / 2);
        const deltaY = (e.clientY - centerY) / (rect.height / 2);

        btn.style.transform = `translate(${deltaX * (strength * 0.4)}px, ${deltaY * (strength * 0.4)}px)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0px, 0px)';
      });
    });
  }

  // =========================================================================
  // 7. 3D TILT CARDS & SPECULAR GLARE
  // =========================================================================
  if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
    const tiltCards = document.querySelectorAll('.tilt-card');

    tiltCards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = -((y - centerY) / centerY) * 9;
        const rotateY = ((x - centerX) / centerX) * 9;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

        // Update glare coordinates
        card.style.setProperty('--glare-x', `${x}px`);
        card.style.setProperty('--glare-y', `${y}px`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });
    });
  }

  // =========================================================================
  // 8. SKILLS PROGRESS FILL & COUNTER ANIMATION
  // =========================================================================
  const skillCards = document.querySelectorAll('.skill-card');

  function animateSkill(card) {
    const fillBar = card.querySelector('.skill-bar-fill');
    const percentEl = card.querySelector('.skill-percentage');
    if (!fillBar || !percentEl) return;

    const targetProgress = fillBar.getAttribute('data-progress') || '0%';
    const targetValue = parseInt(percentEl.getAttribute('data-target'), 10) || 0;

    // Trigger fill width
    fillBar.style.width = targetProgress;

    // Counter animation
    let current = 0;
    const duration = 1200;
    const stepTime = Math.max(15, Math.floor(duration / targetValue));
    const counterTimer = setInterval(() => {
      current += 1;
      if (current >= targetValue) {
        current = targetValue;
        clearInterval(counterTimer);
      }
      percentEl.textContent = `${current}%`;
    }, stepTime);
  }

  // Trigger skills when visible
  if (window.IntersectionObserver) {
    const skillObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateSkill(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });

    skillCards.forEach((card) => skillObserver.observe(card));
  } else {
    // Fallback: fill immediately
    skillCards.forEach((card) => animateSkill(card));
  }

  // =========================================================================
  // 9. CONTACT FORM VALIDATION & SUCCESS ANIMATION & EMAIL COPY
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

      // Name validation
      if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
        nameInput.classList.add('error');
        nameError.textContent = 'Please enter your name (at least 2 characters).';
        isValid = false;
      } else {
        nameInput.classList.remove('error');
        nameError.textContent = '';
      }

      // Email validation
      if (!validateEmail(emailInput.value.trim())) {
        emailInput.classList.add('error');
        emailError.textContent = 'Please provide a valid email address.';
        isValid = false;
      } else {
        emailInput.classList.remove('error');
        emailError.textContent = '';
      }

      // Message validation
      if (!messageInput.value.trim() || messageInput.value.trim().length < 8) {
        messageInput.classList.add('error');
        messageError.textContent = 'Please write a message of at least 8 characters.';
        isValid = false;
      } else {
        messageInput.classList.remove('error');
        messageError.textContent = '';
      }

      if (isValid) {
        // Show submitting state on button
        const origText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Sending...</span>';

        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
          contactForm.reset();
          if (formSuccess) {
            formSuccess.classList.add('show');
          }
        }, 650);
      }
    });

    // Reset error states on user input
    [nameInput, emailInput, messageInput].forEach((input) => {
      if (!input) return;
      input.addEventListener('input', () => {
        input.classList.remove('error');
        const errSpan = document.getElementById(`${input.name}-error`);
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
          // Fallback
          const tempArea = document.createElement('textarea');
          tempArea.value = emailToCopy;
          document.body.appendChild(tempArea);
          tempArea.select();
          document.execCommand('copy');
          document.body.removeChild(tempArea);
        }
        copyText.textContent = 'Copied!';
        copyBtn.style.borderColor = 'var(--cyan)';
        setTimeout(() => {
          copyText.textContent = 'Copy';
          copyBtn.style.borderColor = '';
        }, 2500);
      } catch (err) {
        copyText.textContent = 'Copied!';
        setTimeout(() => { copyText.textContent = 'Copy'; }, 2000);
      }
    });
  }

  // =========================================================================
  // 10. HERO ENTRANCE & SCROLLTRIGGER REVEALS (SYNCHRONIZED WITH INTRO)
  // =========================================================================
  function initHeroAnimations() {
    if (prefersReducedMotion || !hasGSAP) {
      // Direct visibility fallback
      document.querySelectorAll('.hero-reveal').forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    gsap.fromTo('.hero-reveal', {
      opacity: 0,
      y: 40
    }, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      stagger: 0.18,
      ease: 'power3.out'
    });
  }

  function initScrollTriggers() {
    if (prefersReducedMotion || !hasScrollTrigger) {
      document.querySelectorAll('.scroll-reveal').forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach((el) => {
      gsap.fromTo(el, {
        opacity: 0,
        y: 45
      }, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });
    });
  }

  // Hero Parallax on mouse move
  if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
    const heroSection = document.getElementById('hero');
    const heroBlobs = document.querySelectorAll('.hero-blob');
    if (heroSection) {
      heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        const offsetX = (e.clientX - (rect.left + rect.width / 2)) / 35;
        const offsetY = (e.clientY - (rect.top + rect.height / 2)) / 35;

        heroBlobs.forEach((blob, idx) => {
          const factor = (idx + 1) * 0.7;
          blob.style.transform = `translate(${offsetX * factor}px, ${offsetY * factor}px)`;
        });
      });
    }
  }

  // Kick off hero animations when intro completes
  window.addEventListener('introComplete', () => {
    initHeroAnimations();
    initScrollTriggers();
  });

  // If intro overlay was already absent at start (e.g. session storage or reduced motion)
  const introOverlay = document.getElementById('intro-overlay');
  if (!introOverlay) {
    initHeroAnimations();
    initScrollTriggers();
  }

})();

