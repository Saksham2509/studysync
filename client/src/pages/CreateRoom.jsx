import React, { useState } from "react";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";

const CreateRoom = () => {
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [allowedUsers, setAllowedUsers] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Validation: Private rooms must have a password
    if (!isPublic && !password.trim()) {
      setError("Private rooms must have a password!");
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "/api/rooms",
        {
          name: roomName,
          isPublic,
          password: !isPublic ? password : undefined,
          allowedUsers: isPublic
            ? []
            : allowedUsers
                .split(",")
                .map((email) => email.trim())
                .filter(Boolean),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("Room created successfully! Redirecting...");
      
      // Mark this room as created by this user in this session
      localStorage.setItem("createdRoom", roomName);
      
      setTimeout(() => {
        navigate(`/room/${encodeURIComponent(roomName)}`);
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create room. Try another name."
      );
    }
  };

  return (
    <form
      className="flex flex-col gap-3 max-w-md mx-auto mt-10 bg-white p-6 rounded shadow"
      onSubmit={handleSubmit}
    >
      <h2 className="text-xl font-bold mb-2">Create a Room</h2>
      <input
        className="border p-2 rounded"
        placeholder="Room Name"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        required
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => {
            setIsPublic(e.target.checked);
            // Clear password when switching to public
            if (e.target.checked) {
              setPassword("");
            }
          }}
        />
        Public Room
      </label>
      {!isPublic && (
        <>
          <div className="text-sm text-gray-600 mb-2">
            ⚠️ Private rooms require a password for security
          </div>
          <input
            type="password"
            className="border p-2 rounded"
            placeholder="Room Password (required for private rooms)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <textarea
            className="border p-2 rounded"
            placeholder="Allowed user emails (comma separated)"
            value={allowedUsers}
            onChange={(e) => setAllowedUsers(e.target.value)}
          />
        </>
      )}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">{success}</div>}
      <button
        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        type="submit"
      >
        Create Room
      </button>
    </form>
  );
};

export default CreateRoom;
