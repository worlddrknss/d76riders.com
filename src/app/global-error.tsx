"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so it renders its own <html>/<body> and relies only on inline
 * styles — the app's CSS may not have loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          padding: "24px",
          textAlign: "center",
          background: "#f4f1ea",
          color: "#1c1c1c",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
          Something threw a chain
        </h1>
        <p style={{ margin: 0, maxWidth: "28rem", fontSize: "14px", color: "#6b6b6b" }}>
          The site hit an unexpected error. Reload to try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "8px",
            border: "none",
            borderRadius: "8px",
            background: "#e2662f",
            color: "#fff",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
