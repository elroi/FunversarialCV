import "./globals.css";
import { JetBrains_Mono } from "next/font/google";

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
    <html lang="en" className="h-full">
      <body
        className={`${jetBrainsMono.className} min-h-screen bg-noir-bg text-noir-foreground`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-noir-panel focus:px-3 focus:py-2 focus:text-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
