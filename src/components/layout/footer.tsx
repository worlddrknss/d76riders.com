import Link from "next/link";

const columns = [
  {
    title: "Community",
    links: [
      { label: "History", href: "/about" },
      { label: "Community Guidelines", href: "/about" },
      { label: "FAQ", href: "/about" },
      { label: "Contact", href: "mailto:hello@district76riders.com" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Events", href: "/events" },
      { label: "Garage", href: "/garage" },
      { label: "Riders", href: "/r" },
      { label: "News", href: "/news" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Gallery", href: "/gallery" },
      { label: "Featured Roads", href: "/roads" },
      { label: "Join the Community", href: "/join" },
      { label: "Email Newsletter", href: "/join" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-asphalt text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto] lg:px-8">
        <div className="space-y-3">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight">
            DISTRICT <span className="text-sunset">76</span>
          </Link>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Clarksville, Tennessee
          </p>
          <p className="max-w-xs text-sm text-slate-400">
            District 76 is a motorcycle community built for riders in Clarksville and Middle Tennessee.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="flex items-start justify-start lg:justify-end">
          <img src="/images/logo.png" alt="District 76" className="h-40 w-auto opacity-80" />
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
        <p>© 2026 District 76. All rights reserved.</p>
        <p className="mt-2">
          This site is also community developed. To contribute, visit{" "}
          <a
            href="https://github.com/worlddrknss/d76riders.com"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-300 hover:text-white"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
