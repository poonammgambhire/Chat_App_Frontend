import { useState } from "react"
import { useAuthStore } from "../store/useAuthStore"
import { Link } from "react-router-dom"

const ProfilePage = () => {
  const { user, updateProfile, isLoading } = useAuthStore()
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    bio: user?.bio || "",
    profilePic: "",
  })
  const [preview, setPreview] = useState(user?.profilePic || "")

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
      setFormData({ ...formData, profilePic: reader.result })
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await updateProfile(formData)
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Top bar */}
      <div className="bg-base-100 border-b border-base-300 px-4 py-3 flex items-center gap-3">
        <Link to="/chat" className="w-9 h-9 rounded-xl hover:bg-base-200 flex items-center justify-center transition-colors">
          <svg className="w-5 h-5 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-display font-bold text-base-content text-lg">My Profile</h1>
        <button
          onClick={() => window.__toggleTheme?.()}
          className="ml-auto w-9 h-9 rounded-xl hover:bg-base-200 flex items-center justify-center transition-colors"
          title="Toggle theme"
        >
          <svg className="w-5 h-5 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>
      </div>

      <div className="max-w-lg mx-auto p-6 fade-in">
        <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden">
          {/* Cover / Avatar area */}
          <div className="h-24 bg-gradient-to-r from-primary to-secondary relative">
            <div className="absolute -bottom-10 left-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl border-4 border-base-100 overflow-hidden bg-base-300 shadow-lg">
                  <img
                    src={preview || "/avatar.png"}
                    alt="profile"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = "/avatar.png" }}
                  />
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-lg flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-14 px-6 pb-6">
            <p className="text-xs text-base-content/40 font-medium mb-1">{user?.email}</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-base-content/80 mb-1.5">Full name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-base-300 bg-base-200 text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-base-content/80 mb-1.5">
                  Bio <span className="text-base-content/30 font-normal">({formData.bio.length}/150)</span>
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-base-300 bg-base-200 text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
                  rows={3}
                  maxLength={150}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell people a bit about yourself..."
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-primary text-primary-content font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {isLoading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                ) : "Save Changes"}
              </button>
            </form>
          </div>
        </div>

        {/* Account info */}
        <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5 mt-4">
          <h3 className="text-sm font-semibold text-base-content/50 uppercase tracking-wide mb-3">Account Info</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-content/60">Member since</span>
              <span className="text-sm font-medium text-base-content">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-content/60">Status</span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                <span className="w-2 h-2 bg-success rounded-full pulse-dot" />
                Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage