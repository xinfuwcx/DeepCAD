from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from .connection_manager import manager

router = APIRouter()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(client_id, websocket)
    try:
        while True:
            # Keep the connection alive by waiting for data.
            # We don't need to use the data for now.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        # Optionally log the disconnection
        # print(f"Client #{client_id} disconnected") 