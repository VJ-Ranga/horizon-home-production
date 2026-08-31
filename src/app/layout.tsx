import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
