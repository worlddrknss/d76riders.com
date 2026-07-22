"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Download, Share, SquarePlus, X } from "lucide-react";

/** Chrome's install event — a Chromium extension, not in lib.dom. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

const DISMISS_KEY = "d76-install-dismissed";

/** Lets anything on the page re-open the banner after it's been dismissed. */
export const SHOW_INSTALL_EVENT = "d76:show-install";

const subscribeNever = () => () => {};

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS flags an installed web app here instead of via display-mode.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPads report as Mac — touch points are what separate them.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * "Add to Home Screen" for the platforms that won't offer it themselves.
 *
 * Chrome fires beforeinstallprompt and we can show a real Install button. iOS
 * never has — Apple implements no equivalent API and shows no banner of its
 * own, so an iPhone rider sees no way to install no matter how correct the
 * manifest is. This used to render only on the beforeinstallprompt event, which
 * meant iPhones (most of our riders) got nothing at all. They now get the
 * Share → Add to Home Screen steps, which is the only path iOS actually offers.
 */
export function InstallPrompt() {
  // Everything here reads browser state, so hold the first paint until we're on
  // the client — that also keeps the server and hydration renders identical.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    function onPrompt(e: Event) {
      // Hold the event: prompt() is only callable from a user gesture later.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDismissed(true);
    }
    function onShowRequest() {
      try {
        window.localStorage.removeItem(DISMISS_KEY);
      } catch {
        // ignore
      }
      setDismissed(false);
      setShowSteps(true);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(SHOW_INSTALL_EVENT, onShowRequest);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(SHOW_INSTALL_EVENT, onShowRequest);
    };
  }, []);

  function dismiss() {
    setDismissed(true);
    setShowSteps(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!mounted || dismissed) return null;
  if (isStandalone()) return null;

  const ios = isIos();
  // Anywhere that isn't iOS, wait for the browser to say it's installable.
  if (!ios && !deferred) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 z-40 px-3 lg:hidden"
      style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}
    >
      <div className="rounded-xl border border-white/12 bg-asphalt/95 p-3 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Install D76 Riders</p>
            <p className="truncate text-xs text-slate-400">Full screen, one tap from your home screen.</p>
          </div>
          {deferred ? (
            <button
              type="button"
              onClick={install}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sunset px-3 py-2 text-xs font-bold text-white active:bg-[#cf5a26]"
            >
              <Download className="h-3.5 w-3.5" />
              Install
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSteps((v) => !v)}
              aria-expanded={showSteps}
              className="shrink-0 rounded-lg bg-sunset px-3 py-2 text-xs font-bold text-white active:bg-[#cf5a26]"
            >
              {showSteps ? "Hide" : "How"}
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1.5 text-slate-400 active:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showSteps && !deferred && (
          <ol className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <Share className="h-4 w-4 shrink-0 text-sunset" />
              <span>
                Tap <span className="font-semibold text-white">Share</span> in the Safari toolbar.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <SquarePlus className="h-4 w-4 shrink-0 text-sunset" />
              <span>
                Scroll down, pick <span className="font-semibold text-white">Add to Home Screen</span>, then Add.
              </span>
            </li>
          </ol>
        )}
      </div>
    </div>,
    document.body,
  );
}
