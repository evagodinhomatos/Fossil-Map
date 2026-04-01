import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fossil Map Explorer",
  description: "Explore dinosaur fossil occurrences from the Paleobiology Database.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
