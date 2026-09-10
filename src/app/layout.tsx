import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import GlobalHeader from "@/components/GlobalHeader";
import BackgroundMusic from "@/components/BackgroundMusic";

export const metadata: Metadata = {
  metadataBase: new URL("https://annualreport.haycarb.com"),
  title: "Haycarb Annual Report 2025/26 | Beyond the Beyond",
  description:
    "Explore Haycarb\u2019s Annual Report 2025/26 through an interactive digital " +
    "experience covering performance, strategy, sustainability and value creation.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Haycarb PLC",
    title: "Haycarb Annual Report 2025/26 | Beyond the Beyond",
    description:
      "Explore Haycarb\u2019s Annual Report 2025/26 through an interactive digital " +
      "experience covering performance, strategy, sustainability and value creation.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Haycarb Annual Report 2025/26 - Beyond the Beyond",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Haycarb Annual Report 2025/26 | Beyond the Beyond",
    description:
      "Explore Haycarb\u2019s Annual Report 2025/26 through an interactive digital " +
      "experience covering performance, strategy, sustainability and value creation.",
    images: ["/og-image.jpg"],
  },
  // Advertise square assets so browsers and search crawlers do not fall back
  // to the generic globe when the larger source mark is not accepted.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
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
  "document.documentElement.classList.add('intro-seen');" +
  "if(location.pathname==='/'&&sessionStorage.getItem('horizon:home-frames-ready')==='1')" +
  "document.documentElement.classList.add('home-frames-ready')}catch(e){}";

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
        {/* Accessibly (accessiblyapp.com) accessibility widget — loads
            after hydration so it never blocks first paint. */}
        <Script
          id="accessibly-widget"
          src="https://dash.accessibly.app/widget/0198cc9a-8a1c-7166-ae34-0700f160961f/autoload.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
