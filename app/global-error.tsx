"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", textAlign: "center", padding: "2rem" }}>
        <div>
          <div style={{ fontSize: "3rem" }}>💥</div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>You madlads broke the application!</h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>We&apos;re resolving the issue as soon as possible.</p>
          <button onClick={reset} style={{ padding: "0.6rem 1.4rem", background: "#319795", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "1rem" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
