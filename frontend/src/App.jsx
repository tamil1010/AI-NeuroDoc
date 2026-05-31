import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import * as d3 from 'd3';
import { 
  Zap, 
  Search, 
  Cpu, 
  Layers, 
  MessageCircle, 
  Clock, 
  ShieldCheck, 
  Lock,
  LogOut,
  User,
  HelpCircle,
  Sparkles,
  Mic,
  MicOff,
  RotateCcw,
  FileText, 
  Send, 
  Upload, 
  Loader2, 
  MessageSquare, 
  Trash2, 
  Plus, 
  FileUp, 
  CheckCircle2,
  AlertCircle,
  Fingerprint,
  X,
  Database,
  Bot,
  Grid,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Copy,
  Pin,
  Share2,
  Settings,
  Keyboard,
  Sun,
  Moon,
  Info,
  ExternalLink,
  Monitor,
  Activity,
  History,
  Bookmark,
  Hash,
  Filter,
  MoreVertical,
  Minus,
  Layout,
  Star,
  Download,
  Link,
  Mail,
  Terminal,
  PinOff
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';

// --- Constants & Helpers ---

const NeuralWave = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 select-none">
      <svg className="w-full h-full" viewBox="0 0 1000 400" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0 200 Q 250 100, 500 200 T 1000 200"
          stroke="url(#wave-grad)"
          strokeWidth="2"
          fill="none"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.path
          d="M0 220 Q 250 320, 500 220 T 1000 220"
          stroke="rgba(124, 58, 237, 0.2)"
          strokeWidth="1"
          fill="none"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </svg>
      <div className="absolute inset-0 neural-grid opacity-20" />
    </div>
  );
};

