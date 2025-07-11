import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../contexts/SocketContext";

const Timer = ({ room, isHost }) => {
  const socket = useSocket();
  const [timer, setTimer] = useState({ running: false, seconds: 25 * 60, label: "Custom Timer" });
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [customSeconds, setCustomSeconds] = useState(0);
  const intervalRef = useRef(null);

  // Listen for timer:update from server
  useEffect(() => {
    if (!socket || !room) return;
    const handleUpdate = (newTimer) => {
      setTimer(newTimer);
      // Play sound on start/end
      if (newTimer.running) {
        try {
          new Audio("/sounds/start.mp3").play().catch(() => {});
        } catch (e) {}
      }
      if (!newTimer.running && newTimer.seconds === 0) {
        try {
          new Audio("/sounds/end.mp3").play().catch(() => {});
        } catch (e) {}
      }
    };
    socket.on("timer:update", handleUpdate);
    return () => socket.off("timer:update", handleUpdate);
  }, [socket, room]);

  // Host controls ticking
  useEffect(() => {
    if (!isHost || !timer.running) return;
    intervalRef.current = setInterval(() => {
      if (timer.seconds > 0) {
        socket.emit("timer:tick", { room, seconds: timer.seconds - 1 });
      } else {
        // Optionally handle mode switch here
        socket.emit("timer:pause", { room });
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isHost, timer.running, timer.seconds, room, socket]);

  // Host controls
  const start = () => {
    if (isHost && socket) {
      console.log("[Timer] Emitting timer:start", { room, timer: { ...timer, running: true } });
      socket.emit("timer:start", { room, timer: { ...timer, running: true } });
    }
  };
  
  const pause = () => {
    if (isHost && socket) {
      console.log("[Timer] Emitting timer:pause", { room });
      socket.emit("timer:pause", { room });
    }
  };
  
  const reset = () => {
    if (isHost && socket) {
      const totalSeconds = customMinutes * 60 + customSeconds;
      const newTimer = { 
        running: false, 
        seconds: totalSeconds, 
        label: `${customMinutes}:${String(customSeconds).padStart(2, '0')} Timer`
      };
      console.log("[Timer] Emitting timer:reset", { room, timer: newTimer });
      socket.emit("timer:reset", { room, timer: newTimer });
    }
  };

  const setCustomTimer = () => {
    if (isHost && socket && !timer.running) {
      const totalSeconds = customMinutes * 60 + customSeconds;
      if (totalSeconds > 0) {
        const newTimer = { 
          running: false, 
          seconds: totalSeconds, 
          label: `${customMinutes}:${String(customSeconds).padStart(2, '0')} Timer`
        };
        console.log("[Timer] Setting custom timer", { room, timer: newTimer });
        socket.emit("timer:reset", { room, timer: newTimer });
        setShowCustomInput(false);
      }
    }
  };

  const quickSetTimer = (minutes) => {
    if (isHost && socket && !timer.running) {
      const newTimer = { 
        running: false, 
        seconds: minutes * 60, 
        label: `${minutes} Min Timer`
      };
      console.log("[Timer] Setting quick timer", { room, timer: newTimer });
      socket.emit("timer:reset", { room, timer: newTimer });
    }
  };

  useEffect(() => {
    if (!socket) return;
    socket.on("connect", () => console.log("[Socket] Connected", socket.id));
    socket.on("disconnect", () => console.log("[Socket] Disconnected"));
    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-4 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl text-gray-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {timer.label}
        </h2>
        <div className="text-sm text-gray-500">
          {isHost ? "Host Controls" : "Synced Timer"}
        </div>
      </div>
      
      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className="text-6xl font-mono mb-2 text-gray-800 bg-gray-50 rounded-lg py-4 px-6 inline-block border">
          {String(Math.floor(timer.seconds / 60)).padStart(2, "0")}:
          {String(timer.seconds % 60).padStart(2, "0")}
        </div>
        <div className="text-sm text-gray-600 mt-2">
          {timer.running ? (
            <span className="text-green-600 font-medium flex items-center justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Running
            </span>
          ) : (
            <span className="text-gray-500">Paused</span>
          )}
        </div>
      </div>

      {isHost && (
        <div className="space-y-4">
          {/* Control Buttons */}
          <div className="flex gap-2 justify-center">
            <button 
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={start} 
              disabled={timer.running}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-4a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start
            </button>
            <button 
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={pause} 
              disabled={!timer.running}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
              Pause
            </button>
            <button 
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
              onClick={reset}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>

          {/* Quick Timer Buttons */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Set:</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {[5, 10, 15, 25, 30, 45, 60].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => quickSetTimer(minutes)}
                  disabled={timer.running}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {minutes}m
                </button>
              ))}
            </div>
          </div>

          {/* Custom Timer Input */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Custom Timer:</h3>
              <button
                onClick={() => setShowCustomInput(!showCustomInput)}
                disabled={timer.running}
                className="text-blue-500 hover:text-blue-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showCustomInput ? 'Hide' : 'Set Custom'}
              </button>
            </div>
            
            {showCustomInput && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      disabled={timer.running}
                    />
                    <span className="ml-1 text-sm text-gray-600">min</span>
                  </div>
                  <span className="text-gray-500">:</span>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={customSeconds}
                      onChange={(e) => setCustomSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      disabled={timer.running}
                    />
                    <span className="ml-1 text-sm text-gray-600">sec</span>
                  </div>
                </div>
                <button
                  onClick={setCustomTimer}
                  disabled={timer.running || (customMinutes === 0 && customSeconds === 0)}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Set Timer ({customMinutes}:{String(customSeconds).padStart(2, '0')})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {!isHost && (
        <div className="text-center">
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg py-3 px-4 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Only the host can control the timer
          </div>
        </div>
      )}
    </div>
  );
};

export default Timer;
