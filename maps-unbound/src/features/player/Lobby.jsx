import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

function Lobby({ campaignId, userId }) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!campaignId || !userId) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
      transports: ['websocket'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', { campaignId, userId });
    });

    socket.on('room-joined', (payload) => {
      setEvents((prev) => [
        ...prev,
        `Joined room ${payload.room} as ${payload.userId}`,
      ]);
    });

    socket.on('player-joined', (payload) => {
      setEvents((prev) => [
        ...prev,
        `Player ${payload.userId} joined campaign ${payload.campaignId}`,
      ]);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.off('connect');
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [campaignId, userId]);

  return (
    <section>
      <h2>Campaign Lobby</h2>
      <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
      <ul>
        {events.map((event, index) => (
          <li key={`${event}-${index}`}>{event}</li>
        ))}
      </ul>
    </section>
  );
}

export default Lobby;
