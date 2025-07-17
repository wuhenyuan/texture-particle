// @author brunoimbrizi / http://brunoimbrizi.com

precision highp float;

uniform sampler2D uTexture;
uniform sampler2D decorationTextuer;
uniform sampler2D uPTexture;
uniform vec2 uTextureSize;

uniform vec4 faceAera;

varying vec2 vPUv;
varying vec2 vUv;
varying vec2 dTUv;

void main() {
    vec4 color = vec4(0.0);
    vec2 uv = vUv;
    vec2 puv = vPUv;
    vec2 center = (faceAera.xy + faceAera.zw) * 0.5;
    float aera = (faceAera.w - faceAera.y) / 2. + 0.05;
    // vec2 tel = vec2(1.0 / uTextureSize.x, 1.0 / uTextureSize.y);

    float dist = distance(center, puv);
    float radius = 0.;
    float directionlDist = max(0.0, dist - radius);
    float directionMask = 1.0 - smoothstep(radius, aera, directionlDist);
    // float alphaMask = directionMask * alpha;

    // vec2 dirUv = uv - 0.5;
    // vec2 dTUv = puv + uv * tel;

	// pixel color
    vec4 colA = texture2D(uTexture, puv);
    vec4 colorB = texture2D(decorationTextuer, dTUv);
    // if (colA.r < 0.133333) {
	// || uv.x > 1.0 || uv.y > 1.0
    if(uv.x > 1.0 || uv.y > 1.0) {
        gl_FragColor = vec4(.0);
    } else {
		// greyscale
        if(colA.a < 0.02)
            discard;
        // float alpha = smoothstep(0.2, 0.8, colA.r);
        float alpha = colA.r;
        // alpha = mix(0.2, 0.4, alpha);
        gl_FragColor = vec4(vec3(colorB.rgb * colorB.a), alpha * directionMask);
        // gl_FragColor = vec4(1.0);
    }
}
