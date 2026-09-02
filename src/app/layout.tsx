import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import GlobalHeader from "@/components/GlobalHeader";
import BackgroundMusic from "@/components/BackgroundMusic";

export const metadata: Metadata = {
  title: "Haycarb Annual Report 2025/26 | Beyond the Beyond",
  description:
    "Explore Haycarb\u2019s Annual Report 2025/26 through an interactive digital " +
    "experience covering performance, strategy, sustainability and value creation.",
  // Same favicon as the Horizon app, declared the same way, so the two
  // sites share one icon in the tab bar.
  icons: {
    icon: "/images/fav.png",
    shortcut: "/images/fav.png",
    apple: "/images/fav.png",
  },
};

/* Runs before hydration: if this browsing session has already watched the
   intro, mark <html> so globals.css can hide the overlay before the first
   paint. Returning to `/` from a feature page is a full page load, and the
   server always renders the overlay (it has no session), so without this the
   load screen would be painted and then yanked — a visible flash. The React
   side of this lives in AnimationLab, which drops the overlay on mount. */
const INTRO_SEEN_SCRIPT =
  "try{if(sessionStorage.getItem('horizon:intro-seen')==='1')" +
  "document.documentElement.classList.add('intro-seen')}catch(e){}";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the script above adds a class to <html>
    // before React hydrates, so the client attribute legitimately differs
    // from the server's. Same reason theme scripts need it.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans">
        <Script
          id="intro-seen"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: INTRO_SEEN_SCRIPT }}
        />
        <GlobalHeader />
        <BackgroundMusic />
        {children}
      </body>
    </html>
  );
}
