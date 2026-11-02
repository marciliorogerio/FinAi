import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User as UserIcon,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  HelpCircle,
  Mic,
  Square,
  AlertCircle,
  Database,
} from 'lucide-react';
import { FinancialSummary, SpreadsheetInfo } from '../types/finance.ts';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface ChatAdvisorViewProps {
  summary: FinancialSummary;
  spreadsheet?: SpreadsheetInfo | null;
}

export const ChatAdvisorView: React.FC<ChatAdvisorViewProps> = ({
  summary,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Olá! Eu sou o **FinAI**, seu assistente financeiro pessoal.

Estou aqui para te ajudar a entender para onde seu dinheiro está indo, encontrar oportunidades de economia e manter suas finanças em dia.

Aqui estão algumas perguntas que você pode me fazer:
- Quanto gastei com alimentação este mês?
- Qual foi o meu maior gasto recente?
- Como está o meu saldo e quanto me restou?
- Dicas práticas para economizar dinheiro
- Tenho alguma conta vencendo nos próximos dias?

Você também pode tocar nas sugestões rápidas abaixo ou me enviar um áudio pelo microfone!`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const quickQuestions = [
    'Quanto gastei em alimentação?',
    'Qual foi meu maior gasto?',
    'Como está meu saldo geral?',
    'Faça uma análise dos meus gastos',
    'Dicas para sobrar mais dinheiro',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare history: exclude welcome message and error messages to ensure valid user-model dialogue
      const history = messages
        .filter((m) => m.id !== 'welcome' && !m.id.startsWith('err-'))
        .slice(-6)
        .map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          financialContext: {
            spreadsheetName: 'Supabase PostgreSQL',
            totalBalance: summary.totalBalance,
            totalExpenses: summary.totalExpenses,
            totalRevenues: summary.totalRevenues,
            categoryTotals: summary.expenseCategoryTotals,
            recentTransactions: summary.recentTransactions.slice(0, 25).map((t) => ({
              date: t.date,
              description: t.description,
              amount: t.amount,
              type: t.type,
              category: t.category,
              paymentMethod: t.paymentMethod,
            })),
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao obter resposta do assistente.');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: data.reply || 'Entendido!',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: 'Desculpe, ocorreu uma instabilidade ao consultar os dados. Por favor, tente novamente.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const recognitionRef = useRef<any>(null);
  const liveSpokenTextRef = useRef<string>('');

  // Voice asking directly to chat
  const startVoiceQuestion = async () => {
    liveSpokenTextRef.current = '';

    // 1. Web Speech API for instant recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          if (text.trim()) {
            liveSpokenTextRef.current = text.trim();
            setInputMessage(text.trim());
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition not available in chat:', err);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // If live spoken text was already captured, send immediately!
        if (liveSpokenTextRef.current) {
          await handleSendMessage(liveSpokenTextRef.current);
          return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          setIsLoading(true);
          try {
            const parseRes = await fetch('/api/gemini/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Data,
                audioMimeType: 'audio/webm',
              }),
            });
            const data = await parseRes.json();
            if (data.text) {
              await handleSendMessage(data.text);
            }
          } catch (e) {
            console.error('Failed to transcribe voice question:', e);
          } finally {
            setIsLoading(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
    } catch (err) {
      console.error('Mic error:', err);
    }
  };

  const stopVoiceQuestion = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    }
  };

  // Format markdown helper (bold, line breaks, bullet points)
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().replace(/^[-*]\s+/, '') : line;

      // Bold and italic formatting
      const parts = cleanLine.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      const renderedContent = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-neutral-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={pIdx} className="italic text-neutral-800">
              {part.slice(1, -1)}
            </em>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs sm:text-sm text-neutral-800 my-1 leading-relaxed">
            {renderedContent}
          </li>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-xs sm:text-sm text-neutral-800 leading-relaxed">
          {renderedContent}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-136px)] md:h-[calc(100vh-140px)] min-h-0 bg-white rounded-2xl sm:rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-neutral-200 bg-neutral-50/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs shrink-0">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-neutral-900 truncate">FinAI • Consultor</h3>
              <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-500 truncate flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Seu assistente financeiro inteligente</span>
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500 bg-white px-3 py-1.5 rounded-xl border border-neutral-200/80 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>{summary.recentTransactions.length} lançamentos analisados</span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-neutral-50/30">
        {messages.map((msg) => {
          const isBot = msg.role === 'model';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 sm:gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
            >
              {isBot && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-2xl rounded-2xl p-3 sm:p-4 shadow-2xs ${
                  isBot
                    ? 'bg-white text-neutral-900 border border-neutral-200/80'
                    : 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                }`}
              >
                {isBot ? (
                  <div className="space-y-1 text-xs sm:text-sm">{renderFormattedText(msg.text)}</div>
                ) : (
                  <p className="text-xs sm:text-sm leading-relaxed">{msg.text}</p>
                )}
                <span
                  className={`text-[9px] sm:text-[10px] mt-1.5 block font-medium ${
                    isBot ? 'text-neutral-400' : 'text-emerald-100'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>

              {!isBot && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neutral-800 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2 sm:gap-3 justify-start">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-neutral-200/80 shadow-2xs flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
              <div
                className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
              <div
                className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                style={{ animationDelay: '0.4s' }}
              />
              <span className="text-xs text-neutral-500 font-medium ml-1">
                Analisando suas finanças...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips (Horizontal Scroll on Mobile) */}
      <div className="px-3 sm:px-6 py-2 bg-white border-t border-neutral-100 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 shrink-0 uppercase tracking-wider">
          Sugestões:
        </span>
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(q)}
            disabled={isLoading}
            className="text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-full bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-neutral-200/60 text-neutral-700 transition-colors shrink-0 cursor-pointer disabled:opacity-50 min-h-[32px] flex items-center whitespace-nowrap touch-manipulation"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Bar (Thumb-Zone & Zero-Zoom on iOS) */}
      <div className="p-2.5 sm:p-4 bg-white border-t border-neutral-200 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-1.5 sm:gap-2"
        >
          {/* Voice Input Button in Chat */}
          {isRecordingVoice ? (
            <button
              type="button"
              onClick={stopVoiceQuestion}
              className="p-2.5 sm:p-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white animate-pulse transition-all cursor-pointer shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              title="Parar e enviar pergunta por voz"
            >
              <Square className="w-5 h-5 fill-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startVoiceQuestion}
              disabled={isLoading}
              className="p-2.5 sm:p-3 rounded-2xl bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-600 text-neutral-600 border border-neutral-200 transition-all cursor-pointer disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              title="Fazer pergunta por áudio"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Pergunte sobre seus gastos, receitas ou saldo..."
            disabled={isLoading}
            className="flex-1 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-base sm:text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all min-h-[44px]"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="p-2.5 sm:p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
            title="Enviar mensagem"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
