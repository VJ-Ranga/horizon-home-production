import type { Metadata } from "next";
import "./globals.css";
import GlobalHeader from "@/components/GlobalHeader";
import BackgroundMusic from "@/components/BackgroundMusic";

export const metadata: Metadata = {
  title: "Horizon | Haycarb PLC",
  description: "Annual Report 2025/26.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans">
        <GlobalHeader />
        <BackgroundMusic />
        {children}
      </body>
    </html>
  );
}
