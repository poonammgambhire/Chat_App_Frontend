import { create } from "zustand"
import axiosInstance from "../lib/axios"
import { getSocket } from "../lib/socket"
import toast from "react-hot-toast"

export const useFriendStore = create((set, get) => ({
  friends: [],          // confirmed friends list
  requestsReceived: [], // incoming friend requests  (FriendsPage uses this)
  requestsSent: [],     // outgoing friend requests
  blockedUsers: [],     // blocked users            (FriendsPage uses this)
  isLoading: false,

  // ── GET FRIENDS + REQUESTS ──────────────────────────────────────
  // Backend GET /api/friends returns { friends, requestsReceived, requestsSent }
  getFriends: async () => {
    set({ isLoading: true })
    try {
      const res = await axiosInstance.get("/api/friends")
      set({
        friends:          Array.isArray(res.data?.friends)          ? res.data.friends          : [],
        requestsReceived: Array.isArray(res.data?.requestsReceived) ? res.data.requestsReceived : [],
        requestsSent:     Array.isArray(res.data?.requestsSent)     ? res.data.requestsSent     : [],
      })
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load friends")
      set({ friends: [], requestsReceived: [], requestsSent: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  // ── GET BLOCKED USERS ───────────────────────────────────────────
  // Backend GET /api/friends/blocked returns array of users
  getBlockedUsers: async () => {
    try {
      const res = await axiosInstance.get("/api/friends/blocked")
      const data = Array.isArray(res.data) ? res.data : []
      set({ blockedUsers: data })
    } catch (err) {
      console.error("getBlockedUsers error:", err.message)
      set({ blockedUsers: [] })
    }
  },

  // ── SEND FRIEND REQUEST ─────────────────────────────────────────
  // Backend POST /api/friends/request/:id
  sendFriendRequest: async (userId) => {
    try {
      await axiosInstance.post(`/api/friends/request/${userId}`)
      toast.success("Friend request sent!")
      get().getFriends()
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send request")
    }
  },

  // ── ACCEPT FRIEND REQUEST ───────────────────────────────────────
  // Backend POST /api/friends/accept/:id
  acceptFriendRequest: async (userId) => {
    try {
      await axiosInstance.post(`/api/friends/accept/${userId}`)
      toast.success("Friend request accepted!")
      get().getFriends()
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept request")
    }
  },

  // ── REJECT FRIEND REQUEST ───────────────────────────────────────
  // Backend POST /api/friends/reject/:id
  rejectFriendRequest: async (userId) => {
    try {
      await axiosInstance.post(`/api/friends/reject/${userId}`)
      toast.success("Request rejected")
      get().getFriends()
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject request")
    }
  },

  // ── UNFRIEND ────────────────────────────────────────────────────
  // Backend DELETE /api/friends/unfriend/:id
  unfriend: async (userId) => {
    try {
      await axiosInstance.delete(`/api/friends/unfriend/${userId}`)
      toast.success("Unfriended")
      get().getFriends()
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unfriend")
    }
  },

  // ── BLOCK USER ──────────────────────────────────────────────────
  // Backend POST /api/friends/block/:id
  blockUser: async (userId) => {
    try {
      await axiosInstance.post(`/api/friends/block/${userId}`)
      toast.success("User blocked")
      get().getFriends()      // removes from friends list
      get().getBlockedUsers() // adds to blocked list
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to block user")
    }
  },

  // ── UNBLOCK USER ────────────────────────────────────────────────
  // Backend POST /api/friends/unblock/:id
  unblockUser: async (userId) => {
    try {
      await axiosInstance.post(`/api/friends/unblock/${userId}`)
      toast.success("User unblocked")
      get().getBlockedUsers() // removes from blocked list
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unblock")
    }
  },

  // ── SOCKET SUBSCRIBE ────────────────────────────────────────────
  // Backend emits "friendRequest" and "friendRequestAccepted"
  subscribeToFriendEvents: () => {
    const socket = getSocket()
    if (!socket) return

    socket.off("friendRequest")
    socket.off("friendRequestAccepted")

    // Someone sent YOU a friend request → add to requestsReceived
    socket.on("friendRequest", (data) => {
      toast(`📩 ${data.from?.fullName || "Someone"} sent you a friend request!`)
      set((state) => ({
        requestsReceived: [
          ...state.requestsReceived.filter((r) => r._id !== data.from._id),
          data.from,
        ],
      }))
    })

    // Someone accepted YOUR request → refresh friends list
    socket.on("friendRequestAccepted", (data) => {
      toast.success(`🎉 ${data.by?.fullName || "Someone"} accepted your friend request!`)
      get().getFriends()
    })
  },

  // ── SOCKET UNSUBSCRIBE ──────────────────────────────────────────
  unsubscribeFromFriendEvents: () => {
    const socket = getSocket()
    if (!socket) return
    socket.off("friendRequest")
    socket.off("friendRequestAccepted")
  },
}))