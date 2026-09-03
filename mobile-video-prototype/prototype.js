(() => {
  const sections = [...document.querySelectorAll(".media-section")];
  let activeIndex = -1;

  function playSectionMotion(index) {
    const section = sections[index];
    const video = section.querySelector(".section-motion");
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    section.classList.add("is-playing");
    void video.play().catch(() => {});
    const onTimeUpdate = () => {
      if (video.ended) {
        video.pause();
        section.classList.remove("is-playing");
        video.removeEventListener("timeupdate", onTimeUpdate);
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
  }

  function updateActiveSection() {
    const center = window.scrollY + window.innerHeight * 0.5;
    let nextIndex = 0;
    sections.forEach((section, index) => { if (section.offsetTop <= center) nextIndex = index; });
    if (nextIndex !== activeIndex) { activeIndex = nextIndex; playSectionMotion(activeIndex); }
  }

  let raf = 0;
  window.addEventListener("scroll", () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; updateActiveSection(); });
  }, { passive: true });
  updateActiveSection();
})();
