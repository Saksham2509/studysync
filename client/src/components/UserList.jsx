import React, { useEffect, useState } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";

// UserList listens for the 'roomUsers' event and displays all user names in the room
const UserList = ({ room }) => {
  const socket = useSocket();
  const { getUserInfo } = useAuth();
  const userInfo = getUserInfo();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!socket || !room) return;
    
    // Handler for user list updates
    const handleRoomUsers = (userList) => {
      console.log("📥 UserList: Received updated user list:", userList);
      console.log("📊 UserList: Current room:", room);
      console.log("🔍 UserList: Current userInfo:", userInfo);
      
      // Make sure there are no duplicates by unique ID
      const uniqueUsers = [];
      const userIds = new Set();
      
      // Add existing users from the server
      (userList || []).forEach(user => {
        // Create a unique identifier for each user (either userId for authenticated users or socketId for anonymous)
        const uniqueId = user.userId || user.id || user.socketId;
        if (uniqueId && !userIds.has(uniqueId)) {
          userIds.add(uniqueId);
          uniqueUsers.push(user);
        }
      });
      
      // Always make sure the current user is included
      const currentUserId = userInfo.id || socket.id;
      const currentUserName = userInfo.name || 'You';
      
      // Check if the current user is already in the list
      const currentUserIncluded = uniqueUsers.some(user => 
        (user.userId === currentUserId) || 
        (user.id === socket.id) || 
        (user.socketId === socket.id)
      );
      
      // If not, add the current user to the list
      if (!currentUserIncluded && room) {
        uniqueUsers.push({
          id: socket.id,
          socketId: socket.id,
          userId: currentUserId,
          name: currentUserName,
          isCurrentUser: true
        });
        console.log(`Adding current user to displayed list: ${currentUserName}`);
      }
      
      console.log("✅ UserList: Final unique users to display:", uniqueUsers);
      setUsers(uniqueUsers);
    };
    
    // Listen for user list updates
    console.log("🔗 UserList: Setting up roomUsers listener for room:", room);
    socket.on("roomUsers", handleRoomUsers);
    
    // Request current user list after a short delay to ensure joinRoom has been processed
    console.log("📨 UserList: Will request user list for room after delay:", room);
    const requestTimer = setTimeout(() => {
      console.log("📨 UserList: Now requesting user list for room:", room);
      socket.emit("requestUserList", { room });
    }, 1000); // 1 second delay
    
    // Cleanup listener on unmount
    return () => {
      socket.off("roomUsers", handleRoomUsers);
      clearTimeout(requestTimer);
    };
  }, [socket, room, userInfo]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-4 border border-gray-200">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
        <h2 className="font-semibold text-lg text-gray-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Active Users
        </h2>
        <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">
          {users.length || 0}
        </span>
      </div>
      
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p>No active users</p>
        </div>
      ) : (
        <ul className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {users.map((u) => {
            const isCurrentUser = u.isCurrentUser || 
                                  u.userId === userInfo.id || 
                                  u.id === socket?.id || 
                                  u.socketId === socket?.id;
            // Use different colors for different users to make it visually appealing
            const colorClasses = [
              'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
              'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-orange-500'
            ];
            // Generate a consistent color for each user based on their ID
            const colorIndex = (u.userId || u.id || u.name)
              .split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colorClasses.length;
            const bgColorClass = colorClasses[colorIndex];
            
            return (
              <li 
                key={u.id || u.socketId || Math.random().toString()} 
                className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                  isCurrentUser ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${bgColorClass}`}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className={`${isCurrentUser ? 'font-semibold' : 'text-gray-700'}`}>
                    {u.name} {isCurrentUser ? '(You)' : ''}
                  </span>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                    <span>Active</span>
                    {u.joinedAt && (
                      <span className="ml-2">
                        · Joined {new Date(u.joinedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default UserList;
