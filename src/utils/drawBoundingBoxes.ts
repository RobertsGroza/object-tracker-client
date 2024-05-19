import { ObjectInformation } from "contexts/VideoContext";

const STROKE_COLORS = [
    "rgb(255, 0, 0)",
    "rgb(0, 255, 0)",
    "rgb(0, 0, 255)",
    "rgb(255, 255, 0)",
    "rgb(0, 255, 255)",
    "rgb(255, 0, 255)",
    "rgb(255, 255, 255)",
    "rgb(122, 7, 42)",
    "rgb(223, 154, 237)",
    "rgb(135, 72, 0)",
];
const FILL_COLORS = [
    "rgba(255, 0, 0, 0.2)",
    "rgba(0, 255, 0, 0.2)",
    "rgba(0, 0, 255, 0.2)",
    "rgba(255, 255, 0, 0.2)",
    "rgba(0, 255, 255, 0.2)",
    "rgba(255, 0, 255, 0.2)",
    "rgba(255, 255, 255, 0.2)",
    "rgba(122, 7, 42, 0.2)",
    "rgba(223, 154, 237, 0.2)",
    "rgba(135, 72, 0, 0.2)",
];

export function drawMask(ctx: CanvasRenderingContext2D, boundingBox: ObjectInformation, objectLabel: string[]) {
    const mask = boundingBox.mask!;
    let smallestX = Number.MAX_VALUE;
    let smallestY = Number.MAX_VALUE;
    
    ctx.beginPath();
    ctx.fillStyle = FILL_COLORS[boundingBox.id % 10];
    ctx.strokeStyle = STROKE_COLORS[boundingBox.id % 10];
    ctx.lineWidth = 2;
    ctx.moveTo(mask[0][0], mask[0][1]);
    for (const point of mask) {
        if (point[0] < smallestX) {
            smallestX = point[0];
        }
        if (point[1] < smallestY) {
            smallestY = point[1];
        }
        ctx.lineTo(point[0], point[1]);
    }
    ctx.font = "12px Arial";
    ctx.strokeText(objectLabel.join(", "), smallestX, smallestY - 5);
    ctx.stroke();
    ctx.fill();
    ctx.closePath();
}

export function drawBoundingBox(ctx: CanvasRenderingContext2D, boundingBox: ObjectInformation, objectLabel: string[]) {
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
    ctx.closePath();
}
