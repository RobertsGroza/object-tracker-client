export function drawFPS(ctx: CanvasRenderingContext2D, fps: number) {
    ctx.beginPath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.rect(0, 0, 50, 20);
    ctx.fill();
    ctx.font = "12px Arial";
    ctx.strokeStyle = "#ffff00";
    ctx.strokeText("FPS: " + Math.floor(fps).toString(), 0, 12);
    ctx.closePath();
}
