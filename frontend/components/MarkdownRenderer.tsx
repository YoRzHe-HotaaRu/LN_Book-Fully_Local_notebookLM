'use client';

import React from 'react';

interface CitationDetail {
  citation_index: number;
  source_id: string;
  source_title: string;
  page_number: number;
  quoted_text?: string;
}

interface MarkdownRendererProps {
  content: string;
  citations?: CitationDetail[];
  onCitationHover?: (e: React.MouseEvent, citation: CitationDetail) => void;
  onCitationLeave?: () => void;
  onCitationClick?: (citation: CitationDetail) => void;
}

export default function MarkdownRenderer({
  content,
  citations = [],
  onCitationHover,
  onCitationLeave,
  onCitationClick,
}: MarkdownRendererProps) {
  if (!content) return null;

  // Split content into lines to parse block structures
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let currentListItems: React.ReactNode[] = [];
  let inList = false;

  const parseInline = (text: string, keyPrefix: string) => {
    // Matches bold text (**bold**) or citations ([1])
    const inlineRegex = /(\*\*([^*]+)\*\*|\[(\d+)\])/g;
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match;
    let tokenKey = 0;
    
    while ((match = inlineRegex.exec(text)) !== null) {
      const matchIdx = match.index;
      
      // Add preceding plain text
      if (matchIdx > lastIdx) {
        parts.push(<span key={`${keyPrefix}-txt-${tokenKey++}`}>{text.substring(lastIdx, matchIdx)}</span>);
      }
      
      if (match[2] !== undefined) {
        // Bold match
        parts.push(
          <strong key={`${keyPrefix}-bold-${tokenKey++}`} className="font-bold text-gray-900">
            {match[2]}
          </strong>
        );
      } else if (match[3] !== undefined) {
        // Citation match
        const citationNum = parseInt(match[3]);
        const citationDetail = citations.find(c => c.citation_index === citationNum);
        
        if (citationDetail) {
          parts.push(
            <button
              key={`${keyPrefix}-cit-${tokenKey++}`}
              onMouseEnter={(e) => onCitationHover?.(e, citationDetail)}
              onMouseLeave={() => onCitationLeave?.()}
              onClick={() => onCitationClick?.(citationDetail)}
              className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-accent/10 text-accent text-[9px] font-bold mx-0.5 hover:bg-accent hover:text-white transition cursor-pointer"
            >
              {citationNum}
            </button>
          );
        } else {
          parts.push(<span key={`${keyPrefix}-cit-raw-${tokenKey++}`}>{match[0]}</span>);
        }
      }
      
      lastIdx = inlineRegex.lastIndex;
    }
    
    if (lastIdx < text.length) {
      parts.push(<span key={`${keyPrefix}-txt-end`}>{text.substring(lastIdx)}</span>);
    }
    
    return parts.length > 0 ? parts : text;
  };

  const flushList = (key: number) => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc pl-5 mb-3.5 space-y-1 text-gray-700">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      flushList(i);
      continue;
    }

    // Headers: ### Header or ## Header
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      flushList(i);
      const level = headerMatch[1].length;
      const title = headerMatch[2];
      const parsedTitle = parseInline(title, `h-${i}`);
      
      if (level === 1) {
        elements.push(<h1 key={`h1-${i}`} className="text-sm font-bold text-gray-900 mt-4 mb-2 font-serif">{parsedTitle}</h1>);
      } else if (level === 2) {
        elements.push(<h2 key={`h2-${i}`} className="text-xs font-bold text-gray-900 mt-3 mb-1.5 font-serif">{parsedTitle}</h2>);
      } else {
        elements.push(<h3 key={`h3-${i}`} className="text-[10px] font-bold text-accent mt-3 mb-1 font-serif uppercase tracking-wider">{parsedTitle}</h3>);
      }
      continue;
    }

    // Unordered List: * item or - item
    const listMatch = trimmed.match(/^[*+-]\s+(.*)$/);
    if (listMatch) {
      inList = true;
      const content = listMatch[1];
      currentListItems.push(
        <li key={`li-${i}-${currentListItems.length}`} className="text-xs text-gray-700 leading-relaxed pl-0.5">
          {parseInline(content, `li-item-${i}`)}
        </li>
      );
      continue;
    }

    // Regular paragraph
    flushList(i);
    elements.push(
      <p key={`p-${i}`} className="mb-3 text-xs text-gray-700 leading-relaxed">
        {parseInline(line, `p-${i}`)}
      </p>
    );
  }

  flushList(lines.length);

  return <div className="markdown-body select-text">{elements}</div>;
}
