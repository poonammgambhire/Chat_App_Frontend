import { create } from "zustand"
import axiosInstance from "../lib/axios"
import { getSocket } from "../lib/socket"
import toast from "react-hot-toast"

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  getNotifications: async () => {
    set({ isLoading: true })
    try {
      const res = await axiosInstance.get("/api/notifications")
      set({ notifications: Array.isArray(res.data) ? res.data : [] })
    } catch (err) {
      console.error("getNotifications error:", err.message)
      set({ notifications: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  getUnreadCount: async () => {
    try {
      const res = await axiosInstance.get("/api/notifications/unread-count")
      set({ unreadCount: res.data?.count || 0 })
    } catch (err) {
      console.error("getUnreadCount error:", err.message)
      set({ unreadCount: 0 })
    }
  },

  markAllRead: async () => {
    try {
      await axiosInstance.patch("/api/notifications/mark-all-read")
      set({
        notifications: get().notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      })
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed")
    }
  },

  markOneRead: async (id) => {
    try {
      await axiosInstance.patch(`/api/notifications/${id}/read`)
      set({
        notifications: get().notifications.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, get().unreadCount - 1),
      })
    } catch (err) {
      console.error("markOneRead error:", err.message)
    }
  },

  deleteNotification: async (id) => {
    try {
      await axiosInstance.delete(`/api/notifications/${id}`)
      const deleted = get().notifications.find((n) => n._id === id)
      set({
        notifications: get().notifications.filter((n) => n._id !== id),
        unreadCount:
          deleted && !deleted.isRead
            ? Math.max(0, get().unreadCount - 1)
            : get().unreadCount,
      })
    } catch (err) {
      console.error("deleteNotification error:", err.message)
    }
  },

  clearAll: async () => {
    try {
      await axiosInstance.delete("/api/notifications/clear-all")
      set({ notifications: [], unreadCount: 0 })
      toast.success("Notifications cleared")
    } catch (err) {
      console.error("clearAll error:", err.message)
    }
  },

  subscribeToNotifications: () => {
    const socket = getSocket()
    if (!socket) return

    socket.off("notificationCount")
    socket.off("newNotification")

    // Update unread count badge in real time
    socket.on("notificationCount", (count) => {
      set({ unreadCount: count })
    })

    // Add new notification to the list in real time (no manual refresh needed)
    socket.on("newNotification", (notification) => {
      set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }))
    })
  },

  unsubscribeFromNotifications: () => {
    const socket = getSocket()
    if (!socket) return
    socket.off("notificationCount")
    socket.off("newNotification")
  },
}))