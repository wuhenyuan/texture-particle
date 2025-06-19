// @author brunoimbrizi / http://brunoimbrizi.com

precision highp float;

uniform sampler2D uTexture;

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

		// grey += grey2 *grey;
    vec4 colB = vec4(grey, grey, grey, 1.0);
    color = colB;
    color.a = 1.0;

    if(grey < 0.0001)
      discard;
    gl_FragColor = vec4(grey, grey, grey, 1.0);
  }

}