import { useWebSocket } from "contexts/WebSocket";
import "components/styles.css";

export function WSLoadingScreen() {
    const webSocket = useWebSocket();

    if (webSocket.isConnected && !webSocket.hasConnectionIssue) {
        return null;
    }

    return(
        <div className="ws-loading-screen">
            {webSocket.hasConnectionIssue
                ? <h3 style={{ color: "red" }}>Error while connecting. Try reloading!</h3>
                : (
                    <>
                        <div className="loader" />
                        <p>Connecting to WebSocket...</p>
                    </>
                )
            }
        </div>
    )
}
