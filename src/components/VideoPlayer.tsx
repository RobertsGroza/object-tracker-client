import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useVideoContext, ObjectTrackers } from "contexts/VideoContext";
import { useWebSocket } from "contexts/WebSocket";
import { drawBoundingBox, drawMask } from "utils/drawBoundingBoxes";
import "components/styles.css";
import "components/video-loader.css";

export function VideoPlayer() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoContext = useVideoContext();
    const webSocket = useWebSocket();
    const [selectedObjectId, setSelectedObjectId] = useState<number>(-1);
    const [selectedClass, setSelectedClass] = useState<string>("all_classes");
    const [showId, setShowId] = useState(true);
    const [showClass, setShowClass] = useState(false);

    useEffect(() => {
        if (canvasRef.current && videoContext.currentVideoFrame) {
            const ctx = canvasRef.current.getContext("2d");

            const image = new Image();
            image.onload = function() {
                if (ctx !== null && canvasRef.current && videoContext.currentVideoFrame) {
                    const hRatio = canvasRef.current.width / image.width;
                    const vRatio = canvasRef.current.height / image.height;
                    const ratio  = Math.min ( hRatio, vRatio );
                    ctx.drawImage(
                        image, 0, 0, image.width, image.height,
                        0, 0, image.width * ratio, image.height * ratio,
                    );

                    for (const boundingBox of videoContext.currentVideoFrame.positions) {
                        if (selectedClass !== "all_classes" && boundingBox.class !== selectedClass) {
                            continue;
                        }

                        if (selectedObjectId !== -1 && boundingBox.id !== selectedObjectId) {
                            continue;
                        }

                        const objectLabel = [];
                        if (showId) {
                            objectLabel.push(`ID: ${boundingBox.id}`);
                        }
                        if (showClass) {
                            objectLabel.push(`class: ${boundingBox.class}`);
                        }

                        if (boundingBox.mask && boundingBox.mask[0]) {
                            drawMask(ctx, boundingBox, objectLabel);
                            continue;
                        }

                        drawBoundingBox(ctx, boundingBox, objectLabel);
                    }
                }
            };
            image.src = 'data:image/png;base64,' + videoContext.currentVideoFrame.frame;
        }
    }, [videoContext.currentVideoFrame, selectedClass, selectedObjectId, showId, showClass]);

    const playVideo = useCallback(() => {
        videoContext.setIsPlaying(!videoContext.isPlaying);
    }, [videoContext]);

    const changePlaybackSpeed = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        videoContext.setPlaybackSpeed(parseFloat(event.target.value));
    }, [videoContext]);

    const changeSelectedVideo = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        videoContext.setSelectedVideo(event.target.value);
        webSocket.send({ type: "stop_buffer" });
        webSocket.send({ type: "get_summary", video_name: event.target.value, tracker: videoContext.objectTracker });
        setSelectedClass("all_classes");
        setSelectedObjectId(-1);
    }, [videoContext, webSocket]);

    const changeSelectedClass = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        setSelectedClass(event.target.value);
    }, []);

    const changeSelectedObject = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        setSelectedObjectId(parseInt(event.target.value));
    }, []);

    const changeObjectTracker = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        const selectedTracker = event.target.value as ObjectTrackers;
        videoContext.setObjectTracker(selectedTracker);
        if (videoContext.selectedVideo) {
            videoContext.setSelectedVideo(videoContext.selectedVideo!);
            webSocket.send({ type: "stop_buffer" });
            webSocket.send({ type: "get_summary", video_name: videoContext.selectedVideo, tracker: selectedTracker });
        }
        setSelectedClass("all_classes");
        setSelectedObjectId(-1);
    }, [videoContext, webSocket]);

    function uniqueClassFilter(value: string, index: number, array: string[]) {
        return array.indexOf(value) === index;
    }

    const buttonContent = () => {
        if (videoContext.videoEnded) {
            return "Replay";
        } else if (videoContext.isPlaying) {
            return "Pause";
        }
        return "Play";
    }

    const mainControlIcon = () => {
        if (videoContext.videoEnded) {
            return "repeat";
        } else if (videoContext.isPlaying) {
            return "pause";
        }
        return "play";    
    }

    if (!webSocket.isConnected || webSocket.hasConnectionIssue) {
        return null;
    }

    return (
        <>
            <div className="video-container">
                <canvas ref={canvasRef} width="640" height="360" onClick={() => playVideo()}></canvas>
                {videoContext.showLoadingIndicator
                    ? <div className="video-loader"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
                    : (
                        <div className="video-control-indicator" style={{ display: videoContext.isPlaying ? "none" : undefined }}>
                            <i className={`fa fa-${videoContext.videoEnded ? "repeat" : "play"}`}></i>
                        </div>
                    )
                }
            </div>
            <div className="video-controls">
                <div className="control-group">
                    <label htmlFor="videoSelect">Played video: </label>
                    <select
                        name="videoSelect"
                        id="videoSelect"
                        value={videoContext.selectedVideo}
                        onChange={changeSelectedVideo}
                    >
                        {videoContext.videoList.map(el => <option key={el} value={el}>{el}</option>)}
                    </select>
                </div>
                <div className="control-group">
                    <label htmlFor="tracker">Object tracker: </label>
                    <select
                        name="tracker"
                        id="tracker"
                        value={videoContext.objectTracker}
                        onChange={changeObjectTracker}
                    >
                        {Object.values(ObjectTrackers).map(el => (
                            <option key={el} value={el}>{el}</option>
                        ))}
                    </select>
                </div>
                <div className="control-group">
                    <label htmlFor="classSelect">Show specific class: </label>
                    <select
                        name="classSelect"
                        id="classSelect"
                        value={selectedClass}
                        onChange={changeSelectedClass}
                    >
                        <option value="all_classes">Track all</option>
                        {videoContext.allObjects.map(el => el.class).filter(uniqueClassFilter).map(el => <option key={el} value={el}>{el}</option>)}
                    </select>
                </div>
                <div className="control-group">
                    <label htmlFor="idSelect">Track specific ID: </label>
                    <select
                        name="idSelect"
                        id="idSelect"
                        value={selectedObjectId}
                        onChange={changeSelectedObject}
                    >
                        <option value={-1}>Track all {videoContext.allObjects.length} objects</option>
                        {videoContext.allObjects.map(el => <option key={el.id} value={el.id}>ID: {el.id}, Class: {el.class}</option>)}
                    </select>
                </div>
                <div className="control-group">
                    <label htmlFor="videoSpeed">Playback speed: </label>
                    <select
                        name="videoSpeed"
                        id="videoSpeed"
                        value={videoContext.playbackSpeed.toString()}
                        onChange={changePlaybackSpeed}
                    >
                        <option value="2">2x</option>
                        <option value="1">1x</option>
                        <option value="0.5">0.5x</option>
                        <option value="0.25">0.25x</option>
                    </select>
                </div>
                <div className="control-group-checkbox">
                    <input
                        type="checkbox"
                        id="show_id"
                        name="show_id"
                        checked={showId}
                        onChange={(el) => setShowId(el.target.checked)}
                    />
                    <label htmlFor="show_id"> Show ID</label>
                </div>
                <div className="control-group-checkbox">
                    <input
                        type="checkbox"
                        id="show_class"
                        name="show_class"
                        checked={showClass}
                        onChange={(el) => setShowClass(el.target.checked)}
                    />
                    <label htmlFor="show_class"> Show class name</label>
                </div>
                <button className="main-button" onClick={() => playVideo()}>
                    <i style={{ paddingRight: 6 }} className={`fa fa-${mainControlIcon()}`}></i>
                    {buttonContent()}
                </button>
            </div>
        </>
    )
}
