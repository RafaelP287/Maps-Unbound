/**
 * Lobby Component
 * 
 * Real-time campaign lobby interface using Socket.io for WebSocket communication.
 * Provides live chat messaging, player presence tracking, and event notifications.
 * 
 * Features:
 * - Real-time chat messaging between campaign members
 * - Live player join/leave notifications
 * - Connection status monitoring with debug logging
 * - Auto-scroll chat messages
 * - Room-based communication (isolated per campaign)
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext.jsx';

function Lobby() {
  // Get campaignId from URL parameters (e.g., /campaign/:campaignId/lobby)
  const { campaignId } = useParams();
  
  // Get authenticated user from AuthContext
  const { user } = useAuth();
  
  // State for live events feed (player joins/leaves)
  const [events, setEvents] = useState([]);
  
  // State for chat messages with username and timestamp
  const [messages, setMessages] = useState([]);
  
  // State for current message being typed
  const [messageInput, setMessageInput] = useState('');
  
  // Socket.io connection status (true = connected, false = disconnected)
  const [connected, setConnected] = useState(false);
  
  // Array of player userIds currently in the lobby
  const [players, setPlayers] = useState([]);
  
  // Debug log for troubleshooting connection issues (visible in UI)
  const [debugLog, setDebugLog] = useState([]);
  
  // Reference to the Socket.io client instance (persists across renders)
  const socketRef = useRef(null);
  
  // Reference to the bottom of messages container for auto-scrolling
  const messagesEndRef = useRef(null);

  /**
   * Add a timestamped message to the debug log
   * Logs are visible in the UI's debug panel and browser console
   * @param {string} msg - The debug message to log
   */
  const addDebugLog = (msg) => {
    setDebugLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    console.log(msg);
  };

  /**
   * Scroll chat messages container to bottom (latest message)
   * Uses smooth scrolling behavior for better UX
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll to bottom whenever new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Socket.io Connection Effect
   * 
   * Establishes WebSocket connection when component mounts and user/campaign are available.
   * Sets up event listeners for real-time communication.
   * Cleans up connection on unmount or when dependencies change.
   */
  useEffect(() => {
    // Debug: Log current state for troubleshooting
    addDebugLog(`📊 campaignId: ${campaignId || 'MISSING'}`);
    addDebugLog(`📊 user: ${user ? JSON.stringify({_id: user._id, username: user.username}) : 'MISSING'}`);
    
    // Validation: Ensure we have required data before connecting
    if (!campaignId || !user?._id) {
      addDebugLog('❌ Missing campaignId or userId - cannot connect');
      return;
    }

    addDebugLog(`🔌 Attempting to connect... campaignId: ${campaignId}, userId: ${user._id}`);

    // Initialize Socket.io client with server URL from environment variable
    // Uses WebSocket transport for real-time bidirectional communication
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
      transports: ['websocket'], // Force WebSocket (no polling fallback)
      withCredentials: true,      // Send cookies with requests
    });

    // Store socket instance in ref so it persists across renders
    socketRef.current = socket;

    // Event: 'connect' - Fired when socket successfully connects to server
    socket.on('connect', () => {
      addDebugLog('✓ Socket connected: ' + socket.id);
      setConnected(true);
      // Immediately join the campaign-specific room after connecting
      socket.emit('join-room', { campaignId, userId: user._id });
    });

    // Event: 'room-joined' - Confirmation that we successfully joined the campaign room
    // Server sends this only to the user who joined
    socket.on('room-joined', (payload) => {
      addDebugLog('✓ Room joined: ' + payload.room);
      setEvents((prev) => [
        ...prev,
        `✓ You joined room ${payload.room}`,
      ]);
      // Add ourselves to the players list (use Set to prevent duplicates)
      setPlayers((prev) => [...new Set([...prev, payload.userId])]);
    });

    // Event: 'player-joined' - Broadcast when another player joins the campaign
    // Server broadcasts this to all OTHER users in the room
    socket.on('player-joined', (payload) => {
      addDebugLog('🎉 Player joined: ' + payload.userId);
      setEvents((prev) => [
        ...prev,
        `🎉 Player ${payload.userId} joined the campaign!`,
      ]);
      // Add new player to the players list (use Set to prevent duplicates)
      setPlayers((prev) => [...new Set([...prev, payload.userId])]);
    });

    // Event: 'chat-message' - Received when any user sends a message in this room
    // Includes the message content, sender info, and timestamp
    socket.on('chat-message', (payload) => {
      addDebugLog('💬 Message from: ' + payload.username);
      setMessages((prev) => [
        ...prev,
        {
          userId: payload.userId,
          username: payload.username,
          message: payload.message,
          timestamp: new Date().toLocaleTimeString(), // Convert server timestamp to local time
        }
      ]);
    });

    // Event: 'disconnect' - Fired when connection to server is lost
    socket.on('disconnect', () => {
      addDebugLog('❌ Socket disconnected');
      setConnected(false);
    });

    // Event: 'connect_error' - Fired when connection attempt fails
    // Useful for debugging network or CORS issues
    socket.on('connect_error', (error) => {
      addDebugLog('❌ Connection error: ' + error.message);
    });

    // Cleanup function: Remove all event listeners and disconnect when component unmounts
    // or when campaignId/userId changes (to prevent memory leaks and duplicate listeners)
    return () => {
      addDebugLog('🔌 Cleaning up socket connection');
      socket.off('connect');
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('chat-message');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.disconnect();
    };
  }, [campaignId, user?._id]); // Re-run effect if campaignId or userId changes

  /**
   * Send a chat message to the campaign room
   * Emits 'send-message' event to server, which broadcasts to all room members
   * @param {Event} e - Form submit event
   */
  const sendMessage = (e) => {
    e.preventDefault();
    
    // Validation: Don't send empty messages or if not connected
    if (!messageInput.trim() || !socketRef.current) return;

    // Emit message event to server with all required data
    socketRef.current.emit('send-message', {
      campaignId,        // Which campaign room to send to
      userId: user._id,  // Sender's user ID
      username: user.username, // Sender's display name
      message: messageInput,   // The actual message content
    });

    // Clear input field after sending
    setMessageInput('');
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Campaign Lobby</h1>
      <p style={styles.campaignId}>Campaign ID: <code>{campaignId}</code></p>
      <p style={styles.status}>
        Status: <span style={{ color: connected ? '#00FF00' : '#FF0000' }}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </p>

      {/* Debug Log Section */}
      <details style={{ marginBottom: '20px', border: '1px solid #444', padding: '10px', borderRadius: '5px', backgroundColor: '#1a1a1a' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#00FFFF' }}>🔍 Debug Log ({debugLog.length} events)</summary>
        <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '12px', fontFamily: 'monospace', marginTop: '10px', background: '#0a0a0a', padding: '10px', borderRadius: '3px', color: '#00FF00' }}>
          {debugLog.length === 0 ? (
            <p style={{ color: '#888' }}>No debug logs yet...</p>
          ) : (
            debugLog.map((log, idx) => (
              <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid #333' }}>{log}</div>
            ))
          )}
        </div>
      </details>

      <div style={styles.content}>
        {/* Chat Section */}
        <div style={styles.chatSection}>
          <h2 style={styles.sectionTitle}>Chat</h2>
          <div style={styles.messagesContainer}>
            {messages.length === 0 ? (
              <p style={styles.emptyMessage}>No messages yet. Start the conversation!</p>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} style={{
                  ...styles.message,
                  backgroundColor: msg.userId === user._id ? '#00FFFF20' : '#FFFFFF10'
                }}>
                  <strong style={{ color: msg.userId === user._id ? '#00FFFF' : '#00FF00' }}>
                    {msg.username}:
                  </strong>
                  <p style={styles.messageText}>{msg.message}</p>
                  <small style={styles.timestamp}>{msg.timestamp}</small>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} style={styles.messageForm}>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              style={styles.messageInput}
            />
            <button type="submit" style={styles.sendBtn}>Send</button>
          </form>
        </div>

        {/* Events Section */}
        <div style={styles.eventsSection}>
          <h2 style={styles.sectionTitle}>Live Events</h2>
          <div style={styles.eventsList}>
            {events.length === 0 ? (
              <p style={styles.emptyMessage}>Waiting for players to join...</p>
            ) : (
              <ul>
                {events.map((event, index) => (
                  <li key={`${event}-${index}`} style={styles.event}>{event}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '40px auto',
    padding: '40px',
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '2px solid #00FFFF',
  },
  title: {
    color: '#00FFFF',
    textAlign: 'center',
    marginBottom: '10px',
  },
  campaignId: {
    color: '#999',
    textAlign: 'center',
    marginBottom: '10px',
    fontSize: '12px',
  },
  status: {
    color: '#fff',
    textAlign: 'center',
    fontSize: '14px',
    marginBottom: '30px',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  chatSection: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#111',
    borderRadius: '8px',
    border: '1px solid #333',
    padding: '20px',
  },
  eventsSection: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#111',
    borderRadius: '8px',
    border: '1px solid #333',
    padding: '20px',
  },
  sectionTitle: {
    color: '#fff',
    marginBottom: '15px',
    borderBottom: '1px solid #333',
    paddingBottom: '10px',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '15px',
    minHeight: '300px',
    maxHeight: '400px',
    padding: '10px',
  },
  message: {
    padding: '10px',
    marginBottom: '8px',
    borderRadius: '4px',
    borderLeft: '3px solid #00FFFF',
  },
  messageText: {
    margin: '5px 0 0 0',
    color: '#fff',
    fontSize: '14px',
  },
  timestamp: {
    color: '#666',
    fontSize: '11px',
    display: 'block',
    marginTop: '5px',
  },
  emptyMessage: {
    color: '#666',
    textAlign: 'center',
    padding: '40px 0',
  },
  messageForm: {
    display: 'flex',
    gap: '8px',
  },
  messageInput: {
    flex: 1,
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #333',
    backgroundColor: '#222',
    color: '#fff',
    fontSize: '14px',
  },
  sendBtn: {
    padding: '10px 20px',
    backgroundColor: '#00FFFF',
    color: '#111',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  eventsList: {
    flex: 1,
    overflowY: 'auto',
    minHeight: '300px',
    maxHeight: '400px',
    padding: '10px',
  },
  event: {
    color: '#00FF00',
    padding: '8px 0',
    borderBottom: '1px solid #333',
    fontSize: '12px',
  }
};

export default Lobby;
