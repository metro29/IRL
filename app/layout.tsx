import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { FeedbackRoot } from "@/components/feedback/feedback-root";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "IRL",
    template: "%s · IRL",
  },
  description: "Events, challenges, and leaderboards for friend groups who show up in real life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${syne.variable} font-sans antialiased`}>
        {children}
        <FeedbackRoot />
        <Toaster />
      </body>
    </html>
  );
}
