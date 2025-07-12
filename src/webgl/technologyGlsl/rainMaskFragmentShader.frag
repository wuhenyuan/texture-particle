uniform sampler2D tDiffuse;
uniform vec4 faceAera;
varying vec2 vUv;

void main() {
    float mask = texture2D(tDiffuse, vUv).a;
    // mask = step(0.5, mask);
    float validValue = 1.0;

    if(vUv.x < faceAera.x || vUv.x > faceAera.z || vUv.y < faceAera.y) {
        discard;
    }

    // if(mask < 0.2)
    //     discard;

    validValue = mask * validValue;
    gl_FragColor = vec4(vec3(validValue), 1.0);
    // gl_FragColor = vec4(mask);
    // gl_FragColor = vec4(0.5);
}