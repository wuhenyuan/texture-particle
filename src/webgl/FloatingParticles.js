import * as THREE from "three";
import { toRaw } from "vue";
import { useGlobalConfig } from "../stores";
import { Vector2 } from "three/webgpu";

/**
 * Helper function to pick a value based on probabilities.
 * @param {any} val1 - Value 1.
 * @param {any} val2 - Value 2.
 * @param {any} val3 - Value 3.
 * @param {number} prob1 - Probability for val1.
 * @param {number} prob2 - Probability for val2.
 * @param {number} prob3 - Probability for val3.
 * @returns {any} The selected value.
 */
function pickByProbability(val1, val2, val3, prob1, prob2, prob3) {
  const rand = Math.random(); // [0, 1)
  if (rand < prob1) {
    return val1;
  } else if (rand < prob1 + prob2) {
    return val2;
  } else {
    return val3;
  }
}

export default class FloatingParticles {
  /**
   * Constructor, initializes the particle system.
   * @param {THREE.Scene} scene - The Three.js scene to add particles to.
   * @param {number} particleCount - The number of particles.
   * @param {THREE.Vector3} origin - The central point around which the elliptical ring is centered.
   * @param {number} ringInnerRadius - The inner radius of the particle ring.
   * @param {number} ringOuterRadius - The outer radius of the particle ring.
   * @param {number} ringHeight - The total height of the particle ring.
   */
  constructor(
    scene,
    particleCount = 4000,
    origin = new THREE.Vector3(0, 0, 0),
    ringInnerRadius = 150,
    ringOuterRadius = 250,
    ringHeight = 500
  ) {
    this.scene = scene;
    this.particleCount = particleCount;
    this.origin = origin;
    this.ringInnerRadius = ringInnerRadius;
    this.ringOuterRadius = ringOuterRadius;
    this.ringHeight = ringHeight;

    // Animation state for intro
    this.isIntroAnimating = true;
    this.introStartTime = null; // Will be set in update if needed
    this.introDuration = 4.5; // 4.5秒开场动画

    // Store particle positions (x, y, z)
    this.positions = new Float32Array(this.particleCount * 3);
    // Store particle velocities (vx, vy, vz) for subtle random drift
    this.velocities = new Float32Array(this.particleCount * 3);
    // Store particle sizes (will be passed as an attribute to the shader)
    this.sizes = new Float32Array(this.particleCount);
    // Store the UV start coordinates (u, v) for each particle in the texture atlas
    this.uvs = new Float32Array(this.particleCount * 2);

    // 新增：粒子的当前生命周期阶段 (0.0 - 1.0)
    this.lifespans = new Float32Array(this.particleCount);
    // 新增：粒子的总生命周期时长 (秒)
    this.totalLifespans = new Float32Array(this.particleCount);
    // 新增：粒子是否活跃 (主要用于入场动画后，确保粒子开始正常循环)
    this.activeParticles = new Array(this.particleCount).fill(true);

    // Store initial and target positions for intro animation
    this.initialParticlePositions = new Float32Array(this.particleCount * 3);
    this.targetParticlePositions = new Float32Array(this.particleCount * 3);

    // Temporary vectors for calculations to avoid creating new objects in loop
    this.particlePosition = new THREE.Vector3();
    this.direction = new THREE.Vector3(); // Re-purposed for direction vector from origin
    this.time = 0; // Cumulative time for animation
    this.globalConfig = useGlobalConfig();

    this.resolution = new Vector2();
    this.initParticles();
    this.createParticleSystem();
  }

