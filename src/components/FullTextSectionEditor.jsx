import React, { useEffect, useMemo, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import { PALETTE as P } from "../data/constants.js";

// Paragraph node extended with a stable paraId attribute so we can map every
// ProseMirror paragraph back to a row in our data model. Rendered as
// <p data-para-id="..."> so it round-trips through parseHTML.
const ParagraphWithId = Paragraph.extend({
  name: "paragraph",
  addAttributes() {
    return {
      paraId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-para-id"),
        renderHTML: (attrs) => (attrs.paraId ? { "data-para-id": attrs.paraId } : {}),
      },
    };
  },
});

function genId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Walk the doc and collect each paragraph's { paraId, text, pos } in order.
function readDocParagraphs(doc) {
  const out = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "paragraph") {
      out.push({ paraId: node.attrs.paraId || null, text: node.textContent, pos });
      return false;
    }
    return true;
  });
  return out;
}

/**
 * One TipTap editor that owns a contiguous run of paragraphs from a section.
 * Behaves like a Word document: Enter splits a paragraph (creating a new row
 * in our data model), Backspace at the start joins with the previous one.
 *
 * Caller passes:
 *  - paragraphs: ordered array of { id, text } from this section/chunk
 *  - onUpdateText(paraId, text)
 *  - onAddParagraph(afterParaId, opts) — must return the assigned paragraph id
 *  - onDeleteParagraph(paraId)
 *  - placeholder: shown when the editor is empty
 */
export default function FullTextSectionEditor({
  paragraphs,
  onUpdateText,
  onAddParagraph,
  onDeleteParagraph,
  placeholder = "Write...",
}) {
  // We hold the canonical view of paragraphs in a ref so the debounced
  // reconcile callback always reads the most-recent version even if it was
  // scheduled before a reflowing prop change.
  const paragraphsRef = useRef(paragraphs);
  useEffect(() => {
    paragraphsRef.current = paragraphs;
  }, [paragraphs]);

  // Build the initial editor content from incoming paragraphs once. Subsequent
  // external edits (other views, undo) are merged via a sync effect below.
  const initialContent = useMemo(
    () => ({
      type: "doc",
      content: paragraphs.length > 0
        ? paragraphs.map((p) => ({
            type: "paragraph",
            attrs: { paraId: p.id },
            content: p.text ? [{ type: "text", text: p.text }] : [],
          }))
        : [{ type: "paragraph", attrs: { paraId: null }, content: [] }],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const debounceRef = useRef(null);

  const reconcile = useCallback((editor) => {
    if (!editor) return;
    const docParas = readDocParagraphs(editor.state.doc);
    const oldList = paragraphsRef.current;
    const oldById = new Map(oldList.map((p) => [p.id, p]));
    const seen = new Set();

    // First pass: assign IDs to brand-new paragraph nodes (Enter-splits).
    // We do this in a single transaction so positions stay valid.
    const tr = editor.state.tr;
    let trDirty = false;
    for (let i = docParas.length - 1; i >= 0; i--) {
      const dp = docParas[i];
      // Treat as new if it has no paraId or if its paraId is a duplicate of
      // an earlier node's paraId in the same doc (e.g. paste of an existing
      // paragraph). We assign a fresh id and let the reconciler insert it.
      const isDup =
        dp.paraId && docParas.findIndex((x) => x.paraId === dp.paraId) !== i;
      if (!dp.paraId || isDup) {
        const newId = genId();
        const node = editor.state.doc.nodeAt(dp.pos);
        if (node) {
          tr.setNodeMarkup(dp.pos, undefined, { ...node.attrs, paraId: newId });
          dp.paraId = newId;
          trDirty = true;
        }
      }
    }
    if (trDirty) {
      tr.setMeta("addToHistory", false);
      editor.view.dispatch(tr);
    }

    // Second pass: build ops by comparing the (now fully ID'd) doc with state.
    const ops = [];
    docParas.forEach((dp, i) => {
      const existing = oldById.get(dp.paraId);
      if (existing) {
        seen.add(dp.paraId);
        if (existing.text !== dp.text) {
          ops.push({ kind: "update", paraId: dp.paraId, text: dp.text });
        }
      } else {
        const prevId = i > 0 ? docParas[i - 1].paraId : null;
        ops.push({ kind: "add", paraId: dp.paraId, prevParaId: prevId, text: dp.text });
      }
    });
    for (const p of oldList) {
      if (!seen.has(p.id)) ops.push({ kind: "delete", paraId: p.id });
    }

    // Apply ops. Order: deletes first, then adds (so prevParaId is still
    // resolvable), then updates.
    for (const op of ops) {
      if (op.kind === "delete") onDeleteParagraph(op.paraId);
    }
    for (const op of ops) {
      if (op.kind === "add") {
        onAddParagraph(op.prevParaId, { id: op.paraId, text: op.text });
      }
    }
    for (const op of ops) {
      if (op.kind === "update") onUpdateText(op.paraId, op.text);
    }

    // Optimistically sync the ref so a follow-up reconcile (e.g. from the
    // setNodeMarkup dispatch above, or rapid typing) sees the just-applied
    // state instead of waiting for React to flush the parent re-render. The
    // canonical value will overwrite this on the next render anyway.
    paragraphsRef.current = docParas.map((dp) => ({ id: dp.paraId, text: dp.text }));
  }, [onUpdateText, onAddParagraph, onDeleteParagraph]);

  const editor = useEditor({
    extensions: [
      // StarterKit ships its own Paragraph; turn it off so our extended one wins.
      StarterKit.configure({ paragraph: false }),
      ParagraphWithId,
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: false }),
      Typography,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "fulltext-section-pm",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        reconcile(editor);
      }, 350);
    },
    onBlur: ({ editor }) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      reconcile(editor);
    },
  });

  // External sync: when paragraphs change from outside (other view, undo),
  // and the change does not match the current doc, replace content. We compare
  // by id+text concatenated; cheap and good enough for our scale.
  const lastSyncedSig = useRef("");
  useEffect(() => {
    if (!editor) return;
    const sig = paragraphs.map((p) => `${p.id}:${p.text}`).join("\n");
    if (sig === lastSyncedSig.current) return;

    const docParas = readDocParagraphs(editor.state.doc);
    const docSig = docParas.map((p) => `${p.paraId}:${p.text}`).join("\n");
    if (docSig === sig) {
      lastSyncedSig.current = sig;
      return;
    }
    // Avoid clobbering while the user is typing — only replace when the editor
    // does not have focus.
    if (editor.isFocused) return;
    editor.commands.setContent(
      paragraphs.length > 0
        ? paragraphs.map((p) => ({
            type: "paragraph",
            attrs: { paraId: p.id },
            content: p.text ? [{ type: "text", text: p.text }] : [],
          }))
        : [{ type: "paragraph", attrs: { paraId: null }, content: [] }],
      false
    );
    lastSyncedSig.current = sig;
  }, [paragraphs, editor]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
