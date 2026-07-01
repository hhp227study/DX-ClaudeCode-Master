// Mark that JS is available so reveal animations can hide their initial state.
document.documentElement.classList.add("has-js");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Nav links + their sections ──────────────────────────────────────────────
const links = Array.from(document.querySelectorAll(".nav-link"));
const sections = links
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const setActiveLink = (id) => {
  links.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
  });
};

// Immediate feedback on click — don't wait for the smooth scroll to settle.
links.forEach((link) => {
  link.addEventListener("click", () => {
    const id = link.getAttribute("href").slice(1);
    if (document.getElementById(id)) setActiveLink(id);
  });
});

// ── Scroll-spy ──────────────────────────────────────────────────────────────
// Activate whichever section the viewport's middle currently sits in. This is
// independent of each section's height — the previous ratio-based observer never
// fired for the very tall Portfolio section, so its nav item never lit up.
const activateCurrent = () => {
  const mid = window.innerHeight / 2;
  let current = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= mid) {
      current = section;
    }
  }
  if (current) {
    setActiveLink(current.id);
  }
};

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    activateCurrent();
    ticking = false;
  });
};

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
activateCurrent();

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
