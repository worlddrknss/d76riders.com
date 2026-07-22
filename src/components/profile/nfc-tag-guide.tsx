import { Nfc, Smartphone, MapPin, RefreshCw } from "lucide-react";

/**
 * Static how-to for writing the rider's emergency-card link onto an NFC tag.
 * Both iPhone and Android write tags with the same free "NFC Tools" app — the
 * real per-platform differences are enabling NFC (Android) and where the antenna
 * sits (top of an iPhone vs. the back of most Android phones), so the two
 * columns stay honest instead of pretending the apps differ.
 */
export function NfcTagGuide() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
      <div className="flex items-center gap-2">
        <Nfc className="h-5 w-5 text-sunset" />
        <h2 className="font-display text-lg font-bold text-ink">Put your card on an NFC tag</h2>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Write your emergency-card link to a cheap NFC sticker (an NTAG213/215/216 tag works well) and
        stick it on your bike or helmet. A first responder taps it with any phone and your card opens —
        no app, no unlock. First, hit <span className="font-semibold text-ink">Copy Link</span> above to
        grab your link.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* iPhone */}
        <div className="rounded-xl border border-border bg-canvas/60 p-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-ink" />
            <h3 className="text-sm font-bold text-ink">iPhone</h3>
            <span className="text-xs text-muted">(iPhone 7 or newer)</span>
          </div>
          <ol className="mt-3 space-y-2 text-sm text-ink/90">
            <Step n={1}>
              Install <span className="font-semibold">NFC Tools</span> (free) from the App Store.
            </Step>
            <Step n={2}>Tap Copy Link above to copy your card link.</Step>
            <Step n={3}>
              Open NFC Tools → <span className="font-semibold">Write</span> →{" "}
              <span className="font-semibold">Add a record</span> → <span className="font-semibold">URL/URI</span>.
            </Step>
            <Step n={4}>Paste your link, tap OK, then tap Write.</Step>
            <Step n={5}>Hold the top of your iPhone against the tag until it says written.</Step>
          </ol>
        </div>

        {/* Android */}
        <div className="rounded-xl border border-border bg-canvas/60 p-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-ink" />
            <h3 className="text-sm font-bold text-ink">Android</h3>
            <span className="text-xs text-muted">(most phones since ~2014)</span>
          </div>
          <ol className="mt-3 space-y-2 text-sm text-ink/90">
            <Step n={1}>
              Turn NFC on in <span className="font-semibold">Settings → Connected devices</span>, then install{" "}
              <span className="font-semibold">NFC Tools</span> (free) from Google Play.
            </Step>
            <Step n={2}>Tap Copy Link above to copy your card link.</Step>
            <Step n={3}>
              Open NFC Tools → <span className="font-semibold">Write</span> →{" "}
              <span className="font-semibold">Add a record</span> → <span className="font-semibold">URL/URI</span>.
            </Step>
            <Step n={4}>Paste your link, tap OK, then tap Write.</Step>
            <Step n={5}>Hold the back of your phone against the tag until it says written.</Step>
          </ol>
        </div>
      </div>

      {/* The icon is the only sibling flex item — the sentence stays in one
          element so inline emphasis doesn't get laid out as its own column. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sunset" />
          <span>
            Stick it where someone would look: inside your helmet, on the tank, triple clamp, or a fork
            leg. Give it a scan to test before you rely on it.
          </span>
        </p>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sunset" />
          <span>
            Tags rewrite freely, so repeat these steps anytime to overwrite one. If you tap{" "}
            <span className="font-semibold text-ink">New Link</span> above, the old link stops working,
            so re-write your tag with the new one.
          </span>
        </p>
      </div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sunset/15 text-[0.7rem] font-bold text-sunset">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
