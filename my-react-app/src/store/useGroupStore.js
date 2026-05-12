import { create } from "zustand"
import axiosInstance from "../lib/axios"
import { getSocket } from "../lib/socket"
import toast from "react-hot-toast"

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  pinnedGroupMessages: [],
  isLoading: false,
  groupTypingUsers: {}, // { groupId: [{ senderId, senderName }] }

  setSelectedGroup: (group) => set({ selectedGroup: group, groupMessages: [], pinnedGroupMessages: [] }),

  // ================= GET MY GROUPS =================
  getMyGroups: async () => {
    set({ isLoading: true })
    try {
      const res = await axiosInstance.get("/api/groups")
      set({ groups: Array.isArray(res.data) ? res.data : [] })
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load groups")
      set({ groups: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  // ================= CREATE GROUP =================
  createGroup: async (data) => {
    try {
      const res = await axiosInstance.post("/api/groups/create", data)
      set({ groups: [res.data, ...get().groups] })
      toast.success("Group created!")
      return res.data
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group")
      return null
    }
  },

  // ================= GET GROUP MESSAGES =================
  getGroupMessages: async (groupId) => {
    set({ isLoading: true })
    try {
      const res = await axiosInstance.get(`/api/groups/${groupId}/messages`)
      set({ groupMessages: Array.isArray(res.data) ? res.data : [] })
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load messages")
      set({ groupMessages: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  // ================= GET PINNED GROUP MESSAGES =================
  getPinnedGroupMessages: async (groupId) => {
    try {
      const res = await axiosInstance.get(`/api/groups/${groupId}/pinned`)
      set({ pinnedGroupMessages: Array.isArray(res.data) ? res.data : [] })
    } catch {
      set({ pinnedGroupMessages: [] })
    }
  },

  // ================= SEND GROUP MESSAGE =================
  sendGroupMessage: async (data) => {
    const { selectedGroup, groupMessages } = get()
    try {
      const res = await axiosInstance.post(`/api/groups/${selectedGroup._id}/send`, data)
      set({ groupMessages: [...groupMessages, res.data] })
      // Update lastMessage in groups list
      set({
        groups: get().groups.map((g) =>
          g._id === selectedGroup._id ? { ...g, lastMessage: res.data } : g
        ),
      })
    } catch (err) {
      toast.error(err.response?.data?.message || "Send failed")
    }
  },

  // ================= EDIT GROUP MESSAGE =================
  editGroupMessage: async (groupId, messageId, newText) => {
    try {
      const res = await axiosInstance.patch(
        `/api/groups/${groupId}/messages/${messageId}/edit`,
        { newText }
      )
      set({
        groupMessages: get().groupMessages.map((m) =>
          m._id === messageId
            ? { ...m, message: res.data.message, isEdited: true, editedAt: res.data.editedAt }
            : m
        ),
      })
    } catch (err) {
      toast.error(err.response?.data?.message || "Edit failed")
    }
  },

  // ================= DELETE GROUP MESSAGE =================
  deleteGroupMessage: async (groupId, messageId) => {
    try {
      await axiosInstance.delete(`/api/groups/${groupId}/messages/${messageId}`)
      set({ groupMessages: get().groupMessages.filter((m) => m._id !== messageId) })
      toast.success("Message deleted")
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed")
    }
  },

  // ================= REACT TO GROUP MESSAGE =================
  reactToGroupMessage: async (groupId, messageId, emoji) => {
    try {
      const res = await axiosInstance.post(
        `/api/groups/${groupId}/messages/${messageId}/react`,
        { emoji }
      )
      set({
        groupMessages: get().groupMessages.map((m) =>
          m._id === messageId ? { ...m, reactions: res.data.reactions } : m
        ),
      })
    } catch (err) {
      toast.error(err.response?.data?.message || "React failed")
    }
  },

  // ================= PIN GROUP MESSAGE =================
  pinGroupMessage: async (groupId, messageId) => {
    try {
      const res = await axiosInstance.patch(
        `/api/groups/${groupId}/messages/${messageId}/pin`
      )
      set({
        groupMessages: get().groupMessages.map((m) =>
          m._id === messageId
            ? { ...m, isPinned: res.data.isPinned, pinnedAt: res.data.pinnedAt }
            : m
        ),
      })
      await get().getPinnedGroupMessages(groupId)
      toast.success(res.data.isPinned ? "Message pinned!" : "Message unpinned")
    } catch (err) {
      toast.error(err.response?.data?.message || "Pin failed")
    }
  },

  // ================= FORWARD GROUP MESSAGE =================
  // Backend POST /api/groups/:id/messages/:msgId/forward  { targetGroupId }
  forwardGroupMessage: async (groupId, messageId, targetGroupId) => {
    try {
      const res = await axiosInstance.post(
        `/api/groups/${groupId}/messages/${messageId}/forward`,
        { targetGroupId }
      )
      toast.success("Message forwarded!")
      return res.data
    } catch (err) {
      toast.error(err.response?.data?.message || "Forward failed")
    }
  },

  // ================= ADD MEMBER =================
  addMember: async (groupId, userId) => {
    try {
      const res = await axiosInstance.post(`/api/groups/${groupId}/add-member`, { userId })
      set({
        groups: get().groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: get().selectedGroup?._id === groupId ? res.data : get().selectedGroup,
      })
      toast.success("Member added!")
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add member")
    }
  },

  // ================= REMOVE MEMBER =================
  removeMember: async (groupId, userId) => {
    try {
      await axiosInstance.post(`/api/groups/${groupId}/remove-member`, { userId })
      await get().getMyGroups()
      toast.success("Member removed!")
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member")
    }
  },

  // ================= MAKE ADMIN =================
  makeAdmin: async (groupId, userId) => {
    try {
      const res = await axiosInstance.post(`/api/groups/${groupId}/make-admin`, { userId })
      set({
        groups: get().groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: get().selectedGroup?._id === groupId ? res.data : get().selectedGroup,
      })
      toast.success("Admin transferred!")
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to transfer admin")
    }
  },

  // ================= LEAVE GROUP =================
  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/api/groups/${groupId}/leave`)
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: null,
        groupMessages: [],
      })
      toast.success("Left group!")
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave group")
    }
  },

  // ================= UPDATE GROUP =================
  updateGroup: async (groupId, data) => {
    try {
      const res = await axiosInstance.put(`/api/groups/${groupId}`, data)
      set({
        groups: get().groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: get().selectedGroup?._id === groupId ? res.data : get().selectedGroup,
      })
      toast.success("Group updated!")
      return res.data
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update group")
      return null
    }
  },

  // ================= DELETE GROUP =================
  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/api/groups/${groupId}`)
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: null,
        groupMessages: [],
      })
      toast.success("Group deleted!")
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete group")
    }
  },

  // ================= SOCKET SUBSCRIBE =================
  subscribeToGroupEvents: () => {
    const socket = getSocket()
    if (!socket) return

    socket.off("newGroup")
    socket.off("newGroupMessage")
    socket.off("groupDeleted")
    socket.off("removedFromGroup")
    socket.off("groupMessageEdited")
    socket.off("groupMessageDeleted")
    socket.off("groupMessageReaction")
    socket.off("groupMessagePinned")
    socket.off("groupUpdated")
    socket.off("groupUserTyping")
    socket.off("groupUserStoppedTyping")

    socket.on("newGroup", (group) => {
      const exists = get().groups.some((g) => g._id === group._id)
      if (!exists) {
        set({ groups: [group, ...get().groups] })
        toast(`👥 Added to group: ${group.name}`)
      }
    })

    socket.on("newGroupMessage", ({ groupId, message }) => {
      const { selectedGroup, groupMessages, groups } = get()

      // Update lastMessage in sidebar
      set({
        groups: groups.map((g) =>
          g._id === groupId
            ? { ...g, lastMessage: message, unreadCount: selectedGroup?._id === groupId ? 0 : (g.unreadCount || 0) + 1 }
            : g
        ),
      })

      if (selectedGroup && selectedGroup._id === groupId) {
        set({ groupMessages: [...groupMessages, message] })
      }
    })

    socket.on("groupDeleted", ({ groupId }) => {
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
        groupMessages: get().selectedGroup?._id === groupId ? [] : get().groupMessages,
      })
      toast("Group deleted by admin")
    })

    socket.on("removedFromGroup", ({ groupId }) => {
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
        groupMessages: get().selectedGroup?._id === groupId ? [] : get().groupMessages,
      })
      toast("You were removed from a group")
    })

    // ✅ Group message edit real-time
    socket.on("groupMessageEdited", ({ groupId, messageId, newText, editedAt }) => {
      if (get().selectedGroup?._id === groupId) {
        set({
          groupMessages: get().groupMessages.map((m) =>
            m._id === messageId ? { ...m, message: newText, isEdited: true, editedAt } : m
          ),
        })
      }
    })

    // ✅ Group message delete real-time
    socket.on("groupMessageDeleted", ({ groupId, messageId }) => {
      if (get().selectedGroup?._id === groupId) {
        set({ groupMessages: get().groupMessages.filter((m) => m._id !== messageId) })
      }
    })

    // ✅ Group message reaction real-time
    socket.on("groupMessageReaction", ({ groupId, messageId, reactions }) => {
      if (get().selectedGroup?._id === groupId) {
        set({
          groupMessages: get().groupMessages.map((m) =>
            m._id === messageId ? { ...m, reactions } : m
          ),
        })
      }
    })

    // ✅ Group message pin real-time
    socket.on("groupMessagePinned", ({ groupId, messageId, isPinned, pinnedAt }) => {
      if (get().selectedGroup?._id === groupId) {
        set({
          groupMessages: get().groupMessages.map((m) =>
            m._id === messageId ? { ...m, isPinned, pinnedAt } : m
          ),
        })
        get().getPinnedGroupMessages(groupId)
      }
    })

    // ✅ Group updated (admin change, name change, etc.)
    socket.on("groupUpdated", (updatedGroup) => {
      set({
        groups: get().groups.map((g) => (g._id === updatedGroup._id ? updatedGroup : g)),
        selectedGroup:
          get().selectedGroup?._id === updatedGroup._id
            ? updatedGroup
            : get().selectedGroup,
      })
    })

    // ✅ Group typing indicators
    socket.on("groupUserTyping", ({ senderId, senderName, groupId }) => {
      const prev = get().groupTypingUsers
      const existing = prev[groupId] || []
      if (!existing.find((u) => u.senderId === senderId)) {
        set({
          groupTypingUsers: {
            ...prev,
            [groupId]: [...existing, { senderId, senderName }],
          },
        })
      }
    })

    socket.on("groupUserStoppedTyping", ({ senderId, groupId }) => {
      const prev = get().groupTypingUsers
      const existing = (prev[groupId] || []).filter((u) => u.senderId !== senderId)
      set({
        groupTypingUsers: { ...prev, [groupId]: existing },
      })
    })
  },

  unsubscribeFromGroupEvents: () => {
    const socket = getSocket()
    if (!socket) return
    socket.off("newGroup")
    socket.off("newGroupMessage")
    socket.off("groupDeleted")
    socket.off("removedFromGroup")
    socket.off("groupMessageEdited")
    socket.off("groupMessageDeleted")
    socket.off("groupMessageReaction")
    socket.off("groupMessagePinned")
    socket.off("groupUpdated")
    socket.off("groupUserTyping")
    socket.off("groupUserStoppedTyping")
  },
}))