import { useCallback, useEffect, useRef } from "react";
import { useVideoContext } from "contexts/VideoContext";

export function VideoPlayer() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoContext = useVideoContext();

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
                        ctx.beginPath();
                        ctx.rect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height)
                        ctx.stroke()
                    }
                }
            };
            image.src = 'data:image/png;base64,' + videoContext.currentVideoFrame.frame;
        }
    }, [videoContext.currentVideoFrame]);

    const playVideo = useCallback(() => {
        videoContext.setIsPlaying(!videoContext.isPlaying);
    }, [videoContext]);

    const buttonContent = () => {
        if (videoContext.videoEnded) {
            return "REPLAY";
        } else if (videoContext.isPlaying) {
            return "STOP";
        }
        return "PLAY";
    }

    return (
        <>
            <canvas ref={canvasRef} width="640" height="360"></canvas>
            <button onClick={() => playVideo()}>{buttonContent()}</button>
            {videoContext.showLoadingIndicator && <h3>LOADING...</h3>}
        </>
    )
}
