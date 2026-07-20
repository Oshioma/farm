"use client";

import { useRef, useState, type DragEvent } from "react";
import { uploadCommunityFile } from "@/lib/community/storage";
import { DynamicIcon } from "@/lib/community/icon";

const ACCEPT: Record<"image" | "video" | "file", string> = {
  image: "image/*",
  video: "video/*",
  file: "*/*",
};

const ICON: Record<"image" | "video" | "file", string> = {
  image: "image",
  video: "video",
  file: "paperclip",
};

export function FileUploader({
  scope,
  kind,
  value,
  onChange,
  multiple = true,
  maxFiles = 10,
  label,
}: {
  scope: string;
  kind: "image" | "video" | "file";
  value: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = Math.max(0, maxFiles - value.length);
    const toUpload = Array.from(files).slice(0, multiple ? remaining : 1);
    if (toUpload.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(toUpload.map((f) => uploadCommunityFile(f, scope)));
      const urls = uploaded.map((u) => u.url);
      onChange(multiple ? [...value, ...urls] : urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  const canAddMore = multiple ? value.length < maxFiles : value.length === 0;

  return (
    <div>
      {canAddMore && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
            dragOver ? "border-zinc-900 bg-zinc-50" : "border-zinc-300 hover:border-zinc-400"
          }`}
        >
          <DynamicIcon name={uploading ? "loader-circle" : ICON[kind]} size={20} className={`text-zinc-400 ${uploading ? "animate-spin" : ""}`} />
          <p className="text-xs font-medium text-zinc-600">{uploading ? "Uploading…" : label ?? "Click to upload or drag and drop"}</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT[kind]}
            multiple={multiple}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={url} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
              {kind === "image" ? (
                <img src={url} alt="" className="h-full w-full object-cover" />
              ) : kind === "video" ? (
                <video src={url} className="h-full w-full object-cover" muted />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <DynamicIcon name="paperclip" size={18} className="text-zinc-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
              >
                <DynamicIcon name="x" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
