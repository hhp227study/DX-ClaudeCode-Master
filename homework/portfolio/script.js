// Mark that JS is available so reveal animations can hide their initial state.
document.documentElement.classList.add("has-js");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Scroll-spy: highlight the nav link for the section in view ──────────────
const links = Array.from(document.querySelectorAll(".nav-link"));
const sections = links
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const setActiveLink = (id) => {
  links.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
  });
};

const spy = new IntersectionObserver(
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

sections.forEach((section) => spy.observe(section));

// ── Project carousel: snap scrolling with buttons, ticks, counter ───────────
const carousel = document.querySelector(".carousel");

if (carousel) {
  const track = carousel.querySelector(".carousel-track");
  const slides = Array.from(track.children);
  const prevBtn = carousel.querySelector(".carousel-btn.prev");
  const nextBtn = carousel.querySelector(".carousel-btn.next");
  const counter = carousel.querySelector(".carousel-counter .current");
  const ticks = Array.from(carousel.querySelectorAll(".carousel-tick"));
  let index = 0;

  const goTo = (i) => {
    const target = slides[Math.max(0, Math.min(slides.length - 1, i))];
    track.scrollTo({
      left: target.offsetLeft,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  const update = () => {
    // The active slide is the one whose center is closest to the viewport center.
    const center = track.scrollLeft + track.clientWidth / 2;
    let best = Infinity;

    slides.forEach((slide, i) => {
      const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center);
      if (distance < best) {
        best = distance;
        index = i;
      }
    });

    counter.textContent = String(index + 1).padStart(2, "0");
    ticks.forEach((tick, i) => {
      tick.classList.toggle("active", i === index);
      tick.setAttribute("aria-current", i === index ? "true" : "false");
    });
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;
  };

  let scheduled = 0;
  const scheduleUpdate = () => {
    cancelAnimationFrame(scheduled);
    scheduled = requestAnimationFrame(update);
  };

  track.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);

  prevBtn.addEventListener("click", () => goTo(index - 1));
  nextBtn.addEventListener("click", () => goTo(index + 1));
  ticks.forEach((tick, i) => tick.addEventListener("click", () => goTo(i)));

  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      goTo(event.key === "ArrowLeft" ? index - 1 : index + 1);
    }
  });

  update();
}

// ── Reveal elements as they scroll into view ────────────────────────────────
const revealItems = Array.from(document.querySelectorAll(".reveal"));

if (prefersReducedMotion) {
  revealItems.forEach((item) => item.classList.add("in"));
} else {
  const reveal = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
  );

  revealItems.forEach((item) => reveal.observe(item));
}
