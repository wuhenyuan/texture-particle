import {
  Object3D,
  TextureLoader,
  Mesh,
  Vector2,
  BufferAttribute,
  MeshBasicMaterial,
  PlaneGeometry,
  RawShaderMaterial,
  InstancedBufferGeometry,
  LinearMipMapLinearFilter,
  InstancedBufferAttribute,
  LinearFilter,
  RGBFormat,
  RGBAFormat,
  NearestFilter,
  ShaderMaterial,
  AdditiveBlending,
  Vector4,
} from "three";
import { toRaw } from "vue";
// import { particleFrag, particleVert } from "./shader";
import particleFrag from "./depthShader/particles.frag";
import particleVert from "./depthShader/particles.vert";
import { useGlobalConfig } from "../stores";

// import TouchTexture from "./TouchTexture";
import getCrossTexture from "./../components/getCrossTexture";
import { Color } from "three/webgpu";

export default class Particles extends Object3D {
  constructor(scene, renderTexture, ratio) {
    super();
    this.scene = scene;
    this.scene.add(this);
    window.points = this;
    this.time = 0;
    this.progress = 0;
    // 可调节参数，2表示每2像素采样一次
    // this.sampleStep = 2;
    this.sampleStep = 1;
    this.sampleStepX = this.sampleStep;
    // this.sampleStepY = this.sampleStepX / ratio;
    this.sampleStepY = this.sampleStep;
    this.isTextureInit = false;
    // this.webgl = webgl;
    // this.container = new Object3D();
    // todo init width, height
    this.texture = renderTexture;
    this.resolution = new Vector2(this.width, this.height);
    this.globalConfig = useGlobalConfig();
    this.particleColor = new Color(0xffffff);
    this.uniforms = {
      uTime: { value: 0 },
      uRandom: { value: 0.0 },
      uDepth: { value: 2.0 },
      uSize: { value: 0.5 },
      uTextureSize: { value: this.resolution },
      decorationTextuer: { value: null },
      maskFaceTexture: { value: null },
      uTexture: { value: null },
      uPTexture: { value: this.uPTexture },
      uProgress: { value: this.progress },
      eyeBall: { value: this.globalConfig.eyeBall },
      faceAera: { value: this.globalConfig.faceAera },
      minSize: { value: 0 },
      eyeIntensity: { value: 0 },
      uParticleColor: { value: this.particleColor },
    };
    // 添加新的 uniform 变量
    this.uniforms.uBreathStrength = { value: 0.005 }; // 呼吸效果的强度
    this.uniforms.uBreathSpeed = { value: 0.1 }; // 呼吸效果的速度
    this.uniforms.uJitterStrength = { value: 0.2 }; // 粒子抖动的强度
    this.uniforms.uJitterScale = { value: 0.05 }; // 粒子抖动噪声的频率 (值越小，抖动范围越大，变化越平缓)
    this.uniforms.uJitterSpeed = { value: 0.1 }; // 粒子抖动噪声的演变速度
    this.init(this.texture);
  }

  updateTexture() {
    this.init(this.texture);
    // this.texture.needsUpdate = true;
    // this.material.uniforms.uTexture.value.needsUpdate = true;
    // this.material.needsUpdate = true;
  }

  init() {
    // this.texture = videoTexture;
    this.texture.minFilter = NearestFilter;
    this.texture.magFilter = NearestFilter;
    this.texture.format = RGBAFormat;
    // if (video) {
    //   const { videoWidth, videoHeight } = video;
    //   this.width = videoWidth;
    //   this.height = videoHeight;
    // } else {
    //   const texture = videoTexture;
    //   this.width = texture.image.width;
    //   this.height = texture.image.height;
    // }

    const texture = this.texture;
    this.width = texture.image.width;
    this.height = texture.image.height;
    const maxWidth = this.globalConfig.maxParticleWidth;
    if (this.width > maxWidth && this.width < this.height) {
      const ratio = this.width / this.height;
      this.width = maxWidth;
      this.height = Math.floor(maxWidth / ratio);
    }
    console.log(this.width, this.height);

    this.globalConfig.needUpdateParticleSize = false;
    this.resolution.set(this.width, this.height);
    this.initPoints(true);
    // this.initHitArea();
    // this.initTouch();
    // this.resize();
    //   this.show();
  }

  setParticleMap(texture) {
    this.uPTexture = texture;
    if (this.material) {
      this.material.uniforms.uPTexture.value = texture;
    }
    // this.material.needsUpdate = true;
  }

