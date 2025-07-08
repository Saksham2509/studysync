import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../contexts/SocketContext";

const Chat = ({ room, userName }) => {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket || !room) return;
    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      new Audio("/sounds/message.mp3").play();
    };
    const handleHistory = (history) => {
      setMessages(history.map(m => ({
        ...m,
        timestamp: m.createdAt || m.timestamp
      })));
    };
    socket.on("chat:message", handleMessage);
    socket.on("chat:history", handleHistory);
    return () => {
      socket.off("chat:message", handleMessage);
      socket.off("chat:history", handleHistory);
    };
  }, [socket, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    const message = {
      user: userName,
      text: input,
      timestamp: new Date().toISOString(),
    };
    socket.emit("chat:message", { room, message });
    setInput("");
  };

  return (
    <div className="bg-white rounded shadow p-4 flex flex-col h-64 mb-4">
      <div className="flex-1 overflow-y-auto mb-2">
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-1">
            <span className="font-semibold text-blue-600">{msg.user}: </span>
            <span>{msg.text}</span>
            <span className="text-xs text-gray-400 ml-2">
              {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="flex gap-2" onSubmit={sendMessage}>
        <input
          className="border p-2 rounded flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          className="bg-blue-500 text-white p-2 rounded"
          type="submit"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
