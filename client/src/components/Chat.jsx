import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";

const Chat = ({ room, userName }) => {
  const socket = useSocket();
  const { getUserInfo } = useAuth();
  const userInfo = getUserInfo();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket || !room) return;
    
    const handleMessage = (msg) => {
      console.log(`📨 Chat: Received message from ${msg.user}:`, msg.text);
      setMessages((prev) => [...prev, msg]);
      new Audio("/sounds/message.mp3").play();
    };
    
    const handleHistory = (history) => {
      console.log(`📚 Chat: Received ${history.length} messages in chat history`);
      setMessages(history.map(m => ({
        ...m,
        timestamp: m.createdAt || m.timestamp
      })));
    };
    
    // Set up event listeners
    console.log(`🔗 Chat: Setting up message listeners for room ${room}`);
    socket.on("chat:message", handleMessage);
    socket.on("chat:history", handleHistory);
    
    // Request chat history after a delay to ensure user has joined the room
    const historyTimer = setTimeout(() => {
      console.log(`📨 Chat: Requesting chat history for room ${room}`);
      socket.emit("requestChatHistory", { room });
    }, 1500); // 1.5 second delay
    
    // Cleanup function to remove listeners
    return () => {
      console.log(`🔌 Chat: Cleaning up listeners for room ${room}`);
      socket.off("chat:message", handleMessage);
      socket.off("chat:history", handleHistory);
      clearTimeout(historyTimer);
    };
  }, [socket, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    
    // Use the authenticated user name from the JWT if available
    const message = {
      user: userInfo.name || userName, 
      userId: userInfo.id,
      isAuthenticated: userInfo.isAuthenticated,
      text: input,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`📤 Chat: Sending message to room ${room}:`, message.text);
    socket.emit("chat:message", { room, message });
    
    // Add message locally for immediate display with a special flag
    // This helps avoid delay before server echoes the message back
    const localMessage = { 
      ...message, 
      isLocalEcho: true,  // Flag to identify this as a local echo
    };
    setMessages(prev => [...prev, localMessage]);
    setInput("");
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col h-80 mb-4 border border-gray-200">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
        <h3 className="font-semibold text-lg text-gray-700">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Room Chat
          </div>
        </h3>
        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
          {messages.length} messages
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto mb-3 px-1 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            // Determine if this is a user's own message
            const isCurrentUser = (userInfo.id && msg.userId === userInfo.id) || 
                                 (!userInfo.id && msg.isLocalEcho);
            
            // Make sure we have a timestamp - use createdAt or timestamp or current time
            const messageTime = msg.timestamp || msg.createdAt || new Date().toISOString();
            
            // Generate a unique color for each user based on their name or ID
            const colorClasses = [
              'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
              'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-orange-500'
            ];
            const textColorClasses = [
              'text-blue-700', 'text-green-700', 'text-purple-700', 'text-pink-700', 
              'text-yellow-700', 'text-red-700', 'text-indigo-700', 'text-orange-700'
            ];
            
            // Generate a consistent color for each user based on their ID
            const colorIndex = (msg.userId || msg.user || '')
              .split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colorClasses.length;
            
            const userColor = isCurrentUser ? 'text-white' : textColorClasses[colorIndex];
            
            return (
              <div 
                key={idx} 
                className={`px-3 py-2 rounded-lg max-w-[85%] mb-2 ${
                  isCurrentUser 
                  ? "ml-auto bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-800"
                } ${msg.isLocalEcho ? "opacity-80" : ""}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div 
                    className={`text-sm font-semibold ${
                      isCurrentUser ? "text-blue-200" : 
                      msg.isAuthenticated ? userColor : "text-gray-600"
                    }`}
                    title={msg.isAuthenticated ? "Verified User" : "Unverified User"}
                  >
                    {isCurrentUser ? "You" : msg.user || "Unknown User"}
                    {msg.isAuthenticated && (
                      <span className="ml-1 text-xs">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className={`text-xs ${isCurrentUser ? "text-blue-200" : "text-gray-500"} ml-2`}>
                    {messageTime && new Date(messageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <div className="break-words">{msg.text}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="flex gap-2 mt-auto relative" onSubmit={sendMessage}>
        <input
          className="border border-gray-300 p-3 pr-12 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          autoComplete="off"
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg transition-colors duration-200 flex items-center absolute right-1 top-1/2 transform -translate-y-1/2"
          type="submit"
          disabled={!input.trim()}
          title="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default Chat;
