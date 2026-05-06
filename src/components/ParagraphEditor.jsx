import React, { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import { Mark } from "@tiptap/core";
import { Bold, Italic, Underline as UnderlineIcon, Highlighter, List, ListOrdered, Undo, Redo, MessageSquare, BookOpen } from "lucide-react";
import { PALETTE as P } from "../data/constants.js";
import { formatFootnote } from "../lib/chicagoFormatter.js";

// ── Custom Comment Mark ────────────────────────────────────

const CommentMark = Mark.create({
  name: "comment",
  addAttributes() {
    return {
      noteId: { default: null },
      color: { default: "#943D3D" },
      resolved: { default: false },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const isResolved = HTMLAttributes.resolved === true || HTMLAttributes.resolved === "true";
    const bg = isResolved ? "rgba(45,107,90,0.12)" : `${HTMLAttributes.color}25`;
    const border = isResolved
      ? `2px dashed rgba(45,107,90,0.4)`
      : `2.5px solid ${HTMLAttributes.color}70`;
    return ["span", {
      "data-comment-id": HTMLAttributes.noteId,
      style: `background: ${bg}; border-bottom: ${border}; cursor: pointer; padding-bottom: 1px; border-radius: 2px;`,
      class: "inline-comment",
    }, 0];
  },
});

// ── Custom Citation Mark ──────────────────────────────────

const CitationMark = Mark.create({
  name: "citation",
  inclusive: false,
  addAttributes() {
    return {
      citationId: { default: null },
      noteIndex: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "sup[data-citation-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sup", {
      "data-citation-id": HTMLAttributes.citationId,
      style: `color: #8B4513; cursor: pointer; font-size: 0.75em; font-family: 'IBM Plex Mono', monospace; font-weight: 600; vertical-align: super; padding: 0 2px; background: #8B451308; border-radius: 2px;`,
      class: "inline-citation",
    }, String(HTMLAttributes.noteIndex || "?")];
  },
});

// ── Toolbar Button ─────────────────────────────────────────

function ToolbarButton({ icon: Icon, isActive, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="toolbar-btn"
      style={{
        padding: "4px 6px", background: isActive ? `${P.ac}18` : "transparent",
        border: "none", borderRadius: 3, cursor: "pointer", color: isActive ? P.ac : P.tm,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = `${P.ac}12`)}
      onMouseOut={(e) => (e.currentTarget.style.background = isActive ? `${P.ac}18` : "transparent")}
    >
      <Icon size={12} />
    </button>
  );
}

// ── Comment Popover ────────────────────────────────────────

function CommentPopover({ position, onSave, onCancel }) {
  const [text, setText] = useState("");
  return (
    <div className="popover-enter" style={{
      position: "absolute", left: position.x, top: position.y + 24,
      background: P.bg, border: `1px solid ${P.bd}`, borderRadius: 8,
      boxShadow: "0 8px 28px rgba(44,36,24,0.14)", padding: "10px 12px",
      zIndex: 50, width: 240,
    }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1.5,
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
          className="action-btn"
          style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 12px", background: "#943D3D", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
          Save
        </button>
        <button onClick={onCancel}
          className="action-btn"
          style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 12px", background: P.sf, color: P.tm, border: `1px solid ${P.bd}`, borderRadius: 4, cursor: "pointer" }}>
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
  citations = [], noteIndexMap = {}, sources = [],
  onAddCitation, onClickCitation,
}) {
  const debounceRef = useRef(null);
  const pendingTextRef = useRef(null); // tracks text waiting to be flushed
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [showCommentPopover, setShowCommentPopover] = useState(null); // { x, y, from, to }
  const [hasSelection, setHasSelection] = useState(false);
  const [selectionPos, setSelectionPos] = useState(null);
  const [hoveredCitation, setHoveredCitation] = useState(null); // { citationId, x, y }
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
        code: false,
        horizontalRule: false,
        blockquote: { HTMLAttributes: { style: `border-left: 3px solid ${P.ac}40; padding-left: 16px; margin: 8px 0; color: ${P.tm}; font-family: 'Spectral', serif; font-style: italic;` } },
      }),
      Highlight.configure({ HTMLAttributes: { style: `background: ${P.ac}20; border-radius: 2px; padding: 1px 2px;` } }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Typography,
      CommentMark,
      CitationMark,
    ],
    content: content || "",
    autofocus: "end",
    editorProps: {
      attributes: {
        style: `font-size: 15px; line-height: 1.75; color: ${P.tx}; font-family: 'Spectral', serif; outline: none; min-height: 24px; overflow-wrap: break-word; word-break: normal;`,
      },
      handleClick: (view, pos, event) => {
        const resolved = view.state.doc.resolve(pos);
        const marks = resolved.marks();
        // Check citation mark
        const citationMark = marks.find((m) => m.type.name === "citation");
        if (citationMark && onClickCitation) {
          onClickCitation(citationMark.attrs.citationId);
          return true;
        }
        // Check comment mark
        const commentMark = marks.find((m) => m.type.name === "comment");
        if (commentMark && onClickInlineNote) {
          onClickInlineNote(commentMark.attrs.noteId);
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        mouseover: (view, event) => {
          const target = event.target;
          if (target.closest?.(".inline-citation")) {
            const el = target.closest(".inline-citation");
            const citationId = el.getAttribute("data-citation-id");
            if (citationId && editorContainerRef.current) {
              const rect = el.getBoundingClientRect();
              const containerRect = editorContainerRef.current.getBoundingClientRect();
              setHoveredCitation({
                citationId,
                x: rect.left - containerRect.left,
                y: rect.bottom - containerRect.top + 4,
              });
            }
          } else if (!target.closest?.(".citation-tooltip")) {
            setHoveredCitation(null);
          }
        },
        mouseout: (view, event) => {
          if (!event.relatedTarget?.closest?.(".citation-tooltip") && !event.relatedTarget?.closest?.(".inline-citation")) {
            setHoveredCitation(null);
          }
        },
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

  // ── Context-aware re-anchoring helper ──
  // Finds the best position for anchorText, preferring the closest match to originalFrom
  // and using surrounding context to disambiguate duplicates
  const findAnchorPosition = useCallback((fullText, anchorText, originalFrom, docSize) => {
    if (!anchorText) return null;
    const len = anchorText.length;

    // 1. Check if original position still has the right text
    if (originalFrom >= 1 && originalFrom + len - 1 <= docSize) {
      const textAtPos = fullText.slice(originalFrom - 1, originalFrom - 1 + len);
      if (textAtPos === anchorText) return { from: originalFrom, to: originalFrom + len };
    }

    // 2. Find ALL occurrences and pick the closest to originalFrom
    const matches = [];
    let searchFrom = 0;
    while (true) {
      const idx = fullText.indexOf(anchorText, searchFrom);
      if (idx < 0) break;
      matches.push(idx + 1); // convert to 1-indexed
      searchFrom = idx + 1;
    }

    if (matches.length === 0) return null;
    if (matches.length === 1) return { from: matches[0], to: matches[0] + len };

    // Multiple matches — pick closest to original position
    let best = matches[0];
    let bestDist = Math.abs(matches[0] - originalFrom);
    for (let i = 1; i < matches.length; i++) {
      const dist = Math.abs(matches[i] - originalFrom);
      if (dist < bestDist) { best = matches[i]; bestDist = dist; }
    }
    return { from: best, to: best + len };
  }, []);

  // Apply inline comment marks — with improved re-anchoring
  useEffect(() => {
    if (editor && inlineNotes.length > 0) {
      const tr = editor.state.tr;
      let applied = false;
      const fullText = editor.getText();
      const docSize = editor.state.doc.content.size;

      for (const note of inlineNotes) {
        if (note.inlineRange && note.anchorText) {
          const pos = findAnchorPosition(fullText, note.anchorText, note.inlineRange.from, docSize);
          if (pos && pos.from >= 1 && pos.to <= docSize) {
            const markType = editor.schema.marks.comment;
            tr.addMark(pos.from, pos.to, markType.create({ noteId: note.id, color: "#943D3D", resolved: !!note.resolved }));
            applied = true;
          }
        }
      }
      if (applied) editor.view.dispatch(tr);
    }
  }, [editor, inlineNotes, findAnchorPosition]);

  // Apply citation marks — with improved re-anchoring
  useEffect(() => {
    if (editor && citations.length > 0) {
      const tr = editor.state.tr;
      let applied = false;
      const fullText = editor.getText();
      const docSize = editor.state.doc.content.size;

      for (const cite of citations) {
        if (cite.inlineRange && cite.anchorText) {
          const pos = findAnchorPosition(fullText, cite.anchorText, cite.inlineRange.from, docSize);
          if (pos && pos.from >= 1 && pos.to <= docSize) {
            const markType = editor.schema.marks.citation;
            tr.addMark(pos.from, pos.to, markType.create({
              citationId: cite.id,
              noteIndex: noteIndexMap[cite.id] || "?",
            }));
            applied = true;
          }
        }
      }
      if (applied) editor.view.dispatch(tr);
    }
  }, [editor, citations, noteIndexMap, findAnchorPosition]);

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
          display: "flex", gap: 1, padding: "2px 4px", marginBottom: 4,
          background: P.sf, borderRadius: 3, border: `1px solid ${P.bd}`, width: "fit-content",
        }}>
          <ToolbarButton icon={Bold} isActive={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" />
          <ToolbarButton icon={Italic} isActive={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" />
          <ToolbarButton icon={UnderlineIcon} isActive={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline" />
          <ToolbarButton icon={Highlighter} isActive={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight" />
          <div style={{ width: 1, background: P.bd, margin: "0 3px" }} />
          <ToolbarButton icon={List} isActive={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list" />
          <ToolbarButton icon={ListOrdered} isActive={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list" />
          <div style={{ width: 1, background: P.bd, margin: "0 3px" }} />
          <ToolbarButton icon={Undo} onClick={() => editor.chain().focus().undo().run()} title="Undo" />
          <ToolbarButton icon={Redo} onClick={() => editor.chain().focus().redo().run()} title="Redo" />
          {onAddInlineNote && (
            <>
              <div style={{ width: 1, background: P.bd, margin: "0 3px" }} />
              <ToolbarButton
                icon={MessageSquare}
                isActive={false}
                onClick={handleAddComment}
                title={hasSelection ? "Add comment to selection" : "Select text to comment"}
              />
            </>
          )}
          <div style={{ width: 1, background: P.bd, margin: "0 3px" }} />
          <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf, padding: "0 4px", alignSelf: "center" }}>
            {editor.storage.characterCount.words()} words
          </span>
        </div>
      )}
      <EditorContent editor={editor} />

      {/* Floating action buttons near selection */}
      {hasSelection && selectionPos && !showCommentPopover && (
        <div className="popover-enter" style={{
          position: "absolute", left: selectionPos.x, top: selectionPos.y - 34,
          display: "flex", gap: 4, zIndex: 40,
        }}>
          {onAddInlineNote && (
            <div
              onClick={(e) => { e.stopPropagation(); handleAddComment(); }}
              className="action-btn"
              style={{
                background: "#943D3D", color: "#fff", padding: "5px 10px",
                borderRadius: 5, cursor: "pointer", fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 4,
                boxShadow: "0 3px 12px rgba(148,61,61,0.25)", whiteSpace: "nowrap",
                border: "none",
              }}
            >
              <MessageSquare size={9} /> Comment
            </div>
          )}
          {onAddCitation && (
            <div
              onClick={(e) => { e.stopPropagation(); onAddCitation(selectionPos); }}
              className="action-btn"
              style={{
                background: P.ac, color: "#fff", padding: "5px 10px",
                borderRadius: 5, cursor: "pointer", fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 4,
                boxShadow: "0 3px 12px rgba(139,69,19,0.25)", whiteSpace: "nowrap",
                border: "none",
              }}
            >
              <BookOpen size={9} /> Cite
            </div>
          )}
        </div>
      )}

      {/* Citation hover tooltip */}
      {hoveredCitation && (() => {
        const cite = citations.find((c) => c.id === hoveredCitation.citationId);
        const source = cite ? sources.find((s) => s.id === cite.sourceId) : null;
        if (!cite || !source) return null;
        const noteNum = noteIndexMap[cite.id] || "?";
        const formatted = formatFootnote(source, cite.locator);
        return (
          <div className="citation-tooltip" style={{
            position: "absolute", left: hoveredCitation.x, top: hoveredCitation.y,
            background: P.bg, border: `1px solid ${P.bd}`, borderRadius: 6,
            boxShadow: "0 4px 16px rgba(44,36,24,0.12)", padding: "8px 12px",
            zIndex: 45, maxWidth: 320, animation: "fadeSlideIn 150ms ease-out",
          }}>
            <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.ac, marginBottom: 3 }}>
              Footnote {noteNum}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: P.tm, fontFamily: "'Spectral', serif", fontStyle: "italic" }}>
              {formatted}
            </div>
            {cite.footnoteText && (
              <div style={{ fontSize: 11, lineHeight: 1.4, color: P.tx, fontFamily: "'Spectral', serif", marginTop: 4, borderTop: `1px solid ${P.bd}`, paddingTop: 4 }}>
                {cite.footnoteText}
              </div>
            )}
          </div>
        );
      })()}

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
