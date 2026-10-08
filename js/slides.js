/* ============================================================
   Fieldwork slideshow — calm crossfade, ~5s per photograph.
   Respects prefers-reduced-motion (manual controls only).
   No external assets; all photographs are local fieldwork.
   ============================================================ */
(function slideshow() {
  document.addEventListener("DOMContentLoaded", init);

  const DURATION = 5000;

  function init() {
    const frame = document.getElementById("slidesFrame");
    if (!frame) return;
    const imgs = Array.from(frame.querySelectorAll("img"));
    if (imgs.length < 2) return;

    const count = document.getElementById("slideCount");
    const bar = document.getElementById("slideBar");
    const prev = document.getElementById("slidePrev");
    const next = document.getElementById("slideNext");
    const pauseBtn = document.getElementById("slidePause");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    let timer = null;
    let paused = reduceMotion; // start paused when reduced motion is preferred

    const pad = (n) => String(n).padStart(2, "0");

    function show(n) {
      i = (n + imgs.length) % imgs.length;
      imgs.forEach((img, k) => img.classList.toggle("current", k === i));
      if (count) count.textContent = `${pad(i + 1)} / ${pad(imgs.length)}`;
      restartBar();
    }

    function restartBar() {
      if (!bar || reduceMotion) return;
      bar.classList.remove("go");
      void bar.offsetWidth; // restart the CSS animation
      if (!paused) bar.classList.add("go");
    }

    function schedule() {
      clearTimeout(timer);
      if (paused) return;
      timer = setTimeout(() => { show(i + 1); schedule(); }, DURATION);
    }

    function setPaused(p) {
      paused = p;
      clearTimeout(timer);
      if (bar) bar.classList.remove("go");
      if (pauseBtn) {
        pauseBtn.textContent = paused ? "Play" : "Pause";
        pauseBtn.setAttribute("aria-label", paused ? "Play automatic slideshow" : "Pause automatic slideshow");
      }
      if (!paused) { restartBar(); schedule(); }
    }

    if (prev) prev.addEventListener("click", () => { show(i - 1); schedule(); });
    if (next) next.addEventListener("click", () => { show(i + 1); schedule(); });
    if (pauseBtn) {
      if (reduceMotion) {
        pauseBtn.textContent = "Play";
        pauseBtn.setAttribute("aria-label", "Play automatic slideshow");
      }
      pauseBtn.addEventListener("click", () => setPaused(!paused));
    }

    // Pause on hover (desktop), keyboard arrows on the frame
    frame.addEventListener("mouseenter", () => { if (!paused && !reduceMotion) { clearTimeout(timer); if (bar) bar.classList.remove("go"); } });
    frame.addEventListener("mouseleave", () => { if (!paused && !reduceMotion) { restartBar(); schedule(); } });
    frame.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { show(i - 1); schedule(); }
      if (e.key === "ArrowRight") { show(i + 1); schedule(); }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearTimeout(timer);
      else if (!paused) schedule();
    });

    show(0);
    schedule();
  }
})();
