uniform sampler2D tDiffuse;
uniform vec4 faceAera;
varying vec2 vUv;

void main() {
    vec4 mask = texture2D(tDiffuse, vUv).rgba;
    // mask = step(0.5, mask);
    float validValue = 1.0;

    if(vUv.x < faceAera.x || vUv.x > faceAera.z || vUv.y < faceAera.y) {
        discard;
    }

    // if(mask < 0.2)
    //     discard;

    validValue = mask.a * validValue;
    gl_FragColor = vec4(vec3(mask.rgb * validValue), 1.0);
    // gl_FragColor = vec4(mask);
    // gl_FragColor = vec4(0.5);
}