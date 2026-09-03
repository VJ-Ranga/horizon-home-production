# Mobile video section prototype

Standalone, non-production visual experiment for the first four requested sections:

1. Hero
2. Main / Bridge
3. Our Approach to Reporting
4. The Next Horizon of Intelligent Reporting

There is no Intro Statement, Glance, or later section in this demo. There are no text or interactive overlays. Each section owns a real timestamp range from `public/video-mobile/haycarb-540x960.mp4`, then freezes at its real settled portrait frame while the user scrolls normally to the next section. Nothing in `src/` imports this folder.

Preview from the repository root with `python3 -m http.server 4173`, then open `/mobile-video-prototype/` at a mobile viewport.
