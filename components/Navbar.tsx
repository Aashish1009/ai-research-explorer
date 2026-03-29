"use client";

import Link from "next/link";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-blue-600 text-lg tracking-tight">
          AI Paper Explorer
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/bookmarks"
            className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            Bookmarks
          </Link>
        </div>
      </div>
    </nav>
  );
}
