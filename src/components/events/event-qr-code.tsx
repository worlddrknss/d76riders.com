"use client";

import { useEffect, useState } from "react";
import { Download, QrCode } from "lucide-react";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type EventQrCodeProps = {
  eventUrl: string;
  eventTitle: string;
};

export function EventQrCode({ eventUrl, eventTitle }: EventQrCodeProps) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const url = `${window.location.origin}${eventUrl}`;
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: "#1a1d23", light: "#ffffff" },
    }).then(setQrDataUrl).catch(() => {});
  }, [open, eventUrl]);

  function handleDownload() {
    const url = `${window.location.origin}${eventUrl}`;

    const flyerCanvas = document.createElement("canvas");
    const size = 600;
    const padding = 60;
    const qrSize = size - padding * 2;
    flyerCanvas.width = size;
    flyerCanvas.height = size + 80;
    const ctx = flyerCanvas.getContext("2d");
    if (!ctx) return;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, flyerCanvas.width, flyerCanvas.height);

    // Render QR to temp canvas at full size
    const tempCanvas = document.createElement("canvas");
    QRCode.toCanvas(tempCanvas, url, {
      width: qrSize,
      margin: 2,
      color: { dark: "#1a1d23", light: "#ffffff" },
    }, () => {
      ctx.drawImage(tempCanvas, padding, padding);

      // Title text below QR
      ctx.fillStyle = "#1a1d23";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(eventTitle, size / 2, size + 30);

      ctx.fillStyle = "#888888";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText("Scan to view event details", size / 2, size + 55);

      // Download
      const link = document.createElement("a");
      link.download = `${eventTitle.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-qr.png`;
      link.href = flyerCanvas.toDataURL("image/png");
      link.click();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 backdrop-blur" title="Event QR Code">
          <QrCode className="h-3.5 w-3.5 text-asphalt" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Event QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR code for ${eventTitle}`} width={280} height={280} className="rounded-lg border border-border" />
          ) : (
            <div className="flex h-[280px] w-[280px] items-center justify-center rounded-lg border border-border text-sm text-muted">
              Generating…
            </div>
          )}
          <p className="text-center text-xs text-muted">
            Scan to open <strong>{eventTitle}</strong>
          </p>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Download for Flyer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
