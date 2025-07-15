#iChannel0 "file://image4.jpg"
#iChannel1 "file://person.png"

#define MaskTex iChannel0
#define ColorTex iChannel1

#iUniform float offset  = 0.5 in {-1.0, 1.0}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float mask = texture(MaskTex, uv * 3.).x;
    vec4 color = texture(iChannel1, uv);

    mask = smoothstep(0.5, 0.9, mask);

    float o = mix(0., mask, color.x);

    fragColor = vec4(vec3(o * 1.5), 1.);
}