import { createContext, type ReactNode, useCallback, useContext, useState, useEffect } from "react";
import { useVideoContext, ObjectTrackers } from "contexts/VideoContext";

interface WebSocketContextProviderProps {
    children: ReactNode;
}

interface WebSocketState {
    isConnected: boolean;
    hasConnectionIssue: boolean;
    send: (message: OutgoingMessage) => void;
}

interface OutgoingMessage {
    type: string;
    content?: string;
    tracker?: ObjectTrackers;
    video_name?: string;
    count?: string;
}


export const WebSocketContext = createContext<WebSocketState>({
    isConnected: false,
    hasConnectionIssue: false,
    send: () => {},
});

export function useWebSocket() {
    return useContext(WebSocketContext);
}

export function WebSocketContextProvider({ children }: WebSocketContextProviderProps) {
    const videoContext = useVideoContext();
    const [isConnected, setIsConnected] = useState(false);
    const [hasConnectionIssue, setHasConnectionIssue] = useState(false);
    const [ws, setWs] = useState<WebSocket | null>(null);

    const sendMessage = useCallback((message: OutgoingMessage) => {
        if (ws && isConnected) {
            ws.send(JSON.stringify(message));
        }
    }, [ws, isConnected]);

    const requestVideoFrames = useCallback((frameCount: number) => {
        sendMessage({ type: "get_frames", count: frameCount.toString() })
    }, [sendMessage]);

    useEffect(() => {
        const ws = new WebSocket("wss://robertsgroza.id.lv/socket/");

        ws.onopen = () => {
            setIsConnected(true);
            setHasConnectionIssue(false);
        }
        
        ws.onclose = () => {
            setIsConnected(false);
        }

        ws.onerror = () => {
            setHasConnectionIssue(true);
        }

        ws.onmessage = ({ data }) => {
            const message = JSON.parse(data);

            const requestNextFrames = (frameCount: number) => {
                ws.send(JSON.stringify({ type: "get_frames", count: frameCount.toString() }))
            }

            if (message.type === "video_frame") {
                videoContext.addFrameToBuffer(message, requestNextFrames);
                return;
            }

            if (message.type === "video_list") {
                videoContext.setVideoList(message.videos);
                videoContext.setSelectedVideo(message.videos[0]);
                ws.send(JSON.stringify({
                    type: "get_summary",
                    video_name: message.videos[0],
                    tracker: ObjectTrackers.sort,
                }))
                return;
            }

            if (message.type === "video_summary") {
                videoContext.setFrameRate(parseInt(message.content.fps))
                videoContext.setAllObjects(message.content.ids)
                return;
            }

            if (message.type === "video_end") {
                videoContext.setIsFullyLoaded(true);
                return;
            }

            if (message.type === "stop_buffer_success") {
                videoContext.clearBuffer();
                return;
            }
        }

        setWs(ws);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Send play only if video hasn't yet been requested to server
    useEffect(() => {
        if (ws && videoContext.isPlaying && !videoContext.isVideoRequested && videoContext.selectedVideo) {
            sendMessage({ type: "play", video_name: videoContext.selectedVideo, tracker: videoContext.objectTracker });
            requestVideoFrames(10);
            videoContext.setIsVideoRequested(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoContext.isPlaying, videoContext.isVideoRequested, sendMessage, videoContext.selectedVideo])


    return (
        <WebSocketContext.Provider value={{
            isConnected: isConnected,
            send: sendMessage,
            hasConnectionIssue: hasConnectionIssue,
        }}>
            {children}
        </WebSocketContext.Provider>
    )
}
