import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  
  return (
    <section className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-400 via-blue-300 to-blue-100 p-6 relative overflow-hidden">
      {/* Decorative Gradient Circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-200 rounded-full opacity-40 blur-2xl z-0" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-200 rounded-full opacity-40 blur-2xl z-0" />
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-purple-800 mb-4 drop-shadow-lg">
          Welcome to StudySync
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-2xl mb-8">
          Join your friends and study together with real-time timers, break sessions, chat, and collaborative task tracking. Stay focused and motivated in your virtual study room!
        </p>
        
        {isAuthenticated && user ? (
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <Link 
              to="/study-room" 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors text-center"
            >
              Join a Room
            </Link>
            <Link 
              to="/create-room" 
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors text-center"
            >
              Create Room
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <Link 
              to="/login" 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors text-center"
            >
              Log In
            </Link>
            <Link 
              to="/signup" 
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors text-center"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default Home;
