import { useEffect, useRef, useState, useCallback } from "react"
import { useGroupStore } from "../store/useGroupStore"
import { useAuthStore } from "../store/useAuthStore"
import { getSocket } from "../lib/socket"

const EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🔥"]

const GroupMessageBubble = ({ msg, groupId, isAdmin, onEdit, onDelete, onReact, onPin, onForwardToGroup, groups }) => {
  const { user } = useAuthStore()
  const isMine = (msg.sender?._id || msg.sender)?.toString() === user._id?.toString()
  const senderName = msg.sender?.fullName || "Unknown"
  const senderPic = msg.sender?.profilePic || "/avatar.png"
  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : ""

  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(msg.message || "")
  const [showForwardModal, setShowForwardModal] = useState(false)
  const editRef = useRef(null)

  useEffect(() => {
    if (isEditing && editRef.current) editRef.current.focus()
  }, [isEditing])

  const reactionGroups = {}
  if (Array.isArray(msg.reactions)) {
    msg.reactions.forEach((r) => {
      if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = 0
      reactionGroups[r.emoji]++
    })
  }

  const handleEditSubmit = () => {
    if (!editText.trim() || editText.trim() === msg.message) { setIsEditing(false); return }
    onEdit(msg._id, editText.trim())
    setIsEditing(false)
  }

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} gap-2 group`}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false) }}
    >
      {!isMine && (
        <div className="w-7 h-7 rounded-lg overflow-hidden bg-base-300 flex-shrink-0 self-end">
          <img src={senderPic} alt={senderName} className="w-full h-full object-cover" onError={(e) => { e.target.src = "/avatar.png" }} />
        </div>
      )}

      <div className={`max-w-[70%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
        {/* Sender name + pinned */}
        <div className={`flex items-center gap-2 px-1 mb-0.5 ${isMine ? "flex-row-reverse" : ""}`}>
          {!isMine && <p className="text-xs text-base-content/50 font-medium">{senderName}</p>}
          {msg.isPinned && (
            <span className="text-xs text-warning/70 flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              </svg>
            </span>
          )}
          {msg.isForwarded && (
            <span className="text-xs text-base-content/30 flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
              Forwarded
            </span>
          )}
        </div>

        <div className="relative" onMouseEnter={() => setShowActions(true)}>
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isMine ? "bg-primary text-primary-content rounded-br-sm" : "bg-base-100 text-base-content border border-base-300 rounded-bl-sm shadow-sm"
          }`}>
            {isEditing ? (
              <div className="flex flex-col gap-1.5">
                <textarea
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSubmit() }
                    if (e.key === "Escape") { setIsEditing(false); setEditText(msg.message || "") }
                  }}
                  className="bg-transparent border border-white/30 rounded-lg px-2 py-1 text-sm resize-none min-w-[160px] focus:outline-none"
                  rows={2}
                />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => { setIsEditing(false); setEditText(msg.message || "") }} className="text-xs px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20">Cancel</button>
                  <button onClick={handleEditSubmit} className="text-xs px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 font-semibold">Save</button>
                </div>
              </div>
            ) : (
              <>
                {msg.message && <p className="whitespace-pre-wrap break-words">{msg.message}</p>}
                {msg.image && (
                  <img src={msg.image} alt="img" className="max-w-xs rounded-xl mt-1 cursor-pointer hover:opacity-90" onClick={() => window.open(msg.image, "_blank")} />
                )}
                {msg.file && (
                  <a href={msg.file} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 mt-1 text-xs font-medium underline ${isMine ? "text-primary-content/80" : "text-primary"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {msg.fileName || "Download file"}
                  </a>
                )}
                {msg.isEdited && <span className="text-xs italic opacity-50 mt-0.5 block">edited</span>}
              </>
            )}
          </div>

          {/* Actions */}
          {showActions && !isEditing && (
            <div className={`absolute top-0 ${isMine ? "right-full mr-2" : "left-full ml-2"} flex items-center gap-1 fade-in z-10`}>
              <button onClick={() => setShowEmojiPicker((s) => !s)} className="w-7 h-7 rounded-lg bg-base-100 border border-base-300 shadow-sm flex items-center justify-center hover:bg-base-200 text-base-content/60" title="React">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button onClick={() => { setShowForwardModal(true); setShowActions(false) }} className="w-7 h-7 rounded-lg bg-base-100 border border-base-300 shadow-sm flex items-center justify-center hover:bg-base-200 text-base-content/60" title="Forward">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
              </button>
              <button onClick={() => { onPin(msg._id); setShowActions(false) }} className={`w-7 h-7 rounded-lg bg-base-100 border border-base-300 shadow-sm flex items-center justify-center hover:bg-base-200 ${msg.isPinned ? "text-warning" : "text-base-content/60"}`} title={msg.isPinned ? "Unpin" : "Pin"}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
              </button>
              {isMine && msg.message && (
                <button onClick={() => { setIsEditing(true); setShowActions(false) }} className="w-7 h-7 rounded-lg bg-base-100 border border-base-300 shadow-sm flex items-center justify-center hover:bg-base-200 text-base-content/60" title="Edit">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {(isMine || isAdmin) && (
                <button onClick={() => { onDelete(msg._id); setShowActions(false) }} className="w-7 h-7 rounded-lg bg-base-100 border border-base-300 shadow-sm flex items-center justify-center hover:bg-error/10 hover:text-error hover:border-error/30 text-base-content/60" title="Delete">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div className={`absolute top-0 ${isMine ? "right-full mr-10" : "left-full ml-10"} z-20 bg-base-100 border border-base-300 rounded-2xl shadow-xl p-2 flex gap-1 fade-in`}>
              {EMOJIS.map((emoji) => (
                <button key={emoji} onClick={() => { onReact(msg._id, emoji); setShowEmojiPicker(false); setShowActions(false) }} className="w-8 h-8 rounded-xl hover:bg-base-200 flex items-center justify-center text-lg hover:scale-110 transition-all">{emoji}</button>
              ))}
            </div>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className={`flex gap-1 mt-1 flex-wrap ${isMine ? "justify-end" : "justify-start"}`}>
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <button key={emoji} onClick={() => onReact(msg._id, emoji)} className="flex items-center gap-0.5 bg-base-100 border border-base-300 rounded-full px-2 py-0.5 text-xs shadow-sm hover:bg-base-200">
                <span>{emoji}</span>
                {count > 1 && <span className="text-base-content/60 font-medium">{count}</span>}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-base-content/30 mt-0.5 px-1">{time}</p>
      </div>

      {/* Forward to group modal */}
      {showForwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowForwardModal(false)}>
          <div className="bg-base-100 rounded-2xl shadow-2xl p-5 w-80 max-h-80 overflow-y-auto fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base-content">Forward to Group...</h3>
              <button onClick={() => setShowForwardModal(false)} className="w-7 h-7 rounded-lg hover:bg-base-200 flex items-center justify-center text-base-content/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-2">
              {Array.isArray(groups) && groups.filter((g) => g._id !== groupId).map((g) => (
                <button key={g._id} onClick={() => { onForwardToGroup(msg._id, g._id); setShowForwardModal(false) }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-base-200 text-left">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    {g.groupPic ? <img src={g.groupPic} className="w-full h-full object-cover rounded-xl" alt={g.name} /> : <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  </div>
                  <p className="text-sm font-semibold text-base-content">{g.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const GroupChatContainer = () => {
  const {
    selectedGroup, groupMessages, groupTypingUsers,
    getGroupMessages, sendGroupMessage,
    editGroupMessage, deleteGroupMessage,
    reactToGroupMessage, pinGroupMessage,
    forwardGroupMessage,
    getPinnedGroupMessages, pinnedGroupMessages,
    leaveGroup, deleteGroup, makeAdmin,
    updateGroup,
    setSelectedGroup, groups,
  } = useGroupStore()
  const { user } = useAuthStore()
  const bottomRef = useRef(null)
  const [text, setText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showPinned, setShowPinned] = useState(false)
  const fileInputRef = useRef(null)
  const [imagePreview, setImagePreview] = useState(null)
  const typingTimeoutRef = useRef(null)
  const isTypingRef = useRef(false)

  const [showEditGroup, setShowEditGroup] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editPicPreview, setEditPicPreview] = useState(null)
  const [isSavingGroup, setIsSavingGroup] = useState(false)
  const editPicRef = useRef(null)

  const isAdmin = selectedGroup?.admin?._id === user._id || selectedGroup?.admin === user._id
  const typingInThisGroup = (groupTypingUsers[selectedGroup?._id] || []).filter((u) => u.senderId !== user._id)

  useEffect(() => {
    if (selectedGroup) {
      getGroupMessages(selectedGroup._id)
      getPinnedGroupMessages(selectedGroup._id)
    }
  }, [selectedGroup, getGroupMessages, getPinnedGroupMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [groupMessages])

  const emitGroupTyping = useCallback(() => {
    const socket = getSocket()
    if (!socket || !selectedGroup) return
    const memberIds = selectedGroup.members?.map((m) => m._id || m) || []
    if (!isTypingRef.current) {
      socket.emit("groupTyping", { senderId: user._id, senderName: user.fullName, groupId: selectedGroup._id, memberIds })
      isTypingRef.current = true
    }
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("groupStopTyping", { senderId: user._id, groupId: selectedGroup._id, memberIds })
      isTypingRef.current = false
    }, 2000)
  }, [selectedGroup, user])

  const openEditGroup = () => {
    setEditName(selectedGroup?.name || "")
    setEditDesc(selectedGroup?.description || "")
    setEditPicPreview(null)
    setShowEditGroup(true)
  }

  const handleGroupPicChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setEditPicPreview(reader.result)
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleSaveGroup = async () => {
    if (!editName.trim()) return
    setIsSavingGroup(true)
    const data = { name: editName.trim(), description: editDesc.trim() }
    if (editPicPreview) data.groupPic = editPicPreview
    await updateGroup(selectedGroup._id, data)
    setIsSavingGroup(false)
    setShowEditGroup(false)
  }

  const handleSubmit = async () => {
    if ((!text.trim() && !imagePreview) || isSending) return
    const socket = getSocket()
    if (socket && selectedGroup && isTypingRef.current) {
      const memberIds = selectedGroup.members?.map((m) => m._id || m) || []
      socket.emit("groupStopTyping", { senderId: user._id, groupId: selectedGroup._id, memberIds })
      isTypingRef.current = false
    }
    setIsSending(true)
    await sendGroupMessage({ message: text.trim(), image: imagePreview })
    setText("")
    setImagePreview(null)
    setIsSending(false)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  if (!selectedGroup) return null

  return (
    <div className="flex-1 flex flex-col bg-base-200 h-full">
      {/* Header */}
      <div className="bg-base-100 border-b border-base-300 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => setSelectedGroup(null)} className="md:hidden w-9 h-9 rounded-xl hover:bg-base-200 flex items-center justify-center">
          <svg className="w-5 h-5 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/20 flex items-center justify-center flex-shrink-0">
          {selectedGroup.groupPic ? (
            <img src={selectedGroup.groupPic} alt={selectedGroup.name} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base-content text-sm truncate">{selectedGroup.name}</p>
          <p className="text-xs text-base-content/40">{selectedGroup.members?.length || 0} members</p>
        </div>

        {/* Pinned messages button */}
        {pinnedGroupMessages.length > 0 && (
          <button onClick={() => setShowPinned((s) => !s)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors relative ${showPinned ? "bg-warning/20 text-warning" : "hover:bg-base-200 text-base-content/50"}`} title="Pinned messages">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-warning text-white text-xs font-bold rounded-full flex items-center justify-center">{pinnedGroupMessages.length}</span>
          </button>
        )}

        <button onClick={() => setShowInfo((s) => !s)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${showInfo ? "bg-primary/20 text-primary" : "hover:bg-base-200 text-base-content/50"}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Pinned messages panel */}
      {showPinned && pinnedGroupMessages.length > 0 && (
        <div className="bg-warning/5 border-b border-warning/20 px-4 py-2 max-h-32 overflow-y-auto">
          <p className="text-xs font-semibold text-warning/80 mb-1.5">📌 Pinned Messages</p>
          {pinnedGroupMessages.map((pm) => (
            <div key={pm._id} className="text-xs text-base-content/70 py-0.5 border-b border-base-300/50 last:border-0">
              <span className="font-medium text-base-content/50">{pm.sender?.fullName}: </span>
              {pm.message || (pm.image ? "📷 Image" : "📎 File")}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {groupMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                <p className="text-sm text-base-content/30">No messages yet — say hi! 👋</p>
              </div>
            ) : (
              groupMessages.map((msg) => (
                <GroupMessageBubble
                  key={msg._id}
                  msg={msg}
                  groupId={selectedGroup._id}
                  isAdmin={isAdmin}
                  groups={groups}
                  onEdit={(msgId, newText) => editGroupMessage(selectedGroup._id, msgId, newText)}
                  onDelete={(msgId) => deleteGroupMessage(selectedGroup._id, msgId)}
                  onReact={(msgId, emoji) => reactToGroupMessage(selectedGroup._id, msgId, emoji)}
                  onPin={(msgId) => pinGroupMessage(selectedGroup._id, msgId)}
                  onForwardToGroup={(msgId, targetGroupId) => forwardGroupMessage(selectedGroup._id, msgId, targetGroupId)}
                />
              ))
            )}

            {/* Group typing indicator */}
            {typingInThisGroup.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <span className="inline-flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
                <p className="text-xs text-base-content/40">
                  {typingInThisGroup.map((u) => u.senderName.split(" ")[0]).join(", ")} {typingInThisGroup.length === 1 ? "is" : "are"} typing...
                </p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="bg-base-100 border-t border-base-300 px-4 py-3 flex-shrink-0">
            {imagePreview && (
              <div className="mb-2 relative w-fit">
                <img src={imagePreview} alt="preview" className="h-20 rounded-xl object-cover shadow-sm border border-base-300" />
                <button onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-9 h-9 flex-shrink-0 rounded-xl hover:bg-base-200 flex items-center justify-center text-base-content/50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              <textarea
                className="flex-1 px-4 py-2.5 rounded-xl border border-base-300 bg-base-200 text-base-content text-sm placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                placeholder="Type a message..."
                value={text}
                onChange={(e) => { setText(e.target.value); emitGroupTyping() }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
                rows={1}
              />
              <button onClick={handleSubmit} disabled={isSending || (!text.trim() && !imagePreview)} className="w-9 h-9 flex-shrink-0 rounded-xl bg-primary text-primary-content flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all">
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Group Info Panel */}
        {showInfo && (
          <div className="w-64 bg-base-100 border-l border-base-300 flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-base-300">
              <div className="flex items-center justify-between">
                <p className="font-bold text-base-content">Group Info</p>
                {/* Admin can edit group name, description, and picture */}
                {isAdmin && (
                  <button
                    onClick={openEditGroup}
                    className="w-7 h-7 rounded-lg hover:bg-base-200 flex items-center justify-center text-base-content/50 transition-colors"
                    title="Edit group"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
              {selectedGroup.description && (
                <p className="text-xs text-base-content/50 mt-1">{selectedGroup.description}</p>
              )}
            </div>

            <div className="p-4 flex-1">
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-3">Members ({selectedGroup.members?.length})</p>
              <div className="space-y-2">
                {selectedGroup.members?.map((member) => {
                  const memberId = member._id || member
                  const isAdminMember = (selectedGroup.admin?._id || selectedGroup.admin)?.toString() === memberId?.toString()
                  return (
                    <div key={memberId} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-base-300 flex-shrink-0">
                        <img src={member.profilePic || "/avatar.png"} alt={member.fullName} className="w-full h-full object-cover" onError={(e) => { e.target.src = "/avatar.png" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-base-content truncate">{member.fullName || "Member"}</p>
                        {isAdminMember && <p className="text-xs text-primary font-medium">Admin</p>}
                      </div>
                      {/* Admin options for other members */}
                      {isAdmin && !isAdminMember && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => makeAdmin(selectedGroup._id, memberId)}
                            className="text-xs text-primary hover:underline"
                            title="Make admin"
                          >
                            Admin
                          </button>
                          <button
                            onClick={() => useGroupStore.getState().removeMember(selectedGroup._id, memberId)}
                            className="text-xs text-error hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-4 border-t border-base-300 space-y-2">
              {isAdmin ? (
                <button
                  onClick={() => deleteGroup(selectedGroup._id)}
                  className="w-full py-2 rounded-xl bg-error/10 text-error text-sm font-semibold hover:bg-error/20 transition-colors"
                >
                  Delete Group
                </button>
              ) : (
                <button
                  onClick={() => leaveGroup(selectedGroup._id)}
                  className="w-full py-2 rounded-xl bg-warning/10 text-warning text-sm font-semibold hover:bg-warning/20 transition-colors"
                >
                  Leave Group
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Group Modal */}
      {showEditGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowEditGroup(false)}>
          <div className="bg-base-100 rounded-2xl shadow-2xl p-5 w-80 fade-in" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base-content">Edit Group</h3>
              <button onClick={() => setShowEditGroup(false)} className="w-7 h-7 rounded-lg hover:bg-base-200 flex items-center justify-center text-base-content/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Group picture */}
            <div className="flex flex-col items-center mb-4">
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden bg-primary/20 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity relative group"
                onClick={() => editPicRef.current?.click()}
              >
                {editPicPreview ? (
                  <img src={editPicPreview} className="w-full h-full object-cover" alt="preview" />
                ) : selectedGroup.groupPic ? (
                  <img src={selectedGroup.groupPic} className="w-full h-full object-cover" alt={selectedGroup.name} />
                ) : (
                  <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                {/* Camera overlay on hover */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" />
                  </svg>
                </div>
              </div>
              <input type="file" ref={editPicRef} className="hidden" accept="image/*" onChange={handleGroupPicChange} />
              <p className="text-xs text-base-content/40 mt-1">Click to change photo</p>
            </div>

            {/* Group name input */}
            <div className="mb-3">
              <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-1 block">Group Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-base-300 bg-base-200 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="Group name"
                maxLength={50}
              />
            </div>

            {/* Description input */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-1 block">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-base-300 bg-base-200 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                placeholder="Group description (optional)"
                rows={2}
                maxLength={200}
              />
            </div>

            {/* Save button */}
            <button
              onClick={handleSaveGroup}
              disabled={!editName.trim() || isSavingGroup}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-content text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isSavingGroup ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-content/30 border-t-primary-content rounded-full animate-spin" />
                  Saving...
                </span>
              ) : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupChatContainer