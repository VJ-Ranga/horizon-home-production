"use client";

/* Foreground port of final/16-Community Impact.html. The shared video canvas
   supplies the source frame; this layer keeps the source tint, wash, cards,
   and the scroll-locked story rail.

   Content is the 7 spec stories (PDF p.18-19). Four have a YouTube video —
   their play button is a real <a target="_blank">; "Supporting University
   Students" has no video ("No link" in the spec) so it has no play button. */

import { useRef } from "react";
import { SECTIONS, readPxPerFrame, scrollPxForFrame } from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const COMMUNITY = SECTIONS[17];
const CARD_COUNT = COMMUNITY.carousel!.count;
const LEAD_PX = COMMUNITY.carousel!.leadPx;
const TAIL_PX = COMMUNITY.carousel!.tailPx;
const SWEEP_PX = COMMUNITY.carousel!.scrollPx - LEAD_PX - TAIL_PX;

const STORIES = [
  {
    image: "puritas-sath-diyawara.jpg",
    eyebrow: "Health & Wellbeing",
    title: "Puritas Sath Diyawara",
    body: "Purified drinking water for communities in CKD-affected areas",
    stat: ">45,000 People Impacted",
    video: "https://youtu.be/YhnEWT57dv8",
    alt: "Child collecting clean water from a purification tap",
  },
  {
    image: "sisu-diwi-pahana.jpg",
    eyebrow: "Education & Wellbeing",
    title: "Sisu Divi Pahana",
    body: "Nutritious mid day meals supporting student wellbeing, concentration and learning",
    stat: ">800 students/day across 16 schools",
    video: "https://youtu.be/2uwm2s0oUDU",
    alt: "Schoolchildren receiving a mid-day meal",
  },
  {
    image: "puritas-sath-diyawara-going-beyond.jpg",
    eyebrow: "Education & Livelihood Development",
    title: "Puritas Sath Diyawara – Going Beyond",
    body: "School supplies and livelihood support for CKD-affected communities",
    stat: ">2,500 beneficiaries",
    video: "https://youtu.be/gqjIoXtXyJg",
    alt: "Community members receiving school supplies",
  },
  {
    image: "behold-the-turtle.jpg",
    eyebrow: "Environmental Stewardship",
    title: "Behold the Turtle",
    body: "Protecting sea turtle nests, eggs and hatchlings along Sri Lanka’s coast",
    stat: "16,545 eggs protected",
    video: "https://youtu.be/1CB8pfPfCd8",
    alt: "Volunteer supporting a sea turtle conservation project",
  },
  {
    image: "supporting-university-students.jpg",
    eyebrow: "Education & Digital Inclusion",
    title: "Supporting University Students",
    body: "Laptops and scholarships supporting access to tertiary education",
    stat: ">300 students across 7 state universities",
    video: null,
    alt: "University students with laptops",
  },
  {
    image: "healthcare-support-negombo-general-hospital-renovation.jpg",
    eyebrow: "Health & Wellbeing",
    title: "Healthcare Support",
    body: "Critical hospital upgrades and related health initiatives supporting community wellbeing",
    stat: ">10,000 beneficiaries",
    video: null,
    alt: "Healthcare support at Negombo General Hospital",
  },
  {
    image: "eastern-province-coconut-seedling-distribution-programme.jpg",
    eyebrow: "Environmental Stewardship",
    title: "Eastern Province Coconut Seedling Distribution Programme",
    body: "Providing free coconut seedlings to farmers, in partnership with the Coconut Cultivation Board, to support rural livelihoods and long term cultivation",
    stat: "784 farmers",
    video: null,
    alt: "Coconut seedling distribution programme in the Eastern Province",
  },
];

// youtu.be/ID -> the embed URL the popup iframe loads (same shape as
// the Hero / Glance video dialogs).
const embedSrc = (url: string) =>
  `${url.replace("https://youtu.be/", "https://www.youtube.com/embed/")}?autoplay=1&rel=0`;

