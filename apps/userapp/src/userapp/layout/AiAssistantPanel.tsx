import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

type FileAttachment = {
  name: string;
  type: 'file' | 'photo';
  size?: string;
};

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  attachments?: FileAttachment[];
  isStreaming?: boolean;
  tenders?: any[];
  debug?: any[];
};

type AiAssistantPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

// Branded helper quick chips for Tender Analysis
const PROMPT_CHIPS = [
  { text: "🔍 Find tenders closing this week", icon: "📅" },
  { text: "📊 Analyze winning bidding criteria", icon: "🏆" },
  { text: "💡 Search ICT infrastructure tenders", icon: "💻" },
];

export function AiAssistantPanel({ isOpen, onClose }: AiAssistantPanelProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am your AI Assistant. 📋✨\n\nI am here to help you quickly find hidden tender opportunities, instantly analyze complex specifications, and verify bidding criteria so you never miss a winning bid.",
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeStreamingId, setActiveStreamingId] = useState<string | null>(null);
  const [expandedDebugIds, setExpandedDebugIds] = useState<Record<string, boolean>>({});

  const toggleDebug = (msgId: string) => {
    setExpandedDebugIds(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat container to bottom when messages or active stream updates
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isAiThinking, streamingText]);

  // Handle stream typing effect
  useEffect(() => {
    if (!activeStreamingId) return;

    const targetMessage = messages.find(m => m.id === activeStreamingId);
    if (!targetMessage) return;

    const fullText = targetMessage.text;
    let currentIdx = 0;
    setStreamingText('');

    const timer = setInterval(() => {
      currentIdx += Math.min(3, fullText.length - currentIdx); // stream 3 chars at a time for smooth speed
      setStreamingText(fullText.slice(0, currentIdx));

      if (currentIdx >= fullText.length) {
        clearInterval(timer);
        // Commit full stream text into messages
        setMessages(prev => prev.map(m => m.id === activeStreamingId ? { ...m, isStreaming: false } : m));
        setActiveStreamingId(null);
        setStreamingText('');
      }
    }, 20);

    return () => clearInterval(timer);
  }, [activeStreamingId, messages]);

  // Trigger file selection dialog
  const handleAttachFile = () => fileInputRef.current?.click();

  // Mock file/photo uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: FileAttachment[] = Array.from(files).map(file => {
      const isPhoto = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
      return {
        name: file.name,
        type: isPhoto ? 'photo' : 'file',
        size: `${(file.size / 1024).toFixed(1)} KB`
      };
    });

    setAttachments(prev => [...prev, ...newAttachments]);
    // Clear inputs so same files can be re-added if deleted
    e.target.value = '';
  };

  // Delete attachment context
  const handleRemoveAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // Format AI responses, converting code blocks into styled monospace code fields
  const renderMessageContent = (msg: Message) => {
    const textToRender = msg.id === activeStreamingId ? streamingText : msg.text;
    const parts = textToRender.split(/(```[\s\S]*?```)/g);

    return parts.map((part, idx) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract language and code content
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : 'typescript';
        const code = match ? match[2] : part.slice(3, -3);

        return (
          <div key={idx} className="my-3 rounded-xl dark:bg-black/60 bg-neutral-900 border border-neutral-800 p-4 font-mono text-[11px] leading-relaxed text-neutral-200 shadow-inner overflow-x-auto custom-scrollbar relative">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-2">
              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">{language}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(code.trim())}
                className="text-[9px] text-[#5E6AD2] hover:text-[#717CFF] dark:text-[#717CFF] font-semibold hover:underline cursor-pointer"
              >
                Copy Code
              </button>
            </div>
            <pre className="whitespace-pre">{code.trim()}</pre>
          </div>
        );
      }

      // Handle simple newlines and text
      return (
        <span key={idx} className="whitespace-pre-wrap leading-relaxed">
          {part}
        </span>
      );
    });
  };

  // Generate intelligent simulated chatbot replies for Tender Analysis
  const generateSimulatedReply = (userInput: string, attached: FileAttachment[]) => {
    const lowerInput = userInput.toLowerCase();
    
    // Scenario 1: User uploaded a photo (screenshot of a tender page or GP outline)
    const hasPhoto = attached.some(a => a.type === 'photo');
    if (hasPhoto) {
      const photoName = attached.find(a => a.type === 'photo')?.name || 'screenshot.png';
      return `I see you've attached the photo **"${photoName}"**. 🖼️\n\nI have successfully scanned and processed this visual. It matches the **e-GP Portal Tender ID #9042-A** (ICT Supply & Cabling).\n\nHere are the critical details retrieved to help you prepare your bid:\n- **Tender Security Required:** BDT 35,000 (must be issued via bank guarantee).\n- **Submission Deadline:** May 29, 2026 at 14:00.\n- **Technical Weight:** 70% evaluation, 30% financial.\n\nLet me know if you would like me to draft a technical compliance checklist for this tender to ensure your bid succeeds!`;
    }

    // Scenario 2: User uploaded a tender file (pdf, spreadsheet, or text specs)
    const hasFile = attached.some(a => a.type === 'file');
    if (hasFile) {
      const fileName = attached.find(a => a.type === 'file')?.name || 'tender_specs.pdf';
      return `I've successfully scanned and analyzed the tender document **"${fileName}"**. 📄\n\nHere is a technical summary of the key requirements to qualify your business for this contract:\n\n\`\`\`javascript\n{\n  tender_id: "TENDER/2026/8839",\n  procurement_type: "Goods (Computer Hardware & Server Nodes)",\n  turnover_required: "BDT 5,000,000 annual average over 3 years",\n  experience_required: "At least 1 similar supply contract of BDT 3,000,000"\n}\n\`\`\`\n**Winning Advice:** Page 12 of the specs indicates that all components must have a minimum 3-year local warranty. Let me know if you would like me to draft a complete proposal template!`;
    }

    // Scenario 3: Prompt chips clicked
    if (lowerInput.includes('closing') || lowerInput.includes('week') || lowerInput.includes('date')) {
      return `Here are the active tenders closing this week that match your interests: 📅\n\n1. **e-GP ID #88934** (Supply of Laptops & UPS Setup)\n   - *Closing Date:* May 28, 2026 at 11:30\n   - *Authority:* Ministry of Education\n   - *Bidding Type:* Open Tendering Method (OTM)\n\n2. **Tender Ref #OTM-0294-Z** (Standard Software Customization)\n   - *Closing Date:* May 29, 2026 at 15:00\n   - *Authority:* ICT Division\n\n3. **e-GP ID #91032** (LAN and WiFi Networking for Secretariat)\n   - *Closing Date:* June 01, 2026 at 14:30\n   - *Authority:* Ministry of Posts & Telecommunications\n\nWhich of these would you like me to analyze for eligibility criteria?`;
    }

    if (lowerInput.includes('winning') || lowerInput.includes('criteria') || lowerInput.includes('bidding')) {
      return `Based on historical bidding analytics, here are the **top winning bidding criteria** that evaluators look for: 🏆\n\n1. **Technical Specifications Fit (75-80% of points):** Avoid generic models; always list exact compliance specifications matching Section 7 of the tender sheet.\n2. **Financial Average Turnover:** Ensure your audited balance sheet exactly shows the minimum annual turnover over the last 3-5 years.\n3. **Similar Supply Experience:** Provide completion certificates of similar scale. Letters of appreciation score extra points.\n\nLet me know if you want to verify a specific tender's eligibility checklist!`;
    }

    if (lowerInput.includes('ict') || lowerInput.includes('infrastructure')) {
      return `I found **2 high-value ICT Infrastructure tenders** in our search:\n\n- **Tender ID #92043 (Cloud Server Hosting & Migration):** Closes June 12. Average annual turnover requirement is BDT 8 Million.\n- **Tender ID #87920 (Supply & Implementation of Unified Communication System):** Closes June 18. Authority: Bangladesh Computer Council.\n\nWould you like me to fetch the detailed specifications sheets or eligibility requirements for either of these?`;
    }

    // Default conversational reply
    return `I am processing your tender inquiry: *"user: ${userInput}"*. 🚀\n\nI can help you extract bid criteria, verify technical compliance, or locate hard-to-find tenders. Attach photos or specifications documents using the **+** button to get started!`;
  };

  // Submit new message to chatbot
  const handleSendMessage = async (textToSend = inputText, attachedToSend = attachments) => {
    if (!textToSend.trim() && attachedToSend.length === 0) return;

    const userMsgId = `user-${Date.now()}`;
    const newUserMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      attachments: [...attachedToSend],
      timestamp: new Date(),
    };

    // Save previous messages array so we can build chat history
    let prevMessages: Message[] = [];
    setMessages(prev => {
      prevMessages = prev;
      return [...prev, newUserMessage];
    });

    setInputText('');
    setAttachments([]);
    setIsAiThinking(true);

    try {
      // Build clean chat history for context
      const chatHistory = prevMessages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          sender: m.sender,
          text: m.text
        }));

      // Call Express microservice
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: chatHistory
        })
      });

      if (!response.ok) {
        throw new Error('AI Assistant Service encountered an error.');
      }

      const data = await response.json();
      const aiMsgId = `ai-${Date.now()}`;

      const newAiMessage: Message = {
        id: aiMsgId,
        sender: 'ai',
        text: data.message,
        tenders: data.tenders || [],
        debug: data.debug || [],
        timestamp: new Date(),
        isStreaming: true,
      };

      setIsAiThinking(false);
      setMessages(prev => [...prev, newAiMessage]);
      setActiveStreamingId(aiMsgId);

    } catch (err: any) {
      console.error(err);
      setIsAiThinking(false);
      const aiMsgId = `ai-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ai',
          text: "I am sorry, I couldn't reach the AI Assistant service. Please verify the backend is running and try again.",
          timestamp: new Date(),
        }
      ]);
    }
  };

  // Trigger quick prompt chips
  const handleChipClick = (chipText: string) => {
    handleSendMessage(chipText, []);
  };

  return (
    <div 
      className={`fixed inset-y-0 right-0 z-40 h-full bg-white/95 dark:bg-neutral-950/95 backdrop-blur-2xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:relative md:z-10 md:bg-white/90 md:dark:bg-neutral-900/90 ${
        isOpen 
          ? 'w-full md:w-[380px] opacity-100 border-l border-[#E5E5E6] dark:border-white/10' 
          : 'w-0 opacity-0 overflow-hidden border-l-0 pointer-events-none'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* Hidden inputs for attachments */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange} 
        multiple 
      />

      {/* Panel Header */}
      <div className="h-16 px-6 border-b border-[#E5E5E6] dark:border-white/10 flex items-center justify-between bg-white/[0.1] dark:bg-black/[0.1] shrink-0">
        <div className="flex items-center gap-1.5">
          {/* Sparkling gradient AI stars icon - no borders */}
          <div className="flex h-9 w-9 items-center justify-center shrink-0">
            <svg className="h-5 w-5 text-[#5E6AD2] dark:text-[#717CFF]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 21l-.813-5.096L3 15l5.096-.813L9 9l.813 5.096L15 15l-5.187.904z" />
              <path d="M19.071 4.929l-.707 3.536-3.536.707 3.536.707.707 3.536.707-3.536 3.536-.707-3.536-.707-.707-3.536z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#08090A] dark:text-white flex items-center gap-1.5">
              AI Assistant
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            </h3>
            <p className="text-[10px] text-[#8A8F98] dark:text-neutral-500 font-medium">Your Smart Tender Expert</p>
          </div>
        </div>

        {/* Close Panel Button */}
        <button 
          type="button" 
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E5E6] bg-white text-[#62666D] transition-colors hover:bg-neutral-100 hover:text-[#08090A] dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white cursor-pointer"
          aria-label="Close assistant"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages scroll viewport */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar bg-neutral-50/50 dark:bg-[#08090A]/10"
      >
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          return (
            <div 
              key={msg.id}
              className={`flex flex-col max-w-[85%] animate-bubbleEnter ${
                isAi ? 'self-start' : 'self-end items-end'
              }`}
            >
              {/* Bubble */}
              <div 
                className={`rounded-2xl px-4 py-3 text-xs shadow-sm font-medium ${
                  isAi 
                    ? 'bg-neutral-100/90 dark:bg-white/[0.04] text-[#08090A] dark:text-neutral-100 rounded-tl-sm border border-neutral-200/40 dark:border-white/5' 
                    : 'bg-[#5E6AD2] dark:bg-[#717CFF] text-white rounded-tr-sm shadow-md'
                }`}
              >
                {/* Text / Code blocks content */}
                {renderMessageContent(msg)}

                {/* Attachment Context inside Bubbles */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/20 dark:border-white/10 flex flex-wrap gap-1.5">
                    {msg.attachments.map((file, fIdx) => (
                      <div 
                        key={fIdx} 
                        className="flex items-center gap-1 rounded bg-black/20 dark:bg-white/10 px-2 py-1 text-[9px] font-mono text-white"
                      >
                        <span>{file.type === 'photo' ? '🖼️' : '📄'}</span>
                        <span className="truncate max-w-[80px]">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Collapsible Debug Console */}
              {isAi && msg.debug && msg.debug.length > 0 && (
                <div className="mt-2 w-full max-w-sm">
                  <button
                    type="button"
                    onClick={() => toggleDebug(msg.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-200/50 hover:bg-neutral-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[9px] font-mono font-bold text-neutral-600 dark:text-neutral-400 hover:text-[#5E6AD2] dark:hover:text-[#717CFF] transition-all cursor-pointer select-none border border-neutral-300/40 dark:border-white/5"
                  >
                    <span>⚙️</span>
                    <span>{expandedDebugIds[msg.id] ? 'Hide Process Logs' : 'View Process Logs'}</span>
                    <span className="text-[8px] opacity-60">({msg.debug.length} steps)</span>
                  </button>

                  {expandedDebugIds[msg.id] && (
                    <div className="mt-1.5 p-3 rounded-xl bg-[#0c0a09] border border-neutral-800 font-mono text-[9px] text-neutral-300 leading-relaxed shadow-lg max-h-[220px] overflow-y-auto custom-scrollbar space-y-2.5 animate-fadeIn select-text">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                        <span className="text-emerald-500 font-bold uppercase tracking-wider text-[8px]">⚡ AI Search Diagnostics</span>
                        <span className="text-[7px] text-neutral-500">Live Trace</span>
                      </div>
                      {msg.debug.map((log: any, lIdx: number) => {
                        if (typeof log === 'string') {
                          return (
                            <div key={lIdx} className="text-amber-500 border-l border-amber-500/30 pl-1.5">
                              {log}
                            </div>
                          );
                        }
                        return (
                          <div key={lIdx} className="space-y-1 pl-1.5 border-l border-neutral-800">
                            <div className="flex items-center justify-between font-bold text-[#717CFF]">
                              <span>{log.step}</span>
                              <span className="text-[7px] text-neutral-600 font-normal">
                                {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                              </span>
                            </div>
                            {log.details && (
                              <pre className="text-[8px] text-neutral-400 bg-black/40 p-2 rounded-lg border border-neutral-900/60 overflow-x-auto whitespace-pre max-w-full">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tender Notice Cards inside AI messages */}
              {isAi && msg.tenders && msg.tenders.length > 0 && (
                <div className="mt-2.5 space-y-2.5 w-full animate-fadeIn max-w-sm">
                  {msg.tenders.map((tender, tIdx) => (
                    <div 
                      key={tIdx} 
                      className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 p-4 shadow-sm space-y-2 relative overflow-hidden group hover:border-[#5E6AD2] dark:hover:border-[#717CFF] transition-all duration-300 w-full"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-mono font-bold tracking-wider text-neutral-400 bg-neutral-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded">
                          {tender.id}
                        </span>
                        <span className="rounded bg-[#5E6AD2]/10 dark:bg-[#717CFF]/10 px-2 py-0.5 text-[8px] font-bold text-[#5E6AD2] dark:text-[#717CFF]">
                          {tender.category}
                        </span>
                      </div>
                      <h4 className="text-[11px] font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug">
                        {tender.title}
                      </h4>
                      <p className="text-[9px] text-neutral-500 dark:text-neutral-400 line-clamp-1">
                        🏢 {tender.organization} • 📍 {tender.district}
                      </p>
                      <div className="flex items-center justify-between text-[9px] pt-1.5 border-t border-neutral-100 dark:border-white/5 font-medium">
                        <span className="text-neutral-400">Budget: <strong className="text-neutral-800 dark:text-white">{tender.budget}</strong></span>
                        <span className="text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded text-[8px]">
                          📅 {tender.closingDate}
                        </span>
                      </div>
                      <div className="pt-1.5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate(`/tender-notices/${tender.id.toLowerCase().replace('t-', 'id-')}`)}
                          className="w-full text-center py-1.5 rounded bg-[#5E6AD2] hover:bg-[#4d59c2] dark:bg-[#717CFF] dark:hover:bg-[#5b66e6] text-[9px] font-bold text-white transition-all transform active:scale-[0.98] shadow-sm hover:shadow cursor-pointer"
                        >
                          View Details &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bubble Timestamp */}
              <span className="mt-1 text-[9px] text-neutral-400 dark:text-neutral-600 font-mono px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {/* AI Thinking/Typing State Bubble */}
        {isAiThinking && (
          <div className="flex flex-col max-w-[70%] self-start animate-bubbleEnter">
            <div className="rounded-2xl rounded-tl-sm px-[18px] py-3.5 bg-neutral-100 dark:bg-white/[0.04] text-neutral-400 dark:text-neutral-500 border border-neutral-200/40 dark:border-white/5 flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-typingPulse-1" />
                <div className="h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-typingPulse-2" />
                <div className="h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-typingPulse-3" />
              </div>
              <span className="text-[10px] italic font-medium">AI is analyzing tender specifications...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Chips and Chat Input Footer */}
      <div className="p-4 border-t border-[#E5E5E6] dark:border-white/10 bg-white/[0.2] dark:bg-black/[0.1] shrink-0">
        
        {/* Quick prompt chips (only shown when conversation is quiet) */}
        {messages.length <= 2 && !isAiThinking && !activeStreamingId && (
          <div className="flex flex-col gap-1.5 mb-3">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider pl-1.5">Quick Actions:</span>
            <div className="flex flex-wrap gap-1.5">
              {PROMPT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(chip.text)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E5E6] bg-white text-[11px] font-medium text-[#62666D] hover:border-[#5E6AD2] hover:text-[#5E6AD2] dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400 dark:hover:border-[#717CFF] dark:hover:text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <span>{chip.icon}</span>
                  <span>{chip.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded File/Photo Context tags preview (above text box) */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-3">
            {attachments.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-1.5 rounded-lg bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 dark:bg-[#717CFF]/10 dark:border-[#717CFF]/20 px-2.5 py-1 text-[10px] font-medium text-[#5E6AD2] dark:text-[#717CFF] animate-tagEnter"
              >
                <span>{item.type === 'photo' ? '🖼️' : '📄'}</span>
                <span className="truncate max-w-[120px] font-mono">{item.name}</span>
                {item.size && <span className="text-[8px] text-neutral-400 font-mono">({item.size})</span>}
                
                {/* Remove attachment */}
                <button 
                  onClick={() => handleRemoveAttachment(idx)}
                  className="ml-1 hover:text-red-500 transition-colors font-bold text-xs cursor-pointer"
                  title="Remove context"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Form Text input and action buttons */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex flex-col gap-2 rounded-xl border border-neutral-300 dark:border-white/10 bg-white dark:bg-[#18181b] p-2 focus-within:border-[#5E6AD2] dark:focus-within:border-[#717CFF] transition-all"
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask AI or attach photos/tender documents..."
            className="w-full resize-none bg-transparent px-2.5 py-1 text-xs text-[#08090A] dark:text-white outline-none placeholder-neutral-400 dark:placeholder-neutral-600 min-h-[44px] max-h-[100px] custom-scrollbar"
          />
          
          <div className="flex justify-between items-center border-t border-neutral-100 dark:border-neutral-800/60 pt-2 px-1">
            
            {/* Unified plus '+' upload options */}
            <div className="flex items-center">
              {/* Premium outline '+' button to upload files/photos */}
              <button
                type="button"
                onClick={handleAttachFile}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-[#5E6AD2] hover:text-[#5E6AD2] dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-[#717CFF] dark:hover:text-white transition-all cursor-pointer font-bold"
                title="Upload photo, screenshot, or document context (+)"
              >
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>

            {/* Premium Sleek Send Button (Large circle, relatively smaller right arrow) */}
            <button
              type="submit"
              disabled={!inputText.trim() && attachments.length === 0}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5E6AD2] text-white hover:bg-[#4d59c2] focus:outline-none disabled:opacity-35 dark:bg-[#717CFF] dark:hover:bg-[#5b66e6] transition-all transform active:scale-90 shadow-sm disabled:shadow-none cursor-pointer shrink-0"
            >
              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </form>

      </div>

    </div>
  );
}
