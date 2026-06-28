"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { navItems } from "@/data/community";

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-asphalt text-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex flex-col leading-none" aria-label="District 76 home">
          <span className="font-display text-2xl font-bold tracking-tight">
            DISTRICT <span className="text-sunset">76</span> RIDERS
          </span>
          <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Clarksville, Tennessee
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                pathname === item.href ? "text-white" : "text-slate-300 hover:text-white"
              }`}
            >
              {item.label}
              {pathname === item.href ? (
                <span className="mt-1 block h-0.5 w-full rounded-full bg-sunset" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/join"
            className="hidden rounded-md bg-sunset px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-white hover:bg-[#cf5a26] lg:inline-flex"
          >
            Join the Community
          </Link>
          <button
            type="button"
            className="rounded-lg border border-white/20 p-2 text-white lg:hidden"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-white/10 bg-asphalt lg:hidden">
          <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <nav className="grid gap-1" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    pathname === item.href ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/join"
                className="mt-1 rounded-md bg-sunset px-3 py-2 text-sm font-semibold text-white"
                onClick={() => setIsOpen(false)}
              >
                Join the Community
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
