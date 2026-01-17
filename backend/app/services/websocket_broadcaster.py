"""
WebSocket Connection Manager for Dashboard Broadcasting
"""

from fastapi import WebSocket
from typing import Dict, Set, Any
import json
import structlog

logger = structlog.get_logger()


class ConnectionManager:
    """
    Manages WebSocket connections and broadcasting.
    """
    
    def __init__(self):
        """Initialize connection manager."""
        # All active connections
        self.active_connections: Set[WebSocket] = set()
        
        # Room-based connections for call sessions
        self.rooms: Dict[str, Set[WebSocket]] = {}
        
        logger.info("connection_manager_initialized")
    
    async def connect(self, websocket: WebSocket, room: str = None):
        """
        Accept a new WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            room: Optional room ID (e.g., session_id)
        """
        await websocket.accept()
        self.active_connections.add(websocket)
        
        if room:
            if room not in self.rooms:
                self.rooms[room] = set()
            self.rooms[room].add(websocket)
            logger.info("websocket_connected_to_room", room=room)
        else:
            logger.info("websocket_connected")
    
    def disconnect(self, websocket: WebSocket, room: str = None):
        """
        Remove a WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            room: Optional room ID
        """
        self.active_connections.discard(websocket)
        
        if room and room in self.rooms:
            self.rooms[room].discard(websocket)
            if not self.rooms[room]:
                del self.rooms[room]
            logger.info("websocket_disconnected_from_room", room=room)
        else:
            logger.info("websocket_disconnected")
    
    async def broadcast(self, message: Dict[str, Any]):
        """
        Broadcast message to all connected clients.
        
        Args:
            message: Message to broadcast
        """
        message_json = json.dumps(message)
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.error("broadcast_error", error=str(e))
                disconnected.add(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.active_connections.discard(conn)
    
    async def broadcast_to_room(self, room: str, message: Dict[str, Any]):
        """
        Broadcast message to all clients in a room.
        
        Args:
            room: Room ID (e.g., session_id)
            message: Message to broadcast
        """
        if room not in self.rooms:
            return
        
        message_json = json.dumps(message)
        disconnected = set()
        
        for connection in self.rooms[room]:
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.error("room_broadcast_error", error=str(e), room=room)
                disconnected.add(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.rooms[room].discard(conn)
            self.active_connections.discard(conn)
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """
        Send message to a specific client.
        
        Args:
            message: Message to send
            websocket: Target WebSocket connection
        """
        try:
            message_json = json.dumps(message)
            await websocket.send_text(message_json)
        except Exception as e:
            logger.error("send_personal_message_error", error=str(e))


# Singleton instance
_manager: ConnectionManager = None

def get_connection_manager() -> ConnectionManager:
    """Get or create the singleton connection manager."""
    global _manager
    if _manager is None:
        _manager = ConnectionManager()
    return _manager
