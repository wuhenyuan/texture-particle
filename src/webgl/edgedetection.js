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

const fragShaderfilter = /*glsl */ `
// by Nikos Papadopoulos, 4rknova / 2013
// WTFPL

// Sobel Kernel - Horizontal
//  1  2  1
//  0  0  0
// -1 -2 -1

// Sobel Kernel - Horizontal
//  1  0 -1
//  2  0 -2
//  1  0 -1




varying vec2 vUv;
uniform sampler2D tdiff;
uniform vec2 iResolution;
uniform vec2 iChannelResolution;

const int conv_length = 9,
           conv_width = 3;

// Laplace filter kernel
const float conv[conv_length] = float[conv_length](
    -1.,-1.,-1.,
    -1., 8.,-1.,
    -1.,-1.,-1.
);

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy,
          ps = 1. / iResolution.xy; // pixel size

    vec4 acc = vec4(0);

    for (int i = 0; i < conv_length; i++){
        vec2 d = vec2(i % conv_width, i / conv_width) - vec2(conv_width / 2);
    	acc += conv[i] * texture(tdiff, uv + d * ps);
    }
    
	fragColor = acc;
}


void main() {
    // gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    mainImage(gl_FragColor, gl_FragCoord.xy);
    gl_FragColor.a = 1.0;
}

`;

const fragShader3 = /* glsl */ `
// ref: (in japanese)
// https://imagingsolution.net/imaging/canny-edge-detector/
#define tickness 4.

varying vec2 vUv;
uniform sampler2D tdiff;
uniform vec2 iResolution;
uniform vec2 iChannelResolution;
uniform float uContrast;

float getAve(vec2 uv){
    vec3 rgb = texture(tdiff, uv).rgb;
    vec3 lum = vec3(0.299, 0.587, 0.114);
    return dot(lum, rgb);
}


vec4 iMouse = vec4(0.1);

// Detect edge.
vec4 sobel(vec2 fragCoord, vec2 dir){
    vec4 mous = iMouse/iResolution.xyxy*.1;
    vec2 uv = fragCoord/iResolution.xy;
    vec2 texel = 1./iResolution.xy;
    float np = getAve(uv + (vec2(-1,+1) + dir ) * texel * tickness);
    float zp = getAve(uv + (vec2( 0,+1) + dir ) * texel * tickness);
    float pp = getAve(uv + (vec2(+1,+1) + dir ) * texel * tickness);
    
    float nz = getAve(uv + (vec2(-1, 0) + dir ) * texel * tickness);
    // zz = 0
    float pz = getAve(uv + (vec2(+1, 0) + dir ) * texel * tickness);
    
    float nn = getAve(uv + (vec2(-1,-1) + dir ) * texel * tickness);
    float zn = getAve(uv + (vec2( 0,-1) + dir ) * texel * tickness);
    float pn = getAve(uv + (vec2(+1,-1) + dir ) * texel * tickness);
    
    // np zp pp
    // nz zz pz
    // nn zn pn
    
    #if 0
    float gx = (np*-1. + nz*-2. + nn*-1. + pp*1. + pz*2. + pn*1.);
    float gy = (np*-1. + zp*-2. + pp*-1. + nn*1. + zn*2. + pn*1.);
    #else
    // https://www.shadertoy.com/view/Wds3Rl
    float gx = (np*-3. + nz*-10. + nn*-3. + pp*3. + pz*10. + pn*3.);
    float gy = (np*-3. + zp*-10. + pp*-3. + nn*3. + zn*10. + pn*3.);
    #endif
    
    vec2 G = vec2(gx,gy);
    
    float grad = length(G);
    
    float angle = atan(G.y, G.x);
    
    return vec4(G, grad, angle);
}

// Make edge thinner.
vec2 hysteresisThr(vec2 fragCoord, float mn, float mx){

    vec4 edge = sobel(fragCoord, vec2(0));

    vec2 dir = vec2(cos(edge.w), sin(edge.w));
    dir *= vec2(-1,1); // rotate 90 degrees.
    
    vec4 edgep = sobel(fragCoord, dir);
    vec4 edgen = sobel(fragCoord, -dir);

    if(edge.z < edgep.z || edge.z < edgen.z ) edge.z = 0.;
    
    return vec2(
        (edge.z > mn) ? edge.z : 0.,
        (edge.z > mx) ? edge.z : 0.
    );
}

float cannyEdge(vec2 fragCoord, float mn, float mx){

    vec2 np = hysteresisThr(fragCoord + vec2(-1,+1), mn, mx);
    vec2 zp = hysteresisThr(fragCoord + vec2( 0,+1), mn, mx);
    vec2 pp = hysteresisThr(fragCoord + vec2(+1,+1), mn, mx);
    
    vec2 nz = hysteresisThr(fragCoord + vec2(-1, 0), mn, mx);
    vec2 zz = hysteresisThr(fragCoord + vec2( 0, 0), mn, mx);
    vec2 pz = hysteresisThr(fragCoord + vec2(+1, 0), mn, mx);
    
    vec2 nn = hysteresisThr(fragCoord + vec2(-1,-1), mn, mx);
    vec2 zn = hysteresisThr(fragCoord + vec2( 0,-1), mn, mx);
    vec2 pn = hysteresisThr(fragCoord + vec2(+1,-1), mn, mx);
    
    // np zp pp
    // nz zz pz
    // nn zn pn
    //return min(1., step(1e-3, zz.x) * (zp.y + nz.y + pz.y + zn.y)*8.);
    //return min(1., step(1e-3, zz.x) * (np.y + pp.y + nn.y + pn.y)*8.);
    return min(1., step(1e-2, zz.x*8.) * smoothstep(.0, .3, np.y + zp.y + pp.y + nz.y + pz.y + nn.y + zn.y + pn.y)*8.);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec4 mous = iMouse/iResolution.xyxy*.1;
    float edge = cannyEdge(fragCoord, mous.x*5., mous.y*30.);
    
    vec3 col = mix(vec3(0.875,0.835,0.749), vec3(0.145,0.118,0.055), 1.-edge);    
    fragColor = vec4(col,1.0);
}


float contrast(float x, float k) {
// x: 原始亮度值（0~1），k: 强度（建议 5~15）
return 1.0 / (1.0 + exp(-k * (x - 0.5)));
}
void main() {
    // gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    vec4 color = vec4(0.0);
    mainImage(color, gl_FragCoord.xy);
    float g = color.r;
    g = contrast(g, uContrast);
    gl_FragColor = vec4(g, g, g, 1.0);
    // gl_FragColor.a = 1.0;
}
`;

export const edgeDetection = {
  name: "edgeDetection",
  uniforms: {
    tdiff: { type: "t", value: null },
    iResolution: { type: "v2", value: null },
    iChannelResolution: { value: null },
    uContrast: { value: null },
  },
  vertexShader: /*glsl*/ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position =  vec4(position, 1.0);
    }`,

  //   fragmentShader: fragShader,
  //   fragmentShader: fragShader3,

  fragmentShader: fragShaderfilter,
};
