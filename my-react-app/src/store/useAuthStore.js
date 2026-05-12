import { create } from "zustand"
import axiosInstance from "../lib/axios"
import { connectSocket, disconnectSocket } from "../lib/socket"
import toast from "react-hot-toast"

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: false,
  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        // ✅ Fix: No token = not logged in, skip API call silently
        set({ user: null, isCheckingAuth: false })
        return
      }
      const res = await axiosInstance.get("/api/auth/profile")
      set({ user: res.data })
      connectSocket(res.data._id)
    } catch {
      // ✅ Fix: 401 = token expired/invalid, clear silently (no error toast)
      set({ user: null })
      localStorage.removeItem("token")
    } finally {
      set({ isCheckingAuth: false })
    }
  },

  signup: async (data) => {
    set({ isLoading: true })
    try {
      const res = await axiosInstance.post("/api/auth/signup", data)
      localStorage.setItem("token", res.data.token)
      set({ user: res.data })
      connectSocket(res.data._id)
      toast.success("Account created!")
    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed")
    } finally {
      set({ isLoading: false })
    }
  },

  login: async (data) => {
    set({ isLoading: true })
    try {
      const res = await axiosInstance.post("/api/auth/login", data)
      localStorage.setItem("token", res.data.token)
      set({ user: res.data })
      connectSocket(res.data._id)
      toast.success("Logged in!")
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed")
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/api/auth/logout")
    } catch (err) {
      console.error("Logout error:", err.message)
    } finally {
      localStorage.removeItem("token")
      disconnectSocket()
      set({ user: null })
      toast.success("Logged out!")
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true })
    try {
      const res = await axiosInstance.put("/api/auth/update-profile", data)
      set({ user: res.data })
      toast.success("Profile updated!")
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed")
    } finally {
      set({ isLoading: false })
    }
  },
}))