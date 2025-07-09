import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="bg-purple-600 p-4 text-white flex justify-between">
      <Link to="/" className="text-xl font-bold">StudySync</Link>
      <div className="flex space-x-4 items-center">
        <Link to="/" className="hover:text-gray-300">Home</Link>
        <Link to="/create-room" className="hover:text-gray-300">Create Room</Link>
        {isAuthenticated ? (
          <>
            <span className="text-sm">{user?.name || 'User'}</span>
            <button 
              onClick={logout} 
              className="hover:text-gray-300 text-sm bg-purple-700 px-2 py-1 rounded"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-gray-300">Login</Link>
            <Link to="/signup" className="hover:text-gray-300">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
