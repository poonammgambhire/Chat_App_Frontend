import { useEffect, useState } from "react"
import { useFriendStore } from "../store/useFriendStore"
import { useChatStore } from "../store/useChatStore"
import FriendRequest from "../components/FriendRequest"
import { Link, useNavigate } from "react-router-dom"
import axiosInstance from "../lib/axios"

const FriendsPage = () => {
  const {
    friends,
    requestsReceived,
    requestsSent,
    blockedUsers,
    getFriends,
    getBlockedUsers,
    unfriend,
    unblockUser,
    blockUser,
    sendFriendRequest,
  } = useFriendStore()

  const { setSelectedUser } = useChatStore()
  const navigate = useNavigate()

  const [tab, setTab] = useState("friends")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    getFriends()
    getBlockedUsers()
  }, [getFriends, getBlockedUsers])

  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    setIsSearching(true)
    try {
      const res = await axiosInstance.get(`/api/messages/search?query=${encodeURIComponent(q)}`)
      setSearchResults(Array.isArray(res.data) ? res.data : [])
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleMessageFriend = (friend) => {
    setSelectedUser(friend)
    navigate("/chat")
  }

  // ✅ Safe array fallbacks — prevents crash if store not yet loaded
  const safeFriends          = Array.isArray(friends)          ? friends          : []
  const safeRequestsReceived = Array.isArray(requestsReceived) ? requestsReceived : []
  const safeRequestsSent     = Array.isArray(requestsSent)     ? requestsSent     : []
  const safeBlockedUsers     = Array.isArray(blockedUsers)     ? blockedUsers     : []

  const isFriend       = (userId) => safeFriends.some((f) => f._id === userId)
  const isRequestSent  = (userId) => safeRequestsSent.some((r) => r._id === userId)

  const tabs = [
    { key: "friends",  label: "Friends",    count: safeFriends.length },
    { key: "requests", label: "Requests",   count: safeRequestsReceived.length },
    { key: "search",   label: "Find People", count: null },
    { key: "blocked",  label: "Blocked",    count: safeBlockedUsers.length },
  ]

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 border-b border-base-300 px-4 py-3 flex items-center gap-3">
        <Link
          to="/chat"
          className="w-9 h-9 rounded-xl hover:bg-base-200 flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-display font-bold text-base-content text-lg">Friends</h1>
      </div>

      {/* Tabs */}
      <div className="bg-base-100 border-b border-base-300 px-4 flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-base-content/50 hover:text-base-content"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.key ? "bg-primary text-primary-content" : "bg-base-300 text-base-content/60"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-4 fade-in">

        {/* ── FRIENDS TAB ── */}
        {tab === "friends" && (
          <div className="space-y-3">
            {safeFriends.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-base-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-base-content/40 font-medium">No friends yet</p>
                <p className="text-base-content/30 text-sm mt-1">Use "Find People" to connect with others</p>
                <button
                  onClick={() => setTab("search")}
                  className="mt-4 px-5 py-2 rounded-xl bg-primary text-primary-content text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Find People
                </button>
              </div>
            ) : (
              safeFriends.map((friend) => (
                <div
                  key={friend._id}
                  className="bg-base-100 rounded-2xl p-4 flex items-center justify-between border border-base-300 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-base-300 flex-shrink-0">
                      <img
                        src={friend.profilePic || "/avatar.png"}
                        alt={friend.fullName}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = "/avatar.png" }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-base-content">{friend.fullName}</p>
                      <p className="text-xs text-base-content/50">{friend.bio || "No bio"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleMessageFriend(friend)}
                      className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
                    >
                      Message
                    </button>
                    {/* ✅ Block button — calls POST /api/friends/block/:id */}
                    <button
                      onClick={() => blockUser(friend._id)}
                      className="px-3 py-1.5 rounded-xl bg-base-200 text-base-content/60 text-sm font-semibold hover:bg-base-300 transition-colors"
                    >
                      Block
                    </button>
                    <button
                      onClick={() => unfriend(friend._id)}
                      className="px-3 py-1.5 rounded-xl bg-error/10 text-error text-sm font-semibold hover:bg-error/20 transition-colors"
                    >
                      Unfriend
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── REQUESTS TAB ── */}
        {tab === "requests" && (
          <div className="space-y-3">
            {/* Incoming requests */}
            {safeRequestsReceived.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-base-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <p className="text-base-content/40 font-medium">No pending requests</p>
              </div>
            ) : (
              safeRequestsReceived.map((req) => (
                <FriendRequest key={req._id} request={req} />
              ))
            )}

            {/* Sent (pending) requests */}
            {safeRequestsSent.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wide mb-3">
                  Sent Requests ({safeRequestsSent.length})
                </p>
                {safeRequestsSent.map((req) => (
                  <div
                    key={req._id}
                    className="bg-base-100 rounded-2xl p-4 flex items-center justify-between border border-base-300 shadow-sm mb-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-base-300 flex-shrink-0">
                        <img
                          src={req.profilePic || "/avatar.png"}
                          alt={req.fullName}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = "/avatar.png" }}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-base-content text-sm">{req.fullName}</p>
                        <p className="text-xs text-base-content/40">Request pending...</p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-base-300 text-base-content/50 text-xs font-semibold">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SEARCH / FIND PEOPLE TAB ── */}
        {tab === "search" && (
          <div>
            <div className="relative mb-4">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-base-300 bg-base-100 text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              )}
            </div>

            <div className="space-y-3">
              {searchResults.length === 0 && searchQuery && !isSearching && (
                <div className="text-center py-10 text-base-content/40 text-sm">
                  No users found for "{searchQuery}"
                </div>
              )}
              {searchResults.map((u) => (
                <div
                  key={u._id}
                  className="bg-base-100 rounded-2xl p-4 flex items-center justify-between border border-base-300 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-base-300 flex-shrink-0">
                      <img
                        src={u.profilePic || "/avatar.png"}
                        alt={u.fullName}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = "/avatar.png" }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-base-content">{u.fullName}</p>
                      <p className="text-xs text-base-content/50">{u.email}</p>
                    </div>
                  </div>
                  {isFriend(u._id) ? (
                    <span className="px-3 py-1.5 rounded-xl bg-success/10 text-success text-sm font-semibold">
                      Friends ✓
                    </span>
                  ) : isRequestSent(u._id) ? (
                    <span className="px-3 py-1.5 rounded-xl bg-base-300 text-base-content/50 text-sm font-semibold">
                      Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(u._id)}
                      className="px-3 py-1.5 rounded-xl bg-primary text-primary-content text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
                    >
                      Add Friend
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BLOCKED TAB ── */}
        {tab === "blocked" && (
          <div className="space-y-3">
            {safeBlockedUsers.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-base-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <p className="text-base-content/40 font-medium">No blocked users</p>
              </div>
            ) : (
              safeBlockedUsers.map((u) => (
                <div
                  key={u._id}
                  className="bg-base-100 rounded-2xl p-4 flex items-center justify-between border border-base-300 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-base-300 opacity-60 flex-shrink-0">
                      <img
                        src={u.profilePic || "/avatar.png"}
                        alt={u.fullName}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = "/avatar.png" }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-base-content/60">{u.fullName}</p>
                      <p className="text-xs text-error/70 font-medium">Blocked</p>
                    </div>
                  </div>
                  {/* ✅ Unblock — calls POST /api/friends/unblock/:id */}
                  <button
                    onClick={() => unblockUser(u._id)}
                    className="px-3 py-1.5 rounded-xl bg-warning/10 text-warning text-sm font-semibold hover:bg-warning/20 transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default FriendsPage