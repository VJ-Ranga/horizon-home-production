"use client";

import { useEffect, useRef, useState } from "react";
import { SECTIONS, readPxPerFrame, scrollPxForFrame } from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";
import { createVideoDialogController } from "./videoDialogController";

const LEADERSHIP = SECTIONS[11];
const POPUP_CLOSE_AFTER_FRAMES = 5;
const JOINT_MESSAGE_VIDEO_SRC =
  "https://www.youtube.com/embed/K_rvL8qpuDc?autoplay=1&rel=0";

const LANGUAGE_PDFS: { label: string; file: string }[] = [
  { label: "English", file: "Leadership Message - English.pdf" },
  { label: "Sinhala", file: "Leadership Message - Sinhala.pdf" },
  { label: "Tamil", file: "Leadership Message - Tamil.pdf" },
  { label: "Chinese", file: "Leadership Message - Chinese.pdf" },
  { label: "Thai", file: "Leadership Message - Thai.pdf" },
  { label: "German", file: "Leadership Message - German.pdf" },
  { label: "Bahasa Indonesia", file: "Leadership Message - Bahasa.pdf" },
];

function AssetIcon({ file }: { file: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/leadership/web-icons/${encodeURIComponent(file)}`} alt="" aria-hidden="true" />;
}

function CaretIcon() {
  return <svg className="s-leadership5__lang-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
}

function LanguageDropdown() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`s-leadership5__lang${open ? " is-open" : ""}`} ref={wrapRef}>
      <a
        className="s-leadership5__pill s-leadership5__lang-toggle lab-shine"
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <AssetIcon file="Web Icons-16.svg" />
        <span>Select Your Language</span>
        <CaretIcon />
      </a>
      <ul className="s-leadership5__lang-menu" role="menu">
        {LANGUAGE_PDFS.map(({ label, file }) => (
          <li role="none" key={label}>
            <a
              role="menuitem"
              href={`/pdf/home/12-leadership/${encodeURIComponent(file)}`}
              download
              onClick={() => setOpen(false)}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LeadershipLayer() {
  const ref = useSectionLayer(LEADERSHIP);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoFrameRef = useRef<HTMLIFrameElement>(null);
  const currentFrameRef = useRef(LEADERSHIP.settledFrame);
  // The internal-scroll fallback (.is-scrollable + data-lenis-prevent)
  // only exists <=1100px — the section is a fixed-viewport composition on
  // desktop. Gating it here keeps that machinery off desktop entirely,
  // where it otherwise put data-lenis-prevent on the full-viewport layer
  // (killing page smooth-scroll once the section became interactive) and
  // toggled a no-op class on every frame near the settle point.
  const [isCompact, setIsCompact] = useState(false);
  // Phones (<=700px): the flaky inner-scrollbox is replaced with a
  // continuous scroll-through — the whole content block glides up 1:1
  // with the page across this section's pinned budget, like Strategy.
  // No freeze plateau, so a fast flick can't skip the section.
  const [mobileThrough, setMobileThrough] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [videoDialog] = useState(() =>
    createVideoDialogController({
      closeAfterFrames: POPUP_CLOSE_AFTER_FRAMES,
      getCurrentFrame: () => currentFrameRef.current,
      getDialog: () => dialogRef.current,
      getVideoFrame: () => videoFrameRef.current,
      src: JOINT_MESSAGE_VIDEO_SRC,
    })
  );

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1100px)");
    const update = () => setIsCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => setMobileThrough(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Mobile scroll-through glide (mirrors StrategyLayer). Only runs on
  // phones; the >700px paths are untouched.
  useEffect(() => {
    if (!mobileThrough) return;
    let rafId = 0;
    let current = 0;
    const pxPerFrame = readPxPerFrame();
    const startPx = scrollPxForFrame(LEADERSHIP.settledFrame, pxPerFrame);
    // The section's frame is pinned at settledFrame across holdFrames +
    // virtualExitFrames of scroll — that stretch is the glide budget.
    const budgetPx =
      ((LEADERSHIP.holdFrames ?? 0) + (LEADERSHIP.virtualExitFrames ?? 0)) *
      pxPerFrame;
    const EASE = 0.16;
    const BOTTOM_PAD = 40;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const body = bodyRef.current;
      if (!body) return;
      const overflow = Math.max(
        body.scrollHeight - window.innerHeight + BOTTOM_PAD,
        0,
      );
      // Track scroll 1:1 where the content fits the budget; never
      // consume more than the pinned budget, so the glide always
      // finishes before the section exits.
      const sweep = overflow > 0 ? Math.min(budgetPx, overflow) : budgetPx;
      const target =
        sweep > 0
          ? Math.min(Math.max((window.scrollY - startPx) / sweep, 0), 1)
          : 0;
      current += (target - current) * EASE;
      if (Math.abs(target - current) < 0.0004) current = target;
      body.style.transform = `translate3d(0, ${(-current * overflow).toFixed(2)}px, 0)`;
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      if (bodyRef.current) bodyRef.current.style.transform = "";
    };
  }, [mobileThrough]);

  useFrameEffect((frame) => {
    currentFrameRef.current = frame;
    videoDialog.sync(frame);
  });

  useFrameEffect((frame) => {
    const element = ref.current;
    if (!element) return;

    // Desktop (>1100) and phones (<=700, which use the scroll-through
    // glide instead) both skip the inner-scrollbox machinery. Only the
    // 701-1100 tablet range keeps it.
    if (!isCompact || mobileThrough) {
      element.classList.remove("is-scrollable");
      element.removeAttribute("data-lenis-prevent");
      return;
    }

    const scrollUnlocked = frame >= LEADERSHIP.settledFrame &&
      frame <= (LEADERSHIP.exit?.frames[1] ?? LEADERSHIP.settledFrame);
    element.classList.toggle("is-scrollable", scrollUnlocked);
    // Fence Lenis off only while the section is holding and its content
    // actually overflows — otherwise the enter/exit swipe stalls here
    // (Lenis ignored, root not yet scrollable). `contain` on the child
    // lets a swipe past the inner edge fall through to the timeline.
    if (scrollUnlocked && element.scrollHeight > element.clientHeight) {
      element.setAttribute("data-lenis-prevent", "");
    } else {
      element.removeAttribute("data-lenis-prevent");
      element.scrollTop = 0;
    }
  });

  useEffect(() => () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("is-scrollable");
    el.removeAttribute("data-lenis-prevent");
  }, [ref]);

  return (
    <div className="lab-layer s-leadership5" ref={ref} data-section={LEADERSHIP.id} data-initial-hidden="true" aria-labelledby="leadership5-title">
      {/* display:contents everywhere except <=700px, where it becomes a
          block the scroll-through glide translates — so the desktop /
          tablet DOM and layout are unchanged. */}
      <div className="s-leadership5__scrollbody" ref={bodyRef}>
      <header className="s-leadership5__head">
        <h1 id="leadership5-title">Leadership at Haycarb</h1>
        <p className="s-leadership5__intro">Our leadership team steers Haycarb with vision, integrity, and a long-term commitment to innovation<br />and sustainability. Shaped by experience and guided by purpose, they drive strategic<br />growth, empower people, and ensure we deliver value to stakeholders.</p>
      </header>

      <div className="s-leadership5__stage">
          <section className="s-leadership5__people" aria-label="Leadership messages">
            <article className="s-leadership5__person s-leadership5__person--chairman">
              <img className="s-leadership5__portrait s-leadership5__portrait-mobile s-leadership5__portrait-mobile--chairman" src="/leadership/MP-web-small.png" alt="Mohan Pandithage, Chairman" />
              <p className="s-leadership5__role">Chairman</p>
            <h2 className="s-leadership5__name">Mohan Pandithage</h2>
            <span className="s-leadership5__rule" aria-hidden="true" />
            <p className="s-leadership5__statement">The Group continued to demonstrate resilience and<br />adaptability amidst evolving market dynamics by further<br />strengthening its position within the value-added carbon<br />category while effectively navigating supply chain<br />constraints and an increasingly complex global operating<br />environment to deliver sustainable growth and consistent<br />shareholder value.</p>
            </article>
            <article className="s-leadership5__person s-leadership5__person--md">
              <img className="s-leadership5__portrait s-leadership5__portrait-mobile s-leadership5__portrait-mobile--md" src="/leadership/RK-web-small.png" alt="Rajitha Kariyawasan, Managing Director" />
              <p className="s-leadership5__role">Managing Director</p>
            <h2 className="s-leadership5__name">Rajitha Kariyawasan</h2>
            <span className="s-leadership5__rule" aria-hidden="true" />
            <p className="s-leadership5__statement">As a purpose-driven organisation, Haycarb remains<br />focused on addressing the world&apos;s evolving purification<br />and energy storage needs through sustainable innovation,<br />technical excellence and a strong culture of<br />customer-centricity, empowered by the capabilities of<br />our people.</p>
          </article>
        </section>

        <img className="s-leadership5__portrait s-leadership5__portrait--chairman" src="/leadership/MP-web-small.png" alt="Mohan Pandithage, Chairman" />
        <img className="s-leadership5__portrait s-leadership5__portrait--md" src="/leadership/RK-web-small.png" alt="Rajitha Kariyawasan, Managing Director" />
      </div>

      <nav className="s-leadership5__actions" aria-label="Leadership actions">
        <button
          className="s-leadership5__pill s-leadership5__pill--primary lab-shine"
          type="button"
          aria-haspopup="dialog"
          aria-controls="leadership-video-dialog"
          onClick={videoDialog.open}
        >
          <AssetIcon file="Web Icons-15.svg" />
          <span>Joint Message Video</span>
        </button>
        <LanguageDropdown />
        <a className="s-leadership5__pill lab-shine" href="/pdf/home/12-leadership/Board%20of%20Directors.pdf" target="_blank" rel="noopener noreferrer"><AssetIcon file="Web Icons-17.svg" /><span>Board of Directors</span></a>
        <a className="s-leadership5__pill lab-shine" href="/pdf/home/12-leadership/Management%20Team.pdf" target="_blank" rel="noopener noreferrer"><AssetIcon file="Web Icons-18.svg" /><span>Management Team</span></a>
      </nav>
      </div>

      <dialog
        ref={dialogRef}
        className="s-leadership5__video-dialog"
        id="leadership-video-dialog"
        aria-label="Leadership joint message video"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        onClose={videoDialog.handleClose}
      >
        <iframe
          ref={videoFrameRef}
          title="Leadership joint message video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
        <form method="dialog">
          <button
            className="s-leadership5__video-dialog-close"
            type="submit"
            aria-label="Close video"
          >
            ×
          </button>
        </form>
      </dialog>
    </div>
  );
}
