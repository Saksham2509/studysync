import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../contexts/SocketContext";

const MODES = {
  focus: { label: "Focus", seconds: 25 * 60 },
  short_break: { label: "Short Break", seconds: 5 * 60 },
  long_break: { label: "Long Break", seconds: 15 * 60 },
};

const Timer = ({ room, isHost }) => {
  const socket = useSocket();
  const [timer, setTimer] = useState({ running: false, mode: "focus", seconds: MODES.focus.seconds });
  const intervalRef = useRef(null);

  // Listen for timer:update from server
  useEffect(() => {
    if (!socket || !room) return;
    const handleUpdate = (newTimer) => {
      setTimer(newTimer);
      // Play sound on start/end
      if (newTimer.running) new Audio("/sounds/start.mp3").play();
      if (!newTimer.running && newTimer.seconds === MODES[newTimer.mode].seconds) new Audio("/sounds/end.mp3").play();
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
      console.log("[Timer] Emitting timer:reset", { room, timer: { mode: "focus", seconds: MODES.focus.seconds } });
      socket.emit("timer:reset", { room, timer: { mode: "focus", seconds: MODES.focus.seconds } });
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
    <div className="bg-white rounded shadow p-4 mb-4 flex flex-col items-center">
      <h2 className="font-bold mb-2">{MODES[timer.mode].label} Timer</h2>
      <div className="text-4xl font-mono mb-2">{String(Math.floor(timer.seconds / 60)).padStart(2, "0")}:{String(timer.seconds % 60).padStart(2, "0")}</div>
      {isHost && (
        <div className="flex gap-2">
          <button className="bg-green-500 text-white px-3 py-1 rounded" onClick={start} disabled={timer.running}>Start</button>
          <button className="bg-yellow-500 text-white px-3 py-1 rounded" onClick={pause} disabled={!timer.running}>Pause</button>
          <button className="bg-red-500 text-white px-3 py-1 rounded" onClick={reset}>Reset</button>
        </div>
      )}
      {!isHost && <div className="text-xs text-gray-400">Waiting for host to control the timer...</div>}
    </div>
  );
};

export default Timer;
