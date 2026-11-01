"use client";

import { useEffect, useRef, useState } from "react";
import { fmtBytes } from "@/lib/format";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf,application/zip,.txt,.md,.log,.csv,.json";
const LIMIT = 4 * 1024 * 1024;

/** Multi-file picker with a summary of what will be uploaded. */
export function FileInput() {
  const ref = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ name: string; size: number; url: string | null }[]>([]);
  const total = files.reduce((a, f) => a + f.size, 0);

  useEffect(() => () => files.forEach((f) => f.url && URL.revokeObjectURL(f.url)), [files]);
  // React resets the form after an action returns, emptying the input; clear the list with it.
  useEffect(() => {
    const form = ref.current?.form;
    const clear = () => setFiles([]);
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  }, []);

  return (
    <div className="file-input">
      <input
        ref={ref}
        type="file"
        name="files"
        multiple
        accept={ACCEPT}
        onChange={(e) =>
          setFiles(
            [...(e.target.files ?? [])].map((f) => ({
              name: f.name,
              size: f.size,
              url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
            })),
          )
        }
      />
      <small className="muted">Images, PDF, ZIP or text files. Up to 8 files, 4 MB in total.</small>
      {total > LIMIT && <small className="error">These files total {fmtBytes(total)}, over the 4 MB limit.</small>}
      {files.length > 0 && (
        <ul className="file-preview">
          {files.map((f) => (
            <li key={f.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f.url ? <img src={f.url} alt="" /> : <span className="file-icon" aria-hidden>📄</span>}
              <span className="name">{f.name}</span>
              <span className="muted">{fmtBytes(f.size)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
