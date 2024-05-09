import { createContext, type ReactNode, useCallback, useContext, useState, useEffect } from "react";
import { useVideoContext } from "contexts/VideoContext";

interface WebSocketContextProviderProps {
    children: ReactNode;
}

interface WebSocketState {
    isConnected: boolean;
    send: (message: string) => void;
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

            if (message.type === "video_frame") {
                videoContext.addFrameToBuffer(message);
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

    const sendMessage = useCallback((message: string) => {
        if (ws && isConnected) {
            ws.send(message);
        }
    }, [ws, isConnected]);

    // Send play only if video hasn't yet been requested to server
    useEffect(() => {
        if (videoContext.isPlaying && !videoContext.isVideoRequested) {
            sendMessage("play");
        }
    }, [videoContext.isPlaying, videoContext.isVideoRequested, sendMessage])


    return (
        <WebSocketContext.Provider value={{
            isConnected: isConnected,
            send: sendMessage,
        }}>
            {children}
        </WebSocketContext.Provider>
    )
}
