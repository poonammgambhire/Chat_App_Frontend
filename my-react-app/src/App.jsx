import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { Toaster } from "react-hot-toast"
import { useAuthStore } from "./store/useAuthStore"
import { useFriendStore } from "./store/useFriendStore"
import { useNotificationStore } from "./store/useNotificationStore"

import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import ChatPage from "./pages/ChatPage"
import ProfilePage from "./pages/ProfilePage"
import FriendsPage from "./pages/FriendsPage"

const ProtectedRoute = ({ children }) => {
  const { user } = useAuthStore()
  return user ? children : <Navigate to="/login" />
}

const GuestRoute = ({ children }) => {
  const { user } = useAuthStore()
  return !user ? children : <Navigate to="/chat" />
}

const App = () => {
  const { checkAuth, isCheckingAuth, user } = useAuthStore()
  const { subscribeToFriendEvents, unsubscribeFromFriendEvents } = useFriendStore()
  const { subscribeToNotifications, unsubscribeFromNotifications, getUnreadCount } = useNotificationStore()
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "chatlight")

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Subscribe to friend socket events globally
  useEffect(() => {
    if (user) {
      subscribeToFriendEvents()
      subscribeToNotifications()
      getUnreadCount()
    } else {
      unsubscribeFromFriendEvents()
      unsubscribeFromNotifications()
    }
    return () => {
      unsubscribeFromFriendEvents()
      unsubscribeFromNotifications()
    }
  }, [user, subscribeToFriendEvents, unsubscribeFromFriendEvents, subscribeToNotifications, unsubscribeFromNotifications, getUnreadCount])

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
    window.__toggleTheme = () => setTheme((t) => (t === "chatlight" ? "chatdark" : "chatlight"))
    window.__theme = theme
  }, [theme])

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-base-content/50 text-sm font-medium">Loading...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "hsl(var(--b1))",
            color: "hsl(var(--bc))",
            border: "1px solid hsl(var(--b3))",
            borderRadius: "12px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "14px",
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App