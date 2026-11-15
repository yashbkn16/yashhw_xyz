// Scramble effect: hovering a link, button, the name or the location shuffles
// every character for a moment, then they settle back left to right.
// Body text never moves; only the "chrome" around it does.
// This is the only script on the home and CV pages.

const TARGETS = 'nav a, .links a, button, [data-scramble]';
const FRAMES = 50; // 50 frames × 30ms = 1.5s, whatever the length

// Random printable character from "A" (65) to "}" (125): letters plus [ \ ] ^ _ ` { | }
const randomChar = () => String.fromCharCode(65 + Math.floor(Math.random() * 61));

function scramble(el) {
  const text = (el.dataset.text ??= el.textContent); // remember the real text once
  let frame = 0;

  clearInterval(el.timer);
  el.timer = setInterval(() => {
    const settled = Math.floor((++frame / FRAMES) * text.length); // characters already back in place
    // Everything shuffles, brackets included; only spaces hold still so words keep their shape.
    el.textContent = [...text].map((ch, i) => (i < settled || ch === ' ' ? ch : randomChar())).join('');
    if (frame >= FRAMES) clearInterval(el.timer);
  }, 30);
}

// Each one scrambles the first time it comes into view (as the page opens for
// anything on screen, while the content drops in; see "Page entrance" in
// style.css), then again on every hover, or tap on a phone.
// Skipped entirely for people who asked their OS for less motion.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const firstSight = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) { scramble(target); firstSight.unobserve(target); }
    }
  });
  document.querySelectorAll(TARGETS).forEach((el) => {
    firstSight.observe(el);
    el.addEventListener('mouseenter', () => scramble(el));
  });
}
