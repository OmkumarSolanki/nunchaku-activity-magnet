import type { Metadata } from "next";
import { Afacad_Flux, Unbounded } from "next/font/google";
import "./globals.css";

const bodyFont = Afacad_Flux({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Activity Magnets",
  description: "Create your avatar and find your people",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem("activity-magnets-theme");const d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch{}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