const CapabilityItem = ({ icon, title, subtitle, isActive, onClick }) => {
  return (
    <div 
      className={`relative flex items-center gap-5 p-5 transition-all duration-300 cursor-pointer group rounded-2xl border ${
        isActive 
          ? 'bg-ai-purple/10 border-ai-purple/50 shadow-[0_0_20px_rgba(124,58,237,0.2)]' 
          : 'bg-[#0f172a]/30 border-white/5 hover:border-white/10 hover:bg-[#0f172a]/50'
      }`}
      onClick={onClick}
    >
      <div className={`transition-all duration-300 ${
        isActive ? 'text-ai-blue' : 'text-gray-600 group-hover:text-ai-blue'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`text-[11px] font-black tracking-[2px] uppercase transition-colors truncate font-heading ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
          {title}
        </h4>
        <div className="flex items-center gap-2 mt-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-ai-blue shadow-[0_0_8px_#0ea5e9] animate-pulse' : 'bg-gray-800'}`} />
          <p className={`text-[9px] font-bold uppercase tracking-[1.5px] font-mono ${isActive ? 'text-ai-blue' : 'text-gray-600'}`}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

const ConfidenceIndicator = ({ score }) => {
  return (
    <div className="flex flex-col gap-1 w-20">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-bold text-ai-purple/70 uppercase tracking-[1px] font-mono">CONF</span>
        <span className="text-[8px] font-bold text-ai-blue font-mono">{score || 0}%</span>
      </div>
      <div className="h-1 w-full bg-ai-purple/20 overflow-hidden rounded-full">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${score || 0}%` }}
          className="h-full bg-gradient-to-r from-ai-purple to-ai-blue"
        />
      </div>
    </div>
  );
};

const CHUNK_SIZE = 1500; // Increased character limit per chunk
const CHUNK_OVERLAP = 300;

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += (size - overlap);
  }
  return chunks;
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  return dotProduct / (mA * mB);
}

// --- App Component ---

export default function App() {
  const [messages, setMessages] = useState([
    { id: '1', role: 'assistant', content: 'DocuChat AI Initialized.\nSystem ready for your documents.\nPlease upload a PDF to begin.', confidence: 100 }
  ]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [parsingStatus, setParsingStatus] = useState('IDLE'); // 'IDLE', 'ACTIVE', 'COMPLETED'
  const [embeddingStatus, setEmbeddingStatus] = useState('IDLE'); // 'IDLE', 'ACTIVE', 'COMPLETED'
  const [integrityEnabled, setIntegrityEnabled] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [processedChunks, setProcessedChunks] = useState([]); // { text, embedding, docName }
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHallucinationModal, setShowHallucinationModal] = useState(false);
  const [activeFeature, setActiveFeature] = useState('Quantum Parsing');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState('preview');
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'summary', 'pinned'
  const [currentModel, setCurrentModel] = useState('NEURAL_CORE_V3');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [extractedEntities, setExtractedEntities] = useState({ names: [], emails: [], dates: [] });
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCurrentChatPublic, setIsCurrentChatPublic] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [tokenUsage, setTokenUsage] = useState({ sent: 0, received: 0 });
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [contradictions, setContradictions] = useState([]);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('neurodoc_user')) || null);
  const [userToken, setUserToken] = useState(localStorage.getItem('neurodoc_token') || null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isEmailRegistered, setIsEmailRegistered] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCoreNodesMenu, setShowCoreNodesMenu] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'profile', 'settings', 'personalization', 'upgrade', 'help'
  const [userStats, setUserStats] = useState({ docsCount: 0, chatsCount: 0 });
  const [preferences, setPreferences] = useState({
    theme: 'VOID_BLACK',
    fontSize: 'medium',
    chatBubbleStyle: 'futuristic',
    responseStyle: 'detailed',
    notifications: true,
    voiceInput: true
  });
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  const [chatPendingDelete, setChatPendingDelete] = useState(null);

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const inputRef = useRef(null);
  const libraryRef = useRef(null);
  const chatSectionRef = useRef(null);
  const recognitionRef = useRef(null);

  const getAuthHeaders = () => (
    userToken ? { Authorization: `Bearer ${userToken}` } : {}
  );

  const getJsonHeaders = () => ({
    'Content-Type': 'application/json',
    ...getAuthHeaders()
  });

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY
  });

  const API = import.meta.env.VITE_API_URL;
  
  useEffect(() => {
    if (userToken) {
      fetchUserData();
      fetchChats();
      fetchPins();
    }
  }, [userToken]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chat');
    const shareToken = urlParams.get('share');
    
    if (shareToken) {
      // Load chat from share token (not from DB)
      loadSharedChatByToken(shareToken);
    } else if (chatId) {
      if (userToken) {
        loadChat(chatId);
      } else {
        loadSharedChat(chatId);
      }
    }
  }, [userToken]);

  const loadSharedChatByToken = async (token) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`https://ai-neurodoc.onrender.com/api/shared/${token}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
        setDocuments(data.documents || []);
        setCurrentChatId(token);
        setIsCurrentChatPublic(true);
        setError('VIEWING_SHARED: Accessing public neural session (not stored in database).');
        setTimeout(() => setError(null), 5000);
      } else {
        setError(`SHARE_ACCESS_FAILED: ${data.error}`);
      }
    } catch (err) {
      setError('NEURAL_LINK_BROKEN: Failed to fetch shared logs.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadSharedChat = async (chatId) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`https://ai-neurodoc.onrender.com/api/public-chats/${chatId}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages);
        setDocuments(data.documents || []);
        setCurrentChatId(chatId);
        setIsCurrentChatPublic(true);
        setError('VIEWING_SHARED: Accessing public neural session.');
        setTimeout(() => setError(null), 5000);
      } else {
        setError(`SHARE_ACCESS_FAILED: ${data.error}`);
      }
    } catch (err) {
      setError('NEURAL_LINK_BROKEN: Failed to fetch shared logs.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const res = await fetch('https://ai-neurodoc.onrender.com/api/user/me', {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setPreferences(data.user.preferences);
        setUserStats(data.stats);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const updatePreference = async (newPrefs) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated); // Optimistic update
    
    if (!userToken) {
      // For guest users, save to local storage only
      const currentUser = JSON.parse(localStorage.getItem('neurodoc_user') || '{}');
      if (currentUser) {
        currentUser.preferences = updated;
        localStorage.setItem('neurodoc_user', JSON.stringify(currentUser));
      }
      return;
    }

    try {
      const res = await fetch('https://ai-neurodoc.onrender.com/api/user/preferences', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(newPrefs)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Server rejected preference update');
      }
    } catch (err) {
      console.error('Preference update error:', err);
      // Optional: show a small toast/error if critical, but for themes we want it to be smooth
      if (err.message !== 'Update failed') {
        setError(`SYNC_PROTOCOL_FAILURE: ${err.message}`);
      }
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await fetch('https://ai-neurodoc.onrender.com/api/user/profile', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (res.ok) {
        const newUser = { ...user, ...data };
        setUser(newUser);
        localStorage.setItem('neurodoc_user', JSON.stringify(newUser));
      }
    } catch (err) {
      console.error('Profile update error:', err);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError('NEURAL_IMAGE_SIZE_OVERLOAD: Maximum 1MB allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      await updateProfile({ avatar: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const clearUserData = async (type) => {
    if (!window.confirm(`Permanently wipe all ${type} from neural core?`)) return;
    try {
      const res = await fetch(`https://ai-neurodoc.onrender.com/api/user/data?type=${type}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      if (res.ok) {
        if (type === 'chats' || type === 'all') {
          setChats([]);
          setPinnedMessages([]);
          setMessages([{ id: '1', role: 'assistant', content: 'Chat history cleared. System ready.' }]);
          setCurrentChatId(null);
        }
        if (type === 'docs' || type === 'all') {
          setDocuments([]);
          setProcessedChunks([]);
          setPinnedMessages([]);
        }
        fetchUserData(); // Refresh stats
      }
    } catch (err) {
      console.error('Data purge error:', err);
    }
  };

  useEffect(() => {
    // Remove all theme classes first
    document.documentElement.classList.remove('light', 'theme-space-purple', 'theme-cyber-green', 'font-size-small', 'font-size-medium', 'font-size-large');
    
    // Apply theme
    if (preferences.theme === 'QUANTUM_LIGHT') {
      document.documentElement.classList.add('light');
    } else if (preferences.theme === 'SPACE_PURPLE') {
      document.documentElement.classList.add('theme-space-purple');
    } else if (preferences.theme === 'CYBER_GREEN') {
      document.documentElement.classList.add('theme-cyber-green');
    }
    
    // Apply font size
    document.documentElement.classList.add(`font-size-${preferences.fontSize || 'medium'}`);
  }, [preferences.theme, preferences.fontSize]);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 150 && newWidth < 600) {
        setLeftPanelWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + Shift + P for pinned
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setActiveTab('pinned');
      }
      // Esc to close overlays or return to chat
      if (e.key === 'Escape') {
        setActiveTab('chat');
        setShowExportModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchPins = async () => {
    if (!userToken) return;
    try {
      const res = await fetch('https://ai-neurodoc.onrender.com/api/pins', {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setPinnedMessages(data);
    } catch (err) {
      console.error('Error fetching pins:', err);
    }
  };

  const handlePin = async (msg) => {
    try {
      const res = await fetch('https://ai-neurodoc.onrender.com/api/pins', {
        method: 'POST',
        headers: getJsonHeaders(),
        body: JSON.stringify({
          chatId: currentChatId,
          messageId: msg.id,
          content: msg.content,
          role: msg.role
        })
      });
      if (res.ok) fetchPins();
    } catch (err) {
      console.error('Error pinning message:', err);
    }
  };

  const handleUnpin = async (pinId) => {
    try {
      await fetch(`https://ai-neurodoc.onrender.com/api/pins/${pinId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchPins();
    } catch (err) {
      console.error('Error unpinning message:', err);
    }
  };

  const getPinnedForMessage = (messageId) => (
    pinnedMessages.find(pin => pin.chatId === currentChatId && pin.messageId === messageId)
  );

  const copyMessageContent = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedMessageId(msg.id);
      setError('COPIED: Message copied.');
      setTimeout(() => {
        setCopiedMessageId(null);
        setError(null);
      }, 2000);
    } catch (err) {
      setError('COPY_FAILED: Clipboard access denied.');
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch('https://ai-neurodoc.onrender.com/api/chats', {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) setChats(data);
    } catch (err) {
      console.error('Error fetching chats:', err);
    }
  };

  const loadChat = async (chatId) => {
    setIsLoadingHistory(true);
    setCurrentChatId(chatId);
    try {
      const res = await fetch(`https://ai-neurodoc.onrender.com/api/chats/${chatId}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data && data.messages) {
        setIsCurrentChatPublic(data.isPublic || false);
        // Map messages to include IDs for React keys
        const formattedMessages = data.messages.map((m, idx) => ({
          ...m,
          id: m._id || idx.toString()
        }));
        const restoredDocuments = (data.documents || []).map((doc, idx) => ({
          ...doc,
          id: doc.id || doc._id || `${chatId}-doc-${idx}`
        }));
        setMessages(formattedMessages);
        setDocuments(restoredDocuments);
        setProcessedChunks([]);

        const docsWithContent = restoredDocuments.filter(doc => doc.content || doc.chunks?.length);
        if (docsWithContent.length > 0) {
          setEmbeddingStatus('ACTIVE');
          const restoredChunks = [];
          for (const doc of docsWithContent) {
            const chunks = doc.chunks?.length ? doc.chunks : chunkText(doc.content || '');
            for (const chunk of chunks) {
              if (!chunk.trim()) continue;
              const result = await ai.models.embedContent({
                model: 'gemini-embedding-2-preview',
                contents: [{ parts: [{ text: chunk }] }]
              });
              restoredChunks.push({
                text: chunk,
                embedding: result.embeddings[0].values,
                docId: doc.id,
                docName: doc.name
              });
            }
          }
          setProcessedChunks(restoredChunks);
          setEmbeddingStatus('COMPLETED');
        }
      }
    } catch (err) {
      console.error('Error loading chat:', err);
      setError('Failed to load chat history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const requestDeleteChat = (e, chat) => {
    e.stopPropagation();
    setChatPendingDelete(chat);
  };

  const confirmDeleteChat = async () => {
    if (!chatPendingDelete) return;
    const chatId = chatPendingDelete._id;
    try {
      await fetch(`https://ai-neurodoc.onrender.com/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      setChats(prev => prev.filter(c => c._id !== chatId));
      setPinnedMessages(prev => prev.filter(pin => pin.chatId !== chatId));
      if (currentChatId === chatId) {
        startNewChatSession();
      }
      setChatPendingDelete(null);
    } catch (err) {
      console.error('Error deleting chat:', err);
      setError(`DELETE_FAILED: ${err.message || 'Could not delete chat.'}`);
    }
  };

  const groupedChats = useMemo(() => {
    const filtered = chats.filter(chat => 
      (chat.title || 'NULL_LOG').toLowerCase().includes(historySearchQuery.toLowerCase())
    );

    const categories = {
      Today: [],
      Yesterday: [],
      'Last 7 Days': [],
      Older: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    filtered.forEach(chat => {
      const chatDate = new Date(chat.updatedAt);
      if (chatDate >= today) categories.Today.push(chat);
      else if (chatDate >= yesterday) categories.Yesterday.push(chat);
      else if (chatDate >= lastWeek) categories['Last 7 Days'].push(chat);
      else categories.Older.push(chat);
    });

    return Object.entries(categories).filter(([_, items]) => items.length > 0);
  }, [chats, historySearchQuery]);

  const startNewChatSession = () => {
    setMessages([{ id: '1', role: 'assistant', content: 'Welcome to DocuChat! Upload a PDF to start a conversation grounded in your document.' }]);
    setCurrentChatId(null);
    setDocuments([]);
    setProcessedChunks([]);
    setParsingStatus('IDLE');
    setEmbeddingStatus('IDLE');
    setUploadProgress(null);
    setInputText('');
    setIntegrityEnabled(true);
    setError(null);
    setIsThinking(false);
    setIsResetting(false);
  };

  const ensurePersistedChat = async (title = 'INITIATED_LOG') => {
    if (!userToken) return null;
    if (currentChatId) return currentChatId;

    const chatRes = await fetch('https://ai-neurodoc.onrender.com/api/chats', {
      method: 'POST',
      headers: getJsonHeaders(),
      body: JSON.stringify({ title, messages: [], documents: [] })
    });
    const chatData = await chatRes.json();
    if (!chatRes.ok) {
      throw new Error(chatData.error || 'Failed to create chat session');
    }

    setCurrentChatId(chatData._id);
    fetchChats();
    return chatData._id;
  };

  const persistDocumentContent = async (chatId, doc, content, chunks) => {
    const docRes = await fetch(`https://ai-neurodoc.onrender.com/api/chats/${chatId}/documents`, {
      method: 'POST',
      headers: getJsonHeaders(),
      body: JSON.stringify({
        name: doc.name,
        pageCount: doc.pageCount,
        content,
        chunks: []
      })
    });
    const docData = await docRes.json().catch(() => ({}));
    if (!docRes.ok) {
      throw new Error(docData.error || `Document save failed with HTTP ${docRes.status}`);
    }
    return docData;
  };

  const saveChatMessage = async (chatId, message) => {
    if (!userToken || !chatId) return null;

    const res = await fetch(`https://ai-neurodoc.onrender.com/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: getJsonHeaders(),
      body: JSON.stringify(message)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Message save failed with HTTP ${res.status}`);
    }
    return data;
  };

  const readGeminiText = (response) => {
    if (!response) return '';
    if (typeof response.text === 'string') return response.text;
    return response.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('') || '';
  };

  const getFriendlyAiError = (err) => {
    const raw = typeof err?.message === 'string' ? err.message : String(err || '');
    if (/RESOURCE_EXHAUSTED|quota|429/i.test(raw)) {
      return 'AI quota is exhausted for the current API key. The PDF upload succeeded, but Gemini cannot generate a new answer right now.';
    }
    if (/API key|permission|403|401/i.test(raw)) {
      return 'AI request was rejected. Please check the Gemini API key and permissions.';
    }
    if (/network|fetch|Failed to fetch/i.test(raw)) {
      return 'AI request could not reach Gemini. Please check the network connection.';
    }
    return raw.length > 220 ? `${raw.slice(0, 220)}...` : raw;
  };

  const buildLocalDocumentAnswer = (query, contextText) => {
    if (!contextText?.trim()) {
      return 'DATA_NOT_FOUND: The PDF is uploaded, but no searchable document text is available in this session.';
    }

    const cleanedContext = contextText
      .replace(/\[DOC:[^\]]+\]\s*CONTENT:\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const preview = cleanedContext.slice(0, 1400);

    return [
      'AI_QUOTA_LIMIT: Gemini quota is currently exhausted, so I cannot generate a full model answer right now.',
      '',
      `LOCAL_DOCUMENT_EXTRACT for "${query}":`,
      preview || 'No matching extract found in the uploaded document.',
      '',
      'Try again after quota resets for a full AI-generated response.'
    ].join('\n');
  };

  const buildLocalSummary = (text) => {
    const cleaned = (text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return 'No readable text was found in this PDF.';

    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 40);
    const highlights = sentences.slice(0, 6);
    const keywords = Array.from(new Set(
      cleaned
        .toLowerCase()
        .match(/\b[a-z][a-z-]{4,}\b/g) || []
    )).slice(0, 12);

    return [
      '## Auto Summary',
      '',
      highlights.length > 0
        ? highlights.map(sentence => `- ${sentence}`).join('\n')
        : `- ${cleaned.slice(0, 900)}${cleaned.length > 900 ? '...' : ''}`,
      '',
      keywords.length > 0 ? `**Key terms:** ${keywords.join(', ')}` : ''
    ].filter(Boolean).join('\n');
  };

  const generateAiResponse = async (systemInstruction, query) => {
    const modelCandidates = [
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ];
    let lastError = null;

    for (const model of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: query,
          config: { systemInstruction }
        });
        const text = readGeminiText(response);
        if (text.trim()) return text;
        lastError = new Error(`${model} returned an empty response`);
      } catch (err) {
        lastError = err;
        console.error(`Gemini generation failed with ${model}:`, err);
      }
    }

    const friendlyError = new Error(getFriendlyAiError(lastError || new Error('AI generation failed')));
    friendlyError.originalError = lastError;
    throw friendlyError;
  };

  const extractPdfTextWithProgress = (file) => new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('pdf', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/extract-text');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const uploadPercent = Math.round((event.loaded / event.total) * 35);
      setUploadProgress({
        fileName: file.name,
        percent: Math.max(1, uploadPercent),
        label: 'Uploading PDF'
      });
    };

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch (err) {
        reject(new Error('Server returned an invalid PDF extraction response.'));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(data.error || 'Failed to extract text from PDF.'));
        return;
      }

      resolve(data);
    };

    xhr.onerror = () => reject(new Error('Upload request failed. Check that the backend is running.'));
    xhr.send(formData);
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Handle Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        switch (event.error) {
          case 'not-allowed':
            setError('Microphone access denied. Please allow microphone access in your browser settings to use voice input.');
            break;
          case 'network':
            setError('Speech recognition network error. Please check your internet connection or try again later.');
            break;
          case 'no-speech':
            setError('No speech was detected. Please try again.');
            break;
          case 'audio-capture':
            setError('No microphone was found. Ensure your hardware is plugged in and configured.');
            break;
          default:
            setError(`Speech Recognition error: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleNewChat = () => {
    // If we've already uploaded documents or sent messages, allow reset
    if (messages.length <= 1 && documents.length === 0 && !currentChatId) return;
    
    if (!isResetting) {
      setIsResetting(true);
      // Automatically reset the "confirm" state after 3 seconds of inactivity
      setTimeout(() => setIsResetting(false), 3000);
      return;
    }

    startNewChatSession();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }

    setIsUploading(true);
    setParsingStatus('ACTIVE');
    setEmbeddingStatus('IDLE');
    setUploadProgress({ fileName: file.name, percent: 1, label: 'Preparing upload' });
    setError(null);

    try {
      // 1. Extract text via backend
      const data = await extractPdfTextWithProgress(file);
      setUploadProgress({ fileName: file.name, percent: 40, label: 'Extracting text' });
      const fullText = data.text;
      setParsingStatus('COMPLETED');

      // 2. Add to documents list
      const newDoc = { 
        id: Date.now().toString(), 
        name: file.name, 
        pageCount: data.numpages 
      };
      setDocuments(prev => [...prev, newDoc]);

      // 3. Chunk and Embed (Frontend Logic)
      setEmbeddingStatus('ACTIVE');
      const chunks = chunkText(fullText);
      let persistedChatId = null;

      if (userToken) {
        setUploadProgress({ fileName: file.name, percent: 50, label: 'Saving document' });
        persistedChatId = await ensurePersistedChat(file.name.substring(0, 30).toUpperCase());
        await persistDocumentContent(persistedChatId, newDoc, fullText, chunks);
        setUploadProgress({ fileName: file.name, percent: 60, label: 'Document saved' });
        fetchChats();
        fetchUserData();
      }

      const chunksWithEmbeddings = [];

      // Embed chunks
      const usableChunks = chunks.filter(chunk => chunk.trim().length > 0);
      try {
        for (let i = 0; i < usableChunks.length; i++) {
          const chunk = usableChunks[i];
          const result = await ai.models.embedContent({
            model: 'gemini-embedding-2-preview',
            contents: [{ parts: [{ text: chunk }] }]
          });
          
          chunksWithEmbeddings.push({
            text: chunk,
            embedding: result.embeddings[0].values,
            docId: newDoc.id,
            docName: newDoc.name
          });

          const embeddingPercent = usableChunks.length
            ? Math.round(((i + 1) / usableChunks.length) * 30)
            : 30;
          setUploadProgress({
            fileName: file.name,
            percent: Math.min(90, 60 + embeddingPercent),
            label: 'Indexing document'
          });
        }
        setEmbeddingStatus('COMPLETED');
      } catch (embedErr) {
        console.error('Embedding failed after document save:', embedErr);
        setEmbeddingStatus('IDLE');
        setError('DOCUMENT_SAVED: PDF content saved. AI indexing failed, so re-upload may be needed for document chat.');
        setTimeout(() => setError(null), 5000);
      }

      if (chunksWithEmbeddings.length > 0) {
        setProcessedChunks(prev => [...prev, ...chunksWithEmbeddings]);
      }
      
      // 4. Extract Entities (Async)
      extractEntities(fullText);

      // 5. Generate Summary (Async)
      generateSummary(fullText);

      // 6. Detect Contradictions (Async)
      if (documents.length > 0) detectContradictions();

      const systemMessage = { 
        id: Date.now().toString(), 
        role: 'system', 
        content: `Successfully uploaded "${file.name}" (${data.numpages} pages). Document saved with ${chunks.length} text chunks${chunksWithEmbeddings.length > 0 ? ` and indexed with ${chunksWithEmbeddings.length} neural nodes` : ''}.` 
      };

      if (userToken) {
        const chatId = persistedChatId || await ensurePersistedChat(file.name.substring(0, 30).toUpperCase());
        await fetch(`https://ai-neurodoc.onrender.com/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: getJsonHeaders(),
          body: JSON.stringify({ role: 'system', content: systemMessage.content })
        });
        fetchChats();
        fetchUserData();
      }

      setUploadProgress({ fileName: file.name, percent: 100, label: 'Upload complete' });
      setMessages(prev => [...prev, systemMessage]);
      setTimeout(() => setUploadProgress(null), 1500);

    } catch (err) {
      console.error(err);
      setUploadProgress(prev => prev ? { ...prev, label: 'Upload failed' } : null);
      setError(`PDF_UPLOAD_FAILED: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e, customQuery = null) => {
    if (e) e.preventDefault();
    const query = customQuery || inputText.trim();
    if (!query || isThinking) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsThinking(true);
    setError(null);

    try {
      let chatId = currentChatId;

      // 1. Ensure/Create Chat Session
      if (!chatId) {
        const chatRes = await fetch('https://ai-neurodoc.onrender.com/api/chats', {
          method: 'POST',
          headers: getJsonHeaders(),
          body: JSON.stringify({
            title: query.substring(0, 30).toUpperCase(),
            messages: [{ role: 'user', content: query }],
            documents: documents.map(d => ({ name: d.name, pageCount: d.pageCount }))
          })
        });
        const chatData = await chatRes.json().catch(() => ({}));
        if (!chatRes.ok) {
          throw new Error(chatData.error || `Chat create failed with HTTP ${chatRes.status}`);
        }
        chatId = chatData._id;
        setCurrentChatId(chatId);
        fetchChats();
      } else {
        await saveChatMessage(chatId, { role: 'user', content: query });
      }

      // 2. RAG: Retrieve context
      let contextText = '';
      if (processedChunks.length > 0) {
        try {
          const queryEmbedResult = await ai.models.embedContent({
            model: 'gemini-embedding-2-preview',
            contents: [{ parts: [{ text: query }] }]
          });
          const queryVector = queryEmbedResult.embeddings[0].values;
          
          const rankedChunks = [...processedChunks]
            .map(chunk => ({
              ...chunk,
              similarity: cosineSimilarity(queryVector, chunk.embedding)
            }))
            .sort((a, b) => b.similarity - a.similarity);

          const relevantChunks = rankedChunks.slice(0, 10);
          contextText = relevantChunks.map(c => `[DOC: ${c.docName}] CONTENT: ${c.text}`).join('\n\n');
        } catch (embedErr) {
          console.error('Query embedding failed, using local chunk fallback:', embedErr);
          const terms = query.toLowerCase().split(/\W+/).filter(term => term.length > 2);
          const rankedChunks = [...processedChunks]
            .map(chunk => ({
              ...chunk,
              score: terms.reduce((score, term) => score + (chunk.text.toLowerCase().includes(term) ? 1 : 0), 0)
            }))
            .sort((a, b) => b.score - a.score);
          const relevantChunks = rankedChunks.slice(0, 10);
          contextText = relevantChunks.map(c => `[DOC: ${c.docName}] CONTENT: ${c.text}`).join('\n\n');
        }
      }

      // 3. Generate Stream
      const stylePrompts = {
        concise: "Answer extremely concisely, using bullet points where possible. Focus only on critical facts.",
        detailed: "Provide comprehensive and detailed explanations. Include technical nuances and context.",
        professional: "Maintain a strictly professional, corporate audit-style tone. Use high-level vocabulary."
      };

      const systemInstruction = integrityEnabled 
        ? `
          You are NEURODOC AI (v2.4.1). 
          CONTEXT: ${contextText || 'No documents uploaded yet.'}
          STYLE: ${stylePrompts[preferences.responseStyle] || stylePrompts.detailed}
          
          STRICT RULES:
          - Answer ONLY using the provided document context.
          - If the answer is not in the context, say: 'DATA_NOT_FOUND: Information not available in current neural map.'
          - DO NOT use external knowledge.
          - Maintain uppercase technical jargon for system feedback.
          - Use monospace formatting for data points.
        `
        : `
          You are NEURODOC AI (v2.4.1). 
          CONTEXT: ${contextText || 'No documents uploaded yet.'}
          STYLE: ${stylePrompts[preferences.responseStyle] || stylePrompts.detailed}
          
          RULES:
          - Prioritize the provided document context for your answers.
          - If the answer is not in the context, you may use your general knowledge but clearly state if it's from the doc or not.
          - Maintain uppercase technical jargon for system feedback.
          - Use monospace formatting for data points.
        `;

      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: 'Analyzing document...', confidence: 85 }]);
      let responseText = '';
      try {
        responseText = await generateAiResponse(systemInstruction, query);
      } catch (aiErr) {
        responseText = buildLocalDocumentAnswer(query, contextText);
        setError(`AI_LIMIT: ${getFriendlyAiError(aiErr)}`);
        setTimeout(() => setError(null), 6000);
      }
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: responseText } : m));

      // 4. Save to backend
      await saveChatMessage(chatId, { role: 'assistant', content: responseText, confidence: 92 });

      // 5. Update Token Usage
      setTokenUsage(prev => ({
        sent: prev.sent + query.split(' ').length,
        received: prev.received + responseText.split(' ').length
      }));

    } catch (err) {
      console.error(err);
      setError(`NEURAL_LINK_FAILURE: ${getFriendlyAiError(err)}`);
    } finally {
      setIsThinking(false);
    }
  };

  const extractEntities = async (text) => {
    try {
      const prompt = `Extract exactly 5 human names, 5 emails, and 5 dates from this text. 
      Return ONLY a JSON object with keys: names, emails, dates.
      Text: ${text.substring(0, 10000)}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      const data = JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, ''));
      setExtractedEntities(data);
    } catch (err) {
      console.error('Entity extraction failure:', err);
    }
  };

  // Contradiction detection logic
  const detectContradictions = async () => {
    if (documents.length < 2) return;
    try {
      const prompt = `Analyze these documents for potential contradictions or inconsistencies: ${documents.map(d => d.name).join(', ')}. 
      Context summary: ${summaryText.substring(0, 5000)}
      Return a JSON array of objects with keys: topic, docA, docB, contradiction. 
      If none found, return [].`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      const text = response.text.replace(/```json/g, '').replace(/```/g, '');
      const data = JSON.parse(text);
      setContradictions(data);
    } catch (err) {
      console.error('Contradiction log failure:', err);
    }
  };

  const generateSummary = async (text) => {
    setIsSummarizing(true);
    try {
      const localSummary = buildLocalSummary(text);
      setSummaryText(localSummary);

      const prompt = `Provide a comprehensive technical summary of this document. 
      Use bullet points for key takeaways. 
      Format the output in clean Markdown.
      Text: ${text.substring(0, 20000)}`;
      
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt
        });
        const aiSummary = readGeminiText(response);
        if (aiSummary.trim()) setSummaryText(aiSummary);
      } catch (aiErr) {
        console.error('AI summary unavailable, keeping local summary:', aiErr);
        setError(`AI_LIMIT: ${getFriendlyAiError(aiErr)} Local summary is available.`);
        setTimeout(() => setError(null), 6000);
      }
    } catch (err) {
      console.error('Summary generation failure:', err);
      setSummaryText(buildLocalSummary(text));
    } finally {
      setIsSummarizing(false);
    }
  };

  const clearSession = () => {
    setMessages([{ id: '1', role: 'assistant', content: 'Session cleared. Upload a PDF to start again.' }]);
    setDocuments([]);
    setProcessedChunks([]);
    setSummaryText('');
    setExtractedEntities({ names: [], emails: [], dates: [] });
    setError(null);
  };

  const handleCapabilityClick = (title) => {
    setActiveFeature(title);
    switch (title) {
      case 'Smart PDF Parsing':
        fileInputRef.current?.click();
        break;
      case 'Multi-Document Intelligence':
        setError('MULTI_DOC_ENGINE: Aggregating all active neural nodes.');
        break;
      case 'Hallucination Control':
        setIntegrityEnabled(!integrityEnabled);
        setError(`INTEGRITY_SHIELD: ${!integrityEnabled ? 'ENABLED' : 'DISABLED'}`);
        break;
      case 'Real-Time Processing':
        setError('SYNC_ACTIVE: Monitoring neural streams in real-time.');
        break;
      default:
        break;
    }
  };

