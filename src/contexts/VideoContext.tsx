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
    addFrameToBuffer: (frame: VideoFrame, loadMoreFrames: (frameCount: number) => void) => void;
    setFrameRate: (frameRate: number) => void;
    setIsFullyLoaded: (value: boolean) => void;
    setIsPlaying: (value: boolean) => void;
    playbackSpeed: number;
    setPlaybackSpeed: (value: number) => void;
    videoList: string[];
    setVideoList: (value: string[]) => void;
    selectedVideo?: string;
    setSelectedVideo: (value: string) => void;
    setIsVideoRequested: (value: boolean) => void;
    allObjects: Object[];
    setAllObjects: (objects: Object[]) => void;
    clearBuffer: () => void;
    objectTracker: ObjectTrackers;
    setObjectTracker: (objectTracker: ObjectTrackers) => void;
}

export interface ObjectInformation {
    id: number;
    class: string;
    x: number;
    y: number;
    width: number;
    height: number;
    mask?: [number, number][];
}

interface VideoFrame {
    frame: string;
    positions: ObjectInformation[];
}

interface Object {
    id: number;
    class: string;
}

export enum ObjectTrackers {
    sort = "SORT",
    deepSort = "DEEP_SORT",
    byteTrack = "BYTE_TRACK",
    byteTrackSegmented = "BYTE_TRACK_SEGMENTED",
}

export const VideoContext = createContext<VideoContextState>({
    currentVideoFrame: null,
    isPlaying: false,
    frameRate: 30,
    isFullyLoaded: false,
    addFrameToBuffer: () => {},
    setFrameRate: () => {},
    setIsFullyLoaded: () => {},
    setIsPlaying: () => {},
    videoEnded: false,
    showLoadingIndicator: false,
    isVideoRequested: false,
    playbackSpeed: 1,
    setPlaybackSpeed: () => {},
    videoList: [],
    setVideoList: () => {},
    setSelectedVideo: () => {},
    setIsVideoRequested: () => {},
    allObjects: [],
    setAllObjects: () => {},
    clearBuffer: () => {},
    objectTracker: ObjectTrackers.sort,
    setObjectTracker: () => {},
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
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [videoList, setVideoList] = useState<string[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<string | undefined>();
    const [allObjects, setAllObjects] = useState<Object[]>([]);
    const [isBufferBuilt, setIsBufferBuilt] = useState(false);
    const [objectTracker, setObjectTracker] = useState<ObjectTrackers>(ObjectTrackers.sort);
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
                if (isBufferBuilt && !isFullyLoaded && currentFrameIndex.current + 5> frameBuffer.current.length) {
                    setShowLoadingIndicator(true);
                    setIsBufferBuilt(false);
                    return;
                }           
                
                if (!isBufferBuilt) {
                    setShowLoadingIndicator(true);
                    return;
                }

                if (frameBuffer.current[currentFrameIndex.current]) {
                    setShowLoadingIndicator(false);
                    setCurrentVideoFrame(frameBuffer.current[currentFrameIndex.current]);
                    currentFrameIndex.current += 1;
                } else {
                    setVideoEnded(true);
                    setIsPlaying(false);
                }
            },
            // For some reason on firefox video plays slower than on chrome
            ((1000 / frameRate) - (navigator.userAgent.indexOf("Firefox") > -1 ? 5 : 0)) / playbackSpeed,
        );

        return () => {
            clearInterval(frameInterval);
        }
    }, [isPlaying, frameRate, videoEnded, isFullyLoaded, playbackSpeed, isBufferBuilt])

    const addFrameToBuffer = useCallback((frame: VideoFrame, loadMoreFrames: (frameCount: number) => void) => {
        // When buffer end is reached, build at least minimumBufferSize
        const minimumBufferSize = 2 * frameRate;
        if (currentFrameIndex.current + minimumBufferSize < frameBuffer.current.length) {
            setIsBufferBuilt(true);
        }
        
        frameBuffer.current.push(frame);

        // Workaround - Load frames in chunks, so the receiving of videoFrames from WebSocket can be stopped with message
        const buffer_chunk_length = 10;
        if (frameBuffer.current.length % buffer_chunk_length === 0) {
            loadMoreFrames(buffer_chunk_length);
        }
    }, [frameRate]);

    const changeVideo = useCallback((video: string) => {
        setFrameRate(30);
        setCurrentVideoFrame(null);
        setIsFullyLoaded(false);
        setIsVideoRequested(false);
        setIsPlaying(false);
        setVideoEnded(false);
        frameBuffer.current = [];
        currentFrameIndex.current = 0;
        setSelectedVideo(video);
    }, []);
    
    const clearBuffer = useCallback(() => {
        frameBuffer.current = [];
    }, []);

    return (
        <VideoContext.Provider value={{
            currentVideoFrame: currentVideoFrame,
            frameRate: frameRate,
            setFrameRate: setFrameRate,
            addFrameToBuffer: addFrameToBuffer,
            isFullyLoaded: isFullyLoaded,
            setIsFullyLoaded: setIsFullyLoaded,
            isPlaying: isPlaying,
            setIsPlaying: setIsPlaying,
            videoEnded: videoEnded,
            showLoadingIndicator: showLoadingIndicator,
            isVideoRequested: isVideoRequested,
            playbackSpeed: playbackSpeed,
            setPlaybackSpeed: setPlaybackSpeed,
            videoList: videoList,
            setVideoList: setVideoList,
            selectedVideo: selectedVideo,
            setSelectedVideo: changeVideo,
            setIsVideoRequested: setIsVideoRequested,
            allObjects: allObjects,
            setAllObjects: setAllObjects,
            clearBuffer: clearBuffer,
            objectTracker: objectTracker,
            setObjectTracker: setObjectTracker,
        }}>
            {children}
        </VideoContext.Provider>
    )
}
