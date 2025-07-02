import {
  Object3D,
  TextureLoader,
  Mesh,
  Vector2,
  BufferAttribute,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  InstancedBufferGeometry,
  AdditiveBlending,
  InstancedBufferAttribute,
  RGBFormat,
  RGBAFormat,
  NearestFilter,
  Color,
  ShaderChunk,
  DoubleSide,
} from "three";
// import { particleFrag, particleVert } from "./shader";
// import lightSpot from "./lightSpot.png";
import lightSpot from "./point1234.png";
// import lightSpot from "./point.png";

import particleFrag from "./depthShader/probParticles.frag";
import particleVert from "./depthShader/probParticles.vert";
import noise from "./noiseShader";
import commonShader from "./common/common.glsl";

ShaderChunk.noise = noise;
// ShaderChunk.commonShader = commonShader;
// console.log(ShaderChunk);
// import TouchTexture from "./TouchTexture";
import { useGlobalConfig } from "@/stores/index";

const startRatio = 0;
const endRatio = 1;

/**概率粒子 */
export default class ProbParticle extends Object3D {
  constructor(scene, ratio) {
    super();
    this.scene = scene;
    this.scene.add(this);
    window.particlePoints = this;
    this.time = 0;
    this.progress = 0;
    // 可调节参数，2表示每2像素采样一次
    // this.sampleStep = 2;
    this._sampleStep = 5;
    this.sampleStep = 1;
    this.pointSize = 1;
    this.sampleStepX = this.sampleStep;
    this.globalConfig = useGlobalConfig();
    // this.sampleStepY = this.sampleStepX / ratio;
    this.sampleStepY = this.sampleStep;
    this.resolution = new Vector2();
    // this.webgl = webgl;
    // this.container = new Object3D();
    // todo init width, height
  }

  init(videoTexture, video) {
    this.texture = videoTexture;
    this.texture.minFilter = NearestFilter;
    this.texture.magFilter = NearestFilter;
    this.texture.format = RGBAFormat;
    const maxWidth = this.globalConfig.maxWidth;
    // const maxWidth = 200;
    if (video) {
      const { videoWidth, videoHeight } = video;
      this.width = videoWidth;
      this.height = videoHeight;
    } else {
      const texture = videoTexture;
      this.width = texture.image.width;
      this.height = texture.image.height;
    }
    const ratio = this.width / this.height;
    this.width = Math.min(this.width, maxWidth);
    this.height = Math.floor(this.width / ratio);
    if (this.globalConfig.isUseHalf) this.height = this.height / 2;
    const textureLoader = new TextureLoader();
    this.pMap = textureLoader.load(lightSpot);
    // const maxWidth = 180;
    // if (this.width > maxWidth && this.width < this.height) {
    //   const ratio = this.width / this.height;
    //   this.width = maxWidth;
    //   this.height = maxWidth / ratio;
    // }
    this.initPoints(true);
    // this.initHitArea();
    // this.initTouch();
    // this.resize();
    //   this.show();
  }

  setParticleMap(texture) {
    // this.uPTexture = texture;
    // if (this.material) {
    // this.material.uniforms.uPTexture.value = texture;
    // }
    this.uParticleMap = texture;
    if (this.material) {
      this.material.uniforms.uParticleMap.value = texture;
    }
    // this.material.needsUpdate = true;
  }

  setMaskMap(texture) {
    this.uMaskMap = texture;
    if (this.material) {
      this.material.uniforms.uMaskMap.value = texture;
    }
  }

  setHighLightMap(texture) {
    this.uHighLightMap = texture;
    if (this.material) {
      this.material.uniforms.uHighLightMap.value = texture;
    }
  }

  setNormalMap(texture) {
    this.uNormalTexture = texture;
    if (this.material) {
      this.material.uniforms.uNormalTexture.value = texture;
    }
  }

  setDepthMap(texture) {
    this.uDepthTexture = texture;
    if (this.material) {
      this.material.uniforms.uDepthTexture.value = texture;
    }
  }

