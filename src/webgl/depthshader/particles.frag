// @author brunoimbrizi / http://brunoimbrizi.com

precision highp float;

uniform sampler2D uTexture;
uniform sampler2D uPTexture;

varying vec2 vPUv;
varying vec2 vUv;

void main() {
	vec4 color = vec4(0.0);
	vec2 uv = vUv;
	vec2 puv = vPUv;

	// pixel color
	vec4 colA = texture2D(uTexture, puv);
    // if (colA.r < 0.133333) {
	// || uv.x > 1.0 || uv.y > 1.0
	if(uv.x > 1.0 || uv.y > 1.0) {
		gl_FragColor = vec4(.0);
	} else {
		// greyscale
		if(colA.a < 0.02)
			discard;
		gl_FragColor = colA;
	}
}
