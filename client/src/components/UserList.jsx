import React, { useEffect, useState } from "react";
import { useSocket } from "../contexts/SocketContext";

// UserList listens for the 'roomUsers' event and displays all user names in the room
const UserList = ({ room }) => {
  const socket = useSocket();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!socket || !room) return;
    const handleRoomUsers = (userList) => setUsers(userList);
    socket.on("roomUsers", handleRoomUsers);
    return () => socket.off("roomUsers", handleRoomUsers);
  }, [socket, room]);

  return (
    <div className="bg-white rounded shadow p-4 mb-4">
      <h2 className="font-bold mb-2">Active Users</h2>
      <ul className="space-y-1">
        {users.map((u) => (
          <li key={u.id} className="text-gray-700">{u.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
