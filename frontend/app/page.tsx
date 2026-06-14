'use client';

import React, { useState, useEffect } from 'react';
import { useNotebookStore, Notebook } from '../lib/store';
import MainLayout from '../components/layout/MainLayout';
import SourcePanel from '../components/SourcePanel';
import ChatPanel from '../components/ChatPanel';
import StudioPanel from '../components/StudioPanel';
import { Plus, Book, Trash2, FolderPlus, Settings, Save, X, HelpCircle, Loader2 } from 'lucide-react';

export default function Home() {
  const {
    notebooks,
    activeNotebook,
    fetchNotebooks,
    createNotebook,
    selectNotebook,
    updateNotebookSettings,
    deleteNotebook,
    isChatStreaming
  } = useNotebookStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Create Form inputs
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [persona, setPersona] = useState('');

  // Settings input
  const [settingsPersona, setSettingsPersona] = useState('');
  const [settingsNumCtx, setSettingsNumCtx] = useState(8192);

  // Fetch notebooks on mount
  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  // Sync settings when active notebook changes
  useEffect(() => {
    if (activeNotebook) {
      setSettingsPersona(activeNotebook.persona || '');
      setSettingsNumCtx(activeNotebook.num_ctx || 8192);
    }
  }, [activeNotebook]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const newNotebook = await createNotebook(
        name.trim(),
        desc.trim(),
        persona.trim()
      );
      setName('');
      setDesc('');
      setPersona('');
      setIsCreateOpen(false);
      // Automatically select the newly created notebook
      await selectNotebook(newNotebook.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeNotebook) return;
    try {
      await updateNotebookSettings(activeNotebook.id, settingsPersona, settingsNumCtx);
      setIsSettingsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectNotebook = async (notebookId: string) => {
    await selectNotebook(notebookId);
  };

  const handleCloseActiveNotebook = () => {
    useNotebookStore.setState({ activeNotebook: null });
  };

  // 1. RENDER ACTIVE NOTEBOOK VIEW (3-PANEL LAYOUT)
  if (activeNotebook) {
    return (
      <MainLayout 
        notebookName={activeNotebook.name} 
        onOpenSettings={() => setIsSettingsOpen(true)}
      >
        <div className="flex flex-1 overflow-hidden h-full">
          {/* Back button to dashboard */}
          <div className="flex flex-col h-full shrink-0 border-r border-border-custom bg-gray-50 p-2 items-center justify-between z-20">
            <button
              onClick={handleCloseActiveNotebook}
              className="p-2 rounded-xl hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition cursor-pointer"
              title="Exit to Dashboard"
            >
              <Book className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition cursor-pointer"
              title="System Persona Configuration"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* 3-panel split view */}
          <div className="flex-1 flex overflow-hidden">
            {/* Panel 1: Sources (Left) */}
            <div className="w-[280px] shrink-0 h-full">
              <SourcePanel notebookId={activeNotebook.id} />
            </div>

            {/* Panel 2: Chat (Center) */}
            <div className="flex-1 h-full">
              <ChatPanel notebookId={activeNotebook.id} />
            </div>

            {/* Panel 3: Studio (Right) */}
            <div className="w-[320px] shrink-0 h-full">
              <StudioPanel notebookId={activeNotebook.id} />
            </div>
          </div>
        </div>

        {/* Notebook System Instruction/Persona settings modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative border border-border-custom max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="font-serif font-bold text-sm text-gray-800 flex items-center gap-2">
                <Settings className="w-4 h-4 text-accent" />
                <span>Configure Notebook Settings</span>
              </h3>
              <p className="text-[10px] text-gray-400 mt-1">
                Customize the persona and LLM parameters for Gemma 4 when chatting inside this notebook.
              </p>

              <div className="mt-4 space-y-4">
                {/* Custom System Persona / Instructions */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">System Instructions / Persona</label>
                  <textarea
                    rows={4}
                    placeholder="Example: You are a professional biologist summarizing research. Explain concepts simply and define acronyms."
                    value={settingsPersona}
                    onChange={(e) => setSettingsPersona(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:border-accent selection:bg-accent-light"
                  />
                </div>

                {/* Context Window Token Limit Slider */}
                <div className="bg-bg-secondary p-4 rounded-xl border border-border-custom">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-gray-700">Memory Context Window Limit</label>
                    <span className="text-xs font-mono font-bold text-accent bg-accent-light px-2 py-0.5 rounded-full">
                      {settingsNumCtx.toLocaleString()} tokens
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1 leading-normal">
                    Drag the slider to adjust how much source document text and conversation history Gemma 4 can hold in active memory.
                  </p>
                  
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-[9px] text-gray-400 font-mono">2K</span>
                    <input
                      type="range"
                      min={2048}
                      max={32768}
                      step={1024}
                      value={settingsNumCtx}
                      onChange={(e) => setSettingsNumCtx(parseInt(e.target.value))}
                      className="flex-1 accent-accent h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-[9px] text-gray-400 font-mono">32K</span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[9px] text-gray-400">
                    <span>Low Memory (2,048)</span>
                    <span>Standard (8,192)</span>
                    <span>High Context (32,768)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 cursor-pointer transition text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </MainLayout>
    );
  }

  // 2. RENDER DASHBOARD (NOTEBOOK GRID SELECTION)
  return (
    <div className="flex flex-col min-h-screen bg-bg-secondary w-full select-none">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-6 bg-bg-tertiary border-b border-border-custom shadow-xs z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-white font-bold">
            LN
          </div>
          <span className="font-bold text-gray-800 text-base">LocalNotebookLM Dashboard</span>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1 text-xs px-3.5 py-2 rounded-full bg-accent text-white hover:bg-accent-hover transition font-bold shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Notebook</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-800">My Notebooks</h1>
          <p className="text-xs text-gray-500 mt-1">Select a notebook to start researching, chatting, and generating study aides.</p>
        </div>

        {/* Notebooks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* Create Card */}
          <div
            onClick={() => setIsCreateOpen(true)}
            className="border-2 border-dashed border-border-custom hover:border-accent hover:bg-white rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[160px]"
          >
            <FolderPlus className="w-8 h-8 text-gray-400 mb-2" />
            <span className="font-bold text-xs text-gray-700">Create New Notebook</span>
            <span className="text-[10px] text-gray-400 mt-1">Combine documents into a research session</span>
          </div>

          {/* Notebook list */}
          {notebooks.map((nb) => (
            <div
              key={nb.id}
              onClick={() => handleSelectNotebook(nb.id)}
              className="group border border-border-custom hover:border-accent hover:shadow-md bg-white rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition min-h-[160px]"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-xs text-gray-800 group-hover:text-accent transition truncate">
                    {nb.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotebook(nb.id);
                    }}
                    className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Delete Notebook"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {nb.description || "No description provided."}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border-custom flex items-center justify-between text-[10px] text-gray-400">
                <span>{nb.source_count || 0} sources</span>
                <span>{nb.chat_count || 0} chats</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Create Notebook Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative border border-gray-100">
            <h3 className="font-bold text-base text-gray-800 mb-4 flex items-center gap-2">
              <Book className="w-5 h-5 text-accent" />
              <span>Create Notebook</span>
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Notebook Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Biology Exam Study Guide"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Research papers on genetic engineering"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Custom System Persona (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Instructions for the AI, e.g. 'Explain like a physics professor.'"
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="flex-1 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  Create Notebook
                </button>
              </div>
            </form>

            <button
              onClick={() => setIsCreateOpen(false)}
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
