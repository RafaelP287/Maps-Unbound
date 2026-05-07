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
import EncounterAssistantBoard from '../session/EncounterAssistantBoard.jsx';
import CharacterSheet from '../characters/CharacterSheet.jsx';
import './lobby.css';

function Lobby() {
  // Get campaignId from URL parameters (e.g., /campaign/:campaignId/lobby)
  const { campaignId } = useParams();
  
  // Get authenticated user from AuthContext
  const { user, token } = useAuth();
  
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
  const [isDM, setIsDM] = useState(false);
  const [encounterOpen, setEncounterOpen] = useState(false);
  const [encounterReady, setEncounterReady] = useState(false);
  const [encounterReadySaving, setEncounterReadySaving] = useState(false);
  const [playerCharacterId, setPlayerCharacterId] = useState(null);
  
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

  useEffect(() => {
    const fetchCampaignRole = async () => {
      if (!campaignId || !token || !user?._id) return;
      try {
        const response = await fetch(`http://localhost:5001/api/campaigns/${campaignId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;

        const campaign = await response.json();
        const dmMember = campaign.members?.find((member) => member.role === 'DM');
        const dmId = dmMember?.userId?._id?.toString?.() || dmMember?.userId?.toString?.();
        setIsDM(campaign.createdBy?.toString?.() === user._id?.toString?.() || dmId === user._id?.toString?.());
        setEncounterReady(Boolean(campaign.encounter?.isReady));

        // Fetch player's first character
        if (campaign.createdBy?.toString?.() !== user._id?.toString?.() && dmId !== user._id?.toString?.()) {
          const charResponse = await fetch(`http://localhost:5001/api/characters?userId=${user._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (charResponse.ok) {
            const characters = await charResponse.json();
            if (Array.isArray(characters) && characters.length > 0) {
              const characterId = characters[0]._id;
              setPlayerCharacterId(characterId);
            }
          }
        }
      } catch {
        setIsDM(false);
        setEncounterReady(false);
      }
    };

    fetchCampaignRole();
  }, [campaignId, token, user?._id]);

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

  const updateEncounterReady = async (nextReady) => {
    if (!isDM || !campaignId || !token) return;
    try {
      setEncounterReadySaving(true);
      // IMPORTANT: DM toggles whether players are allowed to join encounter map.
      const response = await fetch(`http://localhost:5001/api/campaigns/${campaignId}/encounter-ready`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isReady: nextReady }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || payload?.message || 'Failed to update encounter readiness');
      }

      setEncounterReady(nextReady);
      // Auto-open the encounter board for DM when starting, close when ending
      if (nextReady) {
        setEncounterOpen(true);
      } else {
        setEncounterOpen(false);
      }
    } catch (err) {
      addDebugLog(`❌ Encounter readiness update failed: ${err.message}`);
    } finally {
      setEncounterReadySaving(false);
    }
  };

  return (
    <div className="lobby-page">
      <section className="lobby-shell">
      <h1 className="lobby-title">Campaign Lobby</h1>
      <p className="lobby-campaign-id">Campaign ID: <code>{campaignId}</code></p>
      <p className="lobby-status">
        Status: <span className={connected ? 'lobby-status-pill is-connected' : 'lobby-status-pill is-disconnected'}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </p>
      <p className="lobby-presence">Players connected: {players.length}</p>
      <div className="lobby-actions">
        {isDM ? (
          <button
            type="button"
            onClick={() => updateEncounterReady(!encounterReady)}
            className="lobby-start-encounter-btn"
            disabled={encounterReadySaving}
          >
            {encounterReadySaving
              ? 'Saving...'
              : encounterReady
                ? '⏸ End Encounter'
                : '▶ Start Encounter'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEncounterOpen(true)}
              className="lobby-start-encounter-btn"
              // IMPORTANT: players are gated until DM marks encounter as ready.
              disabled={!encounterReady}
            >
              {!encounterReady ? 'Waiting for DM' : encounterOpen ? 'Encounter Open' : 'Join Encounter'}
            </button>
          </>
        )}
      </div>

      {/* Debug Log Section */}
      <details className="lobby-debug">
        <summary className="lobby-debug-summary">🔍 Debug Log ({debugLog.length} events)</summary>
        <div className="lobby-debug-body">
          {debugLog.length === 0 ? (
            <p className="lobby-empty">No debug logs yet...</p>
          ) : (
            debugLog.map((log, idx) => (
              <div key={idx} className="lobby-debug-line">{log}</div>
            ))
          )}
        </div>
      </details>

      <div className="lobby-content">
        <div className="lobby-encounter-column">
          <div className="lobby-panel lobby-map-panel">
            <h2 className="lobby-section-title">Map</h2>
            {encounterOpen && (isDM || encounterReady) ? (
              <EncounterAssistantBoard isDM={isDM} campaignIdOverride={campaignId} embedded hideEncounterChat />
            ) : (
              <div className="lobby-encounter-placeholder">
                <p className="lobby-empty">
                  {isDM
                    ? 'Click "Start Encounter" to begin the battle map.'
                    : encounterReady
                      ? 'Join the encounter to open the battle map here.'
                      : 'The DM is preparing the encounter. Please wait.'}
                </p>
              </div>
            )}

            {!isDM && playerCharacterId && (
              <CharacterSheet characterId={playerCharacterId} embedded />
            )}
          </div>
        </div>

        <div className="lobby-right-column">
          {/* Chat Section */}
          <div className="lobby-panel">
            <h2 className="lobby-section-title">Lobby Chat</h2>
            <div className="lobby-messages-container">
              {messages.length === 0 ? (
                <p className="lobby-empty">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={msg.userId === user._id ? 'lobby-message is-self' : 'lobby-message'}>
                    <strong className={msg.userId === user._id ? 'lobby-author is-self' : 'lobby-author'}>
                      {msg.username}:
                    </strong>
                    <p className="lobby-message-text">{msg.message}</p>
                    <small className="lobby-timestamp">{msg.timestamp}</small>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="lobby-message-form">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="lobby-message-input"
              />
              <button type="submit">Send</button>
            </form>
          </div>

          {/* Events Section */}
          <div className="lobby-panel">
            <h2 className="lobby-section-title">Live Events</h2>
            <div className="lobby-events-list">
              {events.length === 0 ? (
                <p className="lobby-empty">Waiting for players to join...</p>
              ) : (
                <ul className="lobby-events-ul">
                  {events.map((event, index) => (
                    <li key={`${event}-${index}`} className="lobby-event">{event}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      </section>
    </div>
  );
}

export default Lobby;
