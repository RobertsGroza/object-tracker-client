import { VideoPlayer } from "components/VideoPlayer";
import { VideoContextProvider } from "contexts/VideoContext";
import { WebSocketContextProvider } from "contexts/WebSocket";

function App() {
    return (
        <VideoContextProvider>
            <WebSocketContextProvider>
                <VideoPlayer />
            </WebSocketContextProvider>
        </VideoContextProvider>
    );
}

export default App;
