precision highp float;
precision highp sampler3D;

varying vec2 vUv;

vec4 sRGBToLinear(const in vec4 value) {
    return vec4(mix(pow(value.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), value.rgb * 0.0773993808, vec3(lessThanEqual(value.rgb, vec3(0.04045)))), value.a);
}

vec4 blend23(const in vec4 x, const in vec4 y, const in float opacity) {
    return mix(x, y, opacity);
}

uniform sampler3D lut;

vec4 applyLUT(const in vec3 rgb) {
    return texture(lut, rgb);
}

uniform sampler2D inputBuffer;
uniform float blendOpacity;
uniform float scale;
uniform vec3 offset;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 c = inputColor.rgb;
    // c = applyLUT(vec3(scale) * c + offset).rgb;
    c = applyLUT(c).rgb;
    outputColor = vec4(c, inputColor.a);
}

void main() {
    vec4 color0 = texture2D(inputBuffer, vUv);
    vec4 color1 = vec4(0.0);
    // color0 = sRGBTransferOETF(color0);
    mainImage(color0, vUv, color1);
    color0 = blend23(color0, color1, blendOpacity);
    color0 = sRGBToLinear(color0);
    color0.a = clamp(color0.a, 0.0, 1.0);
    gl_FragColor = color0;
    // gl_FragColor = linearToOutputTexel(color0);
}