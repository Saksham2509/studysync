const Home = () => {
  return (
    <section className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-400 via-blue-300 to-blue-100 p-6 relative overflow-hidden">
      {/* Decorative Gradient Circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-200 rounded-full opacity-40 blur-2xl z-0" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-200 rounded-full opacity-40 blur-2xl z-0" />
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-purple-800 mb-4 drop-shadow-lg">
          Welcome to StudySync
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-2xl mb-6">
          Join your friends and study together with real-time timers, break sessions, chat, and collaborative task tracking. Stay focused and motivated in your virtual study room!
        </p>
      </div>
    </section>
  );
};

export default Home;