export default function CommunityLayer() {
  const ref = useSectionLayer(COMMUNITY);
  const railRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const videoFrameRef = useRef<HTMLIFrameElement | null>(null);

  const openVideo = (url: string) => {
    if (videoFrameRef.current) videoFrameRef.current.src = embedSrc(url);
    dialogRef.current?.showModal();
  };

  useFrameEffect((_frame, _phase, scrollPx) => {
    const startPx = scrollPxForFrame(COMMUNITY.settledFrame, readPxPerFrame());
    const rail = railRef.current;
    const viewport = viewportRef.current;
    const firstCard = rail?.querySelector<HTMLElement>(".s-community__card");
    if (!rail || !viewport || !firstCard) return;

    const sweepPx = Math.min(Math.max(scrollPx - startPx - LEAD_PX, 0), SWEEP_PX);
    const progress = (sweepPx / SWEEP_PX) * (CARD_COUNT - 1);
    const styles = window.getComputedStyle(rail);
    const mobileRail = window.matchMedia("(max-width: 700px)").matches;

    if (mobileRail) {
      const padStart = parseFloat(styles.paddingTop) || 0;
      const padEnd = parseFloat(styles.paddingBottom) || 0;
      const cardHeight = firstCard.offsetHeight;
      const start = viewport.clientHeight / 2 - cardHeight / 2 - padStart;
      const lastCardTop = rail.scrollHeight - padEnd - cardHeight;
      const end = viewport.clientHeight / 2 - cardHeight / 2 - lastCardTop;
      const y = start - (progress / (CARD_COUNT - 1)) * (start - end);
      rail.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      return;
    }

    const padStart = parseFloat(styles.paddingLeft) || 0;
    const padEnd = parseFloat(styles.paddingRight) || 0;
    const cardWidth = firstCard.offsetWidth;
    const start = viewport.clientWidth / 2 - cardWidth / 2 - padStart;
    const lastCardLeft = rail.scrollWidth - padEnd - cardWidth;
    const end = viewport.clientWidth / 2 - cardWidth / 2 - lastCardLeft;
    const x = start - (progress / (CARD_COUNT - 1)) * (start - end);
    rail.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
  });

  return (
    <div className="lab-layer s-community" ref={ref} data-section={COMMUNITY.id} data-initial-hidden="true" aria-labelledby="community-title">
      <div className="s-community__stage">
        <header className="s-community__head">
          <h1 className="s-community__heading" id="community-title">Community Impact</h1>
          <p className="s-community__intro">Creating lasting value beyond our business, we invest in communities through initiatives that promote education, wellbeing, environmental stewardship, and sustainable development.</p>
        </header>
        <div className="s-community__story-viewport" ref={viewportRef}>
          <div className="s-community__stories" ref={railRef} tabIndex={0} role="region" aria-label="Seven community stories, horizontally scrollable">
            {STORIES.map((story, index) => (
              <article className="s-community__card" key={`${story.title}-${index}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="s-community__card-image" src={`/community/${story.image}`} alt={story.alt} loading={index === 0 ? "eager" : "lazy"} decoding="async" />
                {story.video ? (
                  <button
                    type="button"
                    className="s-community__play"
                    aria-haspopup="dialog"
                    aria-label={`Watch: ${story.title}`}
                    onClick={() => openVideo(story.video as string)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z" /></svg>
                  </button>
                ) : null}
                <div className="s-community__copy">
                  <p className="s-community__card-eyebrow">{story.eyebrow}</p>
                  <h2 className="s-community__card-title">{story.title}</h2>
                  <p className="s-community__card-body">{story.body}</p>
                  <hr className="s-community__card-rule" />
                  <p className="s-community__card-stat">{story.stat}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="s-community__video-dialog"
        id="community-video-dialog"
        aria-label="Community story video"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        onClose={() => {
          if (videoFrameRef.current) videoFrameRef.current.src = "";
        }}
      >
        <iframe
          ref={videoFrameRef}
          title="Community story video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
        <form method="dialog">
          <button className="s-community__video-dialog-close" type="submit" aria-label="Close video">
            ×
          </button>
        </form>
      </dialog>
    </div>
  );
}
