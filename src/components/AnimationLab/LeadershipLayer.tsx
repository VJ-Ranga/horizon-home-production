"use client";

import { useEffect, useRef, useState } from "react";
import { SECTIONS } from "./timeline";
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

  useFrameEffect((frame) => {
    currentFrameRef.current = frame;
    videoDialog.sync(frame);
  });

  useFrameEffect((frame) => {
    const element = ref.current;
    if (!element) return;

    if (!isCompact) {
      element.classList.remove("is-scrollable");
      return;
    }

    const scrollUnlocked = frame >= LEADERSHIP.settledFrame &&
      frame <= (LEADERSHIP.exit?.frames[1] ?? LEADERSHIP.settledFrame);
    element.classList.toggle("is-scrollable", scrollUnlocked);
    if (!scrollUnlocked) element.scrollTop = 0;
  });

  useEffect(() => () => {
    ref.current?.classList.remove("is-scrollable");
  }, [ref]);

  return (
    <div className="lab-layer s-leadership5" ref={ref} data-section={LEADERSHIP.id} data-initial-hidden="true" aria-labelledby="leadership5-title">
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
