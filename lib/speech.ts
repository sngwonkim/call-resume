'use client'

export interface SpeechHandlers {
  onTranscript: (text: string, isFinal: boolean) => void
  onSilence: () => void
  onError: (error: string) => void
}

export function createSpeechRecognition(handlers: SpeechHandlers) {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  if (!SpeechRecognition) {
    handlers.onError('이 브라우저는 음성 인식을 지원하지 않아요. Chrome을 사용해주세요.')
    return null
  }

  const recognition = new SpeechRecognition()
  recognition.lang = 'ko-KR'
  recognition.continuous = true
  recognition.interimResults = true

  let silenceTimer: ReturnType<typeof setTimeout> | null = null
  const SILENCE_THRESHOLD_MS = 5000

  const resetSilenceTimer = () => {
    if (silenceTimer) clearTimeout(silenceTimer)
    silenceTimer = setTimeout(() => {
      handlers.onSilence()
    }, SILENCE_THRESHOLD_MS)
  }

  recognition.onresult = (event: any) => {
    resetSilenceTimer()
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      handlers.onTranscript(result[0].transcript, result.isFinal)
    }
  }

  recognition.onerror = (event: any) => {
    if (event.error !== 'no-speech') {
      handlers.onError(`음성 인식 오류: ${event.error}`)
    }
  }

  recognition.onend = () => {
    if (silenceTimer) clearTimeout(silenceTimer)
  }

  return {
    start: () => {
      recognition.start()
      resetSilenceTimer()
    },
    stop: () => {
      if (silenceTimer) clearTimeout(silenceTimer)
      recognition.stop()
    },
  }
}
