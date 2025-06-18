const fragShader = /*glsl*/ `

// Basic sobel filter implementation
// Jeroen Baert - jeroen.baert@cs.kuleuven.be
// 
// www.forceflow.be


// Use these parameters to fiddle with settings
float step = 1.0;

varying vec2 vUv;
uniform sampler2D tdiff;
uniform vec2 iResolution;

float intensity(in vec4 color){
	return sqrt((color.x*color.x)+(color.y*color.y)+(color.z*color.z));
}

vec3 sobel(float stepx, float stepy, vec2 center){
	// get samples around pixel
    float tleft = intensity(texture(tdiff,center + vec2(-stepx,stepy)));
    float left = intensity(texture(tdiff,center + vec2(-stepx,0)));
    float bleft = intensity(texture(tdiff,center + vec2(-stepx,-stepy)));
    float top = intensity(texture(tdiff,center + vec2(0,stepy)));
    float bottom = intensity(texture(tdiff,center + vec2(0,-stepy)));
    float tright = intensity(texture(tdiff,center + vec2(stepx,stepy)));
    float right = intensity(texture(tdiff,center + vec2(stepx,0)));
    float bright = intensity(texture(tdiff,center + vec2(stepx,-stepy)));
 
	// Sobel masks (see http://en.wikipedia.org/wiki/Sobel_operator)
	//        1 0 -1     -1 -2 -1
	//    X = 2 0 -2  Y = 0  0  0
	//        1 0 -1      1  2  1
	
	// You could also use Scharr operator:
	//        3 0 -3        3 10   3
	//    X = 10 0 -10  Y = 0  0   0
	//        3 0 -3        -3 -10 -3
 
    float x = tleft + 2.0*left + bleft - tright - 2.0*right - bright;
    float y = -tleft - 2.0*top - tright + bleft + 2.0 * bottom + bright;
    float color = sqrt((x*x) + (y*y));
    return vec3(color,color,color);
 }

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
	// vec2 uv = fragCoord.xy / iResolution.xy;
	vec4 color = texture(tdiff, vUv);
	fragColor.xyz = sobel(step/iResolution[0], step/iResolution[1], vUv);
    // fragColor.x = 1.0;
}

void main() {
    // gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    mainImage(gl_FragColor, gl_FragCoord.xy);
    gl_FragColor.a = 1.0;
}
`;

export const edgeDetection = {
  name: "edgeDetection",
  uniforms: {
    tdiff: { type: "t", value: null },
    iResolution: { type: "v2", value: null },
  },
  vertexShader: /*glsl*/ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position =  vec4(position, 1.0);
    }`,

  fragmentShader: fragShader,
};
