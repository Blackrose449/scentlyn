import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type UploadedImage = { id: string | null; url: string };

const BUCKET = "product-images";
const SIGNED_TTL_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years

function extensionOf(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase().slice(0, 5) : "jpg";
}

export async function uploadToBucket(file: File, folder: string) {
  const path = `${folder}/${crypto.randomUUID()}.${extensionOf(file)}`;
  const upload = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (upload.error) throw upload.error;
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Could not create an image link");
  return signed.data.signedUrl;
}

type Props = {
  value: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
  folder: string;
  multiple?: boolean;
  label?: string;
  hint?: string;
};

export function ImageUploader({ value, onChange, folder, multiple = true, label = "Upload photo", hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; preview: string }[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const busy = pending.length > 0;

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const list = Array.from(files).slice(0, multiple ? 12 : 1);
    setPending(list.map((file) => ({ name: file.name, preview: URL.createObjectURL(file) })));
    const uploaded: UploadedImage[] = [];
    try {
      for (const file of list) {
        if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
        const url = await uploadToBucket(file, folder);
        uploaded.push({ id: null, url });
      }
      onChange(multiple ? [...value, ...uploaded] : uploaded);
      toast.success(uploaded.length > 1 ? `${uploaded.length} photos uploaded` : "Photo uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setPending((current) => {
        current.forEach((item) => URL.revokeObjectURL(item.preview));
        return [];
      });
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(from: number, to: number) {
    if (from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {busy ? `Uploading ${pending.length} photo${pending.length > 1 ? "s" : ""}…` : label}
        </Button>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>

      {value.length || pending.length ? (
        <ul className="flex flex-wrap gap-3">
          {value.map((image, index) => (
            <li
              key={image.url}
              draggable={multiple}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) move(dragIndex, index);
                setDragIndex(null);
              }}
              className={cn(
                "group relative size-24 overflow-hidden rounded-md border border-border bg-product",
                multiple && "cursor-grab",
                dragIndex === index && "opacity-50",
              )}
            >
              <img src={image.url} alt="" className="size-full object-cover" loading="lazy" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => onChange(value.filter((_, position) => position !== index))}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-foreground/80 text-background"
              >
                <X className="size-3.5" />
              </button>
              {index === 0 && multiple ? (
                <span className="absolute bottom-0 left-0 right-0 bg-foreground/70 py-0.5 text-center text-[10px] font-bold uppercase text-background">
                  Main
                </span>
              ) : null}
            </li>
          ))}
          {pending.map((item) => (
            <li key={item.preview} className="relative size-24 overflow-hidden rounded-md border border-border">
              <img src={item.preview} alt="" className="size-full object-cover opacity-50" />
              <span className="absolute inset-0 grid place-items-center">
                <Loader2 className="size-5 animate-spin text-foreground" />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {multiple && value.length > 1 ? (
        <p className="text-xs text-muted-foreground">Drag thumbnails to reorder — the first photo is the main image.</p>
      ) : null}
    </div>
  );
}
