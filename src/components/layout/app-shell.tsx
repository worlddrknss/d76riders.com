import { AppRail } from "@/components/layout/app-rail";

/**
 * The authenticated app shell: a full-browser-width layout with the persistent
 * left rail and a fluid content column. Pages render their own header + content
 * as children; reading-heavy columns should cap their own measure. The rail is
 * sticky under the top navbar and hidden on small screens (mobile nav lives in
 * the navbar).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <div className="flex gap-6 xl:gap-8">
        <aside className="hidden w-[264px] shrink-0 lg:block">
          <div className="sticky" style={{ top: "calc(var(--nav-h, 5.5rem) + 1rem)" }}>
            <AppRail />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
