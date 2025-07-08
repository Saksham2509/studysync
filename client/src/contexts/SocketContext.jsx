import React, { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";

// Create the Socket context
export const SocketContext = createContext(null);

// Custom hook for easy access
export const useSocket = () => useContext(SocketContext);

// Provider component
export const SocketProvider = ({ children }) => {
  const socketRef = useRef();

  useEffect(() => {
    // Replace with your backend URL if different
    socketRef.current = io("http://localhost:5000", {
      withCredentials: true,
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};
