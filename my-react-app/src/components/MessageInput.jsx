import { useState, useRef, useCallback, useEffect } from "react"
import { useChatStore } from "../store/useChatStore"
import { getSocket } from "../lib/socket"
import { useAuthStore } from "../store/useAuthStore"

const MessageInput = () => {
  const [text, setText] = useState("")
  const [imagePreview, setImagePreview] = useState(null)
  const [isSending, setIsSending] = useState(false)

  // ✅ Voice message states
  const [isRecording, setIsRecording] = useState(false)
  const [voiceBlob, setVoiceBlob] = useState(null)
  const [voiceDuration, setVoiceDuration] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const recordingChunksRef = useRef([])
  const recordingTimerRef = useRef(null)

  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const isTypingRef = useRef(false)

  const { sendMessage, selectedUser, replyTo, clearReplyTo } = useChatStore()
  const { user } = useAuthStore()

  useEffect(() => {
    return () => {
      clearTimeout(recordingTimerRef.current)
      mediaRecorderRef.current?.stop()
    }
  }, [])

  const emitStopTyping = useCallback(() => {
    const socket = getSocket()
    if (socket && selectedUser && isTypingRef.current) {
      socket.emit("stopTyping", { senderId: user._id, receiverId: selectedUser._id })
      isTypingRef.current = false
    }
  }, [selectedUser, user])

  const handleTyping = useCallback(() => {
    const socket = getSocket()
    if (socket && selectedUser) {
      if (!isTypingRef.current) {
        socket.emit("typing", { senderId: user._id, receiverId: selectedUser._id })
        isTypingRef.current = true
      }
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => emitStopTyping(), 2000)
    }
  }, [selectedUser, user, emitStopTyping])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return }
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  // ✅ Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      recordingChunksRef.current = []
      let seconds = 0

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" })
        setVoiceBlob(blob)
        setVoiceDuration(seconds)
        stream.getTracks().forEach((t) => t.stop())
        clearInterval(recordingTimerRef.current)
        setRecordingTime(0)
      }

      mediaRecorder.start()
      setIsRecording(true)

      recordingTimerRef.current = setInterval(() => {
        seconds++
        setRecordingTime(seconds)
        if (seconds >= 120) stopRecording()
      }, 1000)
    } catch {
      alert("Microphone access denied")
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    clearInterval(recordingTimerRef.current)
  }

  const cancelRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    setVoiceBlob(null)
    setVoiceDuration(0)
    clearInterval(recordingTimerRef.current)
    setRecordingTime(0)
  }

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if ((!text.trim() && !imagePreview && !voiceBlob) || isSending) return
    emitStopTyping()
    clearTimeout(typingTimeoutRef.current)
    setIsSending(true)
    try {
      const payload = {
        message: text.trim(),
        image: imagePreview,
        replyTo: replyTo?._id || null,
      }

      // ✅ Voice: convert blob to base64
      if (voiceBlob) {
        const reader = new FileReader()
        const base64Voice = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(voiceBlob)
        })
        payload.voice = base64Voice
        payload.voiceDuration = voiceDuration
        payload.message = ""
      }

      await sendMessage(payload)
      setText("")
      setImagePreview(null)
      setVoiceBlob(null)
      setVoiceDuration(0)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const getReplyPreview = (msg) => {
    if (msg.voice) return "🎤 Voice message"
    if (msg.image) return "📷 Image"
    if (msg.file) return `📎 ${msg.fileName || "File"}`
    return msg.message?.substring(0, 60) || ""
  }

  return (
    <div className="bg-base-100 border-t border-base-300 px-4 py-3 flex-shrink-0">

      {/* ✅ Reply preview banner */}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 bg-base-200 rounded-xl px-3 py-2 border-l-4 border-primary">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary mb-0.5">
              Replying to {replyTo.sender?._id === user._id ? "yourself" : selectedUser?.fullName}
            </p>
            <p className="text-xs text-base-content/60 truncate">{getReplyPreview(replyTo)}</p>
          </div>
          <button
            onClick={clearReplyTo}
            className="w-5 h-5 rounded-full bg-base-300 hover:bg-base-content/20 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {imagePreview && (
        <div className="mb-2 relative w-fit">
          <img src={imagePreview} alt="preview" className="h-20 rounded-xl object-cover shadow-sm border border-base-300" />
          <button
            onClick={() => setImagePreview(null)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center shadow-md hover:bg-error/90 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ✅ Voice blob preview */}
      {voiceBlob && !isRecording && (
        <div className="mb-2 flex items-center gap-2 bg-base-200 rounded-xl px-3 py-2">
          <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
          </svg>
          <span className="text-xs text-base-content/70 font-medium">Voice {formatDuration(voiceDuration)}</span>
          <button onClick={cancelRecording} className="ml-auto text-xs text-error hover:text-error/80 transition-colors">
            Cancel
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {!isRecording && !voiceBlob && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 flex-shrink-0 rounded-xl hover:bg-base-200 flex items-center justify-center transition-colors text-base-content/50 hover:text-base-content"
              title="Attach image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          </>
        )}

        {isRecording ? (
          <div className="flex-1 flex items-center gap-2 bg-error/10 border border-error/30 rounded-xl px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
            <span className="text-sm text-error font-medium">Recording {formatDuration(recordingTime)}</span>
          </div>
        ) : voiceBlob ? (
          <div className="flex-1" />
        ) : (
          <div className="flex-1 relative">
            <textarea
              className="w-full px-4 py-2.5 rounded-xl border border-base-300 bg-base-200 text-base-content text-sm placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none max-h-32 leading-relaxed"
              placeholder="Type a message... (Enter to send)"
              value={text}
              onChange={(e) => { setText(e.target.value); handleTyping() }}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ height: "auto", minHeight: "42px" }}
              onInput={(e) => {
                e.target.style.height = "auto"
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px"
              }}
            />
          </div>
        )}

        {/* ✅ Voice button — hold to record */}
        {!imagePreview && !voiceBlob && (
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center transition-all ${
              isRecording
                ? "bg-error text-white shadow-lg shadow-error/30"
                : "hover:bg-base-200 text-base-content/50 hover:text-base-content"
            }`}
            title={isRecording ? "Release to send" : "Hold to record voice"}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
            </svg>
          </button>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSending || (!text.trim() && !imagePreview && !voiceBlob)}
          className="w-9 h-9 flex-shrink-0 rounded-xl bg-primary text-primary-content flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/20"
          title="Send"
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-primary-content/30 border-t-primary-content rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default MessageInput
