const links = Array.from(document.querySelectorAll(".nav-link"));
const sections = links
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const setActiveLink = (id) => {
  links.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
  });
};

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible) {
      setActiveLink(visible.target.id);
    }
  },
  {
    rootMargin: "-22% 0px -58% 0px",
    threshold: [0.12, 0.3, 0.6],
  },
);

sections.forEach((section) => observer.observe(section));

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;
const canvas = document.querySelector("#particle-canvas");

if (canvas && !reduceMotion && !coarsePointer) {
  const context = canvas.getContext("2d");
  const particles = [];
  const maxParticles = 46;
  const colors = ["rgba(15, 123, 99,", "rgba(199, 141, 33,", "rgba(198, 95, 74,"];
  let width = 0;
  let height = 0;
  let animationFrame = null;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const addParticle = (x, y) => {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      size: Math.random() * 7 + 3,
      life: 1,
      decay: Math.random() * 0.018 + 0.018,
      color: colors[Math.floor(Math.random() * colors.length)],
    });

    if (particles.length > maxParticles) {
      particles.shift();
    }
  };

  const render = () => {
    context.clearRect(0, 0, width, height);

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= particle.decay;

      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }

      context.beginPath();
      context.fillStyle = `${particle.color} ${particle.life * 0.34})`;
      context.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      context.fill();
    }

    animationFrame = requestAnimationFrame(render);
  };

  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;

  window.addEventListener(
    "mousemove",
    (event) => {
      const now = performance.now();
      const distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);

      if (now - lastTime > 18 || distance > 16) {
        addParticle(event.clientX, event.clientY);
        lastX = event.clientX;
        lastY = event.clientY;
        lastTime = now;
      }
    },
    { passive: true },
  );

  window.addEventListener("resize", resize, { passive: true });
  resize();
  render();

  window.addEventListener("pagehide", () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });
}
