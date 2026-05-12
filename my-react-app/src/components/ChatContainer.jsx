import { useEffect, useRef, useState } from "react"
import { useChatStore } from "../store/useChatStore"
import { getSocket } from "../lib/socket"
import MessageBubble from "./MessageBubble"
import MessageInput from "./MessageInput"

// ✅ Last seen formatter helper
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "Last seen recently"
  const diff = Date.now() - new Date(lastSeen).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return "Last seen just now"
  if (mins < 60) return `Last seen ${mins}m ago`
  if (hours < 24) return `Last seen ${hours}h ago`
  if (days === 1) return "Last seen yesterday"
  return `Last seen ${new Date(lastSeen).toLocaleDateString([], { month: "short", day: "numeric" })}`
}

const ChatContainer = () => {
  const {
    messages, getMessages, selectedUser, setSelectedUser,
    onlineUsers, pinnedMessages, getPinnedMessages,
    searchMessages, searchResults, isSearching, clearSearch,
    getLastSeen, lastSeen,
  } = useChatStore()
  const bottomRef = useRef(null)
  const [isTyping, setIsTyping] = useState(false)
  const [showPinned, setShowPinned] = useState(false)
  const typingTimeoutRef = useRef(null)

  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchTimeoutRef = useRef(null)

  const safeMessages = Array.isArray(messages) ? messages : []
  const isOnline = Array.isArray(onlineUsers) && onlineUsers.includes(selectedUser?._id)

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id)
      getPinnedMessages(selectedUser._id)
      getLastSeen(selectedUser._id)  // ✅ Fetch last seen on chat open
    }
  }, [selectedUser, getMessages, getPinnedMessages, getLastSeen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleTyping = ({ senderId }) => {
      if (senderId === selectedUser?._id) {
        setIsTyping(true)
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000)
      }
    }

    const handleStopTyping = ({ senderId }) => {
      if (senderId === selectedUser?._id) {
        setIsTyping(false)
        clearTimeout(typingTimeoutRef.current)
      }
    }

    socket.on("userTyping", handleTyping)
    socket.on("userStoppedTyping", handleStopTyping)

    return () => {
      socket.off("userTyping", handleTyping)
      socket.off("userStoppedTyping", handleStopTyping)
      clearTimeout(typingTimeoutRef.current)
    }
  }, [selectedUser])

  const handleSearchChange = (e) => {
    const q = e.target.value
    setSearchQuery(q)
    clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      searchMessages(q, selectedUser?._id)
    }, 400)
  }

  const closeSearch = () => {
    setShowSearch(false)
    setSearchQuery("")
    clearSearch()
    clearTimeout(searchTimeoutRef.current)
  }

  // ✅ Status line — typing > online > last seen
  const getStatusLine = () => {
    if (isTyping) return null
    if (isOnline) return { text: "Online", color: "text-success" }
    if (lastSeen?.lastSeen) return { text: formatLastSeen(lastSeen.lastSeen), color: "text-base-content/40" }
    return { text: "Offline", color: "text-base-content/40" }
  }

  const statusLine = getStatusLine()

  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-base-200 gap-4">
        <div className="w-20 h-20 bg-base-300 rounded-2xl flex items-center justify-center">
          <svg className="w-10 h-10 text-base-content/20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-base-content/30 text-xl">Select a conversation</p>
          <p className="text-base-content/20 text-sm mt-1">Choose from your contacts to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-base-200 h-full">
      {/* Chat header */}
      <div className="bg-base-100 border-b border-base-300 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => setSelectedUser(null)}
          className="md:hidden w-9 h-9 rounded-xl hover:bg-base-200 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary flex items-center justify-center">
            {selectedUser.profilePic ? (
              <img src={selectedUser.profilePic} alt={selectedUser.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-content font-bold text-lg">
                {selectedUser.fullName?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-base-100 ${isOnline ? "bg-success" : "bg-base-300"}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base-content text-sm truncate">{selectedUser.fullName}</p>
          {/* ✅ Typing / Online / Last seen */}
          <p className={`text-xs font-medium ${isTyping ? "text-success" : statusLine?.color}`}>
            {isTyping ? (
              <span className="flex items-center gap-1">
                <span className="inline-flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1 h-1 bg-success rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
                typing...
              </span>
            ) : statusLine?.text}
          </p>
        </div>

        {pinnedMessages.length > 0 && (
          <button
            onClick={() => setShowPinned((s) => !s)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors relative ${showPinned ? "bg-warning/20 text-warning" : "hover:bg-base-200 text-base-content/50"}`}
            title="Pinned messages"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-warning text-white text-xs font-bold rounded-full flex items-center justify-center">
              {pinnedMessages.length}
            </span>
          </button>
        )}

        <button
          onClick={() => setShowSearch((s) => !s)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${showSearch ? "bg-primary/20 text-primary" : "hover:bg-base-200 text-base-content/50"}`}
          title="Search messages"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {showPinned && pinnedMessages.length > 0 && (
        <div className="bg-warning/5 border-b border-warning/20 px-4 py-2 max-h-28 overflow-y-auto">
          <p className="text-xs font-semibold text-warning/80 mb-1.5">📌 Pinned Messages</p>
          {pinnedMessages.map((pm) => (
            <div key={pm._id} className="text-xs text-base-content/70 py-0.5 border-b border-base-300/50 last:border-0">
              {pm.message || (pm.image ? "📷 Image" : pm.voice ? "🎤 Voice" : "📎 File")}
            </div>
          ))}
        </div>
      )}

      {showSearch && (
        <div className="bg-base-100 border-b border-base-300 px-4 py-2.5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search messages..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-base-300 bg-base-200 text-sm text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <button onClick={closeSearch} className="w-8 h-8 rounded-lg hover:bg-base-200 flex items-center justify-center text-base-content/40 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {isSearching && (
            <div className="flex items-center gap-2 py-1 text-xs text-base-content/40">
              <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Searching...
            </div>
          )}
          {!isSearching && searchQuery && searchResults.length === 0 && (
            <p className="text-xs text-base-content/40 py-1">No messages found for "{searchQuery}"</p>
          )}
          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              <p className="text-xs text-base-content/40 mb-1">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</p>
              {searchResults.map((msg) => (
                <div
                  key={msg._id}
                  className="flex items-start gap-2 px-3 py-2 rounded-xl hover:bg-base-200 cursor-pointer transition-colors"
                  onClick={() => {
                    const el = document.getElementById(`msg-${msg._id}`)
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" })
                      el.classList.add("bg-primary/10")
                      setTimeout(() => el.classList.remove("bg-primary/10"), 2000)
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-base-content/70 truncate">{msg.message}</p>
                    <p className="text-xs text-base-content/30 mt-0.5">
                      {new Date(msg.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {safeMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <p className="text-sm text-base-content/30">No messages yet — say hi! 👋</p>
          </div>
        ) : (
          safeMessages.map((msg) => (
            <div key={msg._id} id={`msg-${msg._id}`} className="transition-colors rounded-xl">
              <MessageBubble message={msg} />
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput />
    </div>
  )
}

export default ChatContainer
