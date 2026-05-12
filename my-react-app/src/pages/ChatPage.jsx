import { useEffect } from "react"
import Sidebar from "../components/Sidebar"
import ChatContainer from "../components/ChatContainer"
import GroupChatContainer from "../components/GroupChatContainer"
import { useChatStore } from "../store/useChatStore"
import { useGroupStore } from "../store/useGroupStore"
import { getSocket } from "../lib/socket"

const ChatPage = () => {
  const { subscribeToMessages, unsubscribeFromMessages, getUsers, selectedUser } = useChatStore()
  const { selectedGroup, subscribeToGroupEvents, unsubscribeFromGroupEvents } = useGroupStore()

  useEffect(() => {
    getUsers()

    const socket = getSocket()

    if (socket && socket.connected) {
      subscribeToMessages()
      subscribeToGroupEvents()
    } else if (socket) {
      const handleConnect = () => {
        subscribeToMessages()
        subscribeToGroupEvents()
      }
      socket.once("connect", handleConnect)
      return () => {
        socket.off("connect", handleConnect)
        unsubscribeFromMessages()
        unsubscribeFromGroupEvents()
      }
    }

    return () => {
      unsubscribeFromMessages()
      unsubscribeFromGroupEvents()
    }
  }, [getUsers, subscribeToMessages, unsubscribeFromMessages, subscribeToGroupEvents, unsubscribeFromGroupEvents])

  // कोणता container दाखवायचा
  const showGroup = !!selectedGroup
  const showChat = !!selectedUser && !selectedGroup
  const showNone = !selectedUser && !selectedGroup

  return (
    <div className="flex h-screen bg-base-200 overflow-hidden">
      {/* Sidebar */}
      <div className={`${(showChat || showGroup) ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 flex-shrink-0`}>
        <Sidebar />
      </div>

      {/* Main area */}
      <div className={`${showNone ? "hidden md:flex" : "flex"} flex-1`}>
        {showGroup && <GroupChatContainer />}
        {showChat && <ChatContainer />}
        {showNone && (
          <div className="flex-1 flex flex-col items-center justify-center bg-base-200 gap-4">
            <div className="w-20 h-20 bg-base-300 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-base-content/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-base-content/30 text-xl">Select a conversation</p>
              <p className="text-base-content/20 text-sm mt-1">Choose from chats or groups to start</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatPage