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
		float grey = colA.r * 0.21 + colA.g * 0.71 + colA.b * 0.07;

		vec4 color2 = texture2D(uPTexture, uv);
		float grey2 = 0.299 * color2.r + 0.587 * color2.g + 0.114 * color2.b;
		if(grey2 < 0.01) {
			gl_FragColor = vec4(.0);
		} else {

		// grey += grey2 *grey;
			vec4 colB = vec4(grey, grey, grey, 1.0);
			color = colB;
			color.a = 1.0;

		// gl_FragColor = vec4(uv, uv);
		// gl_FragColor = color;
			gl_FragColor = vec4(0.2, 0.6, 1.0, grey);
		// gl_FragColor = vec4(1.0);
		}
	}

}