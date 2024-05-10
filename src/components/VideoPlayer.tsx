import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useVideoContext } from "contexts/VideoContext";
import { useWebSocket } from "contexts/WebSocket";

const STROKE_COLORS = [
    "rgb(255, 0, 0)",
    "rgb(0, 255, 0)",
    "rgb0, 0, 255)",
    "rgb(255, 255, 0)",
    "rgb(0, 255, 255)",
    "rgb(255, 0, 255)",
    "rgb(185, 185, 185)",
    "rgb(122, 7, 42)",
    "rgb(223, 154, 237)",
    "rgb(135, 72, 0)",
];
const FILL_COLORS = [
    "rgba(255, 0, 0, 0.2)",
    "rgba(0, 255, 0, 0.2)",
    "rgba0, 0, 255, 0.2)",
    "rgba(255, 255, 0, 0.2)",
    "rgba(0, 255, 255, 0.2)",
    "rgba(255, 0, 255, 0.2)",
    "rgba(185, 185, 185, 0.2)",
    "rgba(122, 7, 42, 0.2)",
    "rgba(223, 154, 237, 0.2)",
    "rgba(135, 72, 0, 0.2)",
];

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
                    // TODO: This can be calculated just once instead of each frame
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

                        ctx.beginPath();
                        ctx.strokeStyle = STROKE_COLORS[boundingBox.id % 10];
                        ctx.lineWidth = 3;
                        ctx.fillStyle = FILL_COLORS[boundingBox.id % 10];
                        ctx.rect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
                        ctx.stroke();
                        ctx.fill();
                        ctx.lineWidth = 1;
                        ctx.font = "12px Arial";
                        ctx.strokeText(objectLabel.join(", "), boundingBox.x, boundingBox.y - 3);
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
        webSocket.send({ type: "stop_buffer", content: "" });
        webSocket.send({ type: "get_summary", content: event.target.value });
        setSelectedClass("all_classes");
        setSelectedObjectId(-1);
    }, [videoContext, webSocket]);

    const changeSelectedClass = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        setSelectedClass(event.target.value);
    }, []);

    const changeSelectedObject = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        setSelectedObjectId(parseInt(event.target.value));
    }, []);

    function uniqueClassFilter(value: string, index: number, array: string[]) {
        return array.indexOf(value) === index;
    }

    const buttonContent = () => {
        if (videoContext.videoEnded) {
            return "REPLAY";
        } else if (videoContext.isPlaying) {
            return "STOP";
        }
        return "PLAY";
    }

    if (!webSocket.isConnected || webSocket.hasConnectionIssue) {
        return null;
    }

    return (
        <>
            {videoContext.showLoadingIndicator
                ? <h3>LOADING...</h3>
                : <canvas ref={canvasRef} width="640" height="360"></canvas>
            }
            <br />
            <button onClick={() => playVideo()}>{buttonContent()}</button>
            <br />
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
            <br />
            <label htmlFor="videoSelect">Played video: </label>
            <select
                name="videoSelect"
                id="videoSelect"
                value={videoContext.selectedVideo}
                onChange={changeSelectedVideo}
            >
                {videoContext.videoList.map(el => <option key={el} value={el}>{el}</option>)}
            </select>
            <br />
            <label htmlFor="classSelect">Show specific class: </label>
            <select
                name="classSelect"
                id="classSelect"
                value={selectedClass}
                onChange={changeSelectedClass}
            >
                <option value="all_classes">Show all</option>
                {videoContext.allObjects.map(el => el.class).filter(uniqueClassFilter).map(el => <option key={el} value={el}>{el}</option>)}
            </select>
            <br />
            <label htmlFor="idSelect">Track specific ID: </label>
            <select
                name="idSelect"
                id="idSelect"
                value={selectedObjectId}
                onChange={changeSelectedObject}
            >
                <option value={-1}>Show all</option>
                {videoContext.allObjects.map(el => <option key={el.id} value={el.id}>ID: {el.id}, Class: {el.class}</option>)}
            </select>
            <br />
            <input
                type="checkbox"
                id="show_id"
                name="show_id"
                checked={showId}
                onChange={(el) => setShowId(el.target.checked)}
            />
            <label htmlFor="show_id"> Show ID</label>
            <br />
            <input
                type="checkbox"
                id="show_class"
                name="show_class"
                checked={showClass}
                onChange={(el) => setShowClass(el.target.checked)}
            />
            <label htmlFor="show_class"> Show class name</label>
        </>
    )
}
