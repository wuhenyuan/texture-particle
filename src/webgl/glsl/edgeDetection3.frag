
// ref: (in japanese)
// https://imagingsolution.net/imaging/canny-edge-detector/
#define tickness 4.

varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform vec2 iResolution;
uniform vec2 iChannelResolution;
uniform float uContrast;

float getAve(vec2 uv) {
    vec3 rgb = texture(tDiffuse, uv).rgb;
    vec3 lum = vec3(0.299, 0.587, 0.114);
    return dot(lum, rgb);
}

vec4 iMouse = vec4(0.1);

// Detect edge.
vec4 sobel(vec2 fragCoord, vec2 dir) {
    vec4 mous = iMouse / iResolution.xyxy * .1;
    vec2 uv = fragCoord / iResolution.xy;
    vec2 texel = 1. / iResolution.xy;
    float np = getAve(uv + (vec2(-1, +1) + dir) * texel * tickness);
    float zp = getAve(uv + (vec2(0, +1) + dir) * texel * tickness);
    float pp = getAve(uv + (vec2(+1, +1) + dir) * texel * tickness);

    float nz = getAve(uv + (vec2(-1, 0) + dir) * texel * tickness);
    // zz = 0
    float pz = getAve(uv + (vec2(+1, 0) + dir) * texel * tickness);

    float nn = getAve(uv + (vec2(-1, -1) + dir) * texel * tickness);
    float zn = getAve(uv + (vec2(0, -1) + dir) * texel * tickness);
    float pn = getAve(uv + (vec2(+1, -1) + dir) * texel * tickness);

    // np zp pp
    // nz zz pz
    // nn zn pn

    #if 0
    float gx = (np * -1. + nz * -2. + nn * -1. + pp * 1. + pz * 2. + pn * 1.);
    float gy = (np * -1. + zp * -2. + pp * -1. + nn * 1. + zn * 2. + pn * 1.);
    #else
    // https://www.shadertoy.com/view/Wds3Rl
    float gx = (np * -3. + nz * -10. + nn * -3. + pp * 3. + pz * 10. + pn * 3.);
    float gy = (np * -3. + zp * -10. + pp * -3. + nn * 3. + zn * 10. + pn * 3.);
    #endif

    vec2 G = vec2(gx, gy);

    float grad = length(G);

    float angle = atan(G.y, G.x);

    return vec4(G, grad, angle);
}

// Make edge thinner.
vec2 hysteresisThr(vec2 fragCoord, float mn, float mx) {

    vec4 edge = sobel(fragCoord, vec2(0));

    vec2 dir = vec2(cos(edge.w), sin(edge.w));
    dir *= vec2(-1, 1); // rotate 90 degrees.

    vec4 edgep = sobel(fragCoord, dir);
    vec4 edgen = sobel(fragCoord, -dir);

    if(edge.z < edgep.z || edge.z < edgen.z)
        edge.z = 0.;

    return vec2((edge.z > mn) ? edge.z : 0., (edge.z > mx) ? edge.z : 0.);
}

float cannyEdge(vec2 fragCoord, float mn, float mx) {

    vec2 np = hysteresisThr(fragCoord + vec2(-1, +1), mn, mx);
    vec2 zp = hysteresisThr(fragCoord + vec2(0, +1), mn, mx);
    vec2 pp = hysteresisThr(fragCoord + vec2(+1, +1), mn, mx);

    vec2 nz = hysteresisThr(fragCoord + vec2(-1, 0), mn, mx);
    vec2 zz = hysteresisThr(fragCoord + vec2(0, 0), mn, mx);
    vec2 pz = hysteresisThr(fragCoord + vec2(+1, 0), mn, mx);

    vec2 nn = hysteresisThr(fragCoord + vec2(-1, -1), mn, mx);
    vec2 zn = hysteresisThr(fragCoord + vec2(0, -1), mn, mx);
    vec2 pn = hysteresisThr(fragCoord + vec2(+1, -1), mn, mx);

    // np zp pp
    // nz zz pz
    // nn zn pn
    //return min(1., step(1e-3, zz.x) * (zp.y + nz.y + pz.y + zn.y)*8.);
    //return min(1., step(1e-3, zz.x) * (np.y + pp.y + nn.y + pn.y)*8.);
    return min(1., step(1e-2, zz.x * 8.) * smoothstep(.0, .3, np.y + zp.y + pp.y + nz.y + pz.y + nn.y + zn.y + pn.y) * 8.);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec4 mous = iMouse / iResolution.xyxy * .1;
    float edge = cannyEdge(fragCoord, mous.x * 5., mous.y * 30.);

    vec3 col = mix(vec3(0.875, 0.835, 0.749), vec3(0.145, 0.118, 0.055), 1. - edge);
    fragColor = vec4(col, 1.0);
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