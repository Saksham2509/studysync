import React, { useState } from "react";
import RoomJoin from "../components/RoomJoin";
import UserList from "../components/UserList";
import Chat from "../components/Chat";
import Timer from "../components/Timer";

const StudyRoom = () => {
  const [room, setRoom] = useState("");
  const [userName, setUserName] = useState("");
  const [isHost, setIsHost] = useState(false);

  if (!room || !userName) {
    return <RoomJoin setRoom={setRoom} setUserName={setUserName} setIsHost={setIsHost} />;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Room: {room}</h1>
      <UserList room={room} />
      <Timer room={room} isHost={isHost} />
      <Chat room={room} userName={userName} />
      <button
        className="mt-4 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        onClick={() => setRoom("")}
      >
        Leave Room
      </button>
    </div>
  );
};

export default StudyRoom;
