import { useEffect, useState } from "react"
import { useChatStore } from "../store/useChatStore"
import { useAuthStore } from "../store/useAuthStore"
import { useGroupStore } from "../store/useGroupStore"
import { useNotificationStore } from "../store/useNotificationStore"
import { Link } from "react-router-dom"
import CreateGroupModal from "./CreateGroupModal"
import NotificationPanel from "./NotificationPanel"

const formatLastMsg = (msg) => {
  if (!msg) return ""
  if (msg.image) return "📷 Image"
  if (msg.file) return `📎 ${msg.fileName || "File"}`
  return msg.message?.substring(0, 35) || ""
}

const formatTime = (dateStr) => {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60 * 1000) return "now"
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m`
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

const Sidebar = () => {
  const { users, getUsers, setSelectedUser, selectedUser, onlineUsers } = useChatStore()
  const { user, logout } = useAuthStore()
  const { groups, getMyGroups, selectedGroup, setSelectedGroup } = useGroupStore()
  const { unreadCount, getUnreadCount, subscribeToNotifications, unsubscribeFromNotifications } = useNotificationStore()

  const [search, setSearch] = useState("")
  const [tab, setTab] = useState("chats")
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const safeUsers = Array.isArray(users)
    ? [...new Map(users.map((u) => [u._id, u])).values()]
    : []
  const safeOnlineUsers = Array.isArray(onlineUsers) ? onlineUsers : []
  const safeGroups = Array.isArray(groups)
    ? [...new Map(groups.map((g) => [g._id, g])).values()]
    : []

  useEffect(() => {
    getUsers()
    getMyGroups()
    getUnreadCount()
    subscribeToNotifications()
    return () => unsubscribeFromNotifications()
  }, [getUsers, getMyGroups, getUnreadCount, subscribeToNotifications, unsubscribeFromNotifications])

  const filteredUsers = safeUsers.filter(
    (u) =>
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  )

  // Sort users: those with lastMessage first (by time), then rest
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : new Date(0)
    const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : new Date(0)
    return tb - ta
  })

  const filteredGroups = safeGroups.filter((g) =>
    g.name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectUser = (u) => {
    setSelectedUser(u)
    setSelectedGroup(null)
  }

  const handleSelectGroup = (g) => {
    setSelectedGroup(g)
    setSelectedUser(null)
  }

  const totalUnreadChats = safeUsers.reduce((sum, u) => sum + (u.unreadCount || 0), 0)
  const totalUnreadGroups = safeGroups.reduce((sum, g) => sum + (g.unreadCount || 0), 0)

  return (
    <div className="flex flex-col w-full bg-base-100 border-r border-base-300 h-full">
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-content" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <span className="font-display font-bold text-base-content">ChatApp</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={() => window.__toggleTheme?.()}
              className="w-8 h-8 rounded-lg hover:bg-base-200 flex items-center justify-center transition-colors"
              title="Toggle theme"
            >
              <svg className="w-4 h-4 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>

            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications((s) => !s)}
              className="w-8 h-8 rounded-lg hover:bg-base-200 flex items-center justify-center transition-colors relative"
              title="Notifications"
            >
              <svg className="w-4 h-4 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Friends */}
            <Link
              to="/friends"
              className="w-8 h-8 rounded-lg hover:bg-base-200 flex items-center justify-center transition-colors"
              title="Friends"
            >
              <svg className="w-4 h-4 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setTab("chats")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors relative ${tab === "chats" ? "bg-primary text-primary-content" : "bg-base-200 text-base-content/60 hover:text-base-content"}`}
          >
            Chats
            {totalUnreadChats > 0 && tab !== "chats" && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-xs font-bold rounded-full flex items-center justify-center">
                {totalUnreadChats > 9 ? "9+" : totalUnreadChats}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("groups")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors relative ${tab === "groups" ? "bg-primary text-primary-content" : "bg-base-200 text-base-content/60 hover:text-base-content"}`}
          >
            Groups {safeGroups.length > 0 && `(${safeGroups.length})`}
            {totalUnreadGroups > 0 && tab !== "groups" && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-xs font-bold rounded-full flex items-center justify-center">
                {totalUnreadGroups > 9 ? "9+" : totalUnreadGroups}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-base-300 bg-base-200 text-sm text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder={tab === "chats" ? "Search conversations..." : "Search groups..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">

        {/* CHATS TAB */}
        {tab === "chats" && (
          sortedUsers.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-base-content/40 text-sm">{search ? `No results for "${search}"` : "No conversations yet"}</p>
            </div>
          ) : (
            sortedUsers.map((u) => {
              const isOnline = safeOnlineUsers.includes(u._id)
              const unread = u.unreadCount || 0
              const isSelected = selectedUser?._id === u._id
              const lastMsg = u.lastMessage

              return (
                <button
                  key={u._id}
                  onClick={() => handleSelectUser(u)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-base-200 transition-colors text-left ${isSelected ? "bg-primary/10 border-r-2 border-primary" : ""}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-primary flex items-center justify-center">
                      {u.profilePic ? (
                        <img src={u.profilePic} alt={u.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary-content font-bold text-lg">
                          {u.fullName?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-base-100 ${isOnline ? "bg-success" : "bg-base-300"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold truncate ${isSelected ? "text-primary" : "text-base-content"}`}>{u.fullName}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                        {lastMsg && (
                          <span className="text-xs text-base-content/30">{formatTime(lastMsg.createdAt)}</span>
                        )}
                        {unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-primary text-primary-content text-xs font-bold flex items-center justify-center">
                            {unread > 9 ? "9+" : unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-base-content/70 font-medium" : "text-base-content/40"}`}>
                      {lastMsg ? formatLastMsg(lastMsg) : isOnline ? "Online" : (u.bio || "No bio")}
                    </p>
                  </div>
                </button>
              )
            })
          )
        )}

        {/* GROUPS TAB */}
        {tab === "groups" && (
          <>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-base-200 transition-colors text-left border-b border-base-300"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-primary">New Group</p>
            </button>

            {filteredGroups.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-base-content/40 text-sm">{search ? `No results for "${search}"` : "No groups yet"}</p>
              </div>
            ) : (
              filteredGroups.map((g) => {
                const isSelected = selectedGroup?._id === g._id
                const unread = g.unreadCount || 0
                const lastMsg = g.lastMessage

                return (
                  <button
                    key={g._id}
                    onClick={() => handleSelectGroup(g)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-base-200 transition-colors text-left ${isSelected ? "bg-primary/10 border-r-2 border-primary" : ""}`}
                  >
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-primary/20 flex items-center justify-center flex-shrink-0">
                      {g.groupPic ? (
                        <img src={g.groupPic} alt={g.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold truncate ${isSelected ? "text-primary" : "text-base-content"}`}>{g.name}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                          {lastMsg && (
                            <span className="text-xs text-base-content/30">{formatTime(lastMsg.createdAt)}</span>
                          )}
                          {unread > 0 && (
                            <span className="w-5 h-5 rounded-full bg-primary text-primary-content text-xs font-bold flex items-center justify-center">
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-base-content/70 font-medium" : "text-base-content/40"}`}>
                        {lastMsg
                          ? `${lastMsg.sender?.fullName?.split(" ")[0] || "Someone"}: ${formatLastMsg(lastMsg)}`
                          : `${g.members?.length || 0} members`}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-base-300">
        <div className="flex items-center gap-2.5">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 flex-1 min-w-0 hover:bg-base-200 rounded-xl px-2 py-1.5 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary flex items-center justify-center flex-shrink-0">
              {user?.profilePic ? (
                <img src={user.profilePic} alt={user?.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-content font-bold text-sm">
                  {user?.fullName?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-base-content truncate">{user?.fullName}</p>
              <p className="text-xs text-success font-medium">● Online</p>
            </div>
          </Link>

          <button
            onClick={logout}
            className="w-8 h-8 rounded-lg hover:bg-error/10 flex items-center justify-center transition-colors flex-shrink-0"
            title="Logout"
          >
            <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
      {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
    </div>
  )
}

export default Sidebar