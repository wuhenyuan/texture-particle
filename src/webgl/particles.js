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
  InstancedBufferAttribute,
  LinearFilter,
  RGBFormat,
  RGBAFormat,
} from "three";
// import { particleFrag, particleVert } from "./shader";
import particleFrag from "./particles.frag";
import particleVert from "./particles.vert";
import { InstancedMesh } from "three";

// import TouchTexture from "./TouchTexture";

export default class Particles extends Object3D {
  constructor(scene) {
    super();
    this.scene = scene;
    this.scene.add(this);
    window.points = this;
    this.time = 0;
    this.progress = 0;
    // this.webgl = webgl;
    // this.container = new Object3D();
    // todo init width, height
  }

  init(videoTexture, video) {
    debugger;
    this.texture = videoTexture;
    this.texture.minFilter = LinearFilter;
    this.texture.magFilter = LinearFilter;
    this.texture.format = RGBAFormat;
    if (video) {
      const { videoWidth, videoHeight } = video;
      this.width = videoWidth;
      this.height = videoHeight;
    } else {
      const texture = videoTexture;
      this.width = texture.image.width;
      this.height = texture.image.height;
    }
    this.initPoints(true);
    // this.initHitArea();
    // this.initTouch();
    // this.resize();
    //   this.show();
  }

  setParticleMap(texture) {
    debugger;
    this.material.uniforms.uPTexture.value = texture;
    // this.material.needsUpdate = true;
  }

  initPoints(discard) {
    if (this.instancePoints) {
      this.remove(this.instancePoints);
    }
    this.numPoints = this.width * this.height;

    let numVisible = this.numPoints;
    const uniforms = {
      uTime: { value: 0 },
      uRandom: { value: 0.0 },
      uDepth: { value: 2.0 },
      uSize: { value: 2.5 },
      uTextureSize: { value: new Vector2(this.width, this.height) },
      uTexture: { value: this.texture },
      uPTexture: { value: null },
      uProgress: { value: null },
    };

    const material = new RawShaderMaterial({
      uniforms,
      // vertexShader: glslify(require("../../../shaders/particle.vert")),
      // fragmentShader: glslify(require("../../../shaders/particle.frag")),
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      depthTest: false,
      transparent: true,
      // blending: AdditiveBlending
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

    for (let i = 0, j = 0; i < this.numPoints; i++) {
      // if (discard && originalColors[i * 4 + 0] <= threshold) continue;

      offsets[j * 3 + 0] = i % this.width;
      offsets[j * 3 + 1] = Math.floor(i / this.width);

      indices[j] = i;

      angles[j] = Math.random() * Math.PI;

      j++;
    }

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
    this.add(this.instancePoints);
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
    this.time += t;
    this.material.uniforms.uTime.value = this.time;
    console.log(this.time);
    if (this.progress < 1) {
      this.progress = this.time / 3;
      // console.log(this.progress);
      this.material.uniforms.uProgress.value = this.progress;
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
