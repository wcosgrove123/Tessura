import React, { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import { Mark } from "@tiptap/core";
import { Bold, Italic, Underline as UnderlineIcon, Highlighter, List, ListOrdered, Undo, Redo, MessageSquare } from "lucide-react";
import { PALETTE as P } from "../data/constants.js";

// ── Custom Comment Mark ────────────────────────────────────

const CommentMark = Mark.create({
  name: "comment",
  addAttributes() {
    return {
      noteId: { default: null },
      color: { default: "#943D3D" },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", {
      "data-comment-id": HTMLAttributes.noteId,
      style: `background: ${HTMLAttributes.color}15; border-bottom: 2px solid ${HTMLAttributes.color}60; cursor: pointer; padding-bottom: 1px;`,
      class: "inline-comment",
    }, 0];
  },
});

// ── Toolbar Button ─────────────────────────────────────────

function ToolbarButton({ icon: Icon, isActive, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: "3px 6px", background: isActive ? `${P.ac}18` : "transparent",
        border: "none", borderRadius: 3, cursor: "pointer", color: isActive ? P.ac : P.tm,
        display: "flex", alignItems: "center", transition: "all 0.15s",
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = `${P.ac}12`)}
      onMouseOut={(e) => (e.currentTarget.style.background = isActive ? `${P.ac}18` : "transparent")}
    >
      <Icon size={13} />
    </button>
  );
}

// ── Comment Popover ────────────────────────────────────────

