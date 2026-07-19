import { AppRail } from "@/components/layout/app-rail";
import { getCurrentUser } from "@/lib/session";

/**
 * The authenticated app shell: a full-browser-width layout with the persistent
 * left rail and a fluid content column. Pages render their own header + content
 * as children; reading-heavy columns should cap their own measure.
 *
 * The rail only appears for signed-in riders — on public pages (a profile viewed
 * logged-out) the content centers at a comfortable width instead of leaving an
 * empty rail column. The rail is hidden on small screens (mobile nav lives in
 * the top navbar).
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const showRail = Boolean(user?.id);

  return (
    <div className="w-full px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <div className="flex gap-6 xl:gap-8">
        {showRail && (
          <aside className="hidden w-66 shrink-0 lg:block">
            <div className="sticky" style={{ top: "calc(var(--nav-h, 5.5rem) + 1rem)" }}>
              <AppRail />
            </div>
          </aside>
        )}
        <main className={`min-w-0 flex-1 ${showRail ? "" : "mx-auto max-w-6xl"}`}>{children}</main>
      </div>
    </div>
  );
}
