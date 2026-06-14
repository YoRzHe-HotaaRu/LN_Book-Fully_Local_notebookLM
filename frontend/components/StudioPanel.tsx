'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNotebookStore, Generation } from '../lib/store';
import { Play, Pause, Square, Award, ArrowLeft, ArrowRight, Eye, RefreshCw, Loader2, BookOpen, Layers, Check, HelpCircle, GitPullRequest, CornerDownRight } from 'lucide-react';

interface StudioPanelProps {
  notebookId: string;
}

export default function StudioPanel({ notebookId }: StudioPanelProps) {
  const { generations, triggerGeneration, fetchGenerations } = useNotebookStore();
  const [activeOutput, setActiveOutput] = useState<{ type: string; data: any } | null>(null);
  
  // Audio Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTurnIdx, setActiveTurnIdx] = useState<number | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  
  // Slide Deck states
  const [slideIdx, setSlideIdx] = useState(0);

  // Flashcards states
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz states
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Poll generations state if any is pending/processing
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    const hasRunning = generations.some(g => g.status === 'pending' || g.status === 'processing');
    if (!hasRunning) return;

    const interval = setInterval(() => {
      fetchGenerations(notebookId);
    }, 4000);

    return () => clearInterval(interval);
  }, [generations, notebookId, fetchGenerations]);

  // Handle TTS playback
  const playPodcast = (script: Array<{ speaker: string; text: string }>) => {
    if (!synthRef.current) return;
    
    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
      setActiveTurnIdx(null);
      return;
    }

    setIsPlaying(true);
    let currentIdx = activeTurnIdx !== null ? activeTurnIdx : 0;
    
    const speakTurn = (idx: number) => {
      if (idx >= script.length) {
        setIsPlaying(false);
        setActiveTurnIdx(null);
        return;
      }
      
      setActiveTurnIdx(idx);
      const turn = script[idx];
      const utterance = new SpeechSynthesisUtterance(turn.text);
      speechUtteranceRef.current = utterance;

      // Select voices: search for Microsoft natural voices
      const voices = synthRef.current?.getVoices() || [];
      const isA = turn.speaker === 'Host A';
      
      let selectedVoice = null;
      if (isA) {
        selectedVoice = voices.find(v => v.name.includes('David') || v.name.includes('Andrew') || v.name.includes('Male')) || voices[0];
      } else {
        selectedVoice = voices.find(v => v.name.includes('Zira') || v.name.includes('Emma') || v.name.includes('Female')) || voices[1] || voices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = isA ? 1.05 : 1.0;
      
      utterance.onend = () => {
        speakTurn(idx + 1);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setActiveTurnIdx(null);
      };

      synthRef.current?.speak(utterance);
    };

    speakTurn(currentIdx);
  };

  const stopPodcast = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
    setActiveTurnIdx(null);
  };

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const handleGenerate = async (type: string) => {
    try {
      await triggerGeneration(notebookId, type);
    } catch (e) {
      console.error(e);
    }
  };

  const openOutput = (gen: Generation) => {
    setActiveOutput({
      type: gen.type,
      data: gen.output
    });
    setSlideIdx(0);
    setFlashcardIdx(0);
    setIsFlipped(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const getGenForType = (type: string) => {
    return generations.find(g => g.type === type);
  };

  const renderCardState = (type: string, title: string, desc: string) => {
    const gen = getGenForType(type);
    const isPending = gen?.status === 'pending' || gen?.status === 'processing';
    const isCompleted = gen?.status === 'completed';
    const isFailed = gen?.status === 'failed';

    return (
      <div className="p-4 bg-white border border-border-custom rounded-xl shadow-xs flex flex-col justify-between hover:border-accent/40 transition">
        <div>
          <h3 className="font-semibold text-xs text-gray-800">{title}</h3>
          <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{desc}</p>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          {isPending ? (
            <div className="flex items-center gap-1.5 text-accent text-[11px] font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Generating...</span>
            </div>
          ) : isCompleted ? (
            <button
              onClick={() => openOutput(gen)}
              className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Output</span>
            </button>
          ) : (
            <button
              onClick={() => handleGenerate(type)}
              className="text-[11px] font-bold text-gray-600 hover:text-accent flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isFailed ? 'Retry' : 'Generate'}</span>
            </button>
          )}

          {isCompleted && (
            <span className="text-[9px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold">Ready</span>
          )}
        </div>
      </div>
    );
  };

  if (!activeOutput) {
    return (
      <div className="flex flex-col h-full bg-bg-tertiary border-l border-border-custom w-full">
        <div className="p-4 border-b border-border-custom bg-bg-tertiary">
          <h2 className="font-bold text-sm text-gray-800 flex items-center gap-2">
            <span>Studio Panel</span>
          </h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Create and review generated study assets.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3.5 custom-scrollbar">
          {renderCardState('podcast', '🎧 Audio Overview', 'Listen to two hosts discuss your documents in a natural conversation.')}
          {renderCardState('slides', '📊 Slide Deck', 'Preview structures and speaker notes compiled for a presentation.')}
          {renderCardState('flashcards', '📝 Flashcards', 'Conceptual questions and answers with flip cards for active recall.')}
          {renderCardState('quiz', '❓ Quiz', 'Multiple-choice test with score tracking and rationales.')}
          {renderCardState('mindmap', '🗺️ Mind Map', 'Visual hierarchy concepts mapped out in structure.')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-tertiary border-l border-border-custom w-full overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border-custom bg-bg-tertiary z-10">
        <button
          onClick={() => { stopPodcast(); setActiveOutput(null); }}
          className="text-xs font-bold text-gray-500 hover:text-accent flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Studio Panel</span>
        </button>
        <span className="font-bold text-[10px] uppercase text-accent tracking-wider bg-accent-light px-2 py-0.5 rounded">{activeOutput.type}</span>
      </div>

      {/* Renderers */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-bg-secondary">
        
        {/* PODCAST RENDERER */}
        {activeOutput.type === 'podcast' && activeOutput.data?.script && (
          <div className="space-y-4 h-full flex flex-col justify-between">
            <div className="bg-white border border-border-custom rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-gray-800 text-xs">Audio Overview Player</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Utilizes local browser voice synthesis.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => playPodcast(activeOutput.data.script)}
                  className="p-2.5 bg-accent hover:bg-accent-hover text-white rounded-full shadow-md transition cursor-pointer"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                </button>
                <button
                  onClick={stopPodcast}
                  disabled={!isPlaying && activeTurnIdx === null}
                  className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition disabled:opacity-50 cursor-pointer"
                  title="Stop"
                >
                  <Square className="w-4 h-4 fill-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white border border-border-custom rounded-xl p-4 shadow-sm space-y-3 custom-scrollbar">
              {activeOutput.data.script.map((turn: any, index: number) => {
                const isCurrent = activeTurnIdx === index;
                const isA = turn.speaker === 'Host A';
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition duration-300 ${
                      isCurrent 
                        ? 'border-accent bg-accent-light/30 ring-1 ring-accent' 
                        : 'border-transparent bg-bg-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                        isA ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {turn.speaker}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isCurrent ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                      {turn.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SLIDES RENDERER */}
        {activeOutput.type === 'slides' && activeOutput.data?.slides && (
          <div className="h-full flex flex-col justify-between space-y-4">
            <div className="flex-1 bg-white border border-border-custom rounded-2xl shadow-sm p-6 flex flex-col justify-between min-h-[300px]">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Slide {slideIdx + 1} of {activeOutput.data.slides.length}
                </span>
                <h3 className="font-serif font-extrabold text-base text-gray-800 mt-2 border-b pb-2 border-gray-100">
                  {activeOutput.data.slides[slideIdx]?.title}
                </h3>
                
                <ul className="mt-4 space-y-3">
                  {activeOutput.data.slides[slideIdx]?.bullets?.map((bullet: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed">
                      <CornerDownRight className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {activeOutput.data.slides[slideIdx]?.notes && (
                <div className="mt-6 p-3 bg-yellow-50/70 border border-yellow-100 rounded-lg">
                  <span className="block text-[10px] font-bold text-yellow-800">Speaker Notes:</span>
                  <p className="text-[11px] text-yellow-950 mt-1 italic leading-relaxed">
                    {activeOutput.data.slides[slideIdx].notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center bg-white border border-border-custom rounded-xl p-3 shadow-xs">
              <button
                onClick={() => setSlideIdx(prev => Math.max(0, prev - 1))}
                disabled={slideIdx === 0}
                className="p-1.5 rounded-lg border border-border-custom hover:bg-bg-secondary disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-gray-500">
                {slideIdx + 1} / {activeOutput.data.slides.length}
              </span>
              <button
                onClick={() => setSlideIdx(prev => Math.min(activeOutput.data.slides.length - 1, prev + 1))}
                disabled={slideIdx === activeOutput.data.slides.length - 1}
                className="p-1.5 rounded-lg border border-border-custom hover:bg-bg-secondary disabled:opacity-50 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* FLASHCARDS RENDERER */}
        {activeOutput.type === 'flashcards' && activeOutput.data?.cards && (
          <div className="h-full flex flex-col justify-between space-y-4">
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex-1 bg-white border border-border-custom rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[260px] relative hover:shadow-md transition duration-300"
            >
              <div className="absolute top-4 left-4 text-[10px] uppercase font-bold text-gray-400">
                Card {flashcardIdx + 1} of {activeOutput.data.cards.length}
              </div>
              <div className="absolute top-4 right-4 text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-bg-secondary text-gray-500">
                {activeOutput.data.cards[flashcardIdx]?.difficulty}
              </div>

              <div className="max-w-md">
                {isFlipped ? (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-2">Answer</span>
                    <p className="text-sm font-semibold text-gray-800 leading-relaxed">
                      {activeOutput.data.cards[flashcardIdx]?.back}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-accent block mb-2">Question</span>
                    <p className="text-sm font-bold text-gray-800 leading-relaxed">
                      {activeOutput.data.cards[flashcardIdx]?.front}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="absolute bottom-4 text-[9px] text-gray-400 italic">
                Click card to flip
              </div>
            </div>

            <div className="flex justify-between items-center bg-white border border-border-custom rounded-xl p-3 shadow-xs">
              <button
                onClick={() => { setIsFlipped(false); setFlashcardIdx(prev => Math.max(0, prev - 1)); }}
                disabled={flashcardIdx === 0}
                className="p-1.5 rounded-lg border border-border-custom hover:bg-bg-secondary disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-gray-500">
                {flashcardIdx + 1} / {activeOutput.data.cards.length}
              </span>
              <button
                onClick={() => { setIsFlipped(false); setFlashcardIdx(prev => Math.min(activeOutput.data.cards.length - 1, prev + 1)); }}
                disabled={flashcardIdx === activeOutput.data.cards.length - 1}
                className="p-1.5 rounded-lg border border-border-custom hover:bg-bg-secondary disabled:opacity-50 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* QUIZ RENDERER */}
        {activeOutput.type === 'quiz' && activeOutput.data?.questions && (
          <div className="space-y-4">
            {activeOutput.data.questions.map((q: any, qIdx: number) => {
              const selectedOpt = quizAnswers[qIdx];
              const isCorrect = selectedOpt === q.correct_index;
              return (
                <div key={qIdx} className="bg-white border border-border-custom rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-xs bg-accent-light text-accent w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    <h4 className="font-semibold text-xs text-gray-800 leading-relaxed">{q.question}</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 pl-7">
                    {q.options.map((opt: string, oIdx: number) => {
                      const isSelected = selectedOpt === oIdx;
                      const showGreen = quizSubmitted && oIdx === q.correct_index;
                      const showRed = quizSubmitted && isSelected && !isCorrect;

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          disabled={quizSubmitted}
                          onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                          className={`text-left text-xs p-2.5 rounded-lg border transition ${
                            showGreen 
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium'
                              : showRed
                              ? 'border-red-500 bg-red-50 text-red-900 font-medium'
                              : isSelected
                              ? 'border-accent bg-accent-light text-accent'
                              : 'border-border-custom bg-bg-secondary text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {quizSubmitted && (
                    <div className={`mt-3 p-3 rounded-lg text-[11px] leading-relaxed flex items-start gap-2 ${
                      isCorrect ? 'bg-emerald-50/50 text-emerald-950 border border-emerald-100' : 'bg-red-50/50 text-red-950 border border-red-100'
                    }`}>
                      <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">{isCorrect ? 'Correct! ' : 'Incorrect. '}</span>
                        <span>{q.explanation}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {!quizSubmitted ? (
              <button
                type="button"
                onClick={() => setQuizSubmitted(true)}
                disabled={Object.keys(quizAnswers).length < activeOutput.data.questions.length}
                className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
              >
                Submit Answers for Grading
              </button>
            ) : (
              <div className="bg-white border border-border-custom rounded-xl p-4 shadow-sm text-center flex flex-col items-center justify-center">
                <Award className="w-8 h-8 text-accent mb-2" />
                <h4 className="font-bold text-xs text-gray-800">Your Grade</h4>
                <p className="text-xl font-extrabold text-accent mt-1">
                  {Object.keys(quizAnswers).filter(idx => quizAnswers[Number(idx)] === activeOutput.data.questions[Number(idx)].correct_index).length} / {activeOutput.data.questions.length}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Quiz completed successfully.</p>
              </div>
            )}
          </div>
        )}

        {/* MIND MAP RENDERER */}
        {activeOutput.type === 'mindmap' && activeOutput.data?.mermaid_code && (
          <div className="bg-white border border-border-custom rounded-2xl shadow-sm p-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-xs text-gray-800 mb-2 flex items-center gap-1.5">
                <GitPullRequest className="w-4 h-4 text-accent" />
                <span>Hierarchical Mind Map Outline</span>
              </h3>
              
              <div className="bg-bg-secondary border border-border-custom rounded-xl p-4 font-mono text-[11px] text-gray-700 whitespace-pre overflow-x-auto leading-relaxed custom-scrollbar">
                {activeOutput.data.mermaid_code}
              </div>
            </div>

            <div className="mt-4 text-[10px] text-gray-400 leading-normal">
              You can copy this Mermaid block and paste it directly into any Mermaid-compatible diagram editor to render a visual graph.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
