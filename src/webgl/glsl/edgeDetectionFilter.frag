

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

const int conv_length = 9, conv_width = 3;

// Laplace filter kernel
const float conv[conv_length] = float[conv_length](-1., -1., -1., -1., 8., -1., -1., -1., -1.);

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy, ps = 1. / iResolution.xy; // pixel size

    vec4 acc = vec4(0);

    for(int i = 0; i < conv_length; i++) {
        vec2 d = vec2(i % conv_width, i / conv_width) - vec2(conv_width / 2);
        acc += conv[i] * texture(tdiff, uv + d * ps);
    }

    acc = smoothstep(-.01, 0.5, acc);
    fragColor = acc;
}

void main() {
    // gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    mainImage(gl_FragColor, gl_FragCoord.xy);
    gl_FragColor.a = 1.0;
}
