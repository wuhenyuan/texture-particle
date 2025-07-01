precision highp float;

varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform vec2 iResolution;

const float EPSILON = 0.01;
const vec3 INVALID_NORMAL = vec3(0.0, 0.0, 0.0); // 用这个值标记“空白像素”
const int RADIUS = 8;

// 可调：控制不同方向权重（横向更强）
// 横向权重因子：越大代表左右方向影响越大
const float HORIZ_WEIGHT_SCALE = 1.;
const float VERT_WEIGHT_SCALE = 1.0;

bool isValidNormal(vec3 n) {
    return length(n) > 0.3;

}

void main() {
    vec2 texelSize = 1.0 / iResolution;
    vec3 centerNormal = texture2D(tDiffuse, vUv).rgb;

    if(isValidNormal(centerNormal)) {
        // 当前像素本身有法线，直接输出
        gl_FragColor = vec4(centerNormal, 1.0);
        return;
    }

    // 否则，尝试从邻域中找有效法线平均
    vec3 accum = vec3(0.0);
    float weight = 0.0;

    for(int dx = -RADIUS; dx <= RADIUS; ++dx) {
        for(int dy = -RADIUS; dy <= RADIUS; ++dy) {
            vec2 offset = vec2(float(dx), float(dy)) * texelSize;
            vec2 uv = vUv + offset;

            vec3 sampleNormal = texture2D(tDiffuse, uv).rgb;
            if(isValidNormal(sampleNormal)) {

                // 基于方向计算加权（横向、纵向、对角不同权重）

                accum += sampleNormal;
                weight += 1.0;
            }
        }
    }

    if(weight > 0.0) {
        vec3 result = normalize(accum / weight);
        gl_FragColor = vec4(result, 1.0);
    } else {
        // 邻域也没找到，保持空白（或输出默认法线）
        gl_FragColor = vec4(INVALID_NORMAL, 1.0);
    }
}
