import { useFriendStore } from "../store/useFriendStore"

const FriendRequest = ({ request }) => {
  const { acceptFriendRequest, rejectFriendRequest } = useFriendStore()

  return (
    <div className="bg-base-100 rounded-2xl p-4 flex items-center justify-between border border-base-300 shadow-sm fade-in">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-base-300 flex-shrink-0">
          <img
            src={request.profilePic || "/avatar.png"}
            alt={request.fullName}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = "/avatar.png" }}
          />
        </div>
        <div>
          <p className="font-semibold text-base-content">{request.fullName}</p>
          <p className="text-xs text-base-content/50">{request.bio || request.email || "Wants to be your friend"}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => acceptFriendRequest(request._id)}
          className="px-3 py-1.5 rounded-xl bg-success text-white text-sm font-semibold hover:bg-success/90 transition-colors shadow-sm"
        >
          Accept
        </button>
        <button
          onClick={() => rejectFriendRequest(request._id)}
          className="px-3 py-1.5 rounded-xl bg-base-200 text-base-content/70 text-sm font-semibold hover:bg-base-300 transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  )
}

export default FriendRequest