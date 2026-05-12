import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import axiosInstance from "../lib/axios"
import toast from "react-hot-toast"

const STEPS = [
  { icon: "📧", title: "Forgot Password", sub: "Enter your registered email address" },
  { icon: "🛡️", title: "Verify OTP", sub: "Enter the 6-digit OTP sent to your email" },
  { icon: "🔒", title: "New Password", sub: "Create a strong new password" },
]

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [showPass1, setShowPass1] = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => setResendTimer(t => t - 1), 1000)
    }
    return () => clearTimeout(timerRef.current)
  }, [resendTimer])

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault()
    const trimEmail = email.trim().toLowerCase()
    if (!trimEmail) return toast.error("Please enter your email")
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimEmail)) return toast.error("Please enter a valid email")

    setIsLoading(true)
    try {
      await axiosInstance.post("/api/auth/forgot-password", { email: trimEmail })
      toast.success("OTP sent! Check your email (also spam folder)")
      setResendTimer(60)
      setStep(1)
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault()
    if (otp.trim().length !== 6) return toast.error("Please enter the 6-digit OTP")

    setIsLoading(true)
    try {
      const res = await axiosInstance.post("/api/auth/verify-otp", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      })
      setResetToken(res.data.resetToken)
      toast.success("OTP verified! ✓")
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e?.preventDefault()
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters")
    if (newPassword !== confirmPass) return toast.error("Passwords do not match")

    setIsLoading(true)
    try {
      await axiosInstance.post("/api/auth/reset-password", {
        email: email.trim().toLowerCase(),
        resetToken,
        newPassword,
      })
      toast.success("Password reset successful! 🎉")
      setTimeout(() => window.location.href = "/login", 1500)
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed")
    } finally {
      setIsLoading(false)
    }
  }

  // Resend OTP
  const handleResend = async () => {
    if (resendTimer > 0) return
    setOtp("")
    setIsLoading(true)
    try {
      await axiosInstance.post("/api/auth/forgot-password", { email: email.trim().toLowerCase() })
      toast.success("OTP resent!")
      setResendTimer(60)
    } catch {
      toast.error("Failed to resend OTP")
    } finally {
      setIsLoading(false)
    }
  }

  const strengthLevel = newPassword.length === 0 ? 0 : newPassword.length < 4 ? 1 : newPassword.length < 8 ? 2 : newPassword.length < 12 ? 3 : 4
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"]
  const strengthColors = ["", "#ef4444", "#f59e0b", "#6366f1", "#22c55e"]

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-content" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-base-content">ChatApp</span>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                i < step ? "bg-success border-success text-white" :
                i === step ? "bg-primary border-primary text-primary-content" :
                "bg-base-100 border-base-300 text-base-content/40"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 transition-all ${i < step ? "bg-success" : "bg-base-300"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-base-100 rounded-2xl p-8 shadow-lg border border-base-300">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">{STEPS[step].icon}</div>
            <h2 className="text-2xl font-bold text-base-content">{STEPS[step].title}</h2>
            <p className="text-base-content/50 text-sm mt-1">{STEPS[step].sub}</p>
            {step >= 1 && (
              <div className="inline-flex items-center gap-1.5 mt-2 bg-base-200 rounded-full px-3 py-1">
                <span className="text-xs">📧</span>
                <span className="text-xs font-semibold text-primary">{email}</span>
              </div>
            )}
          </div>

          {/* Step 0: Email */}
          {step === 0 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-content/50 uppercase tracking-wide mb-1.5">Email Address</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-xl border border-base-300 bg-base-200 text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                <span className="text-blue-500 text-sm mt-0.5">ℹ️</span>
                <p className="text-xs text-blue-600 dark:text-blue-400">OTP will be sent to your email. Check spam folder too.</p>
              </div>
              <button
                type="submit"
                disabled={!email.trim() || isLoading}
                className="w-full py-3 rounded-xl bg-primary text-primary-content font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <span className="loading loading-spinner loading-sm" /> : <><span>📨</span> Send OTP</>}
              </button>
            </form>
          )}

          {/* Step 1: OTP */}
          {step === 1 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-content/50 uppercase tracking-wide mb-1.5">6-Digit OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full px-4 py-4 rounded-xl border border-base-300 bg-base-200 text-base-content text-center text-2xl font-bold tracking-widest placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0 || isLoading}
                className="w-full text-sm text-primary font-semibold disabled:text-base-content/40 disabled:cursor-not-allowed transition-all py-1"
              >
                {resendTimer > 0 ? `🔄 Resend OTP in ${resendTimer}s` : "🔄 Resend OTP"}
              </button>
              <button
                type="submit"
                disabled={otp.length !== 6 || isLoading}
                className="w-full py-3 rounded-xl bg-primary text-primary-content font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <span className="loading loading-spinner loading-sm" /> : <><span>🛡️</span> Verify OTP</>}
              </button>
              <button type="button" onClick={() => setStep(0)} className="w-full text-sm text-base-content/40 hover:text-base-content/70 transition-colors py-1">
                ← Change email
              </button>
            </form>
          )}

          {/* Step 2: New Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-content/50 uppercase tracking-wide mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPass1 ? "text" : "password"}
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-base-300 bg-base-200 text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPass1(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70">
                    {showPass1 ? "🙈" : "👁️"}
                  </button>
                </div>
                {/* Strength bar */}
                {newPassword.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{
                        backgroundColor: i <= strengthLevel ? strengthColors[strengthLevel] : "#e5e7eb"
                      }} />
                    ))}
                    <span className="text-xs font-semibold" style={{ color: strengthColors[strengthLevel], minWidth: 36 }}>
                      {strengthLabels[strengthLevel]}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content/50 uppercase tracking-wide mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPass2 ? "text" : "password"}
                    className={`w-full px-4 py-3 pr-11 rounded-xl border bg-base-200 text-base-content placeholder:text-base-content/30 focus:outline-none focus:ring-2 transition-all ${
                      confirmPass && newPassword !== confirmPass
                        ? "border-error focus:ring-error/40"
                        : "border-base-300 focus:ring-primary/40 focus:border-primary"
                    }`}
                    placeholder="Re-enter password"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPass2(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70">
                    {showPass2 ? "🙈" : "👁️"}
                  </button>
                </div>
                {confirmPass && newPassword !== confirmPass && (
                  <p className="text-xs text-error mt-1 font-medium">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={newPassword.length < 6 || newPassword !== confirmPass || isLoading}
                className="w-full py-3 rounded-xl bg-primary text-primary-content font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? <span className="loading loading-spinner loading-sm" /> : <><span>✅</span> Reset Password</>}
              </button>
            </form>
          )}

          <div className="text-center mt-5">
            <Link to="/login" className="text-sm text-primary font-semibold hover:text-primary/80 transition-colors">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage