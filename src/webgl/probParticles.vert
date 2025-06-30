
// @author brunoimbrizi / http://brunoimbrizi.com

#include <noise>

float rand(float n) {
    return fract(sin(n) * 43758.5453123);
}

float random(float n) {
    return fract(sin(n) * 43758.5453123);
}

float noise(float p) {
    float fl = floor(p);
    float fc = fract(p);
    return mix(rand(fl), rand(fl + 1.0), fc);
}

precision highp float;

attribute float pindex;
attribute vec3 offset;
attribute float angle;

uniform float uTime;
uniform float uRandom;
uniform float uDepth;
uniform float uSize;
uniform vec2 uTextureSize;
uniform sampler2D uNormalTexture;
uniform sampler2D uProbabilityMap;
uniform sampler2D uMaskMap;
uniform sampler2D uHighLightMap;  //高光贴图
uniform float uProgress;
uniform float offsetScale;
// uniform sampler2D uTouch;

varying vec2 vPUv;
varying vec2 vUv;

float remap(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

// noise

void main() {
    vUv = uv;

	// particle uv
    vec2 puv = offset.xy / uTextureSize;
    // puv.y = 1.0 - puv.y;
    vPUv = puv;

	// pixel color
	// vec4 colA = texture2D(uTexture, puv);
	// float grey = colA.r * 0.21 + colA.g * 0.71 + colA.b * 0.07;

	// displacement
    vec3 displaced = offset;
    // displaced.z = 0.1;
	// center
    // displaced.xy -= uTextureSize * 0.5;

	// displacement
    // displaced = offset;
	// randomise
    // displaced.xy += vec2(random(pindex) - 0.5, random(offset.x + pindex) - 0.5) * uRandom;
    // float rndz = (random(pindex) + snoise(vec2(pindex * 0.1, uTime * 0.1)));
    // displaced.z += rndz * (random(pindex) * 2.0 * uDepth);
	// center
    displaced.xy -= uTextureSize * 0.5;
    displaced.z = 0.0;

	// touch
    // float t = texture2D(uTouch, puv).r;
    float rndz = 0.0;
    float t = 0.0;
    displaced.z += t * 20.0 * rndz;
    displaced.x += cos(angle) * t * 1.0 * rndz;
    displaced.y += sin(angle) * t * 1.0 * rndz;

  // progress noise
    float multiplier = uTextureSize.x * 2.0; // distance factor

    vec3 randomDir = vec3(noise(displaced.x) * 2.0 - 1.0, noise(displaced.y) * 2.0 - 1.0, noise(200.0) * 2.0 - 1.0);
    vec3 positionTarget = displaced + normalize(randomDir) * multiplier;

    float noiseOrigin = simplexNoise3d(positionTarget);
    float noiseTarget = simplexNoise3d(displaced);
    float noise = mix(noiseOrigin, noiseTarget, uProgress);

    float duration = 0.6;
    float delay = (1.0 - duration) * noise;
    float end = delay + duration;
    float progress = smoothstep(delay, end, uProgress);

    vec3 mixedPosition = mix(positionTarget, displaced, progress);

    vec4 normal = texture2D(uNormalTexture, vPUv);

    normal.xy = normal.xy * 2.0 - 1.0;

    vec2 normalOffset = normal.xy * offsetScale * normal.z * uSize;

    mixedPosition.xy -= normalOffset;
    // float noiseStrength = 1.0; // Adjust this value to control the intensity of the noise
    // // vec3 noiseOffset = vec3((random2D(mixedPosition.xy + uTime * 0.1) - 0.5) * noiseStrength, (random2D(mixedPosition.yx - uTime * 0.1) - 0.5) * noiseStrength, (random2D(mixedPosition.yz + uTime * 0.05) - 0.5) * noiseStrength);
    // vec3 noiseOffset = vec3((random2D(mixedPosition.xy) - 0.5) * noiseStrength, (random2D(mixedPosition.yx) - 0.5) * noiseStrength, (random2D(mixedPosition.yz) - 0.5) * noiseStrength);
    // mixedPosition += noiseOffset;

    float hightProp = dot(texture2D(uHighLightMap, vPUv).rgb, vec3(0.299, 0.587, 0.114));

    float mask = texture2D(uMaskMap, vPUv).r;
    // float scale1 = sin(uTime * 4. + rand(float(gl_InstanceID)) * 351354.0);
	// particle size
    // float psize = uSize + scale1 * uSize * mix(10., 0.2, uProgress);
    	// particle size

	// pixel color
    vec4 colA = texture2D(uProbabilityMap, puv);
    float grey = colA.r * 0.21 + colA.g * 0.71 + colA.b * 0.07;

    // float psize = snoise(vec2(uTime, pindex) * 0.5) + 2.0;
    float psize = 1.0;
    // psize *= max(grey, 0.5);
    psize *= mix(0.2, 0.5, normal.z) * uSize;
    // psize *= hightProp > 0.05 ? 1.0 : 2.0;

	// final position
    vec4 mvPosition = modelViewMatrix * vec4(mixedPosition, 1.0);
    mvPosition.xyz += position * psize;
    vec4 finalPosition = projectionMatrix * mvPosition;

    gl_Position = finalPosition;
}