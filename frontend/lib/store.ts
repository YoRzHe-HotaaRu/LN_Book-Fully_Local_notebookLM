import { create } from 'zustand';

export interface Notebook {
  id: string;
  name: string;
  description: string;
  persona: string;
  num_ctx: number;
  created_at: string;
  updated_at: string;
  source_count: number;
  chat_count: number;
}

export interface Source {
  id: string;
  notebook_id: string;
  source_type: string;
  title: string;
  chunk_count: number;
  status: string;
  error_message: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  notebook_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Array<{
    citation_index: number;
    ref_index: number;
    chunk_id: string;
    source_id: string;
    source_title: string;
    page_number: number;
    quoted_text: string;
  }>;
  created_at: string;
}

export interface Generation {
  id: string;
  notebook_id: string;
  type: 'podcast' | 'slides' | 'quiz' | 'flashcards' | 'mindmap';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  output: any;
  error_message: string;
  created_at: string;
}

interface NotebookLMState {
  notebooks: Notebook[];
  activeNotebook: Notebook | null;
  sources: Source[];
  activeSourceId: string | null;  // For showing a specific document in the viewer
  activeSourceText: string | null;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  generations: Generation[];
  isChatStreaming: boolean;
  streamingMessageText: string;
  selectedSourceIds: string[];
  
  // Actions
  fetchNotebooks: () => Promise<void>;
  createNotebook: (name: string, description?: string, persona?: string) => Promise<Notebook>;
  selectNotebook: (notebookId: string) => Promise<void>;
  updateNotebookSettings: (notebookId: string, persona: string, numCtx: number) => Promise<void>;
  deleteNotebook: (notebookId: string) => Promise<void>;
  
  fetchSources: (notebookId: string) => Promise<void>;
  uploadSourceFile: (notebookId: string, file: File) => Promise<void>;
  addSourceURL: (notebookId: string, url: string, title?: string) => Promise<void>;
  deleteSource: (sourceId: string) => Promise<void>;
  fetchSourceContent: (sourceId: string) => Promise<void>;
  
  toggleSourceSelection: (sourceId: string) => void;
  selectAllSources: () => void;
  clearSourceSelection: () => void;
  
  fetchConversations: (notebookId: string) => Promise<void>;
  createConversation: (notebookId: string, title?: string) => Promise<Conversation>;
  selectConversation: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  
  fetchGenerations: (notebookId: string) => Promise<void>;
  triggerGeneration: (notebookId: string, type: string, config?: any) => Promise<void>;
}

const API_BASE = 'http://localhost:8000/api';

export const useNotebookStore = create<NotebookLMState>((set, get) => ({
  notebooks: [],
  activeNotebook: null,
  sources: [],
  activeSourceId: null,
  activeSourceText: null,
  conversations: [],
  activeConversation: null,
  messages: [],
  generations: [],
  isChatStreaming: false,
  streamingMessageText: '',
  selectedSourceIds: [],

  fetchNotebooks: async () => {
    try {
      const res = await fetch(`${API_BASE}/notebooks`);
      if (res.ok) {
        const data = await res.json();
        set({ notebooks: data });
      }
    } catch (err) {
      console.error('Failed to fetch notebooks:', err);
    }
  },

  createNotebook: async (name, description = '', persona = '') => {
    const res = await fetch(`${API_BASE}/notebooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, persona }),
    });
    if (!res.ok) throw new Error('Failed to create notebook');
    const data = await res.json();
    set(state => ({ notebooks: [data, ...state.notebooks] }));
    return data;
  },

  selectNotebook: async (notebookId) => {
    const res = await fetch(`${API_BASE}/notebooks/${notebookId}`);
    if (res.ok) {
      const data = await res.json();
      set({ 
        activeNotebook: data, 
        activeSourceId: null, 
        activeSourceText: null, 
        activeConversation: null, 
        messages: [],
        selectedSourceIds: [] 
      });
      
      // Load sources, conversations, generations
      await get().fetchSources(notebookId);
      await get().fetchConversations(notebookId);
      await get().fetchGenerations(notebookId);
    }
  },

  updateNotebookSettings: async (notebookId, persona, numCtx) => {
    const res = await fetch(`${API_BASE}/notebooks/${notebookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona, num_ctx: numCtx }),
    });
    if (res.ok) {
      const data = await res.json();
      set({ activeNotebook: data });
    }
  },

  deleteNotebook: async (notebookId) => {
    const res = await fetch(`${API_BASE}/notebooks/${notebookId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      set(state => ({
        notebooks: state.notebooks.filter(n => n.id !== notebookId),
        activeNotebook: state.activeNotebook?.id === notebookId ? null : state.activeNotebook,
      }));
    }
  },

  fetchSources: async (notebookId) => {
    try {
      const res = await fetch(`${API_BASE}/notebooks/${notebookId}/sources`);
      if (res.ok) {
        const data = await res.json();
        const activeIds = data.filter((s: any) => s.status === 'indexed').map((s: any) => s.id);
        set(state => ({ 
          sources: data,
          selectedSourceIds: state.selectedSourceIds.length === 0 ? activeIds : state.selectedSourceIds.filter(id => activeIds.includes(id))
        }));
      }
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    }
  },

  toggleSourceSelection: (sourceId) => {
    set(state => {
      const isSelected = state.selectedSourceIds.includes(sourceId);
      const newSelected = isSelected
        ? state.selectedSourceIds.filter(id => id !== sourceId)
        : [...state.selectedSourceIds, sourceId];
      return { selectedSourceIds: newSelected };
    });
  },

  selectAllSources: () => {
    const indexedIds = get().sources.filter(s => s.status === 'indexed').map(s => s.id);
    set({ selectedSourceIds: indexedIds });
  },

  clearSourceSelection: () => {
    set({ selectedSourceIds: [] });
  },

  uploadSourceFile: async (notebookId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/notebooks/${notebookId}/sources/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload file');
    
    // Refresh sources
    await get().fetchSources(notebookId);
  },

  addSourceURL: async (notebookId, url, title = '') => {
    const res = await fetch(`${API_BASE}/notebooks/${notebookId}/sources/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title }),
    });
    if (!res.ok) throw new Error('Failed to add URL');
    
    // Refresh sources
    await get().fetchSources(notebookId);
  },

  deleteSource: async (sourceId) => {
    const res = await fetch(`${API_BASE}/sources/${sourceId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      set(state => ({
        sources: state.sources.filter(s => s.id !== sourceId),
        activeSourceId: state.activeSourceId === sourceId ? null : state.activeSourceId,
        activeSourceText: state.activeSourceId === sourceId ? null : state.activeSourceText,
      }));
    }
  },

  fetchSourceContent: async (sourceId) => {
    try {
      // In our design, we can fetch source details which returns content
      const res = await fetch(`${API_BASE}/sources/${sourceId}`);
      // Fallback: If we don't have a direct get source content, we can fetch it via SQLite or just keep it in active state
      // Let's implement active source viewing by finding the source in SQLite
      // Wait, let's look at the backend routers we built:
      // in api/sources.py, we have `GET /sources/{id}` (Wait! we forgot to define GET /sources/{id}! Oh wait, let's verify if we defined it or if we can read it from the sources list).
      // Ah! In `api/sources.py` we have:
      // `GET /notebooks/{id}/sources`
      // Let's see: we didn't define `GET /sources/{id}`! Wait, we should define it or read it. We can edit `api/sources.py` to add `GET /sources/{id}` to return the full content of the source!
      // Let's check api/sources.py code. Yes! It doesn't have `GET /sources/{id}`. We will add that route, which is very easy.
      const contentRes = await fetch(`${API_BASE}/sources/${sourceId}`);
      if (contentRes.ok) {
        const data = await contentRes.json();
        set({ activeSourceId: sourceId, activeSourceText: data.content });
      }
    } catch (err) {
      console.error('Failed to fetch source content:', err);
    }
  },

  fetchConversations: async (notebookId) => {
    try {
      const res = await fetch(`${API_BASE}/notebooks/${notebookId}/conversations`);
      if (res.ok) {
        const data = await res.json();
        set({ conversations: data });
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  },

  createConversation: async (notebookId, title = 'New Chat') => {
    const res = await fetch(`${API_BASE}/notebooks/${notebookId}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    const data = await res.json();
    set(state => ({
      conversations: [data, ...state.conversations],
      activeConversation: data,
      messages: [],
    }));
    return data;
  },

  selectConversation: async (conversationId) => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`);
    if (res.ok) {
      const data = await res.json();
      const conversation = get().conversations.find(c => c.id === conversationId) || null;
      set({ activeConversation: conversation, messages: data });
    }
  },

  sendMessage: async (conversationId, content) => {
    set({ isChatStreaming: true, streamingMessageText: '' });
    
    // Add user message immediately
    const tempUserMsg: Message = {
      id: Math.random().toString(),
      conversation_id: conversationId,
      role: 'user',
      content,
      citations: [],
      created_at: new Date().toISOString()
    };
    set(state => ({ messages: [...state.messages, tempUserMsg] }));

    try {
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, source_ids: get().selectedSourceIds }),
      });

      if (!response.body) throw new Error('No body in stream response');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let citations: any[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE format: "data: {...}\n\n"
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const obj = JSON.parse(jsonStr);
              if (obj.type === 'text') {
                assistantText += obj.content;
                set({ streamingMessageText: assistantText });
              } else if (obj.type === 'done') {
                citations = obj.citations;
              }
            } catch (e) {
              // Ignore line if it's incomplete
            }
          }
        }
      }

      // Add final assistant message
      const finalAssistantMsg: Message = {
        id: Math.random().toString(),
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantText,
        citations,
        created_at: new Date().toISOString()
      };
      
      set(state => ({
        messages: [...state.messages.filter(m => m.id !== tempUserMsg.id), tempUserMsg, finalAssistantMsg],
        isChatStreaming: false,
        streamingMessageText: ''
      }));

      // Refresh conversations list to update titles if changed
      if (get().activeNotebook) {
        await get().fetchConversations(get().activeNotebook!.id);
      }

    } catch (err) {
      console.error('Failed to send message:', err);
      set({ isChatStreaming: false });
    }
  },

  fetchGenerations: async (notebookId) => {
    try {
      const res = await fetch(`${API_BASE}/notebooks/${notebookId}/generations`);
      if (res.ok) {
        const data = await res.json();
        set({ generations: data });
      }
    } catch (err) {
      console.error('Failed to fetch generations:', err);
    }
  },

  triggerGeneration: async (notebookId, type, config = {}) => {
    const res = await fetch(`${API_BASE}/notebooks/${notebookId}/generations/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    if (!res.ok) throw new Error(`Failed to generate ${type}`);
    
    // Refresh generations
    await get().fetchGenerations(notebookId);
  }
}));
