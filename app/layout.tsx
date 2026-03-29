import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Paper Explorer",
  description:
    "Discover and understand the best AI research papers with multi-level explanations powered by free LLMs.",
  openGraph: {
    title: "AI Paper Explorer",
    description:
      "Curated AI research papers with beginner, intermediate, and advanced explanations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
          <Navbar />
          <main>{children}</main>
      </body>
    </html>
  );
}
