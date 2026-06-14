'use client';

import React, { useState, useEffect } from 'react';
import { useNotebookStore, Source } from '../lib/store';
import { Plus, FileText, Globe, Video, Trash2, Loader2, Link2, Upload, AlertCircle, CheckSquare, Square, Check } from 'lucide-react';

interface SourcePanelProps {
  notebookId: string;
}

export default function SourcePanel({ notebookId }: SourcePanelProps) {
  const { 
    sources, 
    activeSourceId,
    selectedSourceIds,
    fetchSources, 
    uploadSourceFile, 
    addSourceURL, 
    deleteSource, 
    fetchSourceContent,
    toggleSourceSelection,
    selectAllSources,
    clearSourceSelection
  } = useNotebookStore();

  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'file' | 'link'>('file');
  
  // Link inputs
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Poll source statuses if any source is processing/uploading
  useEffect(() => {
    const hasActiveTasks = sources.some(s => s.status === 'uploading' || s.status === 'processing');
    if (!hasActiveTasks) return;

    const interval = setInterval(() => {
      fetchSources(notebookId);
    }, 3000);

    return () => clearInterval(interval);
  }, [sources, notebookId, fetchSources]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await uploadSourceFile(notebookId, e.target.files[0]);
      setIsOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await addSourceURL(notebookId, urlInput.trim(), titleInput.trim());
      setUrlInput('');
      setTitleInput('');
      setIsOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4.5 h-4.5 text-red-500" />;
      case 'docx': return <FileText className="w-4.5 h-4.5 text-blue-500" />;
      case 'text': return <FileText className="w-4.5 h-4.5 text-gray-500" />;
      case 'url': return <Globe className="w-4.5 h-4.5 text-emerald-600" />;
      case 'youtube': return <Video className="w-4.5 h-4.5 text-red-600" />;
      default: return <FileText className="w-4.5 h-4.5 text-gray-500" />;
    }
  };

  // Toggle all logic
  const allIndexed = sources.filter(s => s.status === 'indexed');
  const allSelected = allIndexed.length > 0 && allIndexed.every(s => selectedSourceIds.includes(s.id));

  const handleToggleAll = () => {
    if (allSelected) {
      clearSourceSelection();
    } else {
      selectAllSources();
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-tertiary border-r border-border-custom select-none">
      {/* Panel Header */}
      <div className="p-4 border-b border-border-custom bg-bg-tertiary">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-gray-800 flex items-center gap-2">
            <span>Sources</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-light text-accent font-semibold">
              {sources.length}
            </span>
          </h2>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-accent text-white hover:bg-accent-hover transition font-semibold cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add source</span>
          </button>
        </div>

        {/* Checkbox select all */}
        {allIndexed.length > 0 && (
          <div className="flex items-center justify-between mt-3 text-[10px] text-gray-500">
            <button 
              onClick={handleToggleAll}
              className="flex items-center gap-1.5 hover:text-accent font-medium cursor-pointer"
            >
              {allSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-accent" />
              ) : (
                <Square className="w-3.5 h-3.5 text-gray-400" />
              )}
              <span>{allSelected ? 'Select none' : 'Select all'}</span>
            </button>
            <span className="font-medium text-gray-400">
              {selectedSourceIds.length} of {allIndexed.length} active
            </span>
          </div>
        )}
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <FileText className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-gray-500 text-xs font-semibold">No sources uploaded yet</p>
            <p className="text-gray-400 text-[10px] mt-1 leading-normal">Upload files or crawl URLs to seed your notebook.</p>
          </div>
        ) : (
          sources.map((src) => {
            const isActive = activeSourceId === src.id;
            const isSelected = selectedSourceIds.includes(src.id);
            const isProcessing = src.status === 'uploading' || src.status === 'processing';
            const isError = src.status === 'error';
            
            return (
              <div
                key={src.id}
                onClick={() => !isProcessing && fetchSourceContent(src.id)}
                className={`group flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition ${
                  isActive 
                    ? 'border-accent bg-white shadow-xs ring-1 ring-accent' 
                    : isSelected
                    ? 'border-border-custom bg-white hover:border-gray-300'
                    : 'border-border-custom bg-gray-50/70 opacity-60 hover:opacity-80'
                } ${isProcessing ? 'pointer-events-none' : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Checkbox (if indexed) */}
                  {!isProcessing && !isError && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSourceSelection(src.id);
                      }}
                      className="p-0.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-accent cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-300" />
                      )}
                    </button>
                  )}

                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  ) : (
                    getSourceIcon(src.source_type)
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold truncate text-[11px] ${isActive ? 'text-accent' : 'text-gray-800'}`}>
                      {src.title}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      {isProcessing ? 'Indexing chunks...' : isError ? 'Parsing failed' : `${src.chunk_count || 0} chunks`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-1">
                  {isError && (
                    <span title={src.error_message}>
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSource(src.id);
                    }}
                    className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Remove Source"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Source Modal */}
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative border border-gray-100">
            <h3 className="font-bold text-sm text-gray-800 mb-4">Add Source to Notebook</h3>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                onClick={() => setTab('file')}
                className={`flex-1 pb-2 font-semibold text-xs text-center border-b-2 transition ${
                  tab === 'file' ? 'border-accent text-accent' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Upload File
                </span>
              </button>
              <button
                onClick={() => setTab('link')}
                className={`flex-1 pb-2 font-semibold text-xs text-center border-b-2 transition ${
                  tab === 'link' ? 'border-accent text-accent' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  Link (URL/YouTube)
                </span>
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Tab content */}
            {tab === 'file' ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-accent hover:bg-accent-light/10 transition relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  accept=".pdf,.docx,.txt,.md"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-700 font-semibold text-xs">Drag & drop or click to upload</p>
                <p className="text-gray-400 text-[10px] mt-1">Supports PDF, DOCX, TXT, MD up to 20MB</p>
                {isSubmitting && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleLinkSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Crawl Web URL or YouTube Video</label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/article or https://youtube.com/watch?v=..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Custom Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="My Resource Title"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-accent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !urlInput}
                  className="w-full py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Fetching & Parsing...' : 'Import Source'}</span>
                </button>
              </form>
            )}

            <button
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