  /**
   * Initializes the initial position, velocity, size, and texture UVs of particles.
   * Particles are initialized randomly within the defined elliptical ring area.
   * Also initializes lifespan and total lifespan for each particle.
   */
  initParticles() {
    // Define UV start coordinates for each shape in the texture atlas
    const textureUVs = [
      { u: 0.0, v: 0.0 }, // Shape 0: Utility Pole (电线杆)
      { u: 0.25, v: 0.0 }, // Shape 1: Refrigerator (冰箱)
      { u: 0.5, v: 0.0 }, // Shape 2: Calendar (挂历)
      { u: 0.75, v: 0.0 }, // Shape 3: Happy Emoji (开心表情)
      { u: 0.0, v: 0.5 }, // Shape 4: Mobile Phone (手机)
      { u: 0.25, v: 0.5 }, // Shape 5: Television (电视机)
      { u: 0.5, v: 0.5 }, // Shape 6: Watch (手表)
      { u: 0.75, v: 0.5 }, // Shape 7: Camera (相机)
    ];

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const i2 = i * 2;

      // Randomly place particles within the elliptical ring
      const radialDist =
        this.ringInnerRadius +
        Math.random() * (this.ringOuterRadius - this.ringInnerRadius);
      const angle = Math.random() * Math.PI * 2;
      const yPos = this.origin.y + (Math.random() - 0.5) * this.ringHeight;

      this.targetParticlePositions[i3] =
        this.origin.x + radialDist * Math.cos(angle);
      this.targetParticlePositions[i3 + 1] = yPos;
      this.targetParticlePositions[i3 + 2] =
        this.origin.z + radialDist * Math.sin(angle);

      // Set initial position far outside the ring in all directions (X, Y, Z)
      // This creates the "fly in from all directions" effect
      const introSpawnDistance = this.ringOuterRadius * 2.5; // Ensure particles start far enough outside the ring
      this.initialParticlePositions[i3] =
        this.origin.x + (Math.random() - 0.5) * introSpawnDistance * 2; // Random X offset
      this.initialParticlePositions[i3 + 1] =
        this.origin.y + (Math.random() - 0.5) * introSpawnDistance * 2; // Random Y offset
      this.initialParticlePositions[i3 + 2] =
        this.origin.z + (Math.random() - 0.5) * introSpawnDistance * 2; // Random Z offset

      // Initially set current positions to initial positions for the start of the animation
      this.positions[i3] = this.initialParticlePositions[i3];
      this.positions[i3 + 1] = this.initialParticlePositions[i3 + 1];
      this.positions[i3 + 2] = this.initialParticlePositions[i3 + 2];

      // Randomly set initial particle velocities for *very subtle* random drift
      this.velocities[i3] = (Math.random() - 0.5) * 0.001;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.001;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.001;

      // Randomly set particle size - Further increased for better visibility
      const randomScale = pickByProbability(1, 3, 5, 0.8, 0.1, 0.1);
      this.sizes[i] = 1 + randomScale; // Max size 6.0 (1 + 5)

      // Randomly select a texture shape
      const randomTextureIndex = Math.floor(Math.random() * textureUVs.length);
      this.uvs[i2] = textureUVs[randomTextureIndex].u;
      this.uvs[i2 + 1] = textureUVs[randomTextureIndex].v;

      // 新增：初始化生命周期
      // 初始时随机分配生命周期进度，避免所有粒子同时出现和消失
      this.lifespans[i] = Math.random();
      // 随机总生命周期，例如 3-8 秒，让粒子有不同的存活时间
      this.totalLifespans[i] = Math.random() * 5 + 3;
      // 初始所有粒子都活跃
      this.activeParticles[i] = true;
    }
  }

  /**
   * Creates the Three.js particle system (geometry and material).
   */
  createParticleSystem() {
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      "size",
      new THREE.BufferAttribute(this.sizes, 1)
    ); // Custom size attribute
    this.geometry.setAttribute(
      "uvOffset",
      new THREE.BufferAttribute(this.uvs, 2)
    ); // Custom UV offset attribute
    // 新增属性：粒子的当前生命周期阶段
    this.geometry.setAttribute(
      "lifespan",
      new THREE.BufferAttribute(this.lifespans, 1)
    );

    // Create a Canvas as a texture atlas, drawing multiple shapes
    const canvas = document.createElement("canvas");
    canvas.width = 128; // Texture atlas width (4 * 32px per shape)
    canvas.height = 64; // Texture atlas height (2 * 32px per shape)
    const context = canvas.getContext("2d");
    const cellSize = 32; // Each texture cell is 32x32 pixels
    const borderWidth = 3; // Border thickness for contrast

    // Helper to draw a shape in a specific cell
    const drawShape = (col, row, drawFn) => {
      context.save();
      context.translate(col * cellSize, row * cellSize);
      context.clearRect(0, 0, cellSize, cellSize); // Clear cell to transparent before drawing
      drawFn(context, cellSize, borderWidth);
      context.restore();
    };

    // 1. Utility Pole (电线杆)
    drawShape(0, 0, (ctx, size, border) => {
      ctx.fillStyle = "white";
      const poleWidth = size / 6;
      const crossArmLength = size * 0.7;
      const crossArmHeight = size / 10;

      // Main pole
      ctx.fillRect((size - poleWidth) / 2, 0, poleWidth, size);
      // Top crossarm
      ctx.fillRect(
        (size - crossArmLength) / 2,
        size * 0.15,
        crossArmLength,
        crossArmHeight
      );
      // Bottom crossarm
      ctx.fillRect(
        (size - crossArmLength) / 2,
        size * 0.3,
        crossArmLength,
        crossArmHeight
      );
    });

    // 2. Refrigerator (冰箱)
    drawShape(1, 0, (ctx, size, border) => {
      ctx.fillStyle = "white";
      const fridgeWidth = size * 0.6;
      const fridgeHeight = size * 0.9;
      const doorHandleSize = size * 0.08;

      // Fridge body
      ctx.fillRect(
        (size - fridgeWidth) / 2,
        (size - fridgeHeight) / 2,
        fridgeWidth,
        fridgeHeight
      );
      // Door separation line
      ctx.fillRect((size - fridgeWidth) / 2, size / 2 - 1, fridgeWidth, 2);
      // Top door handle
      ctx.fillRect(
        (size + fridgeWidth) / 2 - doorHandleSize * 1.5,
        size * 0.3,
        doorHandleSize,
        doorHandleSize * 2
      );
      // Bottom door handle
      ctx.fillRect(
        (size + fridgeWidth) / 2 - doorHandleSize * 1.5,
        size * 0.6,
        doorHandleSize,
        doorHandleSize * 2
      );
    });

    // 3. Calendar (挂历)
    drawShape(2, 0, (ctx, size, border) => {
      ctx.fillStyle = "white";
      const calWidth = size * 0.7;
      const calHeight = size * 0.8;
      const topRingHeight = size * 0.1;
      const dayLineHeight = size * 0.05;

      // Calendar body
      ctx.fillRect(
        (size - calWidth) / 2,
        (size - calHeight) / 2,
        calWidth,
        calHeight
      );
      // Top ring area
      ctx.fillRect(
        (size - calWidth) / 2,
        (size - calHeight) / 2,
        calWidth,
        topRingHeight
      );
      // Day lines
      ctx.fillStyle = "black";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(
          (size - calWidth) / 2 + border,
          (size - calHeight) / 2 +
            topRingHeight +
            (i * (calHeight - topRingHeight)) / 4,
          calWidth - 2 * border,
          dayLineHeight
        );
      }
    });

    // 4. Happy Emoji (开心表情)
    drawShape(3, 0, (ctx, size, border) => {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2, false); // White face
      ctx.fill();

      ctx.fillStyle = "black";
      // Eyes
      const eyeRadius = size / 10;
      ctx.beginPath();
      ctx.arc(size * 0.35, size * 0.4, eyeRadius, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size * 0.65, size * 0.4, eyeRadius, 0, Math.PI * 2, false);
      ctx.fill();
      // Smile
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.65, size * 0.2, 0, Math.PI, false);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "black";
      ctx.stroke();
    });

    // 5. Mobile Phone (手机)
    drawShape(0, 1, (ctx, size, border) => {
      ctx.fillStyle = "white";
      const phoneWidth = size * 0.5;
      const phoneHeight = size * 0.9;
      const screenBorder = size * 0.05;

      // Phone body
      ctx.fillRect(
        (size - phoneWidth) / 2,
        (size - phoneHeight) / 2,
        phoneWidth,
        phoneHeight
      );
      // Screen (black)
      ctx.fillStyle = "black";
      ctx.fillRect(
        (size - phoneWidth) / 2 + screenBorder,
        (size - phoneHeight) / 2 + screenBorder,
        phoneWidth - 2 * screenBorder,
        phoneHeight - 2 * screenBorder
      );
      // Home button (white dot)
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(
        size / 2,
        (size + phoneHeight) / 2 - screenBorder * 1.5,
        size * 0.05,
        0,
        Math.PI * 2,
        false
      );
      ctx.fill();
    });

    // 6. Television (电视机)
    drawShape(1, 1, (ctx, size, border) => {
      ctx.fillStyle = "white";
      const tvWidth = size * 0.9;
      const tvHeight = size * 0.6;
      const screenBorder = size * 0.05;

      // TV body
      ctx.fillRect(
        (size - tvWidth) / 2,
        (size - tvHeight) / 2,
        tvWidth,
        tvHeight
      );
      // Screen (black)
      ctx.fillStyle = "black";
      ctx.fillRect(
        (size - tvWidth) / 2 + screenBorder,
        (size - tvHeight) / 2 + screenBorder,
        tvWidth - 2 * screenBorder,
        tvHeight - 2 * screenBorder
      );
    });

    // 7. Watch (手表)
    drawShape(2, 1, (ctx, size, border) => {
      ctx.fillStyle = "white";
      const watchBodyWidth = size * 0.6;
      const watchBodyHeight = size * 0.7;
      const strapWidth = size * 0.2;
      const strapHeight = size * 0.15;
      const dialRadius = size * 0.2;

      // Watch body (main rectangle)
      ctx.fillRect(
        (size - watchBodyWidth) / 2,
        (size - watchBodyHeight) / 2,
        watchBodyWidth,
        watchBodyHeight
      );

      // Top strap
      ctx.fillRect(
        (size - strapWidth) / 2,
        (size - watchBodyHeight) / 2 - strapHeight,
        strapWidth,
        strapHeight
      );
      // Bottom strap
      ctx.fillRect(
        (size - strapWidth) / 2,
        (size + watchBodyHeight) / 2,
        strapWidth,
        strapHeight
      );

      // Dial (black circle inside)
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, dialRadius, 0, Math.PI * 2, false);
      ctx.fill();
    });

    // 8. Camera (相机)
    drawShape(3, 1, (ctx, size, border) => {
      ctx.fillStyle = "white";
      const cameraBodyWidth = size * 0.8;
      const cameraBodyHeight = size * 0.5;
      const lensRadius = size * 0.2;
      const lensOffset = size * 0.15;

      // Camera body
      ctx.fillRect(
        (size - cameraBodyWidth) / 2,
        (size - cameraBodyHeight) / 2,
        cameraBodyWidth,
        cameraBodyHeight
      );

      // Lens (white circle)
      ctx.beginPath();
      ctx.arc(
        (size - cameraBodyWidth) / 2 + lensOffset,
        size / 2,
        lensRadius,
        0,
        Math.PI * 2,
        false
      );
      ctx.fill();

      // Lens inner (black circle)
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(
        (size - cameraBodyWidth) / 2 + lensOffset,
        size / 2,
        lensRadius * 0.6,
        0,
        Math.PI * 2,
        false
      );
      ctx.fill();

      // Flash (small white rectangle)
      ctx.fillStyle = "white";
      ctx.fillRect(
        (size + cameraBodyWidth) / 2 - size * 0.15,
        (size - cameraBodyHeight) / 2 + size * 0.05,
        size * 0.1,
        size * 0.1
      );
    });

    const particleTexture = new THREE.CanvasTexture(canvas);
    particleTexture.needsUpdate = true; // Ensure texture updates

    // Define vertex shader code
    const vertexShader = `
      attribute float size;       // Size of each particle
      attribute vec2 uvOffset;    // UV start coordinates for each particle in the texture atlas
      attribute float lifespan;   // Particle's current lifespan progress (0.0 to 1.0)

      varying vec2 vUvOffset;    // Pass UV offset to fragment shader
      varying float vLifespan;    // Pass lifespan to fragment shader

      void main() {
        vUvOffset = uvOffset; // Pass UV offset to fragment shader
        vLifespan = lifespan; // Pass lifespan to fragment shader

        // Calculate particle position in model-view space
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        // Calculate particle size on screen, considering perspective
        // Adjust 400.0 for desired base size at a certain distance
        gl_PointSize = size * (400.0 / -mvPosition.z); 

        gl_Position = projectionMatrix * mvPosition; // Use mvPosition to calculate final position
      }
    `;

    // Define fragment shader code
    const fragmentShader = /*glsl*/ `
      uniform sampler2D u_particleTexture; // Particle texture atlas
      uniform sampler2D u_maskTexture;
      uniform vec2 resolution;
      uniform vec3 u_color;              // Main particle color (from global config)
      uniform vec3 u_flashColor;         // 新增：闪烁颜色
      uniform vec2 u_uvScale;            // UV size of each shape in the texture atlas (e.g., 0.25, 0.5)
      uniform float progress;
      varying vec2 vUvOffset;            // UV offset passed from vertex shader
      varying float vLifespan;            // Lifespan passed from vertex shader

      void main() {
        // gl_PointCoord is the UV coordinate of the current pixel within the particle point (0.0 to 1.0)
        // vUvOffset is the starting UV coordinate for this particle in the texture atlas
        // u_uvScale is the UV size of a single texture in the atlas
        // (1.0 - gl_PointCoord.y) is because Three.js UV Y-axis direction might be opposite to gl_PointCoord's Y-axis
        vec2 fuv = vec2(vUvOffset.x + gl_PointCoord.x * u_uvScale.x,
                       vUvOffset.y + (1.0 - gl_PointCoord.y) * u_uvScale.y);

        vec4 texColor = texture2D(u_particleTexture, fuv);


        vec2 uv = gl_FragCoord.xy / resolution;
        vec4 mask = texture2D(u_maskTexture, uv);

        bool isBright = mask.r > 0.1;

        // if ( isBright && progress >= 1.0) {
        //   discard;
        // }
            
        // 根据生命周期调整不透明度 (渐入渐出效果)
        float opacity = 0.0;
        // 粒子生命周期前 20% 渐入
        if (vLifespan < 0.2) {
            opacity = mix(0.0, 1.0, vLifespan / 0.2);
        } 
        // 粒子生命周期后 20% 渐出
        else if (vLifespan > 0.8) {
            opacity = mix(1.0, 0.0, (vLifespan - 0.8) / 0.2);
        } 
        // 中间阶段完全不透明
        else {
            opacity = 1.0;
        }

        // 根据生命周期调整颜色 (在主颜色和闪烁颜色之间混合)
        // 使用 sin 函数创建周期性颜色波动，让粒子有闪烁感
        vec3 finalColor = mix(u_color, u_flashColor, sin(vLifespan * 3.1415926535 * 2.0)); // 乘以 2PI 使其在一个周期内完成两次闪烁

        // Final color = texture color * final particle color * calculated opacity
        gl_FragColor = texColor * vec4(finalColor, opacity * 0.2);


        // if (mask.r > 0.1 && progress >= 1.0) {
        //   gl_FragColor = vec4(0.6);
        // }
        // Discard pixel if texture's alpha channel is 0 (for transparent backgrounds)
        // 或者如果计算出的不透明度太低也丢弃，提高性能
        if (gl_FragColor.a < 0.0001) discard;
      }
    `;

    // Define uniforms (global variables) for the shader material
    const uniforms = {
      u_particleTexture: { value: particleTexture },
      u_maskTexture: { value: null },
      resolution: { value: this.resolution },
      progress: { value: 0 },
      u_color: { value: new THREE.Color(0x7d7878) }, // Main particle color, will be updated by globalConfig
      u_flashColor: { value: new THREE.Color(0xb2ff) }, // 新增：闪烁颜色，例如青色
      u_uvScale: { value: new THREE.Vector2(0.25, 0.5) }, // Texture atlas is 4x2 grid, so each texture occupies 0.25x0.5 UV space
    };

    this.material = new THREE.ShaderMaterial({
      name: "floating-particles",
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending, // Additive blending mode for glow effect
      depthWrite: false, // Disable depth writing to prevent display issues with particles overlapping
    });

    // Create particle object and add to scene
    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);

    // Apply initial rotation to the particle system to make the ring visible from the front
    this.particles.rotation.x = Math.PI / 2; // Rotate 90 degrees around X-axis
    window.float = this.particles; // For debugging access
  }

  /**
   * Stops the particle system, resetting its state for intro animation.
   */
  stop() {
    this.time = 0;
    this.isIntroAnimating = true;
    this.particles.visible = false;
    // Reset particles to initial positions for next intro animation
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.positions[i3] = this.initialParticlePositions[i3];
      this.positions[i3 + 1] = this.initialParticlePositions[i3 + 1];
      this.positions[i3 + 2] = this.initialParticlePositions[i3 + 2];
      this.lifespans[i] = 0.0; // Reset lifespan for intro
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.lifespan.needsUpdate = true;
  }

  /**
   * Starts the particle system, making it visible and initiating intro animation if needed.
   */
  start() {
    this.particles.visible = true;
    // When starting, ensure intro animation is active and time is reset
    this.time = 0;
    this.isIntroAnimating = true;
    this.initParticles(); // Re-initialize particles for a fresh start
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.lifespan.needsUpdate = true;
    this.geometry.attributes.uvOffset.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  updatetUniforms() {
    this.material.uniforms.u_maskTexture.value = toRaw(
      this.globalConfig.maps.maskHumanTexture
    );

    // Update main particle color from global config
    this.material.uniforms.u_color.value.set(this.globalConfig.config.pColor);
    this.material.uniforms.u_flashColor.value.set(
      this.globalConfig.config.flashColor
    );
    this.material.uniforms.progress.value = this.progress;
  }

  /**
   * Updates the position, lifespan, and other properties of each particle.
   * Handles intro animation, normal floating logic, and particle respawn.
   * @param {number} delta - Time elapsed since last frame (in seconds).
   */
  update(delta) {
    if (!this.particles.visible) return;

    // 移除 this.updatetUniforms(); 因为该方法未定义，且 u_color 更新已在下方处理
    // Update main particle color from global config
    this.updatetUniforms();

    const positionAttribute = this.geometry.attributes.position;
    const lifespanAttribute = this.geometry.attributes.lifespan;
    const velocityAttribute = this.velocities;
    const sizeAttribute = this.geometry.attributes.size; // Get size attribute
    const uvAttribute = this.geometry.attributes.uvOffset; // Get uvOffset attribute

    this.time += delta;

    if (this.isIntroAnimating) {
      const progress = Math.min(1, this.time / this.introDuration); // 0 to 1
      // 移除 this.progress = progress; 因为它没有被使用
      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;
        // Linear interpolation from initial to target position for intro animation
        this.positions[i3] =
          this.initialParticlePositions[i3] +
          (this.targetParticlePositions[i3] -
            this.initialParticlePositions[i3]) *
            progress;
        this.positions[i3 + 1] =
          this.initialParticlePositions[i3 + 1] +
          (this.targetParticlePositions[i3 + 1] -
            this.initialParticlePositions[i3 + 1]) *
            progress;
        this.positions[i3 + 2] =
          this.initialParticlePositions[i3 + 2] +
          (this.targetParticlePositions[i3 + 2] -
            this.initialParticlePositions[i3 + 2]) *
            progress;

        // 在入场动画期间，将 lifespan 固定在中间值，确保粒子完全不透明
        // 这样粒子在入场时是完全可见的，而不是渐入的
        this.lifespans[i] = 0.5;
      }

      if (progress >= 1) {
        this.isIntroAnimating = false;
        // 确保粒子在动画结束时精确地位于目标位置，并重置生命周期
        for (let i = 0; i < this.particleCount; i++) {
          const i3 = i * 3;
          this.positions[i3] = this.targetParticlePositions[i3];
          this.positions[i3 + 1] = this.targetParticlePositions[i3 + 1];
          this.positions[i3 + 2] = this.targetParticlePositions[i3 + 2];
          // 重置为随机初始生命周期，以便开始正常的循环动画（包含渐入渐出）
          this.lifespans[i] = Math.random();
          this.activeParticles[i] = true; // 确保粒子活跃
        }
      }
    } else {
      // Normal floating logic
      const halfRingHeight = this.ringHeight / 2;
      const radialPullStrength = 0.025;
      const verticalReflectionDamping = 0.8;
      const randomNudge = 0.0025;

      // Define UV start coordinates for each shape in the texture atlas (needed for respawn)
      const textureUVs = [
        { u: 0.0, v: 0.0 },
        { u: 0.25, v: 0.0 },
        { u: 0.5, v: 0.0 },
        { u: 0.75, v: 0.0 },
        { u: 0.0, v: 0.5 },
        { u: 0.25, v: 0.5 },
        { u: 0.5, v: 0.5 },
        { u: 0.75, v: 0.5 },
      ];

      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;
        const i2 = i * 2;

        // 更新生命周期
        this.lifespans[i] += delta / this.totalLifespans[i]; // 生命周期阶段 = 经过时间 / 总生命周期

        // 如果粒子生命周期结束，重新初始化粒子
        if (this.lifespans[i] >= 1.0) {
          // 重新初始化粒子属性，使其在环形区域内重生
          const radialDist =
            this.ringInnerRadius +
            Math.random() * (this.ringOuterRadius - this.ringInnerRadius);
          const angle = Math.random() * Math.PI * 2;
          const yPos = this.origin.y + (Math.random() - 0.5) * this.ringHeight;

          this.positions[i3] = this.origin.x + radialDist * Math.cos(angle);
          this.positions[i3 + 1] = yPos;
          this.positions[i3 + 2] = this.origin.z + radialDist * Math.sin(angle);

          this.velocities[i3] = (Math.random() - 0.5) * 0.001;
          this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.001;
          this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.001;

          this.sizes[i] = 1 + pickByProbability(1, 3, 5, 0.8, 0.1, 0.1); // 重置大小

          // 重新选择纹理UV
          const randomTextureIndex = Math.floor(
            Math.random() * textureUVs.length
          );
          this.uvs[i2] = textureUVs[randomTextureIndex].u;
          this.uvs[i2 + 1] = textureUVs[randomTextureIndex].v;

          this.lifespans[i] = 0.0; // 重置生命周期阶段为0
          this.totalLifespans[i] = Math.random() * 5 + 3; // 重新随机总生命周期
          this.activeParticles[i] = true; // 确保粒子活跃
        }

        // 物理更新逻辑 (只有当粒子活跃时才进行)
        this.particlePosition.set(
          positionAttribute.array[i3],
          positionAttribute.array[i3 + 1],
          positionAttribute.array[i3 + 2]
        );

        this.direction.subVectors(this.particlePosition, this.origin);
        const currentRadialDist = Math.sqrt(
          this.direction.x * this.direction.x +
            this.direction.z * this.direction.z
        );
        const currentY = this.direction.y;

        // --- Apply Radial Confinement Forces ---
        if (currentRadialDist > this.ringOuterRadius) {
          this.direction.normalize();
          velocityAttribute[i3] -= this.direction.x * radialPullStrength;
          velocityAttribute[i3 + 2] -= this.direction.z * radialPullStrength;
        } else if (currentRadialDist < this.ringInnerRadius) {
          this.direction.normalize();
          velocityAttribute[i3] += this.direction.x * radialPullStrength;
          velocityAttribute[i3 + 2] += this.direction.z * radialPullStrength;
        }

        // --- Apply Vertical Reflection ---
        if (currentY > halfRingHeight) {
          velocityAttribute[i3 + 1] =
            -Math.abs(velocityAttribute[i3 + 1]) * verticalReflectionDamping;
          positionAttribute.array[i3 + 1] =
            this.origin.y + halfRingHeight - (currentY - halfRingHeight);
        } else if (currentY < -halfRingHeight) {
          velocityAttribute[i3 + 1] =
            Math.abs(velocityAttribute[i3 + 1]) * verticalReflectionDamping;
          positionAttribute.array[i3 + 1] =
            this.origin.y - halfRingHeight - (currentY + halfRingHeight);
        }

        // Add continuous random nudge to velocities
        velocityAttribute[i3] += (Math.random() - 0.5) * randomNudge;
        velocityAttribute[i3 + 1] += (Math.random() - 0.5) * randomNudge;
        velocityAttribute[i3 + 2] += (Math.random() - 0.5) * randomNudge;

        // Update particle position based on current velocity
        positionAttribute.array[i3] += velocityAttribute[i3];
        positionAttribute.array[i3 + 1] += velocityAttribute[i3 + 1];
        positionAttribute.array[i3 + 2] += velocityAttribute[i3 + 2];
      }
    }

    // 标记需要更新的 BufferAttribute
    positionAttribute.needsUpdate = true;
    lifespanAttribute.needsUpdate = true;
    sizeAttribute.needsUpdate = true; // 因为粒子重生时大小可能变化
    uvAttribute.needsUpdate = true; // 因为粒子重生时纹理可能变化
  }
}
