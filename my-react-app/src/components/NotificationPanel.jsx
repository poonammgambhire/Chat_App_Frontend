import { useEffect, useRef } from "react"
import { useNotificationStore } from "../store/useNotificationStore"

const typeIcon = (type) => {
  switch (type) {
    case "friend_request": return "👤"
    case "friend_accepted": return "🎉"
    case "new_message": return "💬"
    case "new_group_message": return "👥"
    case "added_to_group": return "➕"
    case "removed_from_group": return "➖"
    case "group_deleted": return "🗑️"
    case "message_reaction": return "😊"
    default: return "🔔"
  }
}

const typeLabel = (type) => {
  switch (type) {
    case "friend_request": return "Friend Request"
    case "friend_accepted": return "Request Accepted"
    case "new_message": return "New Message"
    case "new_group_message": return "Group Message"
    case "added_to_group": return "Added to Group"
    case "removed_from_group": return "Removed from Group"
    case "group_deleted": return "Group Deleted"
    case "message_reaction": return "Reaction"
    default: return "Notification"
  }
}

const NotificationPanel = ({ onClose }) => {
  const {
    notifications,
    isLoading,
    getNotifications,
    markAllRead,
    markOneRead,
    deleteNotification,
    clearAll,
  } = useNotificationStore()

  const panelRef = useRef(null)

  useEffect(() => {
    getNotifications()
  }, [getNotifications])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  const unread = notifications.filter((n) => !n.isRead)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-start">
      <div
        ref={panelRef}
        className="absolute left-0 top-0 h-full w-80 bg-base-100 border-r border-base-300 shadow-2xl flex flex-col"
        style={{ zIndex: 60 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div>
            <h2 className="font-bold text-base-content text-base">Notifications</h2>
            {unread.length > 0 && (
              <p className="text-xs text-base-content/50">{unread.length} unread</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unread.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-error hover:underline px-2 py-1 rounded-lg hover:bg-error/10 transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-base-200 flex items-center justify-center ml-1"
            >
              <svg className="w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-50">
              <svg className="w-10 h-10 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm text-base-content/40">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`flex items-start gap-3 px-4 py-3 border-b border-base-200 hover:bg-base-200 transition-colors cursor-pointer ${!n.isRead ? "bg-primary/5" : ""}`}
                onClick={() => !n.isRead && markOneRead(n._id)}
              >
                {/* Avatar or icon */}
                <div className="flex-shrink-0 relative">
                  {n.sender?.profilePic ? (
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-base-300">
                      <img
                        src={n.sender.profilePic}
                        alt={n.sender.fullName}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = "/avatar.png" }}
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-base-300 flex items-center justify-center text-base">
                      {typeIcon(n.type)}
                    </div>
                  )}
                  {!n.isRead && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-base-100" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">
                      {typeLabel(n.type)}
                    </p>
                    <p className="text-xs text-base-content/30 flex-shrink-0">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <p className={`text-sm mt-0.5 truncate ${!n.isRead ? "text-base-content font-medium" : "text-base-content/70"}`}>
                    {n.sender?.fullName && <span className="font-semibold">{n.sender.fullName} </span>}
                    {n.data?.messagePreview || n.data?.senderName || ""}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(n._id) }}
                  className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-error/10 hover:text-error flex items-center justify-center text-base-content/30 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationPanel