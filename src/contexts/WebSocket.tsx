import { createContext, type ReactNode, useCallback, useContext, useState, useEffect } from "react";
import { useVideoContext } from "contexts/VideoContext";

interface WebSocketContextProviderProps {
    children: ReactNode;
}

interface WebSocketState {
    isConnected: boolean;
    send: (message: OutgoingMessage) => void;
}

interface OutgoingMessage {
    type: string;
    content: string;
}


export const WebSocketContext = createContext<WebSocketState>({
    isConnected: false,
    send: () => {},
});

export function useWebSocket() {
    return useContext(WebSocketContext);
}

export function WebSocketContextProvider({ children }: WebSocketContextProviderProps) {
    const videoContext = useVideoContext();
    const [isConnected, setIsConnected] = useState(false);
    const [ws, setWs] = useState<WebSocket | null>(null);

    const sendMessage = useCallback((message: OutgoingMessage) => {
        if (ws && isConnected) {
            ws.send(JSON.stringify(message));
        }
    }, [ws, isConnected]);

    const requestVideoFrames = useCallback((frameCount: number) => {
        sendMessage({ type: "get_frames", content: frameCount.toString() })
    }, [sendMessage]);

    useEffect(() => {
        const ws = new WebSocket(`ws://${process.env.REACT_APP_WS_URL}`);

        ws.onopen = () => {
            setIsConnected(true);
        }
        
        ws.onclose = () => {
            setIsConnected(false);
        }

        ws.onmessage = ({ data }) => {
            const message = JSON.parse(data);

            const requestNextFrames = (frameCount: number) => {
                ws.send(JSON.stringify({ type: "get_frames", content: frameCount.toString() }))
            }

            if (message.type === "video_frame") {
                videoContext.addFrameToBuffer(message, requestNextFrames);
                return;
            }

            if (message.type === "video_list") {
                videoContext.setVideoList(message.videos);
                videoContext.setSelectedVideo(message.videos[0]);
                return;
            }

            if (message.type === "video_summary") {
                videoContext.setFrameRate(parseInt(message.content.fps))
                return;
            }

            if (message.type === "video_end") {
                videoContext.setIsFullyLoaded(true);
                return;
            }
        }

        setWs(ws);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Send play only if video hasn't yet been requested to server
    useEffect(() => {
        if (ws && videoContext.isPlaying && !videoContext.isVideoRequested && videoContext.selectedVideo) {
            sendMessage({ type: "play", content: videoContext.selectedVideo });
            requestVideoFrames(10);
            videoContext.setIsVideoRequested(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoContext.isPlaying, videoContext.isVideoRequested, sendMessage, videoContext.selectedVideo])


    return (
        <WebSocketContext.Provider value={{
            isConnected: isConnected,
            send: sendMessage,
        }}>
            {children}
        </WebSocketContext.Provider>
    )
}
