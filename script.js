// ─── NAVBAR SCROLL EFFECT ───
const navbar = document.getElementById('navbar');
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  if (scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  lastScroll = scrollY;
});

// ─── SCROLL REVEAL ANIMATIONS ───
const revealElements = document.querySelectorAll('.reveal');
const observerOptions = {
  root: null,
  rootMargin: '0px 0px -60px 0px',
  threshold: 0.1
};
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      // Stagger delay for siblings
      const siblings = entry.target.parentElement.querySelectorAll('.reveal');
      let delay = 0;
      siblings.forEach((sib, i) => {
        if (sib === entry.target) delay = i * 80;
      });
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

revealElements.forEach(el => observer.observe(el));

// ─── SMOOTH SCROLL FOR ANCHOR LINKS ───
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    e.preventDefault();
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      const offsetTop = targetElement.offsetTop - 80;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  });
});

// ─── COUNTER ANIMATION ON HERO ───
function animateCounters() {
  const counters = document.querySelectorAll('.hero-meta-num');
  counters.forEach(counter => {
    const text = counter.textContent;
    // Skip non-numeric
    if (text.includes('★') || text === 'Free') return;

    const target = parseInt(text.replace(/[^0-9]/g, ''));
    const suffix = text.replace(/[0-9]/g, '');
    let current = 0;
    const duration = 1500;
    const increment = target / (duration / 16);

    const updateCounter = () => {
      current += increment;
      if (current < target) {
        counter.textContent = Math.floor(current) + suffix;
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = text;
      }
    };
    updateCounter();
  });
}

// Trigger counter animation when hero is in view
const heroObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounters();
      heroObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

heroObserver.observe(document.querySelector('.hero-section'));

// ─── PHONE CARD HOVER MICRO-ANIMATION ───
const miniCards = document.querySelectorAll('.mini-card');
miniCards.forEach((card, i) => {
  card.style.animation = `fade-up 0.5s ease ${0.5 + i * 0.15}s both`;
});