function CommentPopover({ position, onSave, onCancel }) {
  const [text, setText] = useState("");
  return (
    <div style={{
      position: "absolute", left: position.x, top: position.y + 24,
      background: P.bg, border: `1px solid ${P.bd}`, borderRadius: 8,
      boxShadow: "0 6px 24px rgba(44,36,24,0.12)", padding: "10px 12px",
      zIndex: 50, width: 240,
    }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: 1.5,
        textTransform: "uppercase", color: "#943D3D", marginBottom: 6,
        display: "flex", alignItems: "center", gap: 4,
      }}>
        <MessageSquare size={9} /> Add Comment
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        placeholder="Your comment..."
        style={{
          width: "100%", minHeight: 50, fontSize: 12, lineHeight: 1.5,
          fontFamily: "'Spectral', serif", color: P.tx, background: P.sf,
          border: `1px solid ${P.bd}`, borderRadius: 4, padding: 8, outline: "none",
          resize: "vertical",
        }}
      />
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        <button onClick={() => { if (text.trim()) onSave(text.trim()); }}
          style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 10px", background: "#943D3D", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
          Save
        </button>
        <button onClick={onCancel}
          style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 10px", background: P.sf, color: P.tm, border: `1px solid ${P.bd}`, borderRadius: 3, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main ParagraphEditor ───────────────────────────────────

export default function ParagraphEditor({
  content, onChange, placeholder = "Start writing...",
  inlineNotes = [], onAddInlineNote, onClickInlineNote,
}) {
  const debounceRef = useRef(null);
  const pendingTextRef = useRef(null); // tracks text waiting to be flushed
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [showCommentPopover, setShowCommentPopover] = useState(null); // { x, y, from, to }
  const [hasSelection, setHasSelection] = useState(false);
  const [selectionPos, setSelectionPos] = useState(null);
  const editorContainerRef = useRef(null);

  // Flush any pending debounced change immediately
  const flushDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingTextRef.current !== null) {
      onChangeRef.current(pendingTextRef.current);
      pendingTextRef.current = null;
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        blockquote: { HTMLAttributes: { style: `border-left: 3px solid ${P.ac}40; padding-left: 16px; margin: 8px 0; color: ${P.tm};` } },
      }),
      Underline,
      Highlight.configure({ HTMLAttributes: { style: `background: ${P.ac}20; border-radius: 2px; padding: 1px 2px;` } }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Typography,
      CommentMark,
    ],
    content: content || "",
    autofocus: "end",
    editorProps: {
      attributes: {
        style: `font-size: 16.5px; line-height: 1.75; color: ${P.tx}; font-family: 'Spectral', serif; outline: none; min-height: 24px;`,
      },
      handleClick: (view, pos, event) => {
        // Check if clicking on a comment mark
        const resolved = view.state.doc.resolve(pos);
        const marks = resolved.marks();
        const commentMark = marks.find((m) => m.type.name === "comment");
        if (commentMark && onClickInlineNote) {
          onClickInlineNote(commentMark.attrs.noteId);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const text = editor.getText();
      pendingTextRef.current = text;
      debounceRef.current = setTimeout(() => {
        pendingTextRef.current = null;
        onChange(text);
      }, 300);
    },
    onBlur: () => {
      flushDebounce();
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasText = from !== to;
      setHasSelection(hasText);
      if (hasText && editorContainerRef.current) {
        // Get approximate position for the comment button
        const coords = editor.view.coordsAtPos(from);
        const containerRect = editorContainerRef.current.getBoundingClientRect();
        setSelectionPos({
          x: coords.left - containerRect.left,
          y: coords.top - containerRect.top,
          from,
          to,
        });
      } else {
        setSelectionPos(null);
      }
    },
  });

  // Apply inline comment marks on mount — with text-anchor re-anchoring
  useEffect(() => {
    if (editor && inlineNotes.length > 0) {
      const tr = editor.state.tr;
      let applied = false;
      const fullText = editor.getText();
      for (const note of inlineNotes) {
        if (note.inlineRange) {
          let { from, to } = note.inlineRange;
          const docSize = editor.state.doc.content.size;

          // Try to re-anchor using stored text snippet if positions are invalid
          if (note.anchorText && (from < 0 || to > docSize || from >= to)) {
            const idx = fullText.indexOf(note.anchorText);
            if (idx >= 0) {
              from = idx + 1; // ProseMirror positions are 1-indexed
              to = from + note.anchorText.length;
            }
          }
          // Also try re-anchoring if the text at the stored position doesn't match
          if (note.anchorText && from >= 0 && to <= docSize && from < to) {
            const textAtPos = fullText.slice(from - 1, to - 1);
            if (textAtPos !== note.anchorText) {
              const idx = fullText.indexOf(note.anchorText);
              if (idx >= 0) {
                from = idx + 1;
                to = from + note.anchorText.length;
              }
            }
          }

          if (from >= 0 && to <= docSize && from < to) {
            const markType = editor.schema.marks.comment;
            tr.addMark(from, to, markType.create({ noteId: note.id, color: "#943D3D" }));
            applied = true;
          }
        }
      }
      if (applied) {
        editor.view.dispatch(tr);
      }
    }
  }, [editor, inlineNotes.length]);

  // Sync content from outside only if it differs
  const lastExternalContent = useRef(content);
  useEffect(() => {
    if (editor && content !== lastExternalContent.current) {
      lastExternalContent.current = content;
      const currentText = editor.getText();
      if (currentText !== content) {
        editor.commands.setContent(content || "");
      }
    }
  }, [content, editor]);

  useEffect(() => {
    return () => {
      // Flush pending changes on unmount instead of discarding
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (pendingTextRef.current !== null) {
        onChangeRef.current(pendingTextRef.current);
        pendingTextRef.current = null;
      }
    };
  }, []);

  const handleAddComment = useCallback(() => {
    if (!selectionPos || !editor) return;
    setShowCommentPopover(selectionPos);
  }, [selectionPos, editor]);

  const handleSaveComment = useCallback((text) => {
    if (!showCommentPopover || !editor || !onAddInlineNote) return;
    const { from, to } = showCommentPopover;
    const noteId = onAddInlineNote({ from, to }, text);
    // Apply comment mark to the selection
    if (noteId) {
      editor.chain().focus().setTextSelection({ from, to })
        .setMark("comment", { noteId, color: "#943D3D" }).run();
    }
    setShowCommentPopover(null);
    setHasSelection(false);
  }, [showCommentPopover, editor, onAddInlineNote]);

  if (!editor) return null;

  return (
    <div ref={editorContainerRef} style={{ position: "relative" }}>
      {editor && (
        <div style={{
          display: "flex", gap: 2, padding: "4px 6px", marginBottom: 6,
          background: P.sf, borderRadius: 4, border: `1px solid ${P.bd}`, width: "fit-content",
        }}>
          <ToolbarButton icon={Bold} isActive={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" />
          <ToolbarButton icon={Italic} isActive={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" />
          <ToolbarButton icon={UnderlineIcon} isActive={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline" />
          <ToolbarButton icon={Highlighter} isActive={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight" />
          <div style={{ width: 1, background: P.bd, margin: "0 4px" }} />
          <ToolbarButton icon={List} isActive={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list" />
          <ToolbarButton icon={ListOrdered} isActive={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list" />
          <div style={{ width: 1, background: P.bd, margin: "0 4px" }} />
          <ToolbarButton icon={Undo} onClick={() => editor.chain().focus().undo().run()} title="Undo" />
          <ToolbarButton icon={Redo} onClick={() => editor.chain().focus().redo().run()} title="Redo" />
          {onAddInlineNote && (
            <>
              <div style={{ width: 1, background: P.bd, margin: "0 4px" }} />
              <ToolbarButton
                icon={MessageSquare}
                isActive={false}
                onClick={handleAddComment}
                title={hasSelection ? "Add comment to selection" : "Select text to comment"}
              />
            </>
          )}
          <div style={{ width: 1, background: P.bd, margin: "0 4px" }} />
          <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: P.tf, padding: "0 4px", alignSelf: "center" }}>
            {editor.storage.characterCount.words()} words
          </span>
        </div>
      )}
      <EditorContent editor={editor} />

      {/* Floating "Add Comment" button near selection */}
      {hasSelection && selectionPos && onAddInlineNote && !showCommentPopover && (
        <div
          onClick={(e) => { e.stopPropagation(); handleAddComment(); }}
          style={{
            position: "absolute", left: selectionPos.x, top: selectionPos.y - 30,
            background: "#943D3D", color: "#fff", padding: "3px 8px",
            borderRadius: 4, cursor: "pointer", fontSize: 9,
            fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 4,
            boxShadow: "0 2px 8px rgba(44,36,24,0.15)", zIndex: 40,
            whiteSpace: "nowrap",
          }}
        >
          <MessageSquare size={9} /> Comment
        </div>
      )}

      {/* Comment popover */}
      {showCommentPopover && (
        <CommentPopover
          position={showCommentPopover}
          onSave={handleSaveComment}
          onCancel={() => setShowCommentPopover(null)}
        />
      )}
    </div>
  );
}
