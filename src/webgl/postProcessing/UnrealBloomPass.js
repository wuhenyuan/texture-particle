import {
  AdditiveBlending,
  Color,
  HalfFloatType,
  MeshBasicMaterial,
  ShaderMaterial,
  UniformsUtils,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";
import { Pass } from "postprocessing";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader";
import { LuminosityHighPassShader } from "three/examples/jsm/shaders/LuminosityHighPassShader";

class UnrealBloomPass extends Pass {
  constructor(scene, camera, opts) {
    super();
    this.strength = opts.strength !== undefined ? opts.strength : 1;
    this.radius = opts.radius;
    this.threshold = opts.threshold;
    this.resolution =
      opts.resolution !== undefined
        ? new Vector2(opts.resolution.x, opts.resolution.y)
        : new Vector2(256, 256);

    // create color only once here, reuse it later inside the render function
    this.clearColor = new Color(0, 0, 0);
    // this.enableAlpha = opts.enableAlpha;

    // render targets
    this.renderTargetsHorizontal = [];
    this.renderTargetsVertical = [];
    this.nMips = 5;
    let resx = Math.round(this.resolution.x / 2);
    let resy = Math.round(this.resolution.y / 2);

    this.renderTargetBright = new WebGLRenderTarget(resx, resy, {
      type: HalfFloatType,
    });
    this.renderTargetBright.texture.name = "UnrealBloomPass.bright";
    this.renderTargetBright.texture.generateMipmaps = false;

    for (let i = 0; i < this.nMips; i++) {
      const renderTargetHorizontal = new WebGLRenderTarget(resx, resy, {
        type: HalfFloatType,
      });

      renderTargetHorizontal.texture.name = `UnrealBloomPass.h${i}`;
      renderTargetHorizontal.texture.generateMipmaps = false;

      this.renderTargetsHorizontal.push(renderTargetHorizontal);

      const renderTargetVertical = new WebGLRenderTarget(resx, resy, {
        type: HalfFloatType,
      });

      renderTargetVertical.texture.name = `UnrealBloomPass.v${i}`;
      renderTargetVertical.texture.generateMipmaps = false;

      this.renderTargetsVertical.push(renderTargetVertical);

      resx = Math.round(resx / 2);

      resy = Math.round(resy / 2);
    }

    // luminosity high pass material

    const highPassShader = LuminosityHighPassShader;
    this.highPassUniforms = UniformsUtils.clone(highPassShader.uniforms);

    this.highPassUniforms.luminosityThreshold.value = opts.threshold;
    this.highPassUniforms.smoothWidth.value = 0.01;

    this.materialHighPassFilter = new ShaderMaterial({
      uniforms: this.highPassUniforms,
      vertexShader: highPassShader.vertexShader,
      fragmentShader: highPassShader.fragmentShader,
    });

    // gaussian blur materials

    this.separableBlurMaterials = [];
    const kernelSizeArray = [3, 5, 7, 9, 11];
    resx = Math.round(this.resolution.x / 2);
    resy = Math.round(this.resolution.y / 2);

    for (let i = 0; i < this.nMips; i++) {
      this.separableBlurMaterials.push(
        this.getSeperableBlurMaterial(kernelSizeArray[i])
      );

      this.separableBlurMaterials[i].uniforms.invSize.value = new Vector2(
        1 / resx,
        1 / resy
      );

      resx = Math.round(resx / 2);

      resy = Math.round(resy / 2);
    }

    // composite material

    this.compositeMaterial = this.getCompositeMaterial(this.nMips);
    this.compositeMaterial.uniforms.blurTexture1.value =
      this.renderTargetsVertical[0].texture;
    this.compositeMaterial.uniforms.blurTexture2.value =
      this.renderTargetsVertical[1].texture;
    this.compositeMaterial.uniforms.blurTexture3.value =
      this.renderTargetsVertical[2].texture;
    this.compositeMaterial.uniforms.blurTexture4.value =
      this.renderTargetsVertical[3].texture;
    this.compositeMaterial.uniforms.blurTexture5.value =
      this.renderTargetsVertical[4].texture;
    this.compositeMaterial.uniforms.bloomStrength.value = opts.strength;
    this.compositeMaterial.uniforms.bloomRadius.value = 0.1;

    const bloomFactors = [1.0, 0.8, 0.6, 0.4, 0.2];
    this.compositeMaterial.uniforms.bloomFactors.value = bloomFactors;
    this.bloomTintColors = [
      new Vector3(1, 1, 1),
      new Vector3(1, 1, 1),
      new Vector3(1, 1, 1),
      new Vector3(1, 1, 1),
      new Vector3(1, 1, 1),
    ];
    this.compositeMaterial.uniforms.bloomTintColors.value =
      this.bloomTintColors;

    // blend material

    const copyShader = CopyShader;

    this.copyUniforms = UniformsUtils.clone(copyShader.uniforms);

    this.blendMaterial = new ShaderMaterial({
      uniforms: this.copyUniforms,
      vertexShader: copyShader.vertexShader,
      fragmentShader: copyShader.fragmentShader,
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });

    // 创建一个新的中间渲染目标
    // this.intermediateRenderTarget = new WebGLRenderTarget(resx, resy, {
    //   format: RGBAFormat,
    //   type: FloatType
    // });

    // // 最后一步处理黑色区域的透明度
    // this.alphaOutBlackMaterial = new ShaderMaterial({
    //   uniforms: {
    //     tDiffuse: { value: null },
    //     threshold: { value: 0.01 } // 定义一个阈值
    //   },
    //   vertexShader: `
    //     varying vec2 vUv;
    //     void main() {
    //         vUv = uv;
    //         gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    //     }
    // `,
    //   fragmentShader: `
    //     uniform sampler2D tDiffuse;
    //     float threshold = 0.1;
    //     float smoothness = 0.1;
    //     varying vec2 vUv;
    //     void main() {
    //         vec4 color = texture2D(tDiffuse, vUv);
    //         // 使用阈值判断颜色是否接近黑色
    //         // if (color.r < threshold && color.g < threshold && color.b < threshold) {
    //         //     color.a = 0.0;
    //         // }
    //         // gl_FragColor = color;

    //         // 计算颜色与黑色的距离
    //         float dist = length(color.rgb);
    //         // 根据距离计算透明度，使用平滑的过渡
    //         float alpha = smoothstep(threshold, threshold + smoothness, dist);
    //         color.a *= alpha;
    //         gl_FragColor = color;
    //     }
    // `,
    //   transparent: true
    // });

    // // 创建一个新的 ShaderMaterial 来复制纹理
    // this.copyMaterial = new ShaderMaterial({
    //   uniforms: {
    //     tDiffuse: { value: null }
    //   },
    //   vertexShader: `
    //     varying vec2 vUv;
    //     void main() {
    //         vUv = uv;
    //         gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    //     }
    // `,
    //   fragmentShader: `
    //     uniform sampler2D tDiffuse;
    //     varying vec2 vUv;
    //     void main() {
    //         vec4 color = texture2D(tDiffuse, vUv);
    //         gl_FragColor = color;
    //     }
    // `,
    //   transparent: true // 确保材质是透明的
    // });

    // this.alphaSmoothMaterial = new ShaderMaterial({
    //   uniforms: {
    //     tDiffuse: { value: null }
    //   },
    //   vertexShader: `
    //     varying vec2 vUv;
    //     void main() {
    //         vUv = uv;
    //         gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    //     }
    // `,
    //   fragmentShader: `

    //       varying vec2 vUv;
    // uniform sampler2D tDiffuse;
    // float alphaThreshold = 0.01;
    // float alphaSmoothness = 0.05;

    // void main() {
    //     float alpha = texture2D(tDiffuse, vUv).a;

    //     // 平滑过渡处理透明度
    //     alpha = smoothstep(alphaThreshold, alphaThreshold + alphaSmoothness, alpha);

    //     gl_FragColor = vec4(0.0, 0.0, 0.0, alpha); // 只处理 alpha 通道
    // }
    //   `
    // });

    this.needsSwap = false;

    this._oldClearColor = new Color();
    this.oldClearAlpha = 1;

    this.basic = new MeshBasicMaterial();

    this.fsQuad = new FullScreenQuad(null);
  }

  dispose() {
    for (let i = 0; i < this.renderTargetsHorizontal.length; i++) {
      this.renderTargetsHorizontal[i].dispose();
    }

    for (let i = 0; i < this.renderTargetsVertical.length; i++) {
      this.renderTargetsVertical[i].dispose();
    }

    this.renderTargetBright.dispose();

    //

    for (let i = 0; i < this.separableBlurMaterials.length; i++) {
      this.separableBlurMaterials[i].dispose();
    }

    this.compositeMaterial.dispose();
    this.blendMaterial.dispose();
    this.basic.dispose();

    //

    this.fsQuad.dispose();
  }

  setSize(width, height) {
    let resx = Math.round(width / 2);
    let resy = Math.round(height / 2);

    this.renderTargetBright.setSize(resx, resy);

    for (let i = 0; i < this.nMips; i++) {
      this.renderTargetsHorizontal[i].setSize(resx, resy);
      this.renderTargetsVertical[i].setSize(resx, resy);

      this.separableBlurMaterials[i].uniforms.invSize.value = new Vector2(
        1 / resx,
        1 / resy
      );

      resx = Math.round(resx / 2);
      resy = Math.round(resy / 2);
    }
  }

  render(renderer, readBuffer, writeBuffer, deltaTime, maskActive) {
    renderer.getClearColor(this._oldClearColor);
    this.oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClear = renderer.autoClear;
    // eslint-disable-next-line no-param-reassign
    renderer.autoClear = false;

    renderer.setClearColor(this.clearColor, 0);

    if (maskActive) renderer.state.buffers.stencil.setTest(false);

    // Render input to screen

    if (this.renderToScreen) {
      this.fsQuad.material = this.basic;
      this.basic.map = readBuffer.texture;

      renderer.setRenderTarget(null);
      renderer.clear();
      this.fsQuad.render(renderer);
    }

    // 1. Extract Bright Areas

    this.highPassUniforms.tDiffuse.value = readBuffer.texture;
    this.highPassUniforms.luminosityThreshold.value = this.threshold;
    this.fsQuad.material = this.materialHighPassFilter;

    renderer.setRenderTarget(this.renderTargetBright);
    renderer.clear();
    this.fsQuad.render(renderer);

    // 2. Blur All the mips progressively

    let inputRenderTarget = this.renderTargetBright;

    for (let i = 0; i < this.nMips; i++) {
      this.fsQuad.material = this.separableBlurMaterials[i];

      this.separableBlurMaterials[i].uniforms.colorTexture.value =
        inputRenderTarget.texture;
      this.separableBlurMaterials[i].uniforms.direction.value =
        UnrealBloomPass.BlurDirectionX;
      renderer.setRenderTarget(this.renderTargetsHorizontal[i]);
      renderer.clear();
      this.fsQuad.render(renderer);

      this.separableBlurMaterials[i].uniforms.colorTexture.value =
        this.renderTargetsHorizontal[i].texture;
      this.separableBlurMaterials[i].uniforms.direction.value =
        UnrealBloomPass.BlurDirectionY;
      renderer.setRenderTarget(this.renderTargetsVertical[i]);
      renderer.clear();
      this.fsQuad.render(renderer);

      inputRenderTarget = this.renderTargetsVertical[i];
    }

    // 处理透明度，进行过渡处理
    // const alphaOutBlackMaterial = this.alphaSmoothMaterial;
    // alphaOutBlackMaterial.uniforms.alphaTexture.value = readBuffer.texture;
    // alphaOutBlackMaterial.uniforms.alphaThreshold.value = 0.01;
    // alphaOutBlackMaterial.uniforms.alphaSmoothness.value = 0.05;
    // renderer.setRenderTarget(this.intermediateAlphaTarget);
    // renderer.clear();
    // this.fsQuad.material = alphaOutBlackMaterial;
    // this.fsQuad.render(renderer);

    // Composite All the mips

    this.fsQuad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.bloomStrength.value = this.strength;
    this.compositeMaterial.uniforms.bloomRadius.value = this.radius;
    this.compositeMaterial.uniforms.bloomTintColors.value =
      this.bloomTintColors;

    renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
    renderer.clear();
    this.fsQuad.render(renderer);

    // Blend it additively over the input texture

    this.fsQuad.material = this.blendMaterial;
    this.copyUniforms.tDiffuse.value = this.renderTargetsHorizontal[0].texture;

    if (maskActive) renderer.state.buffers.stencil.setTest(true);

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(readBuffer);
      this.fsQuad.render(renderer);
    }

    // 把贴图黑色区域转换成透明

    // this.alphaOutBlackMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    // renderer.setRenderTarget(this.intermediateRenderTarget);
    // this.fsQuad.material = this.alphaOutBlackMaterial;
    // renderer.clear();
    // this.fsQuad.render(renderer);

    // // 使用 copyMaterial 将中间渲染目标内容复制回 readBuffer
    // this.copyMaterial.uniforms.tDiffuse.value = this.intermediateRenderTarget.texture;
    // renderer.setRenderTarget(readBuffer);
    // renderer.clear();
    // this.fsQuad.material = this.copyMaterial;
    // this.fsQuad.render(renderer);

    // Restore renderer settings

    renderer.setClearColor(this._oldClearColor, this.oldClearAlpha);
    // eslint-disable-next-line no-param-reassign
    renderer.autoClear = oldAutoClear;
  }

  // enableBloomAlpha(enableAlpha) {
  //   if (!!this.enableAlpha === enableAlpha) return;
  //   this.enableAlpha = enableAlpha;

  //   // dispose
  //   for (let i = 0; i < this.separableBlurMaterials.length; i++) {
  //     this.separableBlurMaterials[i].dispose();
  //   }

  //   // gaussian blur materials
  //   this.separableBlurMaterials = [];
  //   const kernelSizeArray = [3, 5, 7, 9, 11];
  //   let resx = Math.round(this.resolution.x / 2);
  //   let resy = Math.round(this.resolution.y / 2);

  //   for (let i = 0; i < this.nMips; i++) {
  //     this.separableBlurMaterials.push(this.getSeperableBlurMaterial(kernelSizeArray[i]));

  //     this.separableBlurMaterials[i].uniforms.invSize.value = new Vector2(1 / resx, 1 / resy);

  //     resx = Math.round(resx / 2);

  //     resy = Math.round(resy / 2);
  //   }
  // }

  getSeperableBlurMaterial(kernelRadius) {
    const coefficients = [];

    for (let i = 0; i < kernelRadius; i++) {
      coefficients.push(
        (0.39894 * Math.exp((-0.5 * i * i) / (kernelRadius * kernelRadius))) /
          kernelRadius
      );
    }

    // const alphaFragShader = `#include <common>
    // 		varying vec2 vUv;
    // 		uniform sampler2D colorTexture;
    // 		uniform vec2 invSize;
    // 		uniform vec2 direction;
    // 		uniform float gaussianCoefficients[KERNEL_RADIUS];

    //     void main() {
    // 			float weightSum = gaussianCoefficients[0];
    // 			vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
    //       float alphaSum = 0.0;
    // 			for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
    // 				float x = float(i);
    // 				float w = gaussianCoefficients[i];
    // 				vec2 uvOffset = direction * invSize * x;
    // 				vec4 sample1 = texture2D( colorTexture, vUv + uvOffset );
    // 				vec4 sample2 = texture2D( colorTexture, vUv - uvOffset );
    // 				diffuseSum += (sample1.rbg + sample2.rgb) * w;
    //         alphaSum += (sample1.a + sample2.a) * w;
    // 				weightSum += 2.0 * w;
    // 			}
    //       gl_FragColor = vec4(diffuseSum/weightSum, alphaSum/weightSum);
    // 			gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
    //     }`;

    return new ShaderMaterial({
      defines: {
        KERNEL_RADIUS: kernelRadius,
      },

      uniforms: {
        colorTexture: { value: null },
        invSize: { value: new Vector2(0.5, 0.5) }, // inverse texture size
        direction: { value: new Vector2(0.5, 0.5) },
        gaussianCoefficients: { value: coefficients }, // precomputed Gaussian coefficients
      },

      vertexShader: `varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,

      fragmentShader: `#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`,
    });
  }

  getCompositeMaterial(nMips) {
    return new ShaderMaterial({
      defines: {
        NUM_MIPS: nMips,
      },

      uniforms: {
        blurTexture1: { value: null },
        blurTexture2: { value: null },
        blurTexture3: { value: null },
        blurTexture4: { value: null },
        blurTexture5: { value: null },
        bloomStrength: { value: 1.0 },
        bloomFactors: { value: null },
        bloomTintColors: { value: null },
        bloomRadius: { value: 0.0 },
      },

      vertexShader: `varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,

      fragmentShader: `varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`,
    });
  }
}

UnrealBloomPass.BlurDirectionX = new Vector2(1.0, 0.0);
UnrealBloomPass.BlurDirectionY = new Vector2(0.0, 1.0);

export default UnrealBloomPass;
