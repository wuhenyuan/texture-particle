import * as THREE from "three";

const loader = new THREE.TextureLoader();
const texture = loader.load("src/assets/numberLetters.png");

export class DigitalRain {
  get vertexShader() {
    return `
            precision highp float;

            uniform float baseLength;

            // attribute vec3 position;
            // attribute vec2 uv;
            attribute vec3 offset;
            attribute vec4 rotation;
            attribute float length;
            attribute float speed;

            varying vec2 vUv;
            varying float vLength;
            varying float vSpeed;
            varying float vFade;

            // http://www.geeks3d.com/20141201/how-to-rotate-a-vertex-by-a-quaternion-in-glsl/
            vec3 applyQuaternionToVector(vec4 q, vec3 v) {
                return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
            }

            void main() {
                vUv = uv;
                vLength = length;
                vSpeed = speed;
                vFade = (1.0 - sqrt(offset.x*offset.x + offset.y*offset.y) / 100.0);

                vec3 vPosition = applyQuaternionToVector(rotation, position);
                vec3 displacement = offset - vec3(0.0, floor((baseLength - vLength) / 2.0), 0.0);

                gl_Position = projectionMatrix * modelViewMatrix * vec4(displacement + vPosition, 1.0);
            }
        `;
  }
  get fragmentShader() {
    return `
            precision highp float;

            #define FONT_W 12.0
            #define FONT_H 12.0
            #define GLYPH_W (1.0/FONT_W)
            #define GLYPH_H (1.0/FONT_W)

            uniform float time;
            uniform float fadeRate;
            uniform float seed;
            uniform float baseLength;
            uniform sampler2D font;
            uniform sampler2D maskMap;
            uniform vec3 baseColor;
            uniform vec2 resolution;

            varying vec2 vUv;
            varying float vLength;
            varying float vSpeed;
            varying float vFade;

            float median(float r, float g, float b) {
                return max(min(r, g), min(max(r, g), b));
            }

            float rand(float s) {
                return fract(sin(dot(vec2(s, s), vec2(12.9898, 78.233))) * 43758.5453123);
            }

            void main() {
                float vUv2Max = vLength / baseLength;

                vec2 vUv2 = vec2(vUv.x, 1.0 - vUv.y);
                if (vUv2.y > vUv2Max) {
                     discard;
                    // return;
                }
                vec2 resolutionUv = gl_FragCoord.xy / resolution;
                float mask = texture2D(maskMap, resolutionUv).r;
                if (mask>0.05) discard;
                vUv2 = vUv2 / vec2(1.0, vUv2Max);
                vec2 vUv3 = vec2(vUv2.x, 1.0 - vUv2.y);

                vec2 phase = fract(vUv3 / vec2(1.0, 1.0 / vLength));
                float index = floor(vUv2.y / (1.0 / vLength));
                float cycleLength = (vLength + ceil(1.0 / fadeRate)) * vSpeed;

                float step = floor(mod(time, cycleLength) / vSpeed);
                // if (step > vLength) {
                //     index = index - (step - vLength);
                // }

                // vec3 baseColorRM = vec3(0.250, 1, 0.250);
                // vec3 baseColorRM = vec3(0.066,  0.270, 0.894);
                vec3 baseColorRM = baseColor;
                // if (index == step - 1.0) {
                //     baseColorRM = vec3(0.9);
                // }

                float fade = (step - index) * fadeRate;
                if (index >= step) {
                    fade = 1.0;
                }

                float glyphIndex = floor(57.0 * rand(seed + 1234.0 * index));
                float row = floor(glyphIndex / FONT_W);
                float glyphColumn = glyphIndex - row * FONT_W;
                float glyphRow = FONT_W - 1.0 - row;

                vec2 tc = vec2(glyphColumn * GLYPH_W + phase.x * GLYPH_W, glyphRow * GLYPH_H + phase.y * GLYPH_H);
                vec4 sampleC = texture2D(font, tc);

                float sigDist = median(sampleC.r, sampleC.g, sampleC.b) - 0.5;
                float alpha = clamp(sigDist/fwidth(sigDist) + 0.5, 0.0, 1.0);
                vec4 finnalColor = vec4(baseColorRM * vFade, (alpha - fade));
                if (finnalColor.a < 0.1) discard;
                gl_FragColor = finnalColor;
            }
        `;
  }

  constructor(instances) {
    const baseLength = 50;
    const blueprint = new THREE.PlaneGeometry(1, baseLength);
    const geometry = new THREE.InstancedBufferGeometry();

    geometry.index = blueprint.index;
    geometry.attributes.position = blueprint.attributes.position;
    geometry.attributes.uv = blueprint.attributes.uv;

    const offsets = [];
    const rotations = [];
    const lengths = [];
    const speeds = [];

    this.instances = instances;
    this.updateIndex = 0;
    this.lastAttrUpdate = 0;

    for (let i = 0; i < instances; i++) {
      const x = (0.5 + Math.random() * 50) * (Math.random() > 0.5 ? 1 : -1);
      const y = (0.5 + Math.random() * 20) * (Math.random() > 0.5 ? 1 : -1);
      const z = (0.5 + Math.random() * 50) * (Math.random() > 0.5 ? 1 : -1);
      const length = Math.floor(10 + Math.random() * 35);
      const speed = Math.floor(40 + Math.random() * 40);

      const yRotation = Math.atan2(x, z);
      const q = new THREE.Quaternion();
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yRotation);

      offsets.push(x, y, z);
      lengths.push(length);
      speeds.push(speed);
      rotations.push(q.x, q.y, q.z, q.w);
    }

    const offsetsAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(offsets),
      3
    );
    const rotationAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(rotations),
      4
    );
    const lengthsAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(lengths),
      1
    );
    const speedsAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(speeds),
      1
    );

    geometry.setAttribute("offset", offsetsAttr);
    geometry.setAttribute("rotation", rotationAttr);
    geometry.setAttribute("length", lengthsAttr);
    geometry.setAttribute("speed", speedsAttr);

    const material = new THREE.ShaderMaterial({
      name: "rain",
      uniforms: {
        font: { value: texture },
        time: { value: 0.0 },
        seed: { value: Math.random() },
        fadeRate: { value: 0.08 },
        baseLength: { value: baseLength },
        baseColor: { value: new THREE.Color(0xffffff) },
        resolution: { value: new THREE.Vector2() },
        maskMap: { value: null },
      },
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });

    material.onBeforeRender = () => {
      // console.log(material.uniforms);
    };

    material.side = THREE.DoubleSide;
    material.extensions.derivatives = true;
    // material.depthWrite = false;

    this.mesh = new THREE.Mesh(geometry, material);
    window.rain = this.mesh;
  }

  get material() {
    return this.mesh.material;
  }

  setMask(texture) {
    this.material.uniforms.maskMap.value = texture;
  }

  updateConfig(config) {
    if (!config) return;
    const { rainColor } = config;
    if (!this.material) return;
    this.material.uniforms.baseColor.value.set(rainColor);
    // console.log(rainColor);
  }

  setResolution(width, height) {
    this.material.uniforms.resolution.value.set(width, height);
  }

  update(time) {
    // console.log(this.mesh.material.uniforms.time.value);
    time *= 1000;
    this.mesh.material.uniforms.time.value += time;
  }
}
