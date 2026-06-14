'use client';

import React, { useState } from 'react';
import { useNotebookStore } from '../../lib/store';
import { BookOpen, Settings } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  notebookName?: string;
  onOpenSettings?: () => void;
}

export default function MainLayout({ children, notebookName = "My Research Notebook", onOpenSettings }: MainLayoutProps) {
  const { activeNotebook } = useNotebookStore();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-secondary text-foreground text-sm selection:bg-accent-light selection:text-accent">
      {/* Top Header */}
      <header className="flex items-center justify-between h-14 px-5 bg-bg-tertiary border-b border-border-custom z-30 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7.5 h-7.5 rounded-lg bg-accent text-white font-bold text-sm shadow-xs">
            LN
          </div>
          <div>
            <span className="font-bold text-sm text-gray-800 tracking-tight">LocalNotebookLM</span>
            <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-accent text-white font-semibold">Gemma 4 12B QAT</span>
          </div>
        </div>
        
        {activeNotebook && (
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            <span className="font-bold text-xs text-gray-700">{activeNotebook.name}</span>
            <button 
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg hover:bg-gray-200/50 text-gray-500 hover:text-gray-800 transition cursor-pointer"
              title="Notebook System Persona"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <div className="w-20" /> {/* Spacer */}
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}
