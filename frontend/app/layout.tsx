import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import { viewport } from "./viewport";
import { AudienceProvider } from "../src/contexts/AudienceContext";

export { viewport };

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${jetBrainsMono.className} min-h-screen bg-bg text-foreground`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-panel focus:px-3 focus:py-2 focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent"
        >
          Skip to main content
        </a>
        <AudienceProvider>{children}</AudienceProvider>
      </body>
    </html>
  );
}