const handleShare = async () => {
     if (!currentChatId) {
       setError('SELECT_CHAT: Open a session first to share.');
       return;
     }
     setShowShareModal(true);
   };

   const generateShareToken = async () => {
     if (!currentChatId || !userToken) return;
     try {
       const res = await fetch(`https://ai-neurodoc.onrender.com/api/chats/${currentChatId}/share-token`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${userToken}`
         }
       });
       const data = await res.json();
       if (res.ok) {
         const shareUrl = data.shareUrl || `${window.location.origin}?share=${data.shareToken}`;
         navigator.clipboard.writeText(shareUrl);
         setError('SUCCESS: Share link copied (not saved to database).');
         setTimeout(() => setError(null), 3000);
         setShowShareModal(false);
       } else {
         setError(`SHARE_ERROR: ${data.error}`);
       }
     } catch (err) {
       setError('SHARE_TOKEN_FAILED: Could not generate share token.');
     }
   };

  const toggleChatSharing = async () => {
    if (!currentChatId || !userToken) return;
    try {
      const res = await fetch(`https://ai-neurodoc.onrender.com/api/chats/${currentChatId}/share`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ isPublic: !isCurrentChatPublic })
      });
      const data = await res.json();
      if (res.ok) {
        setIsCurrentChatPublic(data.isPublic);
        setError(`SUCCESS: Sharing ${data.isPublic ? 'enabled' : 'disabled'}.`);
        setTimeout(() => setError(null), 3000);
      } else {
        setError(`SHARE_ERROR: ${data.error}`);
      }
    } catch (err) {
      setError('SHARE_UPDATE_FAILED: Could not modify neural visibility.');
    }
  };

  const handleExportAction = async (format) => {
    setExporting(true);
    try {
      const chat = chats.find(c => c._id === currentChatId);
      const res = await fetch('https://ai-neurodoc.onrender.com/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          messages,
          title: chat ? chat.title : 'NEURODOC_SESSION'
        })
      });
      
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neurodoc_session.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (err) {
      console.error('Export error:', err);
      setError('EXPORT_FAILURE: System could not package neural logs.');
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('neurodoc_user');
    localStorage.removeItem('neurodoc_token');
    setUser(null);
    setUserToken(null);
    startNewChatSession();
    setIsConfirmingLogout(false);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (authMode === 'signup' && !authForm.name) {
      setAuthError('Name required');
      return;
    }
    
    if (!authForm.email || !authForm.password) {
      setAuthError('Credentials required');
      return;
    }

    if (authMode === 'login' && !isEmailRegistered) {
      setAuthError('Identity not found in neural registry');
      return;
    }

    try {
      const endpoint = authMode === 'login' 
      ? `${import.meta.env.VITE_API_URL}/api/auth/login` 
      : `${import.meta.env.VITE_API_URL}/api/auth/signup`;
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failure');
        return;
      }

      localStorage.setItem('neurodoc_user', JSON.stringify(data.user));
      localStorage.setItem('neurodoc_token', data.token);
      setUser(data.user);
      setUserToken(data.token);
      if (data.user.preferences) setPreferences(data.user.preferences);
    } catch (err) {
      setAuthError('Neural link connection lost');
    }
  };

  // Check email registration
  useEffect(() => {
    const checkEmail = async () => {
      if (!authForm.email || !authForm.email.includes('@') || authMode !== 'login') {
        setIsEmailRegistered(false);
        return;
      }

      setIsCheckingEmail(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/check-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email })
        });
        const data = await res.json();
        setIsEmailRegistered(data.registered);
        if (!data.registered && authForm.email.length > 5) {
          setAuthError('Error: Account not found');
        } else {
          setAuthError('');
        }
      } catch (err) {
        console.error('Email check failed:', err);
      } finally {
        setIsCheckingEmail(false);
      }
    };

    const timer = setTimeout(checkEmail, 500);
    return () => clearTimeout(timer);
  }, [authForm.email, authMode]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.05),transparent_40%)]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-black/60 border border-ai-purple/20 p-10 rounded-[32px] backdrop-blur-2xl futuristic-shadow">
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-ai-purple to-ai-blue rounded-2xl flex items-center justify-center mb-6 futuristic-shadow ring-1 ring-white/20">
                <ShieldCheck size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-[4px] font-heading text-white">AI_Doc</h1>
              <p className="text-[10px] font-bold text-ai-purple/60 uppercase tracking-[2px] mt-2 mb-4">Version 2.4.1</p>
              <div className="h-px w-20 bg-gradient-to-r from-transparent via-ai-purple/50 to-transparent" />
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-[1px] ml-1">Full Name</label>
                  <div className="relative group">
                    <Layout className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within:text-ai-purple" size={16} />
                    <input 
                      type="text"
                      value={authForm.name}
                      onChange={e => setAuthForm({...authForm, name: e.target.value})}
                      placeholder="e.g., John Doe"
                      className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-sm text-white outline-none focus:border-ai-purple/50 transition-all font-medium placeholder:text-gray-700"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-[1px] ml-1">Email Address</label>
                <div className="relative group">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within:text-ai-purple" size={16} />
                  <input 
                    type="email"
                    value={authForm.email}
                    onChange={e => setAuthForm({...authForm, email: e.target.value})}
                    placeholder="user@example.com"
                    className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-sm text-white outline-none focus:border-ai-purple/50 transition-all font-medium placeholder:text-gray-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-[1px] ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within:text-ai-purple" size={16} />
                  <input 
                    type="password"
                    value={authForm.password}
                    onChange={e => setAuthForm({...authForm, password: e.target.value})}
                    placeholder="••••••••••••"
                    className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-sm text-white outline-none focus:border-ai-purple/50 transition-all font-medium placeholder:text-gray-700"
                  />
                </div>
              </div>

              {authError && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2"
                >
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-[1px]">{authError}</p>
                </motion.div>
              )}

              <button 
                type="submit"
                disabled={authMode === 'login' && (!isEmailRegistered || isCheckingEmail)}
                className={`w-full font-black py-4 rounded-2xl transition-all futuristic-shadow uppercase tracking-[3px] text-xs flex items-center justify-center gap-2 group ${
                  authMode === 'login' && (!isEmailRegistered || isCheckingEmail)
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                    : 'bg-ai-purple hover:bg-ai-purple/80 text-white'
                }`}
              >
                {isCheckingEmail ? 'Verifying...' : authMode === 'login' ? 'Login' : 'Sign Up'}
                {!isCheckingEmail && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            <div className="mt-8 text-center pt-8 border-t border-white/5">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[1px]">
                {authMode === 'login' ? "New user?" : "Already have an account?"}
                <button 
                  onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                  className="ml-2 text-ai-purple hover:text-ai-blue transition-colors outline-none font-black"
                >
                  {authMode === 'login' ? "SIGN_UP" : "LOGIN"}
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden font-sans selection:bg-ai-purple/30 relative">
      {/* Background Effects */}
      <div className="bg-blob top-[-10%] left-[-10%]" />
      <div className="bg-blob bottom-[-10%] right-[-10%] opacity-50" />
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className="particle" 
            style={{ 
              left: `${Math.random() * 100}%`, 
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 3}px`,
              height: `${Math.random() * 3}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }} 
          />
        ))}
      </div>

      {/* Left Sidebar */}
      <AnimatePresence initial={false}>
        {showLeftPanel && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: leftPanelWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex flex-col z-20 glass-panel border-r border-ai-purple/20 relative"
          >
            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              <div className="mb-10 flex-shrink-0 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ai-blue/10 border border-ai-blue/50 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.3)] group cursor-pointer hover:border-ai-blue transition-all">
                    <div className="relative">
                      <Zap size={20} className="text-ai-blue group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-ai-blue/40 blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-sm font-black tracking-[3px] uppercase font-heading text-white">NEURODOC</h1>
                    <p className="text-[10px] font-bold text-gray-600 tracking-[1px] font-mono leading-none">v2.4.1</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={startNewChatSession}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-ai-purple to-ai-blue text-white font-black text-[11px] tracking-[4px] uppercase flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all futuristic-glow rounded-xl font-heading mb-8 relative overflow-hidden group shadow-[0_0_20px_rgba(124,58,237,0.4)]"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                <Plus size={16} className="relative z-10 text-white" />
                <span className="relative z-10">NEW SESSION</span>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-3 px-5 bg-[#0f172a]/70 border border-ai-blue/20 text-white/80 font-black text-[10px] tracking-[3px] uppercase flex items-center justify-center gap-2 hover:text-white hover:border-ai-blue/50 hover:bg-ai-blue/10 active:scale-[0.98] transition-all rounded-xl font-heading mb-3 shadow-[0_0_14px_rgba(14,165,233,0.12)] disabled:opacity-60 disabled:cursor-wait"
              >
                {isUploading ? <Loader2 size={15} className="text-ai-blue animate-spin" /> : <Upload size={15} className="text-ai-blue" />}
                {isUploading && uploadProgress ? `${uploadProgress.percent}%` : 'UPLOAD FILE'}
              </button>

              {uploadProgress && (
                <div className="mb-8 px-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[8px] font-black text-ai-blue uppercase tracking-[2px] font-heading truncate max-w-[70%]">
                      {uploadProgress.label}
                    </p>
                    <span className="text-[8px] font-black text-white/70 font-mono">{uploadProgress.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 border border-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-ai-purple to-ai-blue"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress.percent}%` }}
                      transition={{ duration: 0.25 }}
                    />
                  </div>
                  <p className="mt-2 text-[7px] text-gray-600 uppercase tracking-[1px] font-mono truncate">
                    {uploadProgress.fileName}
                  </p>
                </div>
              )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-10 custom-scrollbar">
          {/* Files Section */}
          <section>
            <div className="space-y-1">
              {documents.map(doc => (
                <div key={doc.id} className="group p-3 bg-white/5 border border-ai-purple/10 flex items-center gap-3 hover:border-ai-purple/30 transition-all rounded-lg backdrop-blur-sm">
                  <div className="w-7 h-7 bg-ai-purple/20 flex items-center justify-center text-ai-blue font-bold text-[9px] border border-ai-blue/20 rounded">
                    PDF
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold truncate uppercase tracking-[1px] text-white">{doc.name}</p>
                    <p className="text-[7px] text-gray-500 uppercase tracking-[1px] font-mono">{doc.pageCount} LAYERS</p>
                  </div>
                </div>
              ))}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
          </section>

          {/* Sessions Section */}
          <section>
            <div className="flex items-center justify-between mb-4 px-3">
              <h2 className="text-[9px] font-bold uppercase tracking-[2px] text-ai-purple font-heading">Conversation_History</h2>
              <Clock size={12} className="text-ai-purple/50" />
            </div>

            <div className="px-3 mb-8">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-ai-blue transition-colors" size={14} />
                <input 
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search history..."
                  className="w-full bg-[#0f172a]/40 border border-white/5 pl-10 pr-4 py-3 rounded-xl text-[10px] outline-none focus:border-ai-blue/30 transition-all font-heading text-white tracking-[1px] uppercase"
                />
                <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white cursor-pointer" size={14} />
              </div>
            </div>
            
            <div className="space-y-8">
              {chats.length === 0 ? (
                <div className="px-4 py-8 text-center border border-dashed border-white/5 rounded-xl mx-2">
                  <p className="text-[8px] text-gray-700 uppercase tracking-[2px] font-heading">No active sessions</p>
                </div>
              ) : groupedChats.length === 0 ? (
                <div className="px-4 py-8 text-center opacity-50">
                  <p className="text-[8px] text-gray-700 uppercase tracking-[2px] font-heading">No matches found</p>
                </div>
              ) : (
                groupedChats.map(([groupName, items]) => (
                  <div key={groupName} className="space-y-3">
                    <h3 className="px-4 text-[9px] font-black text-gray-700 uppercase tracking-[3px] mb-4 font-heading">{groupName}</h3>
                    {items.map(chat => (
                      <div 
                        key={chat._id} 
                        onClick={() => loadChat(chat._id)}
                        className={`group relative px-5 py-4 flex flex-col gap-1 cursor-pointer transition-all border-l-2 ${
                          currentChatId === chat._id 
                            ? 'bg-ai-purple/10 border-ai-purple text-white shadow-[inset_4px_0_15px_-5px_#7c3aed]' 
                            : 'text-gray-500 hover:bg-white/5 border-transparent hover:text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black truncate uppercase tracking-[1px] font-heading flex-1">{chat.title || 'NULL_LOG'}</p>
                          <button
                            onClick={(e) => requestDeleteChat(e, chat)}
                            className="w-6 h-6 flex items-center justify-center rounded border border-white/5 text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
                            title="Delete chat"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                        <p className="text-[8px] text-ai-purple/60 font-bold tracking-[1px] font-mono opacity-50">
                          {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-md relative">
          <AnimatePresence>
            {showUserMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-[#111] border border-white/10 rounded-2xl p-2 shadow-2xl z-[100] backdrop-blur-xl"
              >
                <button 
                  onClick={() => { setActiveModal('profile'); setShowUserMenu(false); }}
                  className="w-full p-3 border-b border-white/5 mb-1 flex items-center gap-3 hover:bg-white/5 transition-all text-left group"
                >
                   <div className="w-8 h-8 rounded-lg bg-ai-purple flex items-center justify-center font-bold text-xs text-white group-hover:shadow-[0_0_10px_#7c3aed] transition-all">
                     {user.name.charAt(0)}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-[10px] font-black uppercase tracking-[1px] text-white truncate font-heading group-hover:text-ai-purple transition-colors">{user.name}</p>
                     <p className="text-[8px] font-bold text-gray-500 uppercase tracking-[1px] truncate font-mono">View Profile</p>
                   </div>
                   <ChevronRight size={14} className="text-gray-600 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="space-y-0.5">
                  <button 
                    onClick={() => { setActiveModal('personalization'); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white text-left group"
                  >
                    <Activity size={16} className="text-gray-500 group-hover:text-ai-blue" />
                    <span className="text-[10px] font-bold uppercase tracking-[1px]">Personalization</span>
                  </button>
                  <button 
                    onClick={() => { setActiveModal('profile'); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white text-left group"
                  >
                    <User size={16} className="text-gray-500 group-hover:text-ai-blue" />
                    <span className="text-[10px] font-bold uppercase tracking-[1px]">Profile</span>
                  </button>
                  <button 
                    onClick={() => { setActiveModal('settings'); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white text-left group"
                  >
                    <Settings size={16} className="text-gray-500 group-hover:text-ai-blue" />
                    <span className="text-[10px] font-bold uppercase tracking-[1px]">Settings</span>
                  </button>
                </div>

                <div className="h-px bg-white/5 my-1" />

                <div className="space-y-0.5">
                  <button 
                    onClick={() => { setActiveModal('help'); setShowUserMenu(false); }}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle size={16} className="text-gray-500 group-hover:text-ai-blue" />
                      <span className="text-[10px] font-bold uppercase tracking-[1px]">Help</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-600" />
                  </button>
          <button 
            onClick={() => setIsConfirmingLogout(true)}
            className="w-full flex items-center gap-3 p-2.5 hover:bg-red-500/5 rounded-xl transition-all text-gray-400 hover:text-red-500 text-left group"
          >
            <LogOut size={16} className="text-gray-500 group-hover:text-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-[1px]">Log out</span>
          </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full flex items-center gap-4 p-4 rounded-[24px] border transition-all ${
              showUserMenu ? 'bg-ai-purple/10 border-ai-purple/50 shadow-[0_0_20px_rgba(124,58,237,0.2)]' : 'bg-[#0f172a]/60 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="w-11 h-11 rounded-[14px] bg-ai-purple flex items-center justify-center text-white font-black text-lg shadow-[0_0_15px_rgba(124,58,237,0.4)] flex-shrink-0">
               {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[11px] font-black text-white tracking-[0.5px] truncate font-heading leading-tight">USER PROFILE</p>
              <p className="text-[9px] font-bold text-gray-500 tracking-[0.5px] truncate font-mono mt-0.5 opacity-80">Core v3</p>
            </div>
            <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
          </button>
        </div>

            {/* Resize Handle */}
            <div 
              onMouseDown={startResizing}
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-ai-blue/50 transition-colors z-30"
              title="Drag to resize"
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative z-10 bg-transparent">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between z-30 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 h-20">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              className={`p-2.5 transition-all rounded-lg border ${
                showLeftPanel ? 'bg-ai-blue/10 border-ai-blue/30 text-ai-blue' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              <Layout size={18} />
            </button>
            
            <div className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-xl group cursor-pointer hover:border-ai-blue/50 transition-all">
              <div className="w-2 h-2 rounded-full bg-ai-blue shadow-[0_0_8px_#0ea5e9] animate-pulse" />
              <span className="text-[10px] font-black text-white/70 tracking-[2px] font-heading group-hover:text-white uppercase">{currentModel}</span>
              <ChevronRight size={14} className="rotate-90 text-gray-500" />
            </div>

            <nav className="flex items-center gap-8 ml-8">
              {['CHAT', 'SUMMARY', 'PINNED'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`relative py-2 text-[11px] font-black tracking-[4px] font-heading transition-all ${
                    activeTab === tab.toLowerCase() ? 'text-white' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {tab}
                  {activeTab === tab.toLowerCase() && (
                    <motion.div 
                      layoutId="nav-underline" 
                      className="absolute -bottom-4 left-0 right-0 h-[3px] bg-ai-purple shadow-[0_0_15px_#7c3aed]"
                    />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveRightTab('stats')}
              className={`flex items-center gap-3 px-4 py-2 border rounded-xl transition-all bg-black/40 hover:bg-black/60 group ${
                isThinking || isUploading 
                  ? 'border-yellow-500/30 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]' 
                  : processedChunks.length > 0 
                    ? 'border-ai-blue/30 text-ai-blue shadow-[0_0_10px_rgba(14,165,233,0.1)]' 
                    : 'border-white/10 text-gray-500'
              }`}
            >
              <Activity size={14} className={isThinking || isUploading ? 'animate-pulse' : 'group-hover:text-white transition-colors'} />
              <span className="text-[9px] font-black uppercase tracking-[2px] font-heading">
                {isThinking || isUploading ? 'PROCESSING' : processedChunks.length > 0 ? 'STABLE' : 'IDLE'}
              </span>
            </button>
            
            <button 
              onClick={() => {
                const nextTheme = isDarkMode ? 'QUANTUM_LIGHT' : 'VOID_BLACK';
                setIsDarkMode(!isDarkMode);
                updatePreference({ theme: nextTheme });
              }}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/40 border border-white/10 text-gray-500 hover:text-white hover:border-white/20 transition-all shadow-lg group"
            >
              {isDarkMode ? <Moon size={18} className="group-hover:rotate-12 transition-transform" /> : <Sun size={18} className="group-hover:scale-110 transition-transform" />}
            </button>

            <button 
              onClick={() => handleShare()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/40 border border-white/10 text-gray-500 hover:text-white hover:border-white/20 transition-all shadow-lg group"
              title="Share chat link"
            >
              <Share2 size={18} className="group-hover:scale-110 transition-transform" />
            </button>
            
            <button 
              onClick={() => setShowExportModal(true)}
              className="px-6 py-2.5 bg-black/40 border border-white/10 text-white hover:border-ai-purple transition-all text-[10px] font-black uppercase tracking-[3px] rounded-xl flex items-center gap-3 group font-heading shadow-xl"
            >
              <Download size={16} className="text-ai-purple group-hover:translate-y-0.5 transition-transform" />
              EXPORT
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Pane */}
          <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
             <NeuralWave />
             <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar relative z-10">
               <div className="max-w-4xl mx-auto space-y-8 pb-32">
                 {activeTab === 'chat' && messages.map((msg, idx) => (
                   <motion.div
                     key={msg.id}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                   >
                     <div className={`flex flex-col gap-3 max-w-[85%] group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                       <div className={`
                         px-8 py-6 transition-all duration-300 relative
                         ${msg.role === 'user' 
                           ? 'bg-ai-purple/10 border border-ai-purple/40 text-white rounded-2xl rounded-tr-none shadow-[0_0_15px_rgba(124,58,237,0.1)]' 
                           : 'bg-[#0f172a]/40 backdrop-blur-xl border border-white/10 text-white rounded-2xl rounded-tl-none shadow-2xl overflow-hidden'
                         }
                       `}>
                          {msg.role === 'assistant' && (
                            <div className="flex items-center justify-between mb-6 pb-2 border-b border-white/5">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-ai-purple rounded flex items-center justify-center font-black text-[10px] text-white shadow-[0_0_10px_rgba(124,58,237,0.5)]">AI</div>
                                <span className="text-[10px] font-black text-ai-purple uppercase tracking-[3px] font-heading">NEURAL_NODE_V2</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-[9px] font-bold text-gray-500 font-mono">10:32:15 AM</span>
                                <Activity size={12} className="text-ai-blue animate-pulse" />
                              </div>
                            </div>
                          )}

                          <div className="markdown-body text-[13px] leading-relaxed font-sans text-gray-200">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>

                          {msg.role === 'assistant' && (
                            <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-3">
                               <div className="px-3 py-1 bg-white/5 border border-white/10 text-ai-blue text-[8px] font-black uppercase tracking-[2px] cursor-pointer hover:bg-ai-blue/10 transition-all rounded font-heading">
                                 P.1 • SOURCE_MAP
                               </div>
                               <div className="flex-1" />
                               <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => copyMessageContent(msg)}
                                    className={`p-1.5 transition-colors ${copiedMessageId === msg.id ? 'text-ai-blue' : 'text-gray-500 hover:text-white'}`}
                                    title={copiedMessageId === msg.id ? 'Copied' : 'Copy to clipboard'}
                                  >
                                    <Copy size={12}/>
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const pinned = getPinnedForMessage(msg.id);
                                      if (pinned) {
                                        handleUnpin(pinned._id);
                                      } else {
                                        handlePin(msg);
                                      }
                                    }}
                                    className={`p-1.5 transition-colors ${getPinnedForMessage(msg.id) ? 'text-ai-purple' : 'text-gray-500 hover:text-white'}`}
                                    title={getPinnedForMessage(msg.id) ? 'Unpin message' : 'Pin message'}
                                  >
                                    {getPinnedForMessage(msg.id) ? <PinOff size={12}/> : <Pin size={12}/>}
                                  </button>
                               </div>
                            </div>
                          )}
                       </div>
                     </div>
                   </motion.div>
                 ))}

                 {activeTab === 'summary' && (
                   <div className="space-y-8 max-w-2xl mx-auto">
                     <div className="flex items-center justify-between mb-8 border-b border-ai-purple/20 pb-4">
                       <div className="flex items-center gap-3">
                         <Zap className="text-ai-blue" size={20} />
                         <h2 className="text-xl font-bold uppercase tracking-[3px] font-heading">Document Summary</h2>
                       </div>
                       {isSummarizing && <Loader2 className="animate-spin text-ai-blue" size={18} />}
                     </div>
                     
                     <div className="glass-panel border-ai-purple/30 p-8 rounded-3xl relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-ai-blue/50" />
                       {isSummarizing ? (
                         <div className="space-y-4">
                           <div className="h-4 bg-white/5 rounded-full w-3/4 animate-pulse" />
                           <div className="h-4 bg-white/5 rounded-full w-1/2 animate-pulse" />
                           <div className="h-32 bg-white/5 rounded-2xl w-full animate-pulse" />
                         </div>
                       ) : summaryText ? (
                         <div className="markdown-body">
                           <ReactMarkdown>{summaryText}</ReactMarkdown>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                           <FileText className="text-gray-700" size={48} />
                           <div>
                             <p className="text-[10px] font-bold uppercase tracking-[2px] text-gray-600">No summary available</p>
                             <p className="text-[8px] text-gray-700 mt-1 uppercase">Upload a document to generate neural map</p>
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 )}

                 {activeTab === 'pinned' && (
                   <div className="space-y-6">
                     <div className="flex items-center gap-3 mb-8 border-b border-ai-purple/20 pb-4">
                       <Bookmark className="text-ai-blue" size={20} />
                       <h2 className="text-xl font-bold uppercase tracking-[3px] font-heading">Pinned_Knowledge</h2>
                     </div>
                     {pinnedMessages.filter(p => p.chatId === currentChatId).length === 0 ? (
                       <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-ai-purple/10 rounded-3xl gap-4">
                         <Pin className="text-gray-700" size={32} />
                         <p className="text-[10px] font-bold uppercase tracking-[2px] text-gray-600">No neural nodes pinned for this session</p>
                       </div>
                     ) : (
                       pinnedMessages.filter(p => p.chatId === currentChatId).map((pin) => (
                         <div key={pin._id} className="p-6 bg-white/5 border border-ai-purple/20 rounded-2xl relative group">
                           <div className="flex items-center justify-between mb-4">
                             <span className="text-[8px] font-bold text-ai-blue uppercase tracking-[2px] font-mono">NODE_{pin.messageId?.substring(0, 8)}</span>
                             <button onClick={() => handleUnpin(pin._id)} className="text-gray-500 hover:text-red-500 transition-colors">
                               <X size={14} />
                             </button>
                           </div>
                           <div className="markdown-body text-sm text-gray-300">
                             <ReactMarkdown>{pin.content}</ReactMarkdown>
                           </div>
                           <div className="mt-4 text-[7px] text-gray-600 font-mono uppercase">
                             TIMESTAMP: {new Date(pin.createdAt).toLocaleString()}
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                 )}


                 
                 {isThinking && activeTab === 'chat' && (
                   <div className="flex justify-start">
                     <div className="bg-[var(--msg-bot-bg)] border border-ai-purple/30 px-6 py-4 flex flex-col gap-3 rounded-2xl futuristic-glow">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1.5">
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                          </div>
                          <span className="text-[9px] font-bold text-ai-purple uppercase tracking-[2px] font-heading">Analyzing Document...</span>
                        </div>
                     </div>
                   </div>
                 )}
               </div>
             </div>

             {/* Bottom Input Area */}
             <div className="p-8 relative z-20">
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Quick Action Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'SUMMARIZE DOCUMENT', icon: <FileText size={18} />, color: 'purple' },
                      { label: 'LIST KEY DATES', icon: <History size={18} />, color: 'pink' },
                      { label: 'ANALYZE RISKS', icon: <ShieldCheck size={18} />, color: 'blue' },
                      { label: 'EXTRACT CONTACTS', icon: <User size={18} />, color: 'cyan' }
                    ].map((item, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSendMessage(null, item.label)}
                        disabled={documents.length === 0 || isThinking}
                        className="flex items-center gap-3 p-5 bg-[#0f172a]/60 border border-white/10 rounded-2xl hover:border-ai-blue hover:bg-white/10 transition-all group disabled:opacity-30 disabled:cursor-not-allowed text-left backdrop-blur-md"
                      >
                        <div className={`p-2 bg-ai-${item.color}/10 border border-ai-${item.color}/30 text-ai-${item.color} rounded-lg group-hover:scale-110 transition-transform`}>
                          {item.icon}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[2px] text-white/50 group-hover:text-white transition-colors font-heading leading-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="relative">
                    <div className="flex items-center gap-4 bg-[#0f172a]/80 border border-white/10 p-2 pl-5 rounded-[24px] focus-within:border-ai-blue/50 transition-all shadow-2xl backdrop-blur-2xl">
                      <input
                        type="text"
                        ref={inputRef}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Ask your AI core..."
                        disabled={documents.length === 0 || isThinking}
                        className="flex-1 bg-transparent px-2 py-4 text-sm font-medium outline-none placeholder:text-gray-600 text-white font-sans"
                      />
                      
                      <div className="flex items-center gap-2 px-2">
                        <button 
                          type="button"
                          onClick={toggleRecording}
                          className={`p-3 transition-colors ${isRecording ? 'text-pink-500' : 'text-gray-500 hover:text-white'}`}
                        >
                          <Mic size={20}/>
                        </button>
                        
                        <button 
                          type="submit"
                          disabled={!inputText.trim() || isThinking || documents.length === 0}
                          className="w-12 h-12 bg-gradient-to-br from-ai-purple to-ai-blue text-white flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(124,58,237,0.4)] rounded-full disabled:opacity-30"
                        >
                          <Send size={20} />
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
             </div>
          </div>

          {/* Right Panel - Doc Preview & Stats */}
          <AnimatePresence>
            {showRightPanel && (
              <motion.aside 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex flex-col glass-panel border-l border-ai-purple/20"
              >
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-[#020617]">
                  <span className="text-[10px] font-black uppercase tracking-[3px] text-ai-purple flex items-center gap-3 font-heading glow-text">
                    <Monitor size={14}/> DATA_SOURCE
                  </span>
                  <button onClick={() => setShowRightPanel(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                    <X size={16}/>
                  </button>
                </div>

                <div className="flex bg-[#0f172a]/20 p-2 gap-1 border-b border-white/5">
                  {['PREVIEW', 'STATS', 'KEYS'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveRightTab(tab.toLowerCase())}
                      className={`flex-1 py-2 text-[9px] font-black uppercase tracking-[2px] transition-all rounded-lg font-heading ${
                        activeRightTab === tab.toLowerCase() 
                          ? 'bg-ai-purple/20 text-white shadow-[0_0_15px_rgba(124,58,237,0.2)]' 
                          : 'text-gray-500 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {activeRightTab === 'preview' && (
                    <div className="space-y-4">
                      {processedChunks.length === 0 ? (
                        <div className="h-48 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl bg-[#0f172a]/20 p-6 text-center">
                          <FileText size={40} className="text-gray-800 mb-4" />
                          <p className="text-[9px] font-black text-gray-600 uppercase tracking-[2px] mb-2 font-heading">NO_NEURAL_MAP_DETECTED</p>
                          <p className="text-[8px] font-bold text-gray-700 uppercase tracking-[1px] font-mono leading-relaxed">
                            Upload a document to generate source map
                          </p>
                        </div>
                      ) : (
                        processedChunks.slice(0, 10).map((chunk, i) => (
                          <div key={i} className="p-4 bg-white/5 border-l-2 border-ai-purple/40 hover:border-ai-blue transition-all group rounded-r-lg">
                             <div className="text-[7px] font-bold text-ai-purple uppercase tracking-[2px] mb-2 font-mono">
                               SOURCE: {chunk.docName.substring(0, 15)}...
                             </div>
                             <p className="text-[10px] leading-relaxed text-gray-400 group-hover:text-white transition-colors line-clamp-4 italic font-sans">
                               "{chunk.text.substring(0, 200)}..."
                             </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}



                  {activeRightTab === 'stats' && (
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => {
                          const stats = [
                            { label: 'Total_Pages', val: documents.reduce((acc, d) => acc + d.pageCount, 0) },
                            { label: 'Neural_Chunks', val: processedChunks.length },
                            { label: 'Session_Logs', val: messages.length },
                            { label: 'Tokens_Sent', val: tokenUsage.sent },
                            { label: 'Tokens_Recv', val: tokenUsage.received },
                            { label: 'Total_Documents', val: documents.length }
                          ];
                          const statsText = stats.map(s => `${s.label}: ${s.val}`).join('\n');
                          navigator.clipboard.writeText(`DocuChat AI Session Stats:\n${statsText}`);
                          setError('SUCCESS: Stats copied to clipboard.');
                          setTimeout(() => setError(null), 3000);
                        }}
                        className="p-4 bg-ai-blue/10 border border-ai-blue/30 rounded-xl flex items-center justify-between group hover:bg-ai-blue/20 transition-all mb-2"
                      >
                         <div className="flex items-center gap-3">
                           <Share2 size={16} className="text-ai-blue" />
                           <span className="text-[10px] font-black uppercase tracking-[2px] text-white">Share Session Stats</span>
                         </div>
                         <ArrowRight size={14} className="text-ai-blue opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                      </button>
                      {[
                        { label: 'Total_Pages', val: documents.reduce((acc, d) => acc + d.pageCount, 0), icon: <History size={16}/> },
                        { label: 'Neural_Chunks', val: processedChunks.length, icon: <Layout size={16}/> },
                        { label: 'Session_Logs', val: messages.length, icon: <Activity size={16}/> },
                        { label: 'Tokens_Sent', val: tokenUsage.sent, icon: <ArrowRight size={16}/> },
                        { label: 'Tokens_Recv', val: tokenUsage.received, icon: <CheckCircle2 size={16}/> },
                        { label: 'Total_Documents', val: documents.length, icon: <Layers size={16}/> }
                      ].map((stat, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-4 bg-white/5 border border-ai-purple/20 flex flex-col gap-2 rounded-xl"
                        >
                          <div className="text-ai-purple">{stat.icon}</div>
                          <div>
                            <p className="text-lg font-bold font-heading">{stat.val}</p>
                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-[1px] font-mono">{stat.label}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {activeRightTab === 'keys' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-[9px] font-bold text-ai-blue uppercase tracking-[2px] mb-3 font-heading border-b border-white/10 pb-1">Identified_Personnel</h3>
                        <div className="space-y-2">
                          {extractedEntities.names.map((name, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-lg">
                              <Bot size={10} className="text-ai-purple" />
                              <span className="text-[10px] text-gray-300 font-medium">{name}</span>
                            </div>
                          ))}
                          {extractedEntities.names.length === 0 && <p className="text-[9px] text-gray-600 italic">No entities mapped.</p>}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[9px] font-bold text-ai-pink uppercase tracking-[2px] mb-3 font-heading border-b border-white/10 pb-1">Communication_Nodes</h3>
                        <div className="space-y-2">
                          {extractedEntities.emails.map((email, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-lg">
                              <Share2 size={10} className="text-ai-blue" />
                              <span className="text-[10px] text-gray-300 font-medium truncate">{email}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[9px] font-bold text-ai-purple uppercase tracking-[2px] mb-3 font-heading border-b border-white/10 pb-1">Temporal_Anchors</h3>
                        <div className="space-y-2">
                          {extractedEntities.dates.map((date, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-lg">
                              <Clock size={10} className="text-ai-pink" />
                              <span className="text-[10px] text-gray-300 font-medium">{date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-[#020617]/80 border-t border-white/5 backdrop-blur-xl relative">
                   <div className="space-y-4">
                      <AnimatePresence>
                        {showCoreNodesMenu && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute bottom-[calc(100%+12px)] left-4 right-4 bg-[#020617] border border-white/10 rounded-[28px] p-4 shadow-2xl z-[100] backdrop-blur-3xl overflow-hidden"
                          >
                            <div className="flex items-center gap-3 mb-4 px-2">
                              <div className="w-1.5 h-1.5 bg-ai-purple rounded-full shadow-[0_0_10px_#7c3aed]" />
                              <span className="text-[9px] font-black uppercase tracking-[3px] text-ai-purple font-heading">Settings</span>
                            </div>

                            <div className="space-y-1.5">
                              <CapabilityItem 
                                icon={<FileText size={14} />} 
                                title="Auto Parse" 
                                subtitle={parsingStatus === 'ACTIVE' ? "PROCESS_ACTIVE" : parsingStatus === 'COMPLETED' ? "EXTRACTION_COMPLETE" : "+IDLE_PACKET"}
                                isActive={parsingStatus !== 'IDLE'}
                                onClick={() => { handleCapabilityClick('Smart PDF Parsing'); setShowCoreNodesMenu(false); }}
                              />

                              <CapabilityItem 
                                icon={<Cpu size={14} />} 
                                title="AI Engine" 
                                subtitle={isThinking ? "GENERATING..." : "STANDBY"}
                                isActive={isThinking}
                                onClick={() => { handleCapabilityClick('AI-Powered Answers'); setShowCoreNodesMenu(false); }}
                              />
                              <CapabilityItem 
                                icon={<Search size={14} />} 
                                title="Semantic Vec" 
                                subtitle={processedChunks.length > 0 ? `${processedChunks.length}_VECTORS_SYNC` : "POOL_OFFLINE"}
                                isActive={processedChunks.length > 0}
                                onClick={() => { handleCapabilityClick('Semantic Vector Search'); setShowCoreNodesMenu(false); }}
                              />
                              <CapabilityItem 
                                icon={<ShieldCheck size={14} />} 
                                title="Integrity" 
                                subtitle={integrityEnabled ? "STRICT_PASS" : "OPEN_MODE"}
                                isActive={integrityEnabled}
                                onClick={() => { handleCapabilityClick('Hallucination Control'); setShowCoreNodesMenu(false); }}
                              />
                            </div>
                            
                            <div className="h-px bg-white/5 my-4" />
                            
                            <button 
                              onClick={() => { setShowCoreNodesMenu(false); setActiveModal('personalization'); }}
                              className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-500 hover:text-white group"
                            >
                              <div className="flex items-center gap-3">
                                <Settings size={14} className="group-hover:text-ai-purple transition-colors" />
                                <span className="text-[10px] font-bold uppercase tracking-[1px]">App Preferences</span>
                              </div>
                              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button 
                        onClick={() => setShowCoreNodesMenu(!showCoreNodesMenu)}
                        className={`w-full flex items-center gap-4 p-4 rounded-[24px] border transition-all ${
                          showCoreNodesMenu ? 'bg-ai-purple/10 border-ai-purple/50 shadow-[0_0_20px_rgba(124,58,237,0.2)]' : 'bg-[#0f172a]/60 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-[14px] bg-ai-purple flex items-center justify-center text-white font-black text-lg shadow-[0_0_15px_rgba(124,58,237,0.4)] flex-shrink-0">
                           <Grid size={22} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[11px] font-black text-white tracking-[0.5px] truncate font-heading leading-tight uppercase">Core Features</p>
                          <p className="text-[9px] font-bold text-gray-500 tracking-[0.5px] truncate font-mono mt-0.5 opacity-80 uppercase">
                             {processedChunks.length > 0 ? `${processedChunks.length} VECTORS SYNC` : 'OFFLINE'}
                          </p>
                        </div>
                        {showCoreNodesMenu ? <X size={14} className="text-white" /> : <ChevronRight size={14} className="text-gray-600" />}
                      </button>
                   </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
        
        {/* Export Modal */}
        <AnimatePresence>
          {showExportModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowExportModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md glass-panel border border-ai-purple/30 p-8 rounded-3xl futuristic-shadow"
              >
                <h3 className="text-lg font-bold uppercase tracking-[4px] font-heading mb-6">Export Logs</h3>
                <p className="text-xs text-gray-400 mb-8 font-sans leading-relaxed">System preparing to package current conversation session. Select desired output format for local archive.</p>
                
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { format: 'pdf', label: 'PDF Document', icon: <FileText size={18}/>, desc: 'Formatted report with layout' },
                    { format: 'txt', label: 'Plain Text', icon: <Terminal size={18}/>, desc: 'Clean chronological log' },
                    { format: 'json', label: 'JSON Data', icon: <Hash size={18}/>, desc: 'Machine-readable neural map' }
                  ].map((opt) => (
                    <button 
                      key={opt.format}
                      onClick={() => handleExportAction(opt.format)}
                      disabled={exporting}
                      className="group flex items-center gap-5 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-ai-purple/10 hover:border-ai-purple/50 transition-all text-left"
                    >
                      <div className="p-3 bg-ai-purple/20 text-ai-blue rounded-xl group-hover:scale-110 transition-transform">
                        {opt.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-bold text-white uppercase tracking-[1px]">{opt.label}</p>
                        <p className="text-[9px] text-gray-500 font-mono mt-0.5">{opt.desc}</p>
                      </div>
                      {exporting ? <Loader2 className="animate-spin text-ai-blue" size={16} /> : <Download className="text-gray-600 group-hover:text-ai-blue" size={16} />}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setShowExportModal(false)}
                  className="w-full mt-8 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-[2px] font-heading hover:text-white transition-colors"
                >
                  ABORT_OPERATION
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Share Modal */}
        <AnimatePresence>
          {showShareModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowShareModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg glass-panel border border-ai-blue/30 p-8 rounded-3xl futuristic-shadow"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold uppercase tracking-[4px] font-heading">Neural Share</h3>
                  <button onClick={() => setShowShareModal(false)} className="text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <p className="text-xs text-gray-400 mb-8 font-sans leading-relaxed">Generate a shareable link for this neural session. The link is created temporarily without storing any data in the database - similar to ChatGPT's sharing feature.</p>
                
                <div className="space-y-4">
{/* Public Toggle - Removed for ChatGPT-style sharing that doesn't use DB */}

                   <div className="p-4 bg-ai-blue/10 border border-ai-blue/20 rounded-2xl">
                     <p className="text-[8px] font-bold text-ai-blue uppercase tracking-[2px] mb-2">SHARE_TOKEN_LINK</p>
                     <p className="text-[7px] text-gray-500 mb-3">This link is generated without storing data in the database</p>
                     <div className="flex items-center gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5">
                       <input 
                         readOnly 
                         value="Click 'Generate Share Link' to create a temporary link"
                         className="flex-1 bg-transparent text-[10px] text-gray-400 font-mono outline-none"
                       />
                     </div>
                   </div>

                   <div className="grid grid-cols-1 gap-3">
                     <button 
                       onClick={generateShareToken}
                       disabled={!currentChatId}
                       className="group flex items-center justify-center gap-3 p-5 bg-gradient-to-r from-ai-purple to-ai-blue text-white rounded-2xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <Share2 size={18}/>
                       <span className="text-[11px] font-bold uppercase tracking-[1px]">Generate Share Link</span>
                     </button>

                     <div className="grid grid-cols-2 gap-3">
                       <button 
                         onClick={async () => {
                           await generateShareToken();
                         }}
                         className="group flex flex-col items-center gap-3 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-ai-blue/10 hover:border-ai-blue/50 transition-all text-center"
                       >
                         <Link size={20} className="text-ai-blue"/>
                         <p className="text-[10px] font-bold text-white uppercase tracking-[1px]">Generate & Copy</p>
                       </button>

                       <button 
                         onClick={() => {
                           const subject = encodeURIComponent(`Shared NeuroDoc Session`);
                           const body = encodeURIComponent(`I've shared a NeuroDoc AI session with you. Generate a share link from the app to access it.`);
                           window.location.href = `mailto:?subject=${subject}&body=${body}`;
                           setShowShareModal(false);
                         }}
                         className="group flex flex-col items-center gap-3 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-ai-purple/10 hover:border-ai-purple/50 transition-all text-center"
                       >
                         <Mail size={20} className="text-ai-purple"/>
                         <p className="text-[10px] font-bold text-white uppercase tracking-[1px]">Email Notification</p>
                       </button>
                     </div>
                   </div>
                </div>

                <button 
                  onClick={() => setShowShareModal(false)}
                  className="w-full mt-8 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-[2px] font-heading hover:text-white transition-colors"
                >
                  DISMISS_MODAL
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Toggle Right Panel */}
        {!showRightPanel && (
          <button 
            onClick={() => setShowRightPanel(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 glass-panel text-ai-purple shadow-lg hover:text-ai-blue transition-all z-20 rounded-full"
          >
            <ChevronRight size={16} className="rotate-180" />
          </button>
        )}
      </main>

      {/* Global Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[101] w-full max-w-sm"
          >
            <div className={`mx-4 p-4 glass-panel futuristic-shadow flex items-start gap-4 rounded-2xl ${error.startsWith('SUCCESS') || error.startsWith('COPIED') || error.startsWith('DOCUMENT_SAVED') || error.startsWith('AI_LIMIT') ? 'border-ai-blue/50' : 'border-red-500/50'}`}>
              {error.startsWith('SUCCESS') || error.startsWith('COPIED') || error.startsWith('DOCUMENT_SAVED') || error.startsWith('AI_LIMIT') ? (
                <CheckCircle2 className="text-ai-blue shrink-0" size={18} />
              ) : (
                <AlertCircle className="text-red-500 shrink-0" size={18} />
              )}
              <div className="flex-1">
                <p className={`text-[10px] font-black uppercase tracking-widest font-heading ${error.startsWith('SUCCESS') || error.startsWith('COPIED') || error.startsWith('DOCUMENT_SAVED') || error.startsWith('AI_LIMIT') ? 'text-ai-blue' : 'text-red-500'}`}>
                  {error.startsWith('SUCCESS') || error.startsWith('COPIED') || error.startsWith('DOCUMENT_SAVED') || error.startsWith('AI_LIMIT') ? 'Status' : 'Protocol_Error'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-gray-600 hover:text-white">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#050505]/95 backdrop-blur-3xl overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xl bg-[#111] border border-white/10 rounded-[32px] p-8 futuristic-shadow relative overflow-hidden"
            >
              {/* Background Accents */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-ai-purple/10 rounded-full blur-[100px] -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-ai-blue/10 rounded-full blur-[100px] -ml-32 -mb-32" />

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="p-2 -ml-2 text-gray-500 hover:text-white rounded-full transition-all group"
                  >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                  </button>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ai-purple to-ai-blue flex items-center justify-center text-white futuristic-shadow">
                    {activeModal === 'personalization' && <Activity size={24} />}
                    {activeModal === 'profile' && <User size={24} />}
                    {activeModal === 'settings' && <Settings size={24} />}
                    {activeModal === 'help' && <HelpCircle size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-[3px] font-heading text-white">
                      {activeModal.toUpperCase()}
                    </h2>
                    <p className="text-[10px] font-bold text-ai-purple/60 uppercase tracking-[2px]">Version 2.4.1</p>
                  </div>
                </div>

                <div className="space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar pr-2">
                  {activeModal === 'personalization' && (
                    <div className="space-y-8">
                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                        <h4 className="text-[11px] font-black text-white uppercase tracking-[1px] mb-4">App Theme</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { id: 'VOID_BLACK', label: 'VOID BLACK', color: 'bg-black' },
                            { id: 'SPACE_PURPLE', label: 'SPACE PURPLE', color: 'bg-purple-900' },
                            { id: 'CYBER_GREEN', label: 'CYBER GREEN', color: 'bg-emerald-900' },
                            { id: 'QUANTUM_LIGHT', label: 'QUANTUM LIGHT', color: 'bg-white' }
                          ].map(t => (
                            <button 
                              key={t.id} 
                              onClick={() => updatePreference({ theme: t.id })}
                              className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${preferences.theme === t.id ? 'bg-ai-purple/20 border-ai-purple shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'bg-transparent border-white/5 hover:border-white/20'}`}
                            >
                              <div className={`w-8 h-8 rounded-full border border-white/10 ${t.color}`} />
                              <span className={`text-[8px] font-black tracking-[1px] ${preferences.theme === t.id ? 'text-white' : 'text-gray-500'}`}>{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                          <h4 className="text-[11px] font-black text-white uppercase tracking-[1px] mb-4">Font_Scale</h4>
                          <div className="flex gap-2">
                            {['small', 'medium', 'large'].map(size => (
                              <button 
                                key={size}
                                onClick={() => updatePreference({ fontSize: size })}
                                className={`flex-1 py-2 rounded-lg border text-[9px] font-black uppercase tracking-[1px] transition-all ${preferences.fontSize === size ? 'bg-ai-purple border-ai-purple text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                          <h4 className="text-[11px] font-black text-white uppercase tracking-[1px] mb-4">Bubble_Interface</h4>
                          <div className="flex gap-2">
                            {['futuristic', 'minimal'].map(style => (
                              <button 
                                key={style}
                                onClick={() => updatePreference({ chatBubbleStyle: style })}
                                className={`flex-1 py-2 rounded-lg border text-[9px] font-black uppercase tracking-[1px] transition-all ${preferences.chatBubbleStyle === style ? 'bg-ai-blue border-ai-blue text-black' : 'bg-white/5 border-white/10 text-gray-500'}`}
                              >
                                {style}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                        <h4 className="text-[11px] font-black text-white uppercase tracking-[1px] mb-4">Response_Protocol</h4>
                          <select 
                            value={preferences.responseStyle}
                            onChange={(e) => updatePreference({ responseStyle: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-[10px] font-bold text-white outline-none focus:border-ai-purple transition-all uppercase tracking-[1px]"
                          >
                            <option value="concise">Concise_Summary</option>
                            <option value="detailed">Detailed Map</option>
                            <option value="professional">Professional_Audit</option>
                          </select>
                        </div>
                      </div>
                    )}

                  {activeModal === 'profile' && (
                    <div className="space-y-8">
                      <div className="flex flex-col items-center p-8 bg-white/5 border border-white/10 rounded-[32px] relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-ai-purple/20 to-transparent" />
                        
                        <div 
                          className="relative group cursor-pointer mb-6"
                          onClick={() => avatarInputRef.current?.click()}
                        >
                           <img src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.email} alt="avatar" className="w-28 h-28 rounded-[2rem] border-2 border-ai-purple futuristic-shadow transition-transform group-hover:scale-105 object-cover" />
                           <div className="absolute inset-0 bg-black/60 rounded-[2rem] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                             <Upload size={24} className="text-white" />
                           </div>
                           <input 
                             type="file" 
                             ref={avatarInputRef} 
                             onChange={handleAvatarUpload} 
                             className="hidden" 
                             accept="image/*" 
                           />
                        </div>

                        <div className="text-center relative z-10 w-full max-w-xs">
                          <input 
                            type="text" 
                            defaultValue={user.name}
                            onBlur={(e) => updateProfile({ name: e.target.value })}
                            className="bg-transparent border-b border-transparent hover:border-ai-purple/50 focus:border-ai-purple text-2xl font-black text-white text-center uppercase tracking-[3px] outline-none w-full transition-all mb-1 font-heading" 
                          />
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[2px] font-mono mb-8 brightness-125">{user.email}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 w-full">
                          <div className="bg-black/60 p-5 rounded-2xl border border-white/5 text-center group hover:border-ai-purple/30 transition-all">
                            <p className="text-[8px] font-bold text-ai-purple uppercase tracking-[2px] mb-1 opacity-60">TOTAL_DOCS_IN_CORE</p>
                            <p className="text-2xl font-black text-white brightness-125">{userStats.docsCount}</p>
                          </div>
                          <div className="bg-black/60 p-5 rounded-2xl border border-white/5 text-center group hover:border-ai-blue/30 transition-all">
                            <p className="text-[8px] font-bold text-ai-blue uppercase tracking-[2px] mb-1 opacity-60">TOTAL_CHATS</p>
                            <p className="text-2xl font-black text-white brightness-125">{userStats.chatsCount}</p>
                          </div>
                        </div>
                        
                        <div className="mt-8 p-4 bg-white/5 rounded-xl w-full border border-white/5">
                           <div className="flex items-center justify-between text-[8px] font-black text-gray-500 uppercase tracking-[1px]">
                             <span>JOINED DATE</span>
                             <span className="text-white">{new Date(user.createdAt).toLocaleDateString()}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeModal === 'settings' && (
                    <div className="space-y-4">
                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                         <h4 className="text-[11px] font-black text-white uppercase tracking-[1px] mb-4">Notification Settings</h4>
                         
                         <div className="flex items-center justify-between group">
                           <div>
                             <p className="text-[10px] font-bold text-white uppercase tracking-[1px]">Push Notifications</p>
                             <p className="text-[8px] text-gray-500 font-medium">Alerts for new chat activity</p>
                           </div>
                           <button 
                             onClick={() => updatePreference({ notifications: !preferences.notifications })}
                             className={`w-10 h-5 rounded-full transition-all relative ${preferences.notifications ? 'bg-ai-purple' : 'bg-gray-800'}`}
                           >
                             <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${preferences.notifications ? 'right-1' : 'left-1'}`} />
                           </button>
                         </div>

                         <div className="flex items-center justify-between group">
                           <div>
                             <p className="text-[10px] font-bold text-white uppercase tracking-[1px]">Voice Controls</p>
                             <p className="text-[8px] text-gray-500 font-medium">Enable speech-to-text input</p>
                           </div>
                           <button 
                             onClick={() => updatePreference({ voiceInput: !preferences.voiceInput })}
                             className={`w-10 h-5 rounded-full transition-all relative ${preferences.voiceInput ? 'bg-ai-blue' : 'bg-gray-800'}`}
                           >
                             <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${preferences.voiceInput ? 'right-1' : 'left-1'}`} />
                           </button>
                         </div>
                      </div>

                      <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-4">
                         <h4 className="text-[11px] font-black text-red-500 uppercase tracking-[1px] mb-4">Critical Actions</h4>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <button 
                             onClick={() => clearUserData('chats')}
                             className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl hover:bg-red-500/10 hover:border-red-500/30 transition-all text-left"
                           >
                             <div className="flex items-center gap-2">
                               <MessageSquare size={14} className="text-gray-500" />
                               <span className="text-[9px] font-bold text-white uppercase tracking-[1px]">Clear History</span>
                             </div>
                             <Trash2 size={12} className="text-red-500/50" />
                           </button>
                           <button 
                             onClick={() => clearUserData('docs')}
                             className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl hover:bg-red-500/10 hover:border-red-500/30 transition-all text-left"
                           >
                             <div className="flex items-center gap-2">
                               <FileText size={14} className="text-gray-500" />
                               <span className="text-[9px] font-bold text-white uppercase tracking-[1px]">Remove Files</span>
                             </div>
                             <Trash2 size={12} className="text-red-500/50" />
                           </button>
                         </div>
                         <button 
                           onClick={() => clearUserData('all')}
                           className="w-full py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[2px] transition-all hover:brightness-110"
                         >
                           ACCOUNT RESET
                         </button>
                      </div>
                    </div>
                  )}

                  {activeModal === 'help' && (
                    <div className="space-y-6">
                      <div className="p-6 bg-ai-purple/10 border border-ai-purple/30 rounded-2xl">
                        <div className="text-[10px] text-ai-blue font-mono leading-relaxed">
                          {">"} HELP CENTER [READY...]<br/>
                          {">"} SCANNING HELP TOPICS...<br/>
                          {">"} OPTIMIZATION: ACTIVE<br/>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {[
                          { q: 'How to upload files?', a: 'Drag and drop any PDF into the document area or use the "+" icon to select files.' },
                          { q: 'Is my data safe?', a: 'All communication is encrypted. Your documents belong strictly to your account.' },
                          { q: 'Keyboard Shortcuts', a: 'CMD+K [SEARCH], ESC [CLOSE], CMD+ENTER [SEND]' }
                        ].map((faq, i) => (
                          <details key={i} className="group">
                            <summary className="flex items-center justify-between p-4 bg-white/5 rounded-2xl cursor-pointer list-none border border-white/10 group-open:border-ai-purple/50 hover:bg-white/10 transition-all">
                              <span className="text-[10px] font-black text-white uppercase tracking-[2px] font-heading">{faq.q}</span>
                              <ChevronRight size={16} className="text-gray-500 group-open:rotate-90 transition-transform" />
                            </summary>
                            <div className="p-4 text-[10px] text-gray-400 font-medium leading-relaxed font-sans mt-1 bg-black/20 rounded-2xl border border-white/5">
                              {faq.a}
                            </div>
                          </details>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[2px] rounded-2xl hover:bg-white/10 transition-all">
                          <ExternalLink size={16} /> CORE_GUIDE
                        </button>
                        <button className="flex items-center justify-center gap-2 py-4 bg-ai-purple text-white text-[10px] font-black uppercase tracking-[2px] rounded-2xl hover:brightness-110 transition-all futuristic-glow">
                          <MessageSquare size={16} /> LIVE_SUPPORT
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {chatPendingDelete && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              className="w-full max-w-md bg-[#080b16] border border-red-500/20 rounded-3xl p-7 futuristic-shadow relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
              <div className="absolute -right-16 -top-16 w-36 h-36 bg-red-500/10 rounded-full blur-[60px]" />
              
              <div className="relative z-10">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-red-500/15 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center shrink-0">
                    <Trash2 size={22} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-white uppercase tracking-[2px] font-heading">Delete_Chat?</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-[1px] mt-2 leading-relaxed font-bold">
                      This conversation and its stored messages will be permanently removed.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl mb-6">
                  <p className="text-[8px] font-black text-red-400 uppercase tracking-[2px] mb-2 font-heading">Target Session</p>
                  <p className="text-[11px] font-black text-white uppercase tracking-[1px] truncate font-heading">
                    {chatPendingDelete.title || 'NULL_LOG'}
                  </p>
                  <p className="text-[8px] text-gray-600 font-mono mt-2">
                    {new Date(chatPendingDelete.updatedAt).toLocaleString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setChatPendingDelete(null)}
                    className="py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-[1px] hover:bg-white/10 transition-all font-heading"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={confirmDeleteChat}
                    className="py-3 bg-red-500/90 text-white rounded-xl text-[10px] font-black uppercase tracking-[1px] hover:bg-red-500 hover:shadow-[0_0_18px_rgba(239,68,68,0.35)] transition-all font-heading"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isConfirmingLogout && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-8 text-center futuristic-shadow"
             >
               <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                 <LogOut size={32} />
               </div>
               <h3 className="text-lg font-black text-white uppercase tracking-[2px] mb-2 font-heading">Terminate_Session?</h3>
               <p className="text-[10px] text-gray-500 uppercase tracking-[1px] mb-8 font-bold leading-relaxed">System state will be saved, but active neural links will be severed.</p>
               <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => setIsConfirmingLogout(false)}
                   className="py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-[1px] hover:bg-white/10 transition-all font-heading"
                 >
                   ABORT
                 </button>
                 <button 
                   onClick={handleLogout}
                   className="py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[1px] hover:brightness-110 transition-all font-heading"
                 >
                   TERMINATE
                 </button>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
