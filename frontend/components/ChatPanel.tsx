'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useNotebookStore, Message } from '../lib/store';
import { Send, Bot, User, ArrowLeft, BookOpen, Quote, ChevronRight, CornerDownRight, X, AlertCircle, FileText, HelpCircle, Calendar, ClipboardList, Settings, Sparkles } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

function parseThoughtsAndContent(rawText: string): { thoughts: string; content: string } {
  if (!rawText) return { thoughts: '', content: '' };
  
  const thoughtStart = rawText.indexOf('<thought>');
  if (thoughtStart === -1) {
    return { thoughts: '', content: rawText };
  }
  
  const thoughtEnd = rawText.indexOf('</thought>');
  if (thoughtEnd === -1) {
    // Thought block is still open (streaming)
    const thoughts = rawText.slice(thoughtStart + 9);
    const content = rawText.slice(0, thoughtStart);
    return { thoughts, content };
  } else {
    // Thought block is closed
    const thoughts = rawText.slice(thoughtStart + 9, thoughtEnd);
    const content = rawText.slice(0, thoughtStart) + rawText.slice(thoughtEnd + 10);
    return { thoughts, content };
  }
}

interface ThoughtDropdownProps {
  thoughts: string;
  isStreaming?: boolean;
}

function ThoughtDropdown({ thoughts, isStreaming }: ThoughtDropdownProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Auto-expand during streaming when thoughts are active
  useEffect(() => {
    if (isStreaming && thoughts && !hasInteracted) {
      setIsOpen(true);
    }
  }, [thoughts, isStreaming, hasInteracted]);

  if (!thoughts || !thoughts.trim()) return null;

  return (
    <div className="mb-3 border border-border-custom bg-[#faf8f5] rounded-xl overflow-hidden text-xs">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setHasInteracted(true);
        }}
        className="w-full px-3.5 py-2 flex items-center justify-between text-gray-500 hover:text-gray-800 hover:bg-gray-100/50 transition font-medium cursor-pointer"
        type="button"
      >
        <span className="flex items-center gap-1.5 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
          {isOpen ? "Hide thinking process" : "View thinking process"}
        </span>
        <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-3.5 pb-3 pt-1.5 border-t border-border-custom bg-white text-gray-500 whitespace-pre-wrap leading-relaxed text-[11px] max-h-60 overflow-y-auto custom-scrollbar italic font-normal">
          {thoughts.trim()}
        </div>
      )}
    </div>
  );
}

interface ChatPanelProps {
  notebookId: string;
}