  initPoints(discard) {
    if (this.instancePoints) {
      try {
        this.instancePoints.dispose();
      } catch (e) {}
      this.remove(this.instancePoints);
      // this.destroy();
    }
    // 间隔采样
    const width = Math.floor(this.width / this.sampleStepX);
    const height = Math.floor(this.height / this.sampleStepY);
    this.numPoints = width * height;

    let numVisible = this.numPoints;

    const material = new ShaderMaterial({
      name: "pointMaterial",
      uniforms: this.uniforms,
      // vertexShader: glslify(require("../../../shaders/particle.vert")),
      // fragmentShader: glslify(require("../../../shaders/particle.frag")),
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      depthTest: false,
      transparent: true,
      blending: AdditiveBlending,
    });
    material.onBeforeRender = () => {};

    const geometry = new InstancedBufferGeometry();

    // positions
    const positions = new BufferAttribute(new Float32Array(4 * 3), 3);
    positions.setXYZ(0, -0.5, 0.5, 0.0);
    positions.setXYZ(1, 0.5, 0.5, 0.0);
    positions.setXYZ(2, -0.5, -0.5, 0.0);
    positions.setXYZ(3, 0.5, -0.5, 0.0);
    geometry.setAttribute("position", positions);

    // uvs
    const uvs = new BufferAttribute(new Float32Array(4 * 2), 2);
    uvs.setXYZ(0, 0.0, 0.0);
    uvs.setXYZ(1, 1.0, 0.0);
    uvs.setXYZ(2, 0.0, 1.0);
    uvs.setXYZ(3, 1.0, 1.0);
    geometry.setAttribute("uv", uvs);

    // index
    geometry.setIndex(
      new BufferAttribute(new Uint16Array([0, 2, 1, 2, 3, 1]), 1, false)
    );

    const indices = new Uint16Array(numVisible);
    const offsets = new Float32Array(numVisible * 3);
    const angles = new Float32Array(numVisible);

    // 修改offset计算逻辑
    // for (let i = 0, j = 0; i < this.width; i += this.sampleStep) {
    //   for (let k = 0; k < this.height; k += this.sampleStep) {
    //     offsets[j * 3 + 0] = i;
    //     offsets[j * 3 + 1] = k;
    //     indices[j] = j;
    //     angles[j] = Math.random() * Math.PI;
    //     j++;
    //   }
    // }

    for (let i = 0, j = 0; i < this.numPoints; i++) {
      // if (discard && originalColors[i * 4 + 0] <= threshold) continue;

      offsets[j * 3 + 0] = (i % width) * this.sampleStepX;
      offsets[j * 3 + 1] = Math.floor(i / width) * this.sampleStepY;

      indices[j] = i;

      angles[j] = Math.random() * Math.PI;

      j++;
    }

    // for (let i = 0, j = 0; i < this.numPoints; i++) {
    //   // if (discard && originalColors[i * 4 + 0] <= threshold) continue;

    //   offsets[j * 3 + 0] = i % this.width;
    //   offsets[j * 3 + 1] = Math.floor(i / this.width);

    //   indices[j] = i;

    //   angles[j] = Math.random() * Math.PI;

    //   j++;
    // }

    geometry.setAttribute(
      "pindex",
      new InstancedBufferAttribute(indices, 1, false)
    );
    geometry.setAttribute(
      "offset",
      new InstancedBufferAttribute(offsets, 3, false)
    );
    geometry.setAttribute(
      "angle",
      new InstancedBufferAttribute(angles, 1, false)
    );

    this.geometry = geometry;
    this.material = material;

    this.instancePoints = new Mesh(geometry, material);
    this.add(this.instancePoints);
    this.instancePoints.frustumCulled = false;
    // this.add(this.instancePoints);
    // this.add(this.instancePoints);
    // updatePartile
  }

  destroy() {
    if (!this.instancePoints) return;

    this.instancePoints.parent.remove(this.instancePoints);
    this.instancePoints.geometry.dispose();
    this.instancePoints.material.dispose();
    this.instancePoints = null;

    if (!this.hitArea) return;

    this.hitArea.parent.remove(this.hitArea);
    this.hitArea.geometry.dispose();
    this.hitArea.material.dispose();
    this.hitArea = null;
  }

  get isDead() {
    return false;
  }

  stop() {
    this.visible = false;
    this.time = 0;
    this.progress = 0;
  }

  start() {
    this.visible = true;
  }

  updateUniforms() {
    const config = this.globalConfig.config;
    this.material.uniforms.uSize.value = config.size;
    this.uniforms.minSize.value = config.minSize;
    this.uniforms.eyeIntensity.value = config.eyeIntensity;
    this.particleColor.set(config.particleColor);
    // this.material.uniforms.decorationTextuer.value =
    //   this.globalConfig.maps.decorationMap;
    if (!this.globalConfig.isTextureInit) {
      this.globalConfig.isTextureInit = true;
      const texture = getCrossTexture(this.width, this.height);
      this.material.uniforms.decorationTextuer.value = texture;
      this.globalConfig.maps.decorationMap = texture;
    }
    this.material.uniforms.uTexture.value = toRaw(
      this.globalConfig.maps.renderTexture
    );
    this.material.uniforms.maskFaceTexture.value = toRaw(
      this.globalConfig.maps.maskFaceTexture
    );
  }
  update(t) {
    if (this.visible === false) return;
    if (!this.material) return;
    this.updateUniforms();
    this.time += t;
    this.material.uniforms.uTime.value = this.time;
    if (this.progress < 1) {
      // this.progress = this.time / 4.5;
      this.progress = this.time;

      // console.log(this.progress);
      this.material.uniforms.uProgress.value = this.progress;
    } else {
      this.material.uniforms.uProgress.value = 1;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // EVENT HANDLERS
  // ---------------------------------------------------------------------------------------------

  resize() {
    if (!this.instancePoints) return;

    const scale = this.webgl.fovHeight / this.height;
    this.instancePoints.scale.set(scale, scale, 1);
    this.hitArea.scale.set(scale, scale, 1);
  }

  onInteractiveMove(e) {
    const uv = e.intersectionData.uv;
    if (this.touch) this.touch.addTouch(uv);
  }
}
