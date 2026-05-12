import { create } from "zustand"
import axiosInstance from "../lib/axios"
import { getSocket } from "../lib/socket"
import toast from "react-hot-toast"

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isLoading: false,
  onlineUsers: [],
  pinnedMessages: [],
  lastSeen: null, // ✅ Added

  setOnlineUsers: (users) => set({ onlineUsers: users }),
  setSelectedUser: (user) => set({ selectedUser: user, messages: [], pinnedMessages: [] }),

  getUsers: async () => {
    set({ isLoading: true })
    try {
      const res = await axiosInstance.get("/api/messages/users")
      const data = Array.isArray(res.data) ? res.data
        : Array.isArray(res.data?.users) ? res.data.users
        : []
      set({ users: data })
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load users")
      set({ users: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  getMessages: async (userId) => {
    set({ isLoading: true })
    try {
      const res = await axiosInstance.get(`/api/messages/${userId}`)
      const data = Array.isArray(res.data) ? res.data
        : Array.isArray(res.data?.messages) ? res.data.messages
        : []
      set({ messages: data })
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load messages")
      set({ messages: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  getPinnedMessages: async (userId) => {
    try {
      const res = await axiosInstance.get(`/api/messages/pinned/${userId}`)
      set({ pinnedMessages: Array.isArray(res.data) ? res.data : [] })
    } catch {
      set({ pinnedMessages: [] })
    }
  },

  // ✅ Added: fetch last seen timestamp for a user
  getLastSeen: async (userId) => {
    try {
      const res = await axiosInstance.get(`/api/messages/last-seen/${userId}`)
      set({ lastSeen: res.data }) // expects { lastSeen: "ISO date string" }
    } catch (err) {
      console.error("getLastSeen error:", err)
      set({ lastSeen: null })
    }
  },

  sendMessage: async (data) => {
    const { selectedUser, messages } = get()
    try {
      const res = await axiosInstance.post(`/api/messages/send/${selectedUser._id}`, data)
      set({ messages: [...messages, res.data] })
      get()._updateUserLastMessage(selectedUser._id, res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || "Send failed")
    }
  },

  editMessage: async (messageId, newText) => {
    try {
      const res = await axiosInstance.patch(`/api/messages/edit/${messageId}`, { newText })
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, message: res.data.message, isEdited: true, editedAt: res.data.editedAt } : m
        ),
      })
    } catch (err) {
      toast.error(err.response?.data?.message || "Edit failed")
    }
  },

  pinMessage: async (messageId) => {
    try {
      const res = await axiosInstance.patch(`/api/messages/pin/${messageId}`)
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, isPinned: res.data.isPinned, pinnedAt: res.data.pinnedAt } : m
        ),
      })
      const { selectedUser } = get()
      if (selectedUser) get().getPinnedMessages(selectedUser._id)
      toast.success(res.data.isPinned ? "Message pinned!" : "Message unpinned")
    } catch (err) {
      toast.error(err.response?.data?.message || "Pin failed")
    }
  },

  forwardMessage: async (messageId, receiverId) => {
    try {
      await axiosInstance.post(`/api/messages/forward/${messageId}`, { receiverId })
      toast.success("Message forwarded!")
    } catch (err) {
      toast.error(err.response?.data?.message || "Forward failed")
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/api/messages/${messageId}`)
      set({ messages: get().messages.filter((m) => m._id !== messageId) })
      toast.success("Message deleted")
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed")
    }
  },

  _updateUserLastMessage: (userId, message) => {
    set({
      users: get().users.map((u) =>
        u._id === userId ? { ...u, lastMessage: message } : u
      ),
    })
  },

  // Search state
  searchResults: [],
  isSearching: false,
  userSearchResults: [],

  searchMessages: async (query, userId) => {
    if (!query.trim()) {
      set({ searchResults: [] })
      return
    }
    set({ isSearching: true })
    try {
      const params = new URLSearchParams({ query })
      if (userId) params.append("userId", userId)
      const res = await axiosInstance.get(`/api/messages/search-messages?${params}`)
      set({ searchResults: Array.isArray(res.data) ? res.data : [] })
    } catch (error) {
      console.log(error)
      set({ searchResults: [] })
    } finally {
      set({ isSearching: false })
    }
  },

  clearSearch: () => set({ searchResults: [], userSearchResults: [] }),

  searchUsers: async (query) => {
    if (!query.trim()) {
      set({ userSearchResults: [] })
      return
    }
    try {
      const res = await axiosInstance.get(`/api/messages/search?query=${encodeURIComponent(query)}`)
      set({ userSearchResults: Array.isArray(res.data) ? res.data : [] })
    } catch {
      set({ userSearchResults: [] })
    }
  },

  subscribeToMessages: () => {
    const socket = getSocket()
    if (!socket) return

    socket.off("newMessage")
    socket.off("onlineUsers")
    socket.off("messageReaction")
    socket.off("messageDeleted")
    socket.off("messagesSeen")
    socket.off("messageEdited")
    socket.off("messagePinned")

    socket.on("newMessage", (message) => {
      const { selectedUser, users } = get()
      const senderId = message.sender?._id?.toString() || message.sender?.toString()

      set({
        users: users.map((u) =>
          u._id === senderId
            ? { ...u, lastMessage: message, unreadCount: (u.unreadCount || 0) + (selectedUser?._id === senderId ? 0 : 1) }
            : u
        ),
      })

      if (selectedUser && senderId === selectedUser._id?.toString()) {
        set({ messages: [...get().messages, message] })
      }
    })

    socket.on("onlineUsers", (users) => {
      set({ onlineUsers: Array.isArray(users) ? users : [] })
    })

    socket.on("messageReaction", ({ messageId, reactions }) => {
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        ),
      })
    })

    socket.on("messageDeleted", ({ messageId }) => {
      set({ messages: get().messages.filter((m) => m._id !== messageId) })
    })

    socket.on("messagesSeen", ({ by }) => {
      const { selectedUser } = get()
      if (selectedUser && by === selectedUser._id?.toString()) {
        set({
          messages: get().messages.map((m) =>
            m.isRead === false ? { ...m, isRead: true } : m
          ),
        })
      }
    })

    socket.on("messageEdited", ({ messageId, newText, editedAt }) => {
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, message: newText, isEdited: true, editedAt } : m
        ),
      })
    })

    socket.on("messagePinned", ({ messageId, isPinned, pinnedAt }) => {
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, isPinned, pinnedAt } : m
        ),
      })
      const { selectedUser } = get()
      if (selectedUser) get().getPinnedMessages(selectedUser._id)
    })
  },

  unsubscribeFromMessages: () => {
    const socket = getSocket()
    if (!socket) return
    socket.off("newMessage")
    socket.off("onlineUsers")
    socket.off("messageReaction")
    socket.off("messageDeleted")
    socket.off("messagesSeen")
    socket.off("messageEdited")
    socket.off("messagePinned")
  },
}))