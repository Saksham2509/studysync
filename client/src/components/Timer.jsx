import { useState, useEffect } from "react";

export default function Timer() {
  const [seconds, setSeconds] = useState(1500); // 25 min default
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((s) => s > 0 ? s - 1 : 0);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = () => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-purple-600">{formatTime()}</h2>
      <button
        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        onClick={() => setIsActive(!isActive)}
      >
        {isActive ? "Pause" : "Start"}
      </button>
    </div>
  );
}
