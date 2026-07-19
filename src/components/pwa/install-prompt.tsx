"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

const DISMISS_KEY = "d76-install-dismissed";

/** Dismissible "Add to Home Screen" banner — only appears when the browser
 *  fires beforeinstallprompt (installable, not already installed). */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return; // already dismissed — don't listen
    } catch {
      // ignore
    }
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred || dismissed) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-sunset/30 bg-sunset/5 p-3">
      <Download className="h-5 w-5 shrink-0 text-sunset" />
      <p className="flex-1 text-sm text-ink">Install District 76 for quick access and a full-screen ride.</p>
      <button
        type="button"
        onClick={install}
        className="rounded-lg bg-sunset px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#cf5a26]"
      >
        Install
      </button>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-muted transition hover:text-ink">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
