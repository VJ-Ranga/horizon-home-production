(() => {
  const video = document.querySelector("#section-motion");
  const sections = [...document.querySelectorAll(".video-section")];
  const frameCount = 1125;
  const durationSeconds = 247.233333;
  let activeIndex = -1;
  let replayToken = 0;
  const frameToTime = (frame) => (frame / frameCount) * durationSeconds;

  function playSectionMotion(index) {
    const section = sections[index];
    const start = frameToTime(Number(section.dataset.startFrame));
    const end = frameToTime(Number(section.dataset.endFrame));
    const token = ++replayToken;
    video.currentTime = start;
    video.classList.add("is-playing");
    void video.play().catch(() => {});
    const onTimeUpdate = () => {
      if (token !== replayToken) return;
      if (video.currentTime >= end) {
        video.pause();
        video.currentTime = end;
        video.classList.remove("is-playing");
        video.removeEventListener("timeupdate", onTimeUpdate);
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
  }

  function updateActiveSection() {
    const center = window.scrollY + window.innerHeight * 0.42;
    let nextIndex = 0;
    sections.forEach((section, index) => { if (section.offsetTop <= center) nextIndex = index; });
    if (nextIndex !== activeIndex) { activeIndex = nextIndex; playSectionMotion(activeIndex); }
  }

  let raf = 0;
  window.addEventListener("scroll", () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; updateActiveSection(); });
  }, { passive: true });
  document.querySelectorAll(".replay").forEach((button, index) => button.addEventListener("click", () => playSectionMotion(index)));
  updateActiveSection();
})();
