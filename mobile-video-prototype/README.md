# Mobile video section prototype

Standalone, non-production experiment for the first three content sections:

1. Our Approach to Reporting
2. The Next Horizon of Intelligent Reporting
3. Haycarb at a Glance

Each section owns a short timestamp range from `public/video-mobile/haycarb-540x960.mp4`, then freezes at the matching portrait frame and leaves its content as normal HTML. Nothing in `src/` imports this folder.

Preview from the repository root with `python3 -m http.server 4173`, then open `/mobile-video-prototype/` at a mobile viewport.
