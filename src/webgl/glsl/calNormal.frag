precision highp float;

varying vec2 vUv;
uniform sampler2D depthMap;
uniform vec2 resolution;

const int KERNEL_RADIUS = 2;

// 替代 outerProduct
mat3 computeOuterProduct(vec3 a, vec3 b) {
    return mat3(a.x * b.x, a.x * b.y, a.x * b.z, a.y * b.x, a.y * b.y, a.y * b.z, a.z * b.x, a.z * b.y, a.z * b.z);
}

// Power iteration 方法求特征向量
vec3 getEigenVector(mat3 M) {
    mat3 M_inv = inverse(M + mat3(0.0001)); // 防止奇异矩阵报错
    vec3 v = vec3(1.0, 1.0, 1.0);
    for(int i = 0; i < 5; ++i) {
        v = normalize(M_inv * v);
    }
    return v;
}

void main() {
    vec3 centroid1 = vec3(0.0);
    float points_count = 0.0;
    vec2 texelSize = 1.0 / resolution;

    // 1. 求质心
    for(int i = -KERNEL_RADIUS; i <= KERNEL_RADIUS; i++) {
        for(int j = -KERNEL_RADIUS; j <= KERNEL_RADIUS; j++) {
            vec2 offset = vec2(float(i), float(j)) * texelSize;
            vec2 sampleUV = vUv + offset;
            float depth = texture2D(depthMap, sampleUV).r;

            if(depth > 0.0 && depth < 1.0) {
                vec3 p = vec3(sampleUV * resolution, depth);
                centroid1 += p;
                points_count += 1.0;
            }
        }
    }

    if(points_count < 3.0) {
        gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0);
        return;
    }

    centroid1 /= points_count;

    // 2. 求协方差矩阵
    mat3 covariance = mat3(0.0);

    for(int i = -KERNEL_RADIUS; i <= KERNEL_RADIUS; i++) {
        for(int j = -KERNEL_RADIUS; j <= KERNEL_RADIUS; j++) {
            vec2 offset = vec2(float(i), float(j)) * texelSize;
            vec2 sampleUV = vUv + offset;
            float depth = texture2D(depthMap, sampleUV).r;

            if(depth > 0.0 && depth < 1.0) {
                vec3 p = vec3(sampleUV * resolution, depth);
                vec3 pc = p - centroid1;
                covariance += computeOuterProduct(pc, pc);
            }
        }
    }

    // 3. 求法线
    vec3 normal = getEigenVector(covariance);

    // 4. 朝向校正
    if(normal.z < 0.0) {
        normal = -normal;
    }

    // 5. 输出颜色
    gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
}
