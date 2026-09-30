import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "./QueryProvider";

export const metadata: Metadata = {
  title: "Hanbee — Learn Beyond the Obvious",
  description:
    "A learning space for curious minds — built to help you gain real skills, achieve your goals, and create a life you're proud of.",
  keywords: ["learning", "LMS", "education", "courses", "Hanbee", "online learning"],
  openGraph: {
    title: "Hanbee — Learn Beyond the Obvious",
    description:
      "A learning space for curious minds — built to help you gain real skills, achieve your goals, and create a life you're proud of.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
