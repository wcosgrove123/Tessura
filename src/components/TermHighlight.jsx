import React from "react";

export function TermHighlight({ term, termData, onClick }) {
  if (!termData) return <span>{term}</span>;
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick(term); }}
      style={{
        color: termData.color,
        borderBottom: `1.5px solid ${termData.color}50`,
        cursor: "pointer",
        fontWeight: 600,
        transition: "all 0.2s",
      }}
      onMouseOver={(e) => {
        e.target.style.backgroundColor = `${termData.color}14`;
        e.target.style.borderBottomColor = termData.color;
      }}
      onMouseOut={(e) => {
        e.target.style.backgroundColor = "transparent";
        e.target.style.borderBottomColor = `${termData.color}50`;
      }}
      title={`${termData.symbol} ${term}`}
    >
      <span style={{ fontSize: "0.65em", opacity: 0.5, marginRight: 2, fontFamily: "serif" }}>
        {termData.symbol}
      </span>
      {term}
    </span>
  );
}

export function renderTermLinks(text, linkedTerms, allTerms, onTermClick) {
  if (!linkedTerms?.length) return text;
  let result = [];
  let remaining = text;
  let key = 0;
  // Sort longer terms first so "cogniscience" matches before "science"
  const sorted = [...linkedTerms].sort((a, b) => b.length - a.length);
  for (const term of sorted) {
    // Word-boundary match: term must not be inside a larger word
    const regex = new RegExp(`\\b(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i");
    const match = remaining.match(regex);
    if (match) {
      const idx = match.index;
      if (idx > 0) result.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
      result.push(
        <TermHighlight key={key++} term={match[1]} termData={allTerms[term]} onClick={onTermClick} />
      );
      remaining = remaining.slice(idx + match[1].length);
    }
  }
  if (remaining) result.push(<span key={key++}>{remaining}</span>);
  return result.length ? result : text;
}
