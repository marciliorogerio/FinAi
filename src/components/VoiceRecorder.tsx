import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, RotateCcw, Sparkles, Volume2, AlertCircle, CheckCircle, Edit3 } from 'lucide-react';

interface VoiceRecorderProps {
  onProcessAudio: (audioBase64: string, mimeType: string, spokenTextHint?: string) => Promise<void>;
  isProcessing: boolean;
  onSwitchToManual?: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onProcessAudio,
  isProcessing,
  onSwitchToManual,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setErrorMsg(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setLiveTranscript('');
    audioChunksRef.current = [];

    // 1. Start browser speech recognition if supported (zero tokens, live transcript)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          if (current.trim()) {
            setLiveTranscript(current.trim());
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('SpeechRecognition error (will still record audio):', e);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition init failed:', err);
      }
    }

    // 2. Check getUserMedia support and start MediaRecorder
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setErrorMsg('Seu navegador atual não suporta gravação direta de áudio. Você pode preencher na aba Manual.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 24000,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission notice:', err?.name || err?.message || err);
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.includes('not allowed') ||
        err?.message?.includes('denied');

      if (isDenied) {
        setErrorMsg(
          'Permissão de microfone negada. Toque no ícone de cadeado na barra de endereço para liberar o microfone ou use a aba Manual.'
        );
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setErrorMsg('Nenhum microfone foi detectado neste dispositivo.');
      } else {
        setErrorMsg('Não foi possível ativar o microfone no momento. Você pode usar a aba Manual para lançar.');
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setLiveTranscript('');
    setRecordingSeconds(0);
    setIsRecording(false);
    setErrorMsg(null);
  };

  const handleSendToAI = async () => {
    // If we have live transcript, we can prioritize sending it to avoid token issues completely!
    if (liveTranscript.trim()) {
      if (audioBlob) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await onProcessAudio(base64Data, audioBlob.type || 'audio/webm', liveTranscript.trim());
        };
        reader.readAsDataURL(audioBlob);
      } else {
        await onProcessAudio('', '', liveTranscript.trim());
      }
      return;
    }

    if (!audioBlob) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      await onProcessAudio(base64Data, audioBlob.type || 'audio/webm');
    };
    reader.readAsDataURL(audioBlob);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const examplePhrases = [
    'Gastei 45 reais no almoço de hoje no PIX',
    'Abasteci 120 reais de gasolina no cartão de crédito',
    'Recebi 2.500 de salário mensal',
    'Farmácia 68 reais no débito',
  ];

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-neutral-900 text-base flex items-center gap-2">
            <Mic className="w-5 h-5 text-emerald-600" />
            Gravar Lançamento por Voz
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Fale naturalmente sobre seu gasto ou ganho que a IA transcreve, calcula e categoriza.
          </p>
        </div>
        {isRecording && (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold animate-pulse border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            Gravando {formatTime(recordingSeconds)}
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
          {onSwitchToManual && (
            <button
              type="button"
              onClick={onSwitchToManual}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 self-start sm:self-auto cursor-pointer transition-colors"
            >
              Usar Modo Manual
            </button>
          )}
        </div>
      )}

      {/* Main Recording Center */}
      <div className="flex flex-col items-center justify-center py-6 px-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
        {!audioBlob ? (
          <div className="flex flex-col items-center text-center w-full max-w-md">
            {isRecording ? (
              <div className="flex flex-col items-center w-full">
                {/* Visualizer wave simulation */}
                <div className="flex items-center justify-center gap-1.5 h-14 mb-4">
                  {[40, 75, 55, 90, 60, 100, 70, 85, 45, 95, 65, 80].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-emerald-500 rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDuration: `${0.4 + (i % 4) * 0.2}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Live transcription box */}
                {liveTranscript && (
                  <div className="w-full mb-4 p-3 rounded-xl bg-white border border-emerald-200 text-xs text-neutral-800 shadow-2xs text-left animate-in fade-in duration-150">
                    <span className="font-semibold text-emerald-700 block text-[11px] mb-1">
                      Ouvindo em tempo real:
                    </span>
                    <p className="italic font-medium">"{liveTranscript}"</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Parar Gravação ({formatTime(recordingSeconds)})</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isProcessing}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 touch-manipulation"
                  title="Toque para começar a falar"
                >
                  <Mic className="w-10 h-10 sm:w-12 sm:h-12" />
                </button>
                <p className="mt-3.5 text-sm sm:text-base font-bold text-neutral-800">
                  Toque no microfone para falar
                </p>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm text-center">
                  Diga o valor, onde gastou, como pagou ou se foi uma receita recebida.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Recorded Audio Preview & Transcript verification */
          <div className="w-full max-w-md flex flex-col items-center">
            {/* Audio Player */}
            <div className="w-full bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs mb-3">
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-2 font-medium">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <Volume2 className="w-3.5 h-3.5" /> Áudio Gravado
                </span>
                <span>{formatTime(recordingSeconds)}</span>
              </div>
              <audio src={audioUrl || ''} controls className="w-full h-10" />
            </div>

            {/* Editable Transcript Preview */}
            <div className="w-full bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs mb-4">
              <div className="flex items-center justify-between text-xs text-neutral-600 font-semibold mb-1.5">
                <span className="flex items-center gap-1 text-emerald-800">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Texto Identificado da Fala:
                </span>
                <span className="text-[11px] text-neutral-400 font-normal">
                  Pode editar
                </span>
              </div>
              <input
                type="text"
                value={liveTranscript}
                onChange={(e) => setLiveTranscript(e.target.value)}
                placeholder="Ex: Almoço 35 reais no débito"
                className="w-full px-3 py-2 text-base sm:text-xs text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[44px]"
              />
              {!liveTranscript && (
                <div className="mt-2 pt-2 border-t border-neutral-100 flex flex-wrap gap-1">
                  <span className="text-[10px] text-neutral-400 block w-full">Ou escolha um exemplo rápido:</span>
                  {examplePhrases.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLiveTranscript(p)}
                      className="text-[10px] px-2 py-1 rounded bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-700 text-neutral-600 cursor-pointer text-left touch-manipulation"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full">
              <button
                type="button"
                onClick={resetRecording}
                disabled={isProcessing}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[48px] touch-manipulation"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Gravar Novamente</span>
              </button>

              <button
                type="button"
                onClick={handleSendToAI}
                disabled={isProcessing}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 min-h-[48px] touch-manipulation"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processando com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Processar com IA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Spoken Examples */}
      <div className="mt-4 pt-4 border-t border-neutral-100">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
          Exemplos do que você pode falar:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {examplePhrases.map((phrase, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onProcessAudio('', '', phrase)}
              disabled={isProcessing || isRecording}
              className="text-xs px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-neutral-200/60 text-neutral-600 transition-colors cursor-pointer text-left"
            >
              "{phrase}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
