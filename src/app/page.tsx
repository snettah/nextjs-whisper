'use client'
import Transcription from '@/components/Transcriptions'
import { useCallback, useEffect, useRef, useState } from 'react'

function useMic(): [
  Function,
  Function,
  (callback: (ev: BlobEvent) => void) => void,
  Function,
  MediaStream | undefined,
  MediaRecorder | undefined
] {
  const [stream, setStream] = useState<MediaStream>()
  const recorder = useRef<MediaRecorder>()

  async function startMicrophone() {
    try {
      const streamData = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
      setStream(streamData)
      recorder.current = new MediaRecorder(streamData, { mimeType: 'audio/webm' })
    } catch (err) {
      alert(err)
    }
  }

  function stopMicrophone() {
    stream?.getTracks().forEach((track) => track.stop())
  }

  const startRecording = (callback: (ev: BlobEvent) => void) => {
    if (!recorder.current) return
    recorder.current.ondataavailable = callback
    recorder.current.start()
  }

  function stopRecording() {
    if (!recorder.current) return
    recorder.current?.stop()
  }

  useEffect(() => {
    startMicrophone()
  }, [])

  return [startMicrophone, stopMicrophone, startRecording, stopRecording, stream, recorder.current]
}

/**
 *
 * @returns
 */

const POST_DATA = true
export default function Home() {
  const [result, setResult] = useState<Transcriptions>([])
  const [, , startRecording, stopRecording, stream, recorder] = useMic()
  // const prompt = useRef('')
  const requestAnimationId = useRef<number>()

  const sendChunks = useCallback(async (chunks: Blob) => {
    if (POST_DATA) {
      const formData = new FormData()
      const timestamp = Date.now().toString()

      formData.append('audio', chunks)
      // formData.append('prompt', prompt.current || '')
      formData.append('timestamp', timestamp)

      const res = await fetch('/api/transcription', {
        method: 'POST',
        body: formData,
      }).then((r) => r.json())

      setResult((text) => {
        const nextResult = [...text]
        nextResult.push({ timestamp: res.timestamp, text: res.result })
        // prompt.current = prompt.current + ' ' + res.result
        return nextResult
      })
    } else {
      console.log('POST DATA')
    }
  }, [])

  /**
   * https://stackoverflow.com/questions/46543341/how-can-i-extract-the-preceding-audio-from-microphone-as-a-buffer-when-silence
   */
  const toggleStreamOnSilence = useCallback(() => {
    if (!stream) return
    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaStreamSource(stream as MediaStream)
    const analyser = audioCtx.createAnalyser()

    // https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/minDecibels
    analyser.minDecibels = -60
    // analyser.maxDecibels = -10
    // analyser.smoothingTimeConstant = 0.9

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    source.connect(analyser)

    let silenceStart = performance.now()
    let triggered = false
    const toggle: FrameRequestCallback = (time) => {
      requestAnimationId.current = requestAnimationFrame(toggle)
      analyser.getByteFrequencyData(dataArray)

      // if there is data above the given db limit
      if (dataArray.some((v) => v)) {
        if (!triggered) {
          if (recorder?.state === 'inactive') recorder?.start()
          triggered = true
        }
        silenceStart = time
      }
      if (triggered && time - silenceStart > 100) {
        if (recorder?.state === 'recording') recorder?.stop()
        triggered = false
      }
    }

    //@ts-expect-error
    toggle()
  }, [recorder, stream])

  useEffect(() => {
    return () => {
      if (requestAnimationId.current) cancelAnimationFrame(requestAnimationId.current)
    }
  }, [])

  const handleStart = useCallback(() => {
    startRecording((data: BlobEvent) => {
      sendChunks(data.data)
    })
    toggleStreamOnSilence()
  }, [sendChunks, startRecording, toggleStreamOnSilence])

  const handleStop = () => {
    stopRecording()
    if (requestAnimationId.current) cancelAnimationFrame(requestAnimationId.current)
  }

  return (
    <main>
      <button onClick={handleStart}>start record</button>
      <button onClick={handleStop}>stop record</button>
      <Transcription transcriptions={result}></Transcription>
    </main>
  )
}
