"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";

type Props = {
  /** The full message, link included. */
  text: string;
  label: string;
  sharingLabel?: string;
  copyLabel?: string;
  copiedLabel?: string;
  className?: string;
  copyClassName?: string;
};

/* Sharing to WhatsApp without a fixed recipient. A wa.me link with no number
   is ignored by WhatsApp Business, so the phone's own share sheet is used
   first: the person picks WhatsApp, WhatsApp Business, SMS or anything else.
   Where there is no share sheet (most desktops), the direct app link is tried
   on phones and WhatsApp Web elsewhere. Copy is always there as a last resort. */
export function ShareWhatsAppButton({ text, label, sharingLabel, copyLabel = "Copy", copiedLabel = "Copied", className = "", copyClassName = "" }: Props) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function share() {
    setBusy(true);
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({ text });
          return;
        } catch (err) {
          // The person closed the sheet: nothing else to do.
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }
      const encoded = encodeURIComponent(text);
      const onPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      window.location.href = onPhone ? `whatsapp://send?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt(copyLabel, text);
    }
  }

  return (
    <>
      <button type="button" onClick={share} disabled={busy} className={className}>
        <MessageCircle className="h-5 w-5" /> {busy && sharingLabel ? sharingLabel : label}
      </button>
      <button type="button" onClick={copy} className={copyClassName}>
        <Copy className="h-4 w-4" /> {copied ? copiedLabel : copyLabel}
      </button>
    </>
  );
}
