import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
import {
  FACE_LANDMARKS_NOSE,
  NOSE_LANDMARKS,
  MOUTH_LANDMARKS,
  FACE_LANDMARKS_TESSELATION,
  FACE_LANDMARKS_LIPS,
  FACE_LANDMARKS_LEFT_EYE,
  FACE_LANDMARKS_LEFT_EYEBROW,
  FACE_LANDMARKS_LEFT_IRIS,
  FACE_LANDMARKS_RIGHT_EYE,
  FACE_LANDMARKS_RIGHT_EYEBROW,
  FACE_LANDMARKS_RIGHT_IRIS,
  FACE_LANDMARKS_FACE_OVAL,
  FACE_LANDMARKS_CONTOURS,
} from "./partData";

export default function useMediaPipe() {
  const video: HTMLVideoElement = document.getElementById("video")!;
  console.log(video);
  const canvasElement = document.getElementById("output") as HTMLCanvasElement;
  const ctx = canvasElement.getContext("2d") as CanvasRenderingContext2D;

  const videoWidth = 480;
  let runningMode: "IMAGE" | "VIDEO" = "VIDEO";
  let vision, faceLandmarker;
  async function createFaceLandmarker() {
    vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU",
      },
      minDetectionConfidence: 0.001,
      minFacePresenceConfidence: 0.001,
      minTrackingConfidence: 0.0001,
      outputFaceBlendshapes: false,
      runningMode,
      numFaces: 1,
    });
    console.log("faceLandmarker created.", faceLandmarker);
    // await faceLandmarker.setOptions({ runningMode: "VIDEO" });
  }
  createFaceLandmarker();

  const drawingUtils = new DrawingUtils(ctx);

  let lastVideoTime = -1;
  let results;
  let needResult = true;

  async function detectPicture(target) {
    if (!faceLandmarker) {
      console.log("Wait for faceLandmarker to load before clicking!");
      return;
    }

    if (runningMode === "VIDEO") {
      runningMode = "IMAGE";
      await faceLandmarker.setOptions({ runningMode });
    }
    // Remove all landmarks drawed before
    // const allCanvas = target.parentNode.getElementsByClassName("canvas");
    // for (var i = allCanvas.length - 1; i >= 0; i--) {
    //   const n = allCanvas[i];
    //   n.parentNode.removeChild(n);
    // }

    // We can call faceLandmarker.detect as many times as we like with
    // different image data each time. This returns a promise
    // which we wait to complete and then call a function to
    // print out the results of the prediction.
    results = faceLandmarker.detect(target);

    if (results.faceLandmarks.length && results.faceLandmarks[0].length > 0) {
      needResult = true;
    }
    console.log(results);
    const drawingUtils = new DrawingUtils(ctx);
    for (const landmarks of results.faceLandmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_TESSELATION,
        { color: "#C0C0C070", lineWidth: 1 }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
        { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        { color: "#30FF30" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
        { color: "#30FF30" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
        { color: "#E0E0E0" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LIPS,
        {
          color: "#E0E0E0",
        }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
        { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
        { color: "#30FF30" }
      );
    }
  }

  async function predictWebcam() {
    const radio = video.videoHeight / video.videoWidth;
    video.style.width = videoWidth + "px";
    video.style.height = videoWidth * radio + "px";
    canvasElement.style.width = videoWidth + "px";
    canvasElement.style.height = videoWidth * radio + "px";
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
    // Now let's start detecting the stream.
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      results = faceLandmarker.detectForVideo(video, startTimeMs);
      console.log(results);
    }
    if (results.faceLandmarks.length && results.faceLandmarks[0].length > 0) {
      needResult = true;
    }

    if (results.faceLandmarks) {
      // ctx.fillStyle = "#000"; // 背景色
      ctx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
      // ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
      for (const landmarks of results.faceLandmarks) {
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_TESSELATION, {
          color: "#C0C0C070",
          lineWidth: 1,
        });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_RIGHT_EYE, {
          color: "#FF3030",
        });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_RIGHT_EYEBROW, {
          color: "#FF3030",
        });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_LEFT_EYE, {
          color: "#30FF30",
        });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_LEFT_EYEBROW, {
          color: "#30FF30",
        });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_FACE_OVAL, {
          color: "#E0E0E0",
        });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_LIPS, {
          color: "#FF3030",
        });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_RIGHT_IRIS, {
          color: "#FF3030",
        });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_LEFT_IRIS, {
          color: "#30FF30",
        });

        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_NOSE, {
          color: "#ff0000",
        });
        drawingUtils.drawConnectors(landmarks, NOSE_LANDMARKS, {
          color: "#00ff00",
        });
        drawingUtils.drawConnectors(landmarks, MOUTH_LANDMARKS, {
          color: "#00ff00",
        });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_CONTOURS, {
          color: "#00ffff",
        });
      }
    }

    requestAnimationFrame(predictWebcam);
    // Call this function again to keep predicting when the browser is ready.
  }

  function startDetecte() {
    requestAnimationFrame(predictWebcam);
  }
  function updateLandMark(position) {
    const positions = position.array;
    if (results && results.faceLandmarks && needResult) {
      const faceLandmarks = results.faceLandmarks[0];
      needResult = false;

      const scale = 100;
      for (let i = 0; i < 478; i++) {
        const lanmmark = faceLandmarks[i];
        // positions.push(landmark.x, landmark.y, landmark.z);
        positions[i * 3] = (lanmmark.x - 0.5) * scale;
        positions[i * 3 + 1] = (1.0 - lanmmark.y - 0.5) * scale;
        // positions[i * 3 + 2] = (lanmmark.z - 0.5) * scale;
        positions[i * 3 + 2] = 0;
      }
      position.needsUpdate = true;
    }
  }
  return {
    startDetecte,
    detectPicture,
    updateLandMark,
  };
}
