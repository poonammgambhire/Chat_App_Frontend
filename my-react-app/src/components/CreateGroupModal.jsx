import { useState } from "react"
import { useGroupStore } from "../store/useGroupStore"
import { useChatStore } from "../store/useChatStore"

const CreateGroupModal = ({ onClose }) => {
  const { createGroup } = useGroupStore()
  const { users } = useChatStore()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedMembers, setSelectedMembers] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const [search, setSearch] = useState("")

  const filteredUsers = (Array.isArray(users) ? users : []).filter(u =>
    u.fullName?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    if (selectedMembers.length < 1) return
    setIsCreating(true)
    await createGroup({ name, description, members: selectedMembers })
    setIsCreating(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col fade-in" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-base-300">
          <h2 className="font-bold text-base-content text-lg">New Group</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-base-200 flex items-center justify-center text-base-content/50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-semibold text-base-content/80 mb-1.5">Group Name *</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-base-300 bg-base-200 text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              placeholder="Enter group name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-base-content/80 mb-1.5">Description</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-base-300 bg-base-200 text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              placeholder="Optional..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={150}
            />
          </div>

          {/* Members */}
          <div>
            <label className="block text-sm font-semibold text-base-content/80 mb-1.5">
              Add Members * ({selectedMembers.length} selected)
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-base-300 bg-base-200 text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all mb-2"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredUsers.map(user => {
                const isSelected = selectedMembers.includes(user._id)
                return (
                  <button
                    key={user._id}
                    onClick={() => toggleMember(user._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                      isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-base-200 border border-transparent"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-base-300 flex-shrink-0">
                      <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="w-full h-full object-cover" onError={e => { e.target.src = "/avatar.png" }} />
                    </div>
                    <p className="text-sm font-semibold text-base-content flex-1">{user.fullName}</p>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-base-300">
          <button
            onClick={handleCreate}
            disabled={!name.trim() || selectedMembers.length < 1 || isCreating}
            className="w-full py-3 rounded-xl bg-primary text-primary-content font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</>
            ) : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateGroupModal