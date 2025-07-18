import * as THREE from "three";
import { toRaw } from "vue";
import { useGlobalConfig } from "../stores";

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
    this.introStartTime = null;
    this.introDuration = 4.5; // 3秒开场动画

    // Store particle positions (x, y, z)
    this.positions = new Float32Array(this.particleCount * 3);
    // Store particle velocities (vx, vy, vz) for subtle random drift
    this.velocities = new Float32Array(this.particleCount * 3);
    // Store particle sizes (will be passed as an attribute to the shader)
    this.sizes = new Float32Array(this.particleCount);
    // Store the UV start coordinates (u, v) for each particle in the texture atlas
    this.uvs = new Float32Array(this.particleCount * 2);

    // Store initial and target positions for intro animation
    this.initialParticlePositions = new Float32Array(this.particleCount * 3);
    this.targetParticlePositions = new Float32Array(this.particleCount * 3);

    // Temporary vectors for calculations to avoid creating new objects in loop
    this.particlePosition = new THREE.Vector3();
    this.direction = new THREE.Vector3(); // Re-purposed for direction vector from origin
    this.time = 0;
    this.globalConfig = useGlobalConfig();
    this.initParticles();
    this.createParticleSystem();
  }

  /**
   * Initializes the initial position, velocity, size, and texture UVs of particles.
   * Particles are initialized randomly within the defined elliptical ring area.
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
      const introSpawnDistance = this.ringOuterRadius * 2.5; // 确保粒子从环外足够远的地方开始
      this.initialParticlePositions[i3] =
        this.origin.x + (Math.random() - 0.5) * introSpawnDistance * 2; // X方向随机偏移
      this.initialParticlePositions[i3 + 1] =
        this.origin.y + (Math.random() - 0.5) * introSpawnDistance * 2; // Y方向随机偏移
      this.initialParticlePositions[i3 + 2] =
        this.origin.z + (Math.random() - 0.5) * introSpawnDistance * 2; // Z方向随机偏移

      // this.positions[i3] = this.origin.x + radialDist * Math.cos(angle); // x
      // this.positions[i3 + 1] = yPos; // y
      // this.positions[i3 + 2] = this.origin.z + radialDist * Math.sin(angle); // z

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
      this.sizes[i] = 1 + randomScale; // Max size 2.0

      // Randomly select a texture shape
      const randomTextureIndex = Math.floor(Math.random() * textureUVs.length);
      this.uvs[i2] = textureUVs[randomTextureIndex].u;
      this.uvs[i2 + 1] = textureUVs[randomTextureIndex].v;
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

    // 7. Watch (手表) - Reusing simplified version, ensuring white on transparent
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

    // 8. Camera (相机) - Reusing simplified version, ensuring white on transparent
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

                    varying vec2 vUvOffset;    // Pass UV offset to fragment shader

                    void main() {
                        vUvOffset = uvOffset; // Pass UV offset to fragment shader

                        // Calculate particle position in model-view space
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

                        // Calculate particle size on screen, considering perspective
                        gl_PointSize = size * (400.0 / -mvPosition.z); 

                        gl_Position = projectionMatrix * mvPosition; // Use mvPosition to calculate final position
                    }
                `;

    // Define fragment shader code
    const fragmentShader = `
                    uniform sampler2D u_particleTexture; // Particle texture atlas
                    uniform vec3 u_color;                // Particle color (main particle color, usually white)
                    uniform float u_opacity;             // Particle opacity
                    uniform vec2 u_uvScale;              // UV size of each shape in the texture atlas (e.g., 0.25, 0.5)

                    varying vec2 vUvOffset;             // UV offset passed from vertex shader

                    void main() {
                        // gl_PointCoord is the UV coordinate of the current pixel within the particle point (0.0 to 1.0)
                        // vUvOffset is the starting UV coordinate for this particle in the texture atlas
                        // u_uvScale is the UV size of a single texture in the atlas
                        // (1.0 - gl_PointCoord.y) is because Three.js UV Y-axis direction might be opposite to gl_PointCoord's Y-axis
                        vec2 uv = vec2(vUvOffset.x + gl_PointCoord.x * u_uvScale.x,
                                       vUvOffset.y + (1.0 - gl_PointCoord.y) * u_uvScale.y);

                        vec4 texColor = texture2D(u_particleTexture, uv);

                        // Final color = texture color * particle color * particle opacity
                        gl_FragColor = texColor * vec4(u_color, u_opacity);

                        // Discard pixel if texture's alpha channel is 0 (for transparent backgrounds)
                        if (gl_FragColor.a < 0.0001) discard;
                    }
                `;

    // Define uniforms (global variables) for the shader material
    const uniforms = {
      u_particleTexture: { value: particleTexture },
      u_color: { value: new THREE.Color(0x7d7878) }, // Main particle color is white
      u_opacity: { value: 0.5 }, // Increased opacity for better visibility
      u_uvScale: { value: new THREE.Vector2(0.25, 0.5) }, // Texture atlas is 4x2 grid, so each texture occupies 0.25x0.5 UV space
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending, // Additive blending mode
      depthWrite: false, // Disable depth writing to prevent display issues with particles overlapping
    });

    // Create particle object and add to scene
    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);

    // Apply initial rotation to the particle system to make the ring visible from the front
    this.particles.rotation.x = Math.PI / 2; // Rotate 30 degrees around X-axis
    window.float = this.particles;
  }

  /**
   * Updates the position of each particle, simulating a very subtle random drift
   * within the defined elliptical ring bounds, and reflecting them when they go out of bounds.
   */
  update(delta) {
    this.material.uniforms.u_color.value.set(this.globalConfig.config.pColor);
    const positionAttribute = this.geometry.attributes.position;
    const velocityAttribute = this.velocities;
    this.time += delta;
    if (this.isIntroAnimating) {
      // if (!this.introStartTime) {
      //   this.introStartTime = delta;
      // }
      // const elapsed = delta - this.introStartTime;
      const progress = Math.min(1, this.time / this.introDuration); // 0 to 1

      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;
        // Linear interpolation from initial to target position
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
      }

      if (progress >= 1) {
        this.isIntroAnimating = false;
        // Ensure particles are exactly at target positions when animation ends
        for (let i = 0; i < this.particleCount; i++) {
          const i3 = i * 3;
          this.positions[i3] = this.targetParticlePositions[i3];
          this.positions[i3 + 1] = this.targetParticlePositions[i3 + 1];
          this.positions[i3 + 2] = this.targetParticlePositions[i3 + 2];
        }
      }
    } else {
      // Normal floating logic
      const halfRingHeight = this.ringHeight / 2;
      const radialPullStrength = 0.025;
      const verticalReflectionDamping = 0.8;
      const randomNudge = 0.0025;

      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;

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
    positionAttribute.needsUpdate = true; // Always update position attribute
  }
}

// --- Main program logic ---
