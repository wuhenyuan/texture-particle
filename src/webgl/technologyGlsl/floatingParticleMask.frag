uniform sampler2D tDiffuse;
uniform vec4 faceAera;
varying vec2 vUv;

void main() {
    float mask = texture2D(tDiffuse, vUv).r;
    mask = step(0.01, mask);
    // mask = step(0.5, mask);
    float validValue = 1.0;

    vec2 center = (faceAera.xy + faceAera.zw) * 0.5;
    float aera = (faceAera.w - faceAera.y) / 2. - 0.015;

    float dist = distance(center, vUv);
    float radius = 0.;
    float directionlDist = max(0.0, dist - radius);
    float directionMask = 1.0 - smoothstep(radius, aera * 1.5, directionlDist);
    directionMask = step(0.01, directionMask);

    validValue = mask * validValue * directionMask;
    gl_FragColor = vec4(validValue);
    // gl_FragColor = vec4(mask);
    // gl_FragColor = vec4(0.5);
}