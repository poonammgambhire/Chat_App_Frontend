const OnlineStatus = ({ isOnline }) => (
  <span
    className={`block w-3 h-3 rounded-full border-2 border-base-100 ${isOnline ? "bg-success" : "bg-base-300"}`}
  />
)

export default OnlineStatus