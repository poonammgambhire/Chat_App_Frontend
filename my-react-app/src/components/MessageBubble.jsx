import { useState, useRef, useEffect } from "react"
import { useAuthStore } from "../store/useAuthStore"
import { useChatStore } from "../store/useChatStore"
import axiosInstance from "../lib/axios"

const EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🔥"]

// ✅ Voice player component
const VoicePlayer = ({ src, duration, isMine }) => {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause() } else { audioRef.current.play() }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const pct = (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100
    setProgress(pct)
    setCurrentTime(Math.floor(audioRef.current.currentTime))
  }

  const handleEnded = () => { setIsPlaying(false); setProgress(0); setCurrentTime(0) }

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex items-center gap-2 mt-1 min-w-[160px]">
      <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} />
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isMine ? "bg-white/20 hover:bg-white/30" : "bg-primary/10 hover:bg-primary/20 text-primary"
        }`}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        )}
      </button>
      <div className="flex-1 flex flex-col gap-0.5">
        <div className={`h-1 rounded-full ${isMine ? "bg-white/20" : "bg-base-300"}`}>
          <div className={`h-1 rounded-full transition-all ${isMine ? "bg-white/80" : "bg-primary"}`} style={{ width: `${progress}%` }} />
        </div>
        <span className={`text-xs ${isMine ? "text-white/60" : "text-base-content/40"}`}>
          {formatTime(currentTime)} / {formatTime(duration || 0)}
        </span>
      </div>
    </div>
  )
}

const MessageBubble = ({ message }) => {
  const { user } = useAuthStore()
  const { deleteMessage, editMessage, pinMessage, forwardMessage, users, setReplyTo } = useChatStore()
  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(message.message || "")
  const [lightboxOpen, setLightboxOpen] = useState(false)  // ✅ Image fullscreen
  const editInputRef = useRef(null)

  const isMine = (message.sender?._id || message.sender)?.toString() === user._id?.toString()

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.setSelectionRange(editText.length, editText.length)
    }
  }, [isEditing])

  // ✅ Close lightbox on Escape
  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e) => { if (e.key === "Escape") setLightboxOpen(false) }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lightboxOpen])

  const handleReact = async (emoji) => {
    try {
      const res = await axiosInstance.post(`/api/messages/react/${message._id}`, { emoji })
      const { messages: msgs } = useChatStore.getState()
      useChatStore.setState({
        messages: msgs.map((m) => m._id === message._id ? { ...m, reactions: res.data.reactions } : m),
      })
    } catch { /* ignore */ }
    setShowEmojiPicker(false)
    setShowActions(false)
  }

  const handleForward = async (receiverId) => {
    await forwardMessage(message._id, receiverId)
    setShowForwardModal(false)
    setShowActions(false)
  }

  const handleEditSubmit = async () => {
    if (!editText.trim() || editText.trim() === message.message) { setIsEditing(false); return }
    await editMessage(message._id, editText.trim())
    setIsEditing(false)
  }

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSubmit() }
    if (e.key === "Escape") { setIsEditing(false); setEditText(message.message || "") }
  }

  const reactionGroups = {}
  if (Array.isArray(message.reactions)) {
    message.reactions.forEach((r) => {
      if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = 0
      reactionGroups[r.emoji]++
    })
  }

  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : ""

  // ✅ Reply preview snippet
  const getReplySnippet = (replyMsg) => {
    if (!replyMsg) return null
    if (replyMsg.voice) return "🎤 Voice message"
    if (replyMsg.image) return "📷 Image"
    return replyMsg.message?.substring(0, 50) || "Message"
  }

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} group mb-1`}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false) }}
    >
      <div className={`relative max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>

        {message.isPinned && (
          <p className={`text-xs text-warning/70 mb-0.5 flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
            Pinned
          </p>
        )}

        {message.isForwarded && (
          <p className={`text-xs text-base-content/40 mb-0.5 flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
            Forwarded
          </p>
        )}

        <div className="relative">
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed cursor-default ${
              isMine
                ? "bg-primary text-primary-content rounded-br-sm"
                : "bg-base-100 text-base-content border border-base-300 rounded-bl-sm shadow-sm"
            }`}
            onMouseEnter={() => setShowActions(true)}
          >

            {/* ✅ Reply quote preview */}
            {message.replyTo && (
              <div className={`mb-2 px-3 py-1.5 rounded-xl border-l-4 ${
                isMine ? "bg-white/10 border-white/40" : "bg-base-200 border-primary/50"
              }`}>
                <p className={`text-xs truncate ${isMine ? "text-white/60" : "text-base-content/50"}`}>
                  {getReplySnippet(message.replyTo)}
                </p>
              </div>
            )}

            {isEditing ? (
              <div className="flex flex-col gap-1.5">
                <textarea
                  ref={editInputRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="bg-transparent border border-white/30 rounded-lg px-2 py-1 text-sm resize-none min-w-[160px] focus:outline-none focus:border-white/60"
                  rows={2}
                />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => { setIsEditing(false); setEditText(message.message || "") }} className="text-xs px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors">Cancel</button>
                  <button onClick={handleEditSubmit} className="text-xs px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 transition-colors font-semibold">Save</button>
                </div>
              </div>
            ) : (
              <>
                {message.message && <p className="whitespace-pre-wrap break-words">{message.message}</p>}

                {/* ✅ Image with fullscreen lightbox */}
                {message.image && (
                  <img
                    src={message.image}
                    alt="img"
                    className="max-w-xs rounded-xl mt-1 cursor-zoom-in hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxOpen(true)}
                  />
                )}

                {/* ✅ Voice message player */}
                {message.voice && (
                  <VoicePlayer src={message.voice} duration={message.voiceDuration} isMine={isMine} />
                )}

                {message.file && (
                  <a href={message.file} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center gap-2 mt-1 text-xs font-medium underline ${isMine ? "text-primary-content/80" : "text-primary"}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {message.fileName || "Download file"}
                  </a>
                )}

                {message.isEdited && (
                  <span className={`text-xs italic opacity-50 mt-0.5 block ${isMine ? "text-right" : "text-left"}`}>edited</span>
                )}

                {isMine && (
                  <span className={`text-xs mt-0.5 flex justify-end ${message.isRead ? "text-primary-content/80" : "text-primary-content/40"}`}>
                    {message.isRead ? "✓✓" : "✓"}
                  </span>
                )}
              </>
            )}
          </div>

          {showActions && !isEditing && (
            <div className={`absolute top-0 ${isMine ? "right-full mr-2" : "left-full ml-2"} flex items-center gap-1`}>
              <button onClick={() => setShowEmojiPicker((s) => !s)} className="w-7 h-7 rounded-lg bg-base-100 border border-base-300 shadow-sm flex items-center justify-center hover:bg-base-200 transition-colors text-base-content/60" title="React">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>

              {/* ✅ Reply button */}
              <button onClick={() => { setReplyTo(message); setShowActions(false) }} className="w-7 h-7 rounded-lg bg-base-100 border border-base-300 shadow-sm flex items-center justify-center hover:bg-base-200 transition-colors text-base-content/60" title="Reply">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              </button>

              <button onClick={() => { setShowForwardModal(true); setShowActions(false) }} className="w-7 h-7 rounded-lg bg-base-100 border border-base-300 shadow-sm flex items-center justify-center hover:bg-base-200 transition-colors text-base-content/60" title="Forward">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
              </button>

              <button onClick={() => { pinMessage(message._id); setShowActions(false) }} className={`w-7 h-7 rounded-lg bg-base-100 border border-base-300 shadow-sm flex items-center justify-center hover:bg-base-200 transition-colors ${message.isPinned ? "text-warning" : "text-base-content/60"}`} title={message.isPinned ? "Unpin" : "Pin"}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
              </button>

              {isMine && message.message && (
                <button onClick={() => { setIsEditing(true); setShowActions(false) }} className="w-7 h-7 rounded-lg bg-base-100 border border-base-300 shadow-sm flex items-center justify-center hover:bg-base-200 transition-colors text-base-content/60" title="Edit">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              )}

              {isMine && (
                <button onClick={() => { deleteMessage(message._id); setShowActions(false) }} className="w-7 h-7 rounded-lg bg-base-100 border border-base-300 shadow-sm flex items-center justify-center hover:bg-error/10 hover:text-error hover:border-error/30 transition-colors text-base-content/60" title="Delete">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>
          )}

          {showEmojiPicker && (
            <div className={`absolute top-0 ${isMine ? "right-full mr-10" : "left-full ml-10"} z-10 bg-base-100 border border-base-300 rounded-2xl shadow-xl p-2 flex gap-1`}>
              {EMOJIS.map((emoji) => (
                <button key={emoji} onClick={() => handleReact(emoji)} className="w-8 h-8 rounded-xl hover:bg-base-200 flex items-center justify-center text-lg transition-all hover:scale-110">{emoji}</button>
              ))}
            </div>
          )}
        </div>

        {Object.keys(reactionGroups).length > 0 && (
          <div className={`flex gap-1 mt-1 flex-wrap ${isMine ? "justify-end" : "justify-start"}`}>
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <button key={emoji} onClick={() => handleReact(emoji)} className="flex items-center gap-0.5 bg-base-100 border border-base-300 rounded-full px-2 py-0.5 text-xs shadow-sm hover:bg-base-200 transition-colors">
                <span>{emoji}</span>
                {count > 1 && <span className="text-base-content/60 font-medium">{count}</span>}
              </button>
            ))}
          </div>
        )}

        <p className={`text-xs text-base-content/30 mt-0.5 px-1 ${isMine ? "text-right" : "text-left"}`}>{time}</p>
      </div>

      {/* ✅ Image Fullscreen Lightbox */}
      {lightboxOpen && message.image && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10" onClick={() => setLightboxOpen(false)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={message.image} alt="Full size" className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <a href={message.image} download target="_blank" rel="noopener noreferrer"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-xl transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download
          </a>
        </div>
      )}

      {showForwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowForwardModal(false)}>
          <div className="bg-base-100 rounded-2xl shadow-2xl p-5 w-80 max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base-content">Forward to...</h3>
              <button onClick={() => setShowForwardModal(false)} className="w-7 h-7 rounded-lg hover:bg-base-200 flex items-center justify-center text-base-content/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-2">
              {Array.isArray(users) && users.map((u) => (
                <button key={u._id} onClick={() => handleForward(u._id)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-base-200 transition-colors text-left">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-base-300 flex-shrink-0">
                    <img src={u.profilePic || "/avatar.png"} alt={u.fullName} className="w-full h-full object-cover" onError={(e) => { e.target.src = "/avatar.png" }} />
                  </div>
                  <p className="text-sm font-semibold text-base-content">{u.fullName}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageBubble
