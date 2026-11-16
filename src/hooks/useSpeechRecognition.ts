import { useState, useRef, useEffect, useCallback } from 'react';

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: BrowserSpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: BrowserSpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: BrowserSpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: BrowserSpeechRecognition, ev: Event) => void) | null;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function supportsMediaRecorderFallback(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return Boolean(
    navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
  );
}

function pickAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Falha ao ler áudio'));
    reader.readAsDataURL(blob);
  });
}

function mapSpeechError(errorCode: string): string {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Permissão do microfone bloqueada. Libere o microfone no navegador ou digite seu CEP.';
    case 'no-speech':
      return 'Não ouvimos sua voz. Toque no microfone e fale novamente perto do aparelho.';
    case 'audio-capture':
      return 'Nenhum microfone encontrado neste aparelho. Digite seu CEP ou cidade acima.';
    case 'network':
      return 'Sem conexão para reconhecer a voz. Tente digitar seu CEP ou cidade.';
    case 'aborted':
      return '';
    default:
      return 'Não foi possível usar o microfone agora. Digite seu CEP ou cidade.';
  }
}

interface UseSpeechRecognitionOptions {
  lang?: string;
  onFinalTranscript?: (transcript: string) => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { lang = 'pt-BR', onFinalTranscript } = options;

  const [isSupported] = useState<boolean>(
    () => getSpeechRecognitionConstructor() !== null || supportsMediaRecorderFallback()
  );
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [speechMode, setSpeechMode] = useState<'native' | 'recorder'>('native');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const autoStopTimerRef = useRef<number | null>(null);
  const nativeFailedFallbackRef = useRef(false);
  const onFinalRef = useRef(onFinalTranscript);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const cleanupMediaStream = useCallback(() => {
    if (autoStopTimerRef.current !== null) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore if already stopped
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const clearSpeechError = useCallback(() => {
    setSpeechError(null);
  }, []);

  const startMediaRecorder = useCallback(async () => {
    if (!supportsMediaRecorderFallback()) {
      setSpeechError('Microfone indisponível neste navegador. Digite seu CEP ou cidade acima.');
      return;
    }

    setSpeechError(null);
    setInterimTranscript('');
    setSpeechMode('recorder');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = pickAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstart = () => {
        setIsListening(true);
        // Auto-stop after 10 seconds to keep audio short and fast
        autoStopTimerRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, 10000);
      };

      recorder.onerror = () => {
        cleanupMediaStream();
        setIsListening(false);
        setIsProcessingVoice(false);
        setSpeechError('Não foi possível gravar áudio agora. Digite seu CEP ou cidade.');
      };

      recorder.onstop = async () => {
        cleanupMediaStream();
        setIsListening(false);

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;

        if (!chunks.length) {
          setSpeechError('Nenhum áudio capturado. Tente falar mais perto do microfone.');
          return;
        }

        const recordedType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: recordedType });

        if (blob.size < 400) {
          setSpeechError('Áudio muito curto. Toque no microfone e fale seu CEP ou cidade.');
          return;
        }

        setIsProcessingVoice(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64,
              mimeType: recordedType,
            }),
          });

          const data = (await response.json().catch(() => ({}))) as {
            transcript?: string;
            error?: string;
          };

          if (!response.ok || !data.transcript) {
            setSpeechError(
              data.error || 'Não foi possível transcrever a voz. Digite seu CEP ou cidade.'
            );
            return;
          }

          onFinalRef.current?.(data.transcript.trim());
        } catch {
          setSpeechError('Sem conexão para transcrever o áudio. Digite seu CEP ou cidade.');
        } finally {
          setIsProcessingVoice(false);
        }
      };

      recorder.start();
    } catch (err: unknown) {
      cleanupMediaStream();
      setIsListening(false);
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setSpeechError('Permissão do microfone bloqueada. Libere o microfone ou digite seu CEP.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setSpeechError('Nenhum microfone encontrado neste aparelho. Digite seu CEP ou cidade.');
      } else {
        setSpeechError('Não foi possível acessar o microfone. Digite seu CEP ou cidade.');
      }
    }
  }, [cleanupMediaStream]);

  const startListening = useCallback(() => {
    const RecognitionCtor = getSpeechRecognitionConstructor();

    // If native Web Speech API isn't supported (Firefox, Safari, iOS Chrome, etc.)
    // or failed previously in this environment, use MediaRecorder + /api/transcribe
    if (!RecognitionCtor || nativeFailedFallbackRef.current) {
      void startMediaRecorder();
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    setSpeechError(null);
    setInterimTranscript('');
    setSpeechMode('native');

    const recognition = new RecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += `${piece} `;
        } else {
          interim += piece;
        }
      }

      if (interim.trim()) {
        setInterimTranscript(interim.trim());
      }

      const cleanedFinal = finalText.trim();
      if (cleanedFinal) {
        setInterimTranscript('');
        onFinalRef.current?.(cleanedFinal);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      setInterimTranscript('');

      // If browser exposes webkitSpeechRecognition stub but blocks its cloud service
      // (common in Safari/Brave/embedded webviews), seamlessly fall back to MediaRecorder!
      if (
        (event.error === 'service-not-allowed' || event.error === 'language-not-supported') &&
        supportsMediaRecorderFallback()
      ) {
        nativeFailedFallbackRef.current = true;
        recognitionRef.current = null;
        void startMediaRecorder();
        return;
      }

      const msg = mapSpeechError(event.error);
      if (msg) {
        setSpeechError(msg);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
      if (supportsMediaRecorderFallback()) {
        nativeFailedFallbackRef.current = true;
        void startMediaRecorder();
      } else {
        setSpeechError('Não foi possível iniciar o microfone. Digite seu CEP ou cidade.');
      }
    }
  }, [lang, startMediaRecorder]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      cleanupMediaStream();
    };
  }, [cleanupMediaStream]);

  return {
    isSupported,
    isListening,
    isProcessingVoice,
    speechMode,
    interimTranscript,
    speechError,
    startListening,
    stopListening,
    clearSpeechError,
  };
}
