import vision from "../mediapipe/tasks-vision@0.10.3";
const { FaceLandmarker, DrawingUtils, FilesetResolver } = vision;
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
  getEyeball,
  getFaceOvalIndex,
} from "./partData";
import { useGlobalConfig } from "../stores";
import { BufferGeometry } from "three";
import { alphaT } from "three/tsl";
import { CanvasTexture } from "three";

export default function useMediaPipe() {
  const video: HTMLVideoElement = document.getElementById("video")!;
  const NUM_RANDOM_LINES = 500; // 生成随机线条的数量
  const BODY_LINE_DEPTH = 1.5; // 随机线条在Z轴上的分布厚度
  console.log(video);
  const canvasElement = document.getElementById("output") as HTMLCanvasElement;
  const ctx = canvasElement.getContext("2d") as CanvasRenderingContext2D;

  const maskCanvasElement = document.getElementById(
    "mask"
  ) as HTMLCanvasElement;
  const maskCtx = maskCanvasElement.getContext("2d", {
    alpha: true,
  }) as CanvasRenderingContext2D;

  const maskFaceTexture = new CanvasTexture(maskCanvasElement);

  const globalConfig = useGlobalConfig();
  setTimeout(() => {
    globalConfig.maps.maskFaceTexture = maskFaceTexture;
  });
  const videoWidth = 480;
  let videoHeight = 0;
  let runningMode: "IMAGE" | "VIDEO" = "VIDEO";
  let vision, faceLandmarker, imageSegmenter;
  let labels;
  async function createFaceLandmarker() {
    vision = await FilesetResolver.forVisionTasks("/src/mediapipe/wasm");
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `/src/mediapipe/face_landmarker.task`,
        delegate: "GPU",
      },
      // minDetectionConfidence: 0.001,
      // minFacePresenceConfidence: 0.001,
      // minTrackingConfidence: 0.0001,
      outputFaceBlendshapes: false,
      runningMode,
      numFaces: 1,
    });

    // imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
    //   baseOptions: {
    //     modelAssetPath:
    //       "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite",
    //     delegate: "GPU",
    //   },
    //   runningMode: runningMode,
    //   outputCategoryMask: true,
    //   outputConfidenceMasks: false,
    // });
    // labels = imageSegmenter.getLabels();
    // console.log("faceLandmarker created.", faceLandmarker);
    if (globalConfig.isLocal) {
      // setTimeout(() => {
      try {
        startDetecte();
      } catch (error) {
        console.log(error);
      }
      // });
    }
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

  // function updateFaceMesh(landmarks, faceMesh) {
  //   const positions = faceMesh.geometry.attributes.position.array;
  //   for (let i = 0; i < landmarks.length; i++) {
  //     const p = landmarks[i];
  //     positions[i * 3] = (p.x - 0.5) * 2;
  //     positions[i * 3 + 1] = -(p.y - 0.5) * 2;
  //     positions[i * 3 + 2] = -p.z * 2;
  //   }
  //   faceMesh.geometry.attributes.position.needsUpdate = true;
  // }

  function setSize(_canvasElement, video) {
    const radio = video.videoHeight / video.videoWidth;
    video.style.width = videoWidth + "px";
    videoHeight = Math.floor(videoWidth * radio);
    video.style.height = videoHeight + "px";
    _canvasElement.style.width = videoWidth + "px";
    _canvasElement.style.height = videoHeight + "px";
    _canvasElement.width = video.videoWidth;
    _canvasElement.height = video.videoHeight;
  }

  async function predictWebcam() {
    requestAnimationFrame(predictWebcam);
    if (globalConfig.hasFaceInfo) return;
    // 如果是中断过程，不需要检查
    if (!globalConfig.canPlay) return;
    setSize(canvasElement, video);
    setSize(maskCanvasElement, video);
    // Now let's start detecting the stream.
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      results = faceLandmarker.detectForVideo(video, startTimeMs);

      // imageSegmenter.segmentForVideo(video, startTimeMs, (result) => {
      //   let imageData = ctx.getImageData(
      //     0,
      //     0,
      //     video.videoWidth,
      //     video.videoHeight
      //   ).data;
      //   console.log(result);
      //   return;
      //   // 在segmenter的回调中处理所有更新
      //   if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      //     // updateFaceMesh(faceResults.faceLandmarks[0]);
      //     updateRandomLines(mask, results.faceLandmarks[0]);
      //   }
      //   // 即使没有脸，只要有人，也更新随机线条
      //   else if (mask) {
      //     updateRandomLines(mask, null);
      //   }
      // });
      // console.log(results);
    }
    if (results.faceLandmarks.length && results.faceLandmarks[0].length > 0) {
      needResult = true;
    }

    if (results.faceLandmarks && globalConfig.drawFaceDetection) {
      // ctx.fillStyle = "#000"; // 背景色
      const landmarks = results.faceLandmarks[0];
      ctx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
      // ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
      for (const landmarks of results.faceLandmarks) {
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_TESSELATION, {
          color: "#C0C0C070",
          lineWidth: 1,
        });
        // drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_RIGHT_EYE, {
        //   color: "#FF3030",
        // });
        // drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_RIGHT_EYEBROW, {
        //   color: "#FF3030",
        // });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_LEFT_EYE, {
          color: "#30FF30",
        });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_LEFT_EYEBROW, {
          color: "#30FF30",
        });
        // drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_FACE_OVAL, {
        //   color: "#E0E0E0",
        // });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_LIPS, {
          color: "#FF3030",
        });
        // drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_RIGHT_IRIS, {
        //   color: "#FF3030",
        // });
        drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_LEFT_IRIS, {
          color: "#30FF30",
        });

        // drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_NOSE, {
        //   color: "#ff0000",
        // });
        // drawingUtils.drawConnectors(landmarks, NOSE_LANDMARKS, {
        //   color: "#00ff00",
        // });
        // drawingUtils.drawConnectors(landmarks, MOUTH_LANDMARKS, {
        //   color: "#00ff00",
        // });
        // drawingUtils.drawConnectors(landmarks, FACE_LANDMARKS_CONTOURS, {
        //   color: "#00ffff",
        // });
      }

      maskCtx.clearRect(0, 0, videoWidth, videoHeight);
      fillArea(landmarks, FACE_LANDMARKS_FACE_OVAL, "blue");
      fillArea(landmarks, FACE_LANDMARKS_RIGHT_EYE, "red");
      fillArea(landmarks, FACE_LANDMARKS_LEFT_EYE, "red");
    }

    // Call this function again to keep predicting when the browser is ready.
  }

  const fillArea = (landmarks, paths, color) => {
    maskCtx.beginPath(); // 开始新路径
    for (let i = 0; i < paths.length; i++) {
      const point = paths[i];
      const lankmark = landmarks[point.start];
      if (i === 0) {
        maskCtx.moveTo(
          lankmark.x * canvasElement.width,
          lankmark.y * canvasElement.height
        );
      } else {
        maskCtx.lineTo(
          lankmark.x * canvasElement.width,
          lankmark.y * canvasElement.height
        );
      }
    }
    maskCtx.closePath();
    maskCtx.fillStyle = color;
    maskCtx.fill();
  };

  let isDetectionInited = false;
  function startDetecte() {
    console.log("-------------startDetecte---------------");
    if (globalConfig.isFaceReady) return;
    if (!faceLandmarker) return;
    if (isDetectionInited) return;
    requestAnimationFrame(predictWebcam);
    isDetectionInited = true;
  }
  function updateLandMark() {
    // const faceGeometry2 = globalConfig.faceGeometry as BufferGeometry;
    // if (!faceGeometry2) return;
    // // const positions = position.array;
    // const position = faceGeometry2.attributes.position;
    // const positions = position.array;
    let max = 0;
    let min = 0;
    let lx = 0,
      ly = 0,
      rx = 0,
      ry = 0;

    let minx, maxx, miny, maxy;
    minx = miny = 1;
    maxx = maxy = -1;
    if (results && results.faceLandmarks && needResult) {
      const faceLandmarks = results.faceLandmarks[0];
      if (!faceLandmarks?.length) return;
      setTimeout(() => {
        globalConfig.isFaceReady = true;
      });
      // console.log(faceLandmarks);
      needResult = false;
      globalConfig.isFaceLamkmardUpdate = true;
      const scale = 1;
      // for (let i = 0; i < 478; i++) {
      //   const lanmmark = faceLandmarks[i];
      //   // positions.push(landmark.x, landmark.y, landmark.z);
      //   positions[i * 3] = (lanmmark.x - 0.5) * scale;
      //   positions[i * 3 + 1] = (0.5 - lanmmark.y) * scale;
      //   const z = -lanmmark.z * scale;
      //   positions[i * 3 + 2] = z;
      //   if (max < z) max = z;
      //   if (min > z) min = z;
      // }

      if (!globalConfig.hasFaceInfo) {
        // 更新眼珠位置
        const { eyeBallRight, eyeBallLeft } = getEyeball();

        const [i1, i2, i3, i4] = eyeBallLeft;
        const [j1, j2, j3, j4] = eyeBallRight;
        lx =
          (faceLandmarks[i1].x +
            faceLandmarks[i2].x +
            faceLandmarks[i3].x +
            faceLandmarks[i4].x) /
          4;
        ly =
          (faceLandmarks[i1].y +
            faceLandmarks[i2].y +
            faceLandmarks[i3].y +
            faceLandmarks[i4].y) /
          4;
        rx =
          (faceLandmarks[j1].x +
            faceLandmarks[j2].x +
            faceLandmarks[j3].x +
            faceLandmarks[j4].x) /
          4;
        ry =
          (faceLandmarks[j1].y +
            faceLandmarks[j2].y +
            faceLandmarks[j3].y +
            faceLandmarks[j4].y) /
          4;

        const faceOvel = getFaceOvalIndex();
        for (let i = 0; i < faceOvel.length; i++) {
          const index = faceOvel[i];
          const landmark = faceLandmarks[index];
          if (minx > landmark.x) minx = landmark.x;
          if (maxx < landmark.x) maxx = landmark.x;
          if (miny > landmark.y) miny = landmark.y;
          if (maxy < landmark.y) maxy = landmark.y;
        }
        // position.needsUpdate = true;
      }

      if (!globalConfig.hasFaceInfo) {
        if (lx === 1 || lx === 0) return;
        globalConfig.hasFaceInfo = true;
        globalConfig.eyeBall.set(lx, 1.0 - ly, rx, 1.0 - ry);
        // globalConfig.faceAera.set(minx, miny, maxx, maxy);
        globalConfig.faceAera.set(minx, 1 - maxy, maxx, 1 - miny);
        //动态调整粒子的宽度
        const xw = Math.floor((200 / (maxx - minx)) * 0.3);
        globalConfig.needUpdateParticleSize = true;
        globalConfig.maxParticleWidth = xw;
      }
      globalConfig.faceDepthMax = max;
      globalConfig.faceDepthMin = min;
    }

    // faceGeometry2.attributes.position.needsUpdate = true;
    // faceGeometry2.computeVertexNormals();
    // faceGeometry2.attributes.normal.needsUpdate = true;
  }
  return {
    startDetecte,
    detectPicture,
    updateLandMark,
  };
}
