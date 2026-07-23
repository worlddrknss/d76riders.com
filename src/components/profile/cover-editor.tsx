"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

import { updateCoverPhotoAction } from "@/app/(site)/account/actions";
import { ImageCropper } from "@/components/media/image-cropper";

/**
 * 3:1 at 1600px wide. The banner's own aspect changes with the viewport — it is
 * roughly 2:1 on a phone and wider on a desktop — so the crop is baked at a
 * canonical ratio and the browser trims the rest centrally with object-cover.
 * Framing centrally in the editor therefore survives every breakpoint.
 */
const ASPECT = 3;
const OUTPUT = 1600;

export function CoverEditor({ url }: { url: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function save(file: File) {
    const form = new FormData();
    form.append("coverFile", file);
    const result = await updateCoverPhotoAction(form);
    if (!result.error) router.refresh();
    return result;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/30 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/60"
      >
        <Camera className="h-3.5 w-3.5" />
        {url ? "Edit Cover" : "Add Cover"}
      </button>

      <ImageCropper
        open={open}
        onClose={() => setOpen(false)}
        title={url ? "Edit cover photo" : "Add a cover photo"}
        aspect={ASPECT}
        outputWidth={OUTPUT}
        initialSrc={url}
        onSave={save}
        emptyHint="Wide photos work best — JPG, PNG or WebP"
      />
    </>
  );
}
