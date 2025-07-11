import React, { useState } from "react";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";

const CreateRoom = () => {
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!roomName.trim()) {
      setError("Room name is required!");
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "/api/rooms",
        { name: roomName },
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
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Create Study Room</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          required
        />
        
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        
        <button
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 transition duration-200"
          type="submit"
        >
          Create Public Room
        </button>
      </form>
    </div>
  );
};

export default CreateRoom;
