import { Clock, MapPin, Monitor, ShieldAlert } from "lucide-react";

export type EmergencyAccess = {
  id: string;
  createdAt: Date;
  address: string | null;
  ip: string | null;
  userAgent: string | null;
  lat: number | null;
  lng: number | null;
};

/** Coarse device/browser label from a user-agent — enough for the owner to
 *  recognize (or not) an access, without pretending to be precise. */
function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  const os = /iPhone|iPad/i.test(ua)
    ? "iPhone/iPad"
    : /Android/i.test(ua)
      ? "Android"
      : /Mac OS X|Macintosh/i.test(ua)
        ? "Mac"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Linux/i.test(ua)
            ? "Linux"
            : "device";
  const browser = /Chrome/i.test(ua) && !/Edg/i.test(ua)
    ? "Chrome"
    : /Firefox/i.test(ua)
      ? "Firefox"
      : /Edg/i.test(ua)
        ? "Edge"
        : /Safari/i.test(ua)
          ? "Safari"
          : "browser";
  return `${browser} on ${os}`;
}

export function EmergencyAccessLog({ accesses }: { accesses: EmergencyAccess[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface shadow-soft">
      <header className="flex items-center gap-2 border-b border-border px-5 py-4 sm:px-6">
        <ShieldAlert className="h-4 w-4 text-sunset" />
        <h2 className="font-display text-lg font-semibold text-ink">Access log</h2>
        <span className="ml-auto text-xs text-muted">Who&apos;s opened your card</span>
      </header>

      {accesses.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted sm:px-6">
          No one has opened your emergency card yet. Every access is recorded here — with time, location,
          and device — so you can spot anything you don&apos;t recognize and rotate your link.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {accesses.map((a) => {
            const mapHref = a.lat != null && a.lng != null
              ? `https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`
              : null;
            return (
              <li key={a.id} className="px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Clock className="h-4 w-4 shrink-0 text-muted" />
                  {a.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 pl-6 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-sunset" />
                    {a.address ? (
                      mapHref ? (
                        <a href={mapHref} target="_blank" rel="noopener noreferrer" className="hover:text-ink hover:underline">
                          {a.address}
                        </a>
                      ) : (
                        a.address
                      )
                    ) : mapHref ? (
                      <a href={mapHref} target="_blank" rel="noopener noreferrer" className="hover:text-ink hover:underline">
                        View on map
                      </a>
                    ) : (
                      "Location not shared"
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Monitor className="h-3.5 w-3.5" />
                    {deviceLabel(a.userAgent)}
                  </span>
                  {a.ip && <span className="tabular-nums">{a.ip}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