  initPoints(discard) {
    if (this.instancePoints) {
      this.remove(this.instancePoints);
      // this.destroy();
    }
    // 间隔采样
    const width = Math.floor(this.width / this.sampleStepX);
    const height = Math.floor(this.height / this.sampleStepY);
    this.numPoints = width * height;
    console.log("sampleStepX", this.sampleStepX);

    let numVisible = this.numPoints;
    const uniforms = {
      uTime: { value: 0 },
      uRandom: { value: 0.0 },
      uDepth: { value: 2.0 },
      uSize: { value: this.pointSize },
      uTextureSize: { value: new Vector2(this.width, this.height) },
      uProbabilityMap: { value: this.texture },
      //   uProbabilityMap: { value: this.uPTexture },
      //uParticleMap: { value: this.uParticleMap },
      uParticleMap: { value: this.pMap },
      uHparticleMap: { value: this.pMap },

      uProgress: { value: this.progress },
      uMaskMap: { value: this.uMaskMap },
      uParticleColor: { value: new Color(0x4a9fd4) },
      uResolution: { value: this.resolution },
      uHighLightMap: { value: this.uHighLightMap },
      uHighLightColor: { value: new Color(0x4a9fd4) },
      uNormalTexture: { value: this.uNormalTexture },
      uDepthTexture: { value: this.uDepthTexture },
      offsetScale: { value: 0.5 },
    };

    const material = new ShaderMaterial({
      name: "probParticle",
      uniforms,
      // vertexShader: glslify(require("../../../shaders/particle.vert")),
      // fragmentShader: glslify(require("../../../shaders/particle.frag")),
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      depthTest: false,
      transparent: true,
      toneMapped: true,
      side: DoubleSide,
      renderOrder: 10,
      // blending: AdditiveBlending,
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

    const startHeight = Math.floor(height * startRatio);
    const endHeight = Math.floor(height * endRatio);

    for (let i = 0, j = 0; i < this.numPoints; i++) {
      // if (discard && originalColors[i * 4 + 0] <= threshold) continue;

      offsets[j * 3 + 0] = (i % width) * this.sampleStepX;
      let height2 = Math.floor(i / width) * this.sampleStepY + startHeight;
      offsets[j * 3 + 1] = height2;
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
    // this.container.add(this.instancePoints);
    // instancedMesh.frustumCulled = false;
    // this.add(this.instancePoints);
    this.add(this.instancePoints);
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

  update(t) {
    if (!this.material) return;
    const config = this.config;
    // if (this.config) {
    //   this.material.uniforms.uSuppress.value = this.config.suppress;
    // }

    this.material.uniforms.uParticleColor.value.set(config.particleColor);
    this.material.uniforms.uHighLightColor.value.set(config.uHighLightColor);
    this.material.uniforms.offsetScale.value = config.offsetScale;
    // console.log(this.material.uniforms.uHighLightColor.value);

    if (this._sampleStep !== config.sampleStep) {
      this._sampleStep = config.sampleStep;
      if (config.sampleStep >= 10) {
        this.sampleStep = 5 / config.sampleStep;
      } else if (config.sampleStep >= 5) {
        const sampleStep = 10 - config.sampleStep;
        this.sampleStep = sampleStep / 5;
      } else {
        const sampleStep = 10 - config.sampleStep;
        this.sampleStep = sampleStep / 5;
      }
      // this.sampleStep = config.sampleStep;
      this.sampleStepX = this.sampleStep;
      // this.sampleStepY = this.sampleStepX / ratio;
      this.sampleStepY = this.sampleStep;
      this.initPoints();
    }
    this.pointSize = config.pointSize;
    this.material.uniforms.uSize.value = this.pointSize;
    this.time += t;
    this.material.uniforms.uTime.value = this.time;
    const max = 1;
    let layer = 4;
    this.progress = 1 - Math.exp(-0.2 * this.time);
    if (this.progress < max) {
      // this.progress = this.time / layer;
      this.progress = this.progress;
      // console.log(this.progress);
      this.material.uniforms.uProgress.value = this.progress;
      // console.log(this.progress);
    } else {
      this.material.uniforms.uProgress.value = max;
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
