precision highp float;

const float PI = 4.0 * atan(1.0);

uniform sampler2D u_input;
uniform float u_transformSize;
uniform float u_subtransformSize;

varying vec2 vUV;


vec4 dualfft_rows(vec2 p) {
   p.x = floor(p.x);
   float base = floor(p.x / u_subtransformSize) * (u_subtransformSize/2.0);
   float offset = mod(p.x, u_subtransformSize/2.0);
   float iy  = p.y / u_transformSize;
   float ix0 = (base + offset) / u_transformSize;
   float ix1 = ix0 + 0.5;
   vec4 v0 = texture2D(u_input, vec2(ix0, iy) ); 
   vec4 v1 = texture2D(u_input, vec2(ix1, iy) );
   float angle = radians(-360.0*p.x/u_subtransformSize);
   vec2 t = vec2( cos(angle), sin(angle) );
   // transform two complex number planes at once
   return v0 + vec4(t.x*v1.x - t.y*v1.y,
        t.y*v1.x + t.x*v1.y,
        t.x*v1.z - t.y*v1.w,
        t.y*v1.z + t.x*v1.w);
}

void main() {
    // gl_FragColor = dualfft_rows( vUV.xy * u_transformSize );
    gl_FragColor = dualfft_rows( gl_FragCoord.xy );
    gl_FragColor = vec4(gl_FragCoord.xy, vUV.xy);
}


// vec2 multiplyComplex(vec2 a, vec2 b)
// {
//     return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
// }

// #ifdef HORIZONTAL

// void main(void)
// {
    
//     float index = vUV.x * u_transformSize - 0.5;
    
//     if (vUV.x > 0.5)
//         index = ceil(index);
//     else
//         index = floor(index);

//     float evenIndex = floor(index / u_subtransformSize) * (u_subtransformSize * 0.5) + mod(index, u_subtransformSize * 0.5);
//     float oddIndex = evenIndex + u_transformSize * 0.5;

//     vec4 x0 = texture2D(u_input, vec2(evenIndex / u_transformSize, vUV.y)).rgba;
//     vec4 x1 = texture2D(u_input, vec2(oddIndex / u_transformSize, vUV.y)).rgba;

//     float twiddleArgument = -2.0 * PI * (index / u_subtransformSize);
//     vec2 twiddle = vec2(cos(twiddleArgument), sin(twiddleArgument));
    
//     vec2 outputA = x0.xy + multiplyComplex(twiddle, x1.xy);
//     vec2 outputB = x0.zw + multiplyComplex(twiddle, x1.zw);

//     gl_FragColor = vec4(outputA, outputB);
    
//     // float index = floor(vUV.x * u_transformSize - 0.5);

//     // float base = floor(index / u_subtransformSize) * (u_subtransformSize * 0.5);
//     // float offset = mod(index, u_subtransformSize * 0.5);

//     // float ix0 = (base + offset) / u_transformSize;
//     // float ix1 = ix0 + 0.5;

//     // vec4 x0 = texture2D(u_input, vec2(ix0, vUV.y));
//     // vec4 x1 = texture2D(u_input, vec2(ix1, vUV.y));

//     // float twiddleArgument = -2.0 * PI * (index / u_subtransformSize);
//     // vec2 t = vec2(cos(twiddleArgument), sin(twiddleArgument));

//     // gl_FragColor = x0 + vec4(t.x*x1.x - t.y*x1.y,
//     //                          t.y*x1.x + t.x*x1.y,
//     //                          t.x*x1.z - t.y*x1.w,
//     //                          t.y*x1.z + t.x*x1.w);
// }

// #else

// void main(void)
// {
//     // float index = floor(vUV.y * u_transformSize - 0.5);

//     // float base = floor(index / u_subtransformSize) * (u_subtransformSize * 0.5);
//     // float offset = mod(index, u_subtransformSize * 0.5);

//     // float iy0 = (base + offset) / u_transformSize;
//     // float iy1 = iy0 + 0.5;

//     // vec4 x0 = texture2D(u_input, vec2(vUV.x, iy0));
//     // vec4 x1 = texture2D(u_input, vec2(vUV.x, iy1));

//     // float twiddleArgument = -2.0 * PI * (index / u_subtransformSize);
//     // vec2 t = vec2(cos(twiddleArgument), sin(twiddleArgument));

//     // gl_FragColor = x0 + vec4(t.x*x1.x - t.y*x1.y,
//     //                          t.y*x1.x + t.x*x1.y,
//     //                          t.x*x1.z - t.y*x1.w,
//     //                          t.y*x1.z + t.x*x1.w);
    
//     float index = vUV.y * u_transformSize;

//     float evenIndex = floor(index / u_subtransformSize) * (u_subtransformSize * 0.5) + mod(index, u_subtransformSize * 0.5);
//     float oddIndex = evenIndex + u_transformSize * 0.5;

//     vec4 x0 = texture2D(u_input, vec2(vUV.x, evenIndex / u_transformSize)).rgba;
//     vec4 x1 = texture2D(u_input, vec2(vUV.x, oddIndex / u_transformSize)).rgba;

//     float twiddleArgument = -2.0 * PI * (index / u_subtransformSize);
//     vec2 twiddle = vec2(cos(twiddleArgument), sin(twiddleArgument));
    
//     vec2 outputA = x0.xy + multiplyComplex(twiddle, x1.xy);
//     vec2 outputB = x0.zw + multiplyComplex(twiddle, x1.zw);

//     gl_FragColor = vec4(outputA, outputB);
//     // gl_FragColor = vec4(evenIndex, evenIndex / u_transformSize, oddIndex, oddIndex / u_transformSize);
// }

// #endif
