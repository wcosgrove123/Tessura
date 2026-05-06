import React, { useEffect, useRef } from "react";
import { PALETTE as P } from "../data/constants.js";
import { AlertTriangle } from "lucide-react";

/**
 * Custom confirmation modal matching the Tessera parchment aesthetic.
 *
 * Usage:
 *   <ConfirmModal
 *     open={showConfirm}
 *     title="Delete paragraph?"
 *     message="This action cannot be undone."
 *     confirmLabel="Delete"
 *     danger={true}
 *     onConfirm={() => { doThing(); setShowConfirm(false); }}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
export default function ConfirmModal({
  open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel",
  danger = false, onConfirm, onCancel,
}) {
  const confirmRef = useRef(null);

  // Focus the confirm button on open, handle Escape
  useEffect(() => {
    if (open) {
      setTimeout(() => confirmRef.current?.focus(), 50);
      const handleKey = (e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter") onConfirm();
        // Focus trap: Tab cycles between Cancel and Confirm
        if (e.key === "Tab") {
          const modal = confirmRef.current?.closest("[data-modal]");
          if (!modal) return;
          const focusable = modal.querySelectorAll("button");
          if (focusable.length < 2) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
    }
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  const accentColor = danger ? "#943D3D" : P.ac;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(44, 36, 24, 0.4)",
          backdropFilter: "blur(6px)",
          animation: "modalBackdropIn 200ms ease-out",
        }}
      />
      {/* Modal */}
      <div data-modal style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", zIndex: 9999,
        background: P.bg, border: `1px solid ${P.bd}`,
        borderRadius: 12, padding: "28px 32px 24px",
        boxShadow: "0 20px 60px rgba(44, 36, 24, 0.22)",
        minWidth: 340, maxWidth: 440,
        animation: "modalIn 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        {/* Icon + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          {danger && (
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: `${accentColor}12`, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={17} style={{ color: accentColor }} />
            </div>
          )}
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 400,
            color: P.tx, margin: 0, lineHeight: 1.3,
          }}>
            {title}
          </h3>
        </div>
        {/* Message */}
        {message && (
          <p style={{
            fontFamily: "'Spectral', serif", fontSize: 13.5, lineHeight: 1.6,
            color: P.tm, margin: "0 0 22px",
          }}>
            {message}
          </p>
        )}
        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onCancel}
            className="action-btn"
            style={{
              padding: "8px 22px", borderRadius: 6, cursor: "pointer",
              background: P.sf, color: P.tm, border: `1px solid ${P.bd}`,
              fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: 0.5,
            }}
            onMouseOver={(e) => (e.target.style.background = P.sh)}
            onMouseOut={(e) => (e.target.style.background = P.sf)}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="action-btn"
            style={{
              padding: "8px 22px", borderRadius: 6, cursor: "pointer",
              background: accentColor, color: "#fff", border: "none",
              fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: 0.5, fontWeight: 500,
            }}
            onMouseOver={(e) => (e.target.style.opacity = 0.85)}
            onMouseOut={(e) => (e.target.style.opacity = 1)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
