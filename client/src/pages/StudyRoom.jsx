import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../utils/axios";
import UserList from "../components/UserList";
import Chat from "../components/Chat";
import Timer from "../components/Timer";
import LoginModal from "../components/LoginModal";
import ConfirmModal from "../components/ConfirmModal";
import AlertModal from "../components/AlertModal";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";

const StudyRoom = () => {
  const navigate = useNavigate();
  const { roomName } = useParams();
  const [room, setRoom] = useState(roomName || "");
  const [isHost, setIsHost] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [infoError, setInfoError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joinStatus, setJoinStatus] = useState("pending");
  const socket = useSocket();
  const { getUserInfo, loading: authLoading } = useAuth();
  const { showError, showSuccess, showWarning } = useNotification();
  const userInfo = getUserInfo();
  const [userName, setUserName] = useState("");
  const [showRoomSelection, setShowRoomSelection] = useState(!roomName);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [redirectPath, setRedirectPath] = useState('');
  
  // Modal states for confirmations and alerts
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onClose: null });
  
  // Room selection for /study-room page
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomInput, setRoomInput] = useState("");

  // If we're on /study-room and not /room/:roomName
  useEffect(() => {
    setRoom(roomName || "");
    setShowRoomSelection(!roomName);
  }, [roomName]);

  // Check if user is authenticated
  useEffect(() => {
    if (authLoading) return;
    
    if (!userInfo || !userInfo.id) {
      setRedirectPath(window.location.pathname);
      setShowLoginModal(true);
    } else {
      if (userInfo.name && userInfo.name !== 'Anonymous User') {
        setUserName(userInfo.name);
      }
      setShowLoginModal(false);
    }
  }, [userInfo, authLoading]);

  // Fetch available rooms when on the study-room page
  useEffect(() => {
    if (showRoomSelection) {
      const fetchAvailableRooms = async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem("token");
          const res = await axios.get(`/api/rooms`, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
            params: { t: Date.now() } // Cache busting
          });
          setAvailableRooms(res.data.rooms || []);
        } catch (err) {
          console.error("Failed to fetch rooms:", err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchAvailableRooms();
    }
  }, [showRoomSelection]);

  // Listen for room changes to refresh the room list
  useEffect(() => {
    if (!socket || !showRoomSelection) return;

    const handleRoomChanged = ({ room }) => {
      console.log(`Room ${room} changed - refreshing room list`);
      // Refetch the available rooms
      const fetchAvailableRooms = async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem("token");
          const res = await axios.get(`/api/rooms`, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
            params: { t: Date.now() } // Cache busting
          });
          setAvailableRooms(res.data.rooms || []);
        } catch (err) {
          console.error("Failed to fetch rooms:", err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchAvailableRooms();
    };

    socket.on('roomChanged', handleRoomChanged);

    return () => {
      socket.off('roomChanged', handleRoomChanged);
    };
  }, [socket, showRoomSelection]);

  // Handle form submission for room selection
  const handleRoomSelect = async (e) => {
    e.preventDefault();
    
    if (!roomInput.trim()) return;
    
    await joinRoom(roomInput.trim());
  };

  // Function to handle joining a room
  const joinRoom = async (roomName) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/rooms/${encodeURIComponent(roomName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(error => {
        if (error.response && error.response.status === 404) {
          return { data: null };
        }
        throw error;
      });
      
      const roomExists = response.data && response.data.room;
      
      if (!roomExists) {
        showError(`Room "${roomName}" does not exist!`);
        return;
      } 
      
      // Room exists, navigate directly (all rooms are public now)
      navigate(`/room/${encodeURIComponent(roomName)}`);
    } catch (error) {
      console.error("Error checking room existence:", error);
      showError("An error occurred while checking if this room exists.");
    }
  };

  // Fetch room details
  useEffect(() => {
    if (!room || showRoomSelection) {
      return;
    }
    
    const fetchRoom = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/rooms/${encodeURIComponent(room)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const roomData = res.data.room;
        
        // Set room data since all rooms are now public
        
        setRoomInfo(roomData);
        setInfoError("");
        
        // Check if current user is the host
        if (
          roomData.host === userInfo.id || 
          roomData.host === userInfo.email ||
          (localStorage.getItem("createdRoom") === room)
        ) {
          setIsHost(true);
          
          if (socket) {
            socket.emit("setRoomHost", { room, userId: userInfo.id });
          }
        }
        
        setLoading(false);
      } catch (err) {
        setInfoError(
          err.response?.data?.message || "Could not fetch room info."
        );
        setLoading(false);
        
        if (err.response?.status === 404) {
          showError(`Room "${room}" does not exist!`);
          navigate("/study-room");
        }
      }
    };
    
    fetchRoom();
  }, [room, navigate, userInfo.id, userInfo.email, socket]);

  // Handle socket connection and room joining
  useEffect(() => {
    if (!socket || !room || joinStatus !== "pending") return;
    
    const handleJoinRoom = () => {
      try {
        console.log('🔍 DEBUG: User info before joining:', {
          userInfo,
          userName,
          finalUserName: userName || userInfo.name
        });
        
        const joinData = { 
          room,
          userName: userName || userInfo.name,
          asHost: isHost
        };
        console.log(`🚀 StudyRoom: Emitting joinRoom for ${room}:`, joinData);
        socket.emit("joinRoom", joinData);
        setJoinStatus("joined");
      } catch (err) {
        console.error("Error joining room:", err);
        setInfoError("Failed to join the room. Please try again.");
      }
    };
    
    handleJoinRoom();
  }, [socket, room, userName, userInfo.name, isHost, joinStatus]);

  // Handle room closed event
  useEffect(() => {
    if (!socket) return;
    
    const handleRoomClosed = ({ reason }) => {
      console.log('🚨 StudyRoom: Room closed event received:', { reason, currentRoom: room });
      
      // Show alert modal with navigation
      setAlertModal({
        isOpen: true,
        title: "Room Closed",
        message: reason || "The room has been closed by the host.",
        type: "warning",
        onClose: () => {
          console.log('🚨 StudyRoom: Navigating away from closed room');
          // Navigate back to study room list
          navigate('/study-room');
        }
      });
      
      // Also navigate after a short delay as a fallback
      setTimeout(() => {
        console.log('🚨 StudyRoom: Fallback navigation triggered');
        navigate('/study-room');
      }, 3000);
    };
    
    socket.on("roomClosed", handleRoomClosed);
    
    return () => {
      socket.off("roomClosed", handleRoomClosed);
    };
  }, [socket, navigate, room]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showLoginModal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoginModal 
          isOpen={showLoginModal}
          onClose={() => {
            setShowLoginModal(false);
            if (!userInfo || !userInfo.id) {
              navigate('/');
            }
          }}
          redirectAfterLogin={redirectPath}
        />
      </div>
    );
  }

  // Room selection UI
  if (showRoomSelection) {
    return (
      <div className="max-w-4xl mx-auto p-6 min-h-screen bg-gray-50">
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-6 text-center text-purple-700">
            Study Rooms
          </h1>
          
          <form onSubmit={handleRoomSelect} className="mb-8">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Enter room name"
                className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
                disabled={loading}
              >
                Join
              </button>
            </div>
          </form>
          
          <h2 className="text-xl font-semibold mb-4">Available Rooms:</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-2"></div>
              <p>Loading rooms...</p>
            </div>
          ) : availableRooms.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No active study rooms available.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {availableRooms.map((r) => (
                <div
                  key={r._id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    console.log("🎯 ROOM CARD CLICKED!");
                    console.log("Room:", r.name, "isPublic:", r.isPublic);
                    setRoomInput(r.name);
                    joinRoomWithPasswordCheck(r.name);
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-lg">{r.name}</h3>
                    {!r.isPublic && (
                      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="text-green-600">Public</span> • {r.activeCount || 0} active users
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="text-center">
          <button
            onClick={() => navigate("/create-room")}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors shadow-md"
          >
            Create a New Room
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-lg text-gray-600">Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Room: {room}</h1>
      {roomInfo && (
        <div className="mb-4 bg-white shadow rounded p-4">
          <h2 className="font-semibold text-lg mb-2">Room Information</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-gray-600">Name:</div>
            <div>{roomInfo.name}</div>
            
            <div className="text-gray-600">Status:</div>
            <div>{roomInfo.isPublic ? 
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Public</span> : 
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">Private</span>}
            </div>
            
            <div className="text-gray-600">Your Role:</div>
            <div>{isHost ? 
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">Host</span> : 
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">Member</span>}
            </div>
            
            <div className="text-gray-600">Joined As:</div>
            <div>{userName || userInfo.name}</div>
          </div>
        </div>
      )}
      
      {infoError && <div className="text-red-500 text-sm mb-2">{infoError}</div>}
      
      {/* Debug: Log when UserList is rendered */}
      {console.log("🎯 StudyRoom: Rendering UserList with room:", room, "joinStatus:", joinStatus)}
      <UserList room={room} />
      <Timer room={room} isHost={isHost} />
      <Chat room={room} userName={userName || userInfo.name} />
      
      <div className="mt-6 flex justify-between">
        <button
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          onClick={() => {
            if (socket) {
              socket.emit("leaveRoom", { room });
              setTimeout(() => navigate("/study-room"), 100);
            } else {
              navigate("/study-room");
            }
          }}
        >
          Leave Room
        </button>
        
        {isHost && (
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: "End Study Session",
                message: "Are you sure you want to end this study session for everyone? This action cannot be undone.",
                onConfirm: () => {
                  if (socket) {
                    socket.emit("endSession", { room });
                    setTimeout(() => {
                      navigate("/study-room");
                    }, 500);
                  } else {
                    navigate("/study-room");
                  }
                  setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                }
              });
            }}
          >
            End Session
          </button>
        )}
      </div>
      
      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
        confirmText="End Session"
        type="danger"
      />
      
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => {
          // Close the modal first
          setAlertModal({ isOpen: false, title: '', message: '', type: 'info', onClose: null });
          
          // Then call the custom onClose if it exists
          if (alertModal.onClose) {
            alertModal.onClose();
          }
        }}
      />
    </div>
  );
};

export default StudyRoom;
