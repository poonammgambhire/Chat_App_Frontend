import { io } from "socket.io-client"

let socket = null

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"

export const connectSocket = (userId) => {
  // Disconnect existing socket cleanly before creating new one
  if (socket) {
    socket.disconnect()
    socket = null
  }

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  // ✅ FIX: Emit userOnline after socket connects (and re-emit on reconnect)
  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id)
    socket.emit("userOnline", userId)
  })

  // ✅ FIX: Re-emit userOnline after automatic reconnection
  socket.on("reconnect", () => {
    console.log("🔄 Socket reconnected, re-registering user:", userId)
    socket.emit("userOnline", userId)
  })

  socket.on("connect_error", (err) => {
    console.warn("⚠️ Socket connection error:", err.message)
  })

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}