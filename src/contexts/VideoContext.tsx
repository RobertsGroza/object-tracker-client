import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useState,
    useEffect,
    useRef,
} from "react";

interface VideoContextProviderProps {
    children: ReactNode;
}

interface VideoContextState {
    currentVideoFrame: VideoFrame | null;
    frameRate: number;
    isFullyLoaded: boolean;
    isPlaying: boolean;
    videoEnded: boolean;
    showLoadingIndicator: boolean;
    isVideoRequested: boolean;
    addFrameToBuffer: (frame: VideoFrame) => void;
    setFrameRate: (frameRate: number) => void;
    setIsFullyLoaded: (value: boolean) => void;
    setIsPlaying: (value: boolean) => void;
    clearState: () => void;
}

interface ObjectInformation {
    id: number;
    class: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface VideoFrame {
    frame: string;
    positions: ObjectInformation[];
}

export const VideoContext = createContext<VideoContextState>({
    currentVideoFrame: null,
    isPlaying: false,
    frameRate: 30,
    isFullyLoaded: false,
    addFrameToBuffer: () => {},
    setFrameRate: () => {},
    clearState: () => {},
    setIsFullyLoaded: () => {},
    setIsPlaying: () => {},
    videoEnded: false,
    showLoadingIndicator: false,
    isVideoRequested: false,
});

export function useVideoContext() {
    return useContext(VideoContext);
}

export function VideoContextProvider({ children }: VideoContextProviderProps) {
    const [frameRate, setFrameRate] = useState(30);
    const [currentVideoFrame, setCurrentVideoFrame] = useState<VideoFrame | null>(null); 
    const [isFullyLoaded, setIsFullyLoaded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoEnded, setVideoEnded] = useState(false);
    const [isVideoRequested, setIsVideoRequested] = useState(false);
    const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
    const frameBuffer = useRef<VideoFrame[]>([]);
    const currentFrameIndex = useRef<number>(0)

    useEffect(() => {
        if (isPlaying && videoEnded) {
            currentFrameIndex.current = 0;
            setVideoEnded(false);
        }
    }, [isPlaying, videoEnded])

    useEffect(() => {
        let frameInterval: NodeJS.Timer | undefined;

        if (!isPlaying || videoEnded) {
            return;
        }

        frameInterval = setInterval(
            () => {
                if (!isFullyLoaded && currentFrameIndex.current + frameRate > frameBuffer.current.length) {
                    setShowLoadingIndicator(true);
                    return;
                }                

                if (frameBuffer.current[currentFrameIndex.current]) {
                    setShowLoadingIndicator(false);
                    setCurrentVideoFrame(frameBuffer.current[currentFrameIndex.current]);
                    currentFrameIndex.current += 1;
                } else {
                    setVideoEnded(true);
                    setIsPlaying(false); // TODO: HERE CAN ADD LOOP LOGIC
                }
            },
            // For some reason on firefox video plays slower than on chrome
            (1000 / frameRate) - (navigator.userAgent.indexOf("Firefox") > -1 ? 5 : 0),
        );

        return () => {
            clearInterval(frameInterval);
        }
    }, [isPlaying, frameRate, videoEnded, isFullyLoaded])

    const addFrameToBuffer = useCallback((frame: VideoFrame) => {
        setIsVideoRequested(true);
        frameBuffer.current.push(frame);
    }, []);

    const clearState = useCallback(() => {
        setFrameRate(30);
        setCurrentVideoFrame(null);
        setIsFullyLoaded(false);
        setIsVideoRequested(false);
        frameBuffer.current = [];
    }, []);

    return (
        <VideoContext.Provider value={{
            currentVideoFrame: currentVideoFrame,
            frameRate: frameRate,
            setFrameRate: setFrameRate,
            addFrameToBuffer: addFrameToBuffer,
            clearState: clearState,
            isFullyLoaded: isFullyLoaded,
            setIsFullyLoaded: setIsFullyLoaded,
            isPlaying: isPlaying,
            setIsPlaying: setIsPlaying,
            videoEnded: videoEnded,
            showLoadingIndicator: showLoadingIndicator,
            isVideoRequested: isVideoRequested,
        }}>
            {children}
        </VideoContext.Provider>
    )
}
