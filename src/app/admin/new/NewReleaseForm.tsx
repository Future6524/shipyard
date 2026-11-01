"use client";

import { useActionState, useState } from "react";
import { FileInput } from "@/components/FileInput";
import { createReleaseAction } from "../actions";

const STARTER_ITEMS = ["QA regression pass", "Docs updated", "Changelog entry written"];

export function NewReleaseForm({ products, defaultOwner }: { products: { id: number; name: string }[]; defaultOwner: string }) {
  const [state, action, pending] = useActionState(createReleaseAction, undefined);
  // Controlled fields survive React's automatic form reset when the action returns an error.
  const [v, setV] = useState({
    product: String(products[0]?.id ?? "new"),
    newProduct: "",
    version: "",
    title: "",
    description: "",
    owner: defaultOwner,
    targetDate: "",
  });
  const [items, setItems] = useState<string[]>(STARTER_ITEMS);
  const bind = (k: keyof typeof v) => ({
    name: k,
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value }),
  });

  return (
    <form action={action} className="card form form-grid">
      <label className="field">
        <span>Product</span>
        <select {...bind("product")}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="new">+ New product…</option>
        </select>
      </label>
      {v.product === "new" ? (
        <label className="field">
          <span>New product name</span>
          <input {...bind("newProduct")} required maxLength={60} />
        </label>
      ) : (
        <span className="hide-sm" />
      )}

      <label className="field">
        <span>Version</span>
        <input {...bind("version")} required placeholder="e.g. 2.4.0" maxLength={32} autoComplete="off" />
      </label>
      <label className="field">
        <span>Title</span>
        <input {...bind("title")} required placeholder="What ships in this release" maxLength={60} />
      </label>

      <label className="field span-2">
        <span>Description</span>
        <textarea {...bind("description")} required rows={5} placeholder="What's changing and why it matters to users" />
      </label>

      <label className="field">
        <span>Owner</span>
        <input {...bind("owner")} required maxLength={60} />
      </label>
      <label className="field">
        <span>Target date</span>
        <input type="date" {...bind("targetDate")} />
      </label>

      <fieldset className="field span-2">
        <legend>Checklist</legend>
        <div className="item-list">
          {items.map((it, i) => (
            <div key={i} className="item-row">
              <span className="box" aria-hidden />
              <input
                name="item"
                value={it}
                maxLength={140}
                aria-label={`Checklist item ${i + 1}`}
                onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button type="button" className="btn btn-icon" aria-label={`Remove item ${i + 1}`} onClick={() => setItems(items.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm add" onClick={() => setItems([...items, ""])}>
            + Add item
          </button>
        </div>
      </fieldset>

      <div className="field span-2">
        <span>Screenshots and attachments</span>
        <FileInput />
      </div>

      {state?.error && (
        <p className="error span-2" role="alert">
          {state.error}
        </p>
      )}
      <div className="span-2 form-actions">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create release"}
        </button>
      </div>
    </form>
  );
}
