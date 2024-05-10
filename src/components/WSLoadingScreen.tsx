import { useWebSocket } from "contexts/WebSocket";

export function WSLoadingScreen() {
    const webSocket = useWebSocket();

    if (webSocket.isConnected && !webSocket.hasConnectionIssue) {
        return null;
    }

    return(
        <>
            <h2>Waiting for WS connection...</h2>
            {webSocket.hasConnectionIssue && (
                <p style={{ color: "red" }}>Error while connecting. Try reloading!</p>
            )}
        </>
    )
}
