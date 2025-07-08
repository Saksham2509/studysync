import React, { useState } from "react";
import { useSocket } from "../contexts/SocketContext";

// RoomJoin emits 'joinRoom' with userName and room
const RoomJoin = ({ setRoom, setIsHost, setUserName }) => {
  const [roomInput, setRoomInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [host, setHost] = useState(false);
  const socket = useSocket();

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomInput || !nameInput || !socket) return;
    setRoom(roomInput);
    setUserName(nameInput);
    setIsHost(host);
    // Emit userName and room to backend, only if socket is ready
    socket.emit("joinRoom", { room: roomInput, userName: nameInput });
  };

  return (
    <form className="flex flex-col gap-2 max-w-xs mx-auto mt-10" onSubmit={handleJoin}>
      <input
        className="border p-2 rounded"
        placeholder="Your Name"
        value={nameInput}
        onChange={e => setNameInput(e.target.value)}
      />
      <input
        className="border p-2 rounded"
        placeholder="Room Name"
        value={roomInput}
        onChange={e => setRoomInput(e.target.value)}
      />
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={host} onChange={e => setHost(e.target.checked)} />
        Join as Host
      </label>
      <button className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600" type="submit" disabled={!socket}>
        {socket ? "Join Room" : "Connecting..."}
      </button>
    </form>
  );
};

export default RoomJoin;