export default function ChatPanel({ notebookId }: ChatPanelProps) {
  const {
    conversations,
    activeConversation,
    messages,
    isChatStreaming,
    streamingMessageText,
    createConversation,
    selectConversation,
    sendMessage,
    activeSourceId,
    activeSourceText,
    sources,
    selectedSourceIds,
    fetchSourceContent
  } = useNotebookStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sourceViewerRef = useRef<HTMLDivElement>(null);
  
  // Citation Tooltip state
  const [hoveredCitation, setHoveredCitation] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessageText]);

  // Start chat if none active
  useEffect(() => {
    if (conversations.length > 0 && !activeConversation) {
      selectConversation(conversations[0].id);
    }
  }, [conversations, activeConversation, selectConversation]);

  const handleSendText = async (text: string) => {
    if (!text.trim() || isChatStreaming) return;
    
    let convId = activeConversation?.id;
    if (!convId) {
      const newConv = await createConversation(notebookId, text.trim().slice(0, 30));
      convId = newConv.id;
    }
    
    await sendMessage(convId, text.trim());
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput('');
    await handleSendText(text);
  };

  const handleStartNewChat = async () => {
    await createConversation(notebookId, 'New Chat');
  };

  // Helper to render message content with clickable citations
  const renderMessageContent = (msg: Message) => {
    const text = msg.content;
    if (!text) return null;

    // Regex to match citations: [1], [2], etc.
    const citationRegex = /\[(\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const citationNum = parseInt(match[1]);
      
      // Push preceding text
      if (matchIndex > lastIndex) {
        parts.push(<span key={lastIndex}>{text.substring(lastIndex, matchIndex)}</span>);
      }

      // Find matched citation details
      const citationDetail = msg.citations?.find(c => c.citation_index === citationNum);
      
      if (citationDetail) {
        parts.push(
          <button
            key={matchIndex}
            onMouseEnter={(e) => handleCitationHover(e, citationDetail)}
            onMouseLeave={() => setHoveredCitation(null)}
            onClick={() => handleCitationClick(citationDetail)}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold mx-0.5 hover:bg-accent hover:text-white transition cursor-pointer"
          >
            {citationNum}
          </button>
        );
      } else {
        parts.push(<span key={matchIndex}>{match[0]}</span>);
      }
      
      lastIndex = citationRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={lastIndex}>{text.substring(lastIndex)}</span>);
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed text-xs text-gray-700">
        {parts.length > 0 ? parts : text}
      </div>
    );
  };

  const handleCitationHover = (e: React.MouseEvent, citation: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 10
    });
    setHoveredCitation(citation);
  };

  const handleCitationClick = async (citation: any) => {
    // Open source file in splitscreen
    await fetchSourceContent(citation.source_id);
    
    // Highlight or scroll to text in source viewer after a short delay
    setTimeout(() => {
      const viewer = sourceViewerRef.current;
      if (viewer) {
        const snippetText = citation.quoted_text || "";
        const elements = viewer.getElementsByTagName('p');
        for (let el of Array.from(elements)) {
          if (el.textContent && el.textContent.includes(snippetText.substring(0, 30))) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-yellow-100', 'transition', 'duration-1000');
            setTimeout(() => el.classList.remove('bg-yellow-100'), 3000);
            break;
          }
        }
      }
    }, 500);
  };

  const activeIndexedSources = sources.filter(s => s.status === 'indexed');
  const activeSelectedSources = activeIndexedSources.filter(s => selectedSourceIds.includes(s.id));

  return (
    <div className="flex-1 flex overflow-hidden bg-bg-secondary h-full relative">
      {/* Splitscreen Container */}
      <div className="flex-1 flex h-full overflow-hidden">
        
        {/* Left Split: Document Viewer */}
        {activeSourceText && (
          <div className="w-1/2 h-full bg-white border-r border-border-custom flex flex-col relative animate-slide-in">
            {/* Viewer Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-border-custom bg-white z-10">
              <span className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-accent" />
                {sources.find(s => s.id === activeSourceId)?.title || 'Document Viewer'}
              </span>
              <button
                onClick={() => useNotebookStore.setState({ activeSourceText: null, activeSourceId: null })}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                title="Close document viewer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Content */}
            <div 
              ref={sourceViewerRef}
              className="flex-1 overflow-y-auto p-8 space-y-4 text-xs text-gray-700 leading-relaxed custom-scrollbar selection:bg-accent-light"
            >
              {activeSourceText.split('\n\n').map((paragraph, index) => {
                if (!paragraph.trim()) return null;
                if (paragraph.startsWith('#')) {
                  const level = (paragraph.match(/^#+/) || ['#'])[0].length;
                  const text = paragraph.replace(/^#+\s*/, '');
                  return (
                    <h3 
                      key={index} 
                      className={`font-bold text-gray-800 mt-5 mb-2.5 ${
                        level === 1 ? 'text-sm border-b pb-1 border-gray-100' : 'text-xs'
                      }`}
                    >
                      {text}
                    </h3>
                  );
                }
                return (
                  <p key={index} className="transition duration-500 rounded p-1.5">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* Right Split: Chat Interface */}
        <div className={`h-full flex flex-col bg-bg-secondary ${activeSourceText ? 'w-1/2' : 'w-full'}`}>
          {/* Chat Headers / Conversations bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-custom bg-white shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-500 text-[11px] uppercase tracking-wider">Chat</span>
              <select
                value={activeConversation?.id || ''}
                onChange={(e) => e.target.value && selectConversation(e.target.value)}
                className="text-xs font-semibold border border-border-custom rounded-full px-3 py-1 bg-bg-secondary text-gray-700 focus:outline-none focus:border-accent cursor-pointer"
              >
                {conversations.length === 0 ? (
                  <option value="">No active chats</option>
                ) : (
                  conversations.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))
                )}
              </select>
            </div>
            <button
              onClick={handleStartNewChat}
              className="text-xs px-3 py-1.5 bg-accent-light text-accent rounded-full hover:bg-accent hover:text-white transition font-semibold cursor-pointer"
            >
              New Chat
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            {messages.length === 0 && !isChatStreaming ? (
              /* Google NotebookLM "Notebook Guide" Empty State */
              <div className="flex flex-col items-center justify-center min-h-full text-center px-4 max-w-xl mx-auto space-y-6 py-8">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-accent-light flex items-center justify-center text-accent mx-auto mb-3 shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-gray-800">
                    {useNotebookStore.getState().activeNotebook?.name || "Notebook Guide"}
                  </h3>
                  <p className="text-gray-400 text-xs mt-1">
                    {activeSelectedSources.length} of {activeIndexedSources.length} documents selected.
                  </p>
                </div>

                {/* Notebook Guide Shortcuts */}
                <div className="w-full bg-white border border-border-custom rounded-2xl p-5 shadow-xs text-left">
                  <span className="block font-bold text-[11px] text-gray-400 uppercase tracking-wider mb-3.5">
                    Generate Notebook Guide
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => handleSendText("Create a comprehensive FAQ document based on the active sources.")}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border-custom hover:border-accent hover:bg-bg-secondary text-left transition cursor-pointer group"
                    >
                      <HelpCircle className="w-5 h-5 text-accent mt-0.5" />
                      <div>
                        <span className="block text-xs font-bold text-gray-800 group-hover:text-accent">FAQ</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5 leading-normal">Common questions and detailed answers.</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSendText("Compile a structured Study Guide detailing key themes and concepts.")}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border-custom hover:border-accent hover:bg-bg-secondary text-left transition cursor-pointer group"
                    >
                      <ClipboardList className="w-5 h-5 text-accent mt-0.5" />
                      <div>
                        <span className="block text-xs font-bold text-gray-800 group-hover:text-accent">Study Guide</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5 leading-normal">Key glossary terms and conceptual outlines.</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSendText("Extract a chronological Timeline of events from the source documents.")}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border-custom hover:border-accent hover:bg-bg-secondary text-left transition cursor-pointer group"
                    >
                      <Calendar className="w-5 h-5 text-accent mt-0.5" />
                      <div>
                        <span className="block text-xs font-bold text-gray-800 group-hover:text-accent">Timeline</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5 leading-normal">Step-by-step chronology of major breakthroughs.</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSendText("Generate a formal Briefing Document summarizing the core contents.")}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border-custom hover:border-accent hover:bg-bg-secondary text-left transition cursor-pointer group"
                    >
                      <FileText className="w-5 h-5 text-accent mt-0.5" />
                      <div>
                        <span className="block text-xs font-bold text-gray-800 group-hover:text-accent">Briefing Doc</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5 leading-normal">Professional summary prepared for quick review.</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 max-w-xs leading-normal">
                  Or ask a custom question in the input box below.
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div key={msg.id} className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="w-7 h-7 shrink-0 rounded-xl bg-accent flex items-center justify-center text-white font-bold shadow-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-xs border ${
                        isUser 
                          ? 'bg-accent text-white border-accent' 
                          : 'bg-white text-gray-700 border-border-custom'
                      }`}>
                        {isUser ? (
                          <p className="text-xs leading-relaxed">{msg.content}</p>
                        ) : (() => {
                          const { thoughts, content } = parseThoughtsAndContent(msg.content);
                          return (
                            <>
                              <ThoughtDropdown thoughts={thoughts} />
                              {content && (
                                <MarkdownRenderer
                                  content={content}
                                  citations={msg.citations}
                                  onCitationHover={handleCitationHover}
                                  onCitationLeave={() => setHoveredCitation(null)}
                                  onCitationClick={handleCitationClick}
                                />
                              )}
                            </>
                          );
                        })()}
                        <span className={`block text-[9px] text-right mt-1.5 ${isUser ? 'text-sage-100 opacity-80' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
 
                {/* Streaming Indicator */}
                {isChatStreaming && (
                  <div className="flex gap-3.5 justify-start">
                    <div className="w-7 h-7 shrink-0 rounded-xl bg-accent flex items-center justify-center text-white font-bold shadow-xs">
                      <Bot className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="max-w-[82%] rounded-2xl px-4 py-3 bg-white text-gray-700 border border-border-custom shadow-xs w-full">
                      {(() => {
                        const { thoughts, content } = parseThoughtsAndContent(streamingMessageText);
                        const isThinking = thoughts.length > 0 && content.length === 0;
                        return (
                          <>
                            <ThoughtDropdown thoughts={thoughts} isStreaming={true} />
                            {content ? (
                              <MarkdownRenderer
                                content={content}
                                citations={[]}
                              />
                            ) : (
                              isThinking ? (
                                <div className="flex items-center gap-1.5 py-1 px-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" />
                                  <span className="text-[10px] text-gray-400 font-medium">Formulating response...</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 py-1 px-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                                  <span className="text-[10px] text-gray-400 font-medium ml-1.5">Gemma 4 is thinking...</span>
                                </div>
                              )
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Panel - Capsule Layout */}
          <div className="p-4 bg-bg-secondary border-t border-border-custom">
            <form onSubmit={handleFormSubmit} className="relative max-w-2xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  activeIndexedSources.length === 0 
                    ? "Upload sources first to start chatting..." 
                    : activeSelectedSources.length === 0
                    ? "Select at least one source to chat..."
                    : "Ask a question about your sources..."
                }
                disabled={activeSelectedSources.length === 0 || isChatStreaming}
                className="w-full pl-4 pr-14 py-3 text-xs border border-border-custom rounded-full bg-white shadow-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={activeSelectedSources.length === 0 || !input.trim() || isChatStreaming}
                className="absolute right-1.5 top-1.5 p-2 bg-accent hover:bg-accent-hover text-white rounded-full transition disabled:opacity-50 flex items-center justify-center cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            
            {/* Sources indicator */}
            <div className="text-center mt-2 text-[10px] text-gray-400 font-medium">
              {activeSelectedSources.length === 0 ? (
                <span className="text-red-500 font-semibold flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Select at least one source document above.
                </span>
              ) : (
                <span>
                  Using <b>{activeSelectedSources.length} of {activeIndexedSources.length}</b> source documents selected for grounding.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hover Citation Tooltip Overlay */}
      {hoveredCitation && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="bg-white border border-border-custom p-3.5 rounded-xl shadow-lg max-w-xs z-50 text-[11px] text-gray-700 animate-fade-in"
          onMouseEnter={() => setHoveredCitation(hoveredCitation)} // Keep open
          onMouseLeave={() => setHoveredCitation(null)}
        >
          <div className="flex items-center gap-1.5 text-accent font-bold mb-1.5">
            <Quote className="w-3.5 h-3.5" />
            <span>{hoveredCitation.source_title}, page {hoveredCitation.page_number}</span>
          </div>
          <p className="italic text-gray-500 line-clamp-3 leading-relaxed">"{hoveredCitation.quoted_text}"</p>
          <button
            onClick={() => handleCitationClick(hoveredCitation)}
            className="mt-2 text-accent font-bold hover:underline block w-full text-right cursor-pointer"
          >
            Jump to Source &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
