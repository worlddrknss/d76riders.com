"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { updateAvatarAction } from "@/app/(site)/account/actions";
import { ImageCropper } from "@/components/media/image-cropper";

/** 512 stays crisp on retina at every size an avatar is rendered. */
const OUTPUT = 512;

export function AvatarEditor({ url, name }: { url: string | null; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function save(file: File) {
    const form = new FormData();
    form.append("avatarFile", file);
    const result = await updateAvatarAction(form);
    if (!result.error) router.refresh();
    return result;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Change ${name}'s profile picture`}
        className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-2 border-surface bg-asphalt text-white shadow-lift transition hover:bg-sunset sm:h-10 sm:w-10"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <ImageCropper
        open={open}
        onClose={() => setOpen(false)}
        title="Choose profile picture"
        aspect={1}
        outputWidth={OUTPUT}
        shape="circle"
        // Seeded with the current avatar so it can be re-framed without
        // re-uploading. Served same-origin from /api/media, so the canvas
        // isn't tainted.
        initialSrc={url}
        onSave={save}
      />
    </>
  );
}
