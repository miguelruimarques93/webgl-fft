precision highp float;

const float PI = 4.0 * atan(1.0);

uniform sampler2D u_input;
uniform float u_transformSize;
uniform float u_subtransformSize;

varying vec2 vUV;

/*
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
    gl_FragColor = dualfft_rows( vUV.xy );
}
*/

vec2 multiplyComplex(vec2 a, vec2 b)
{
    return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

void main(void)
{
    #ifdef HORIZONTAL
        float index = vUV.x * u_transformSize - 0.5;
    #else
        float index = vUV.y * u_transformSize - 0.5;
    #endif
    
    float evenIndex = floor(index / u_subtransformSize) * (u_subtransformSize * 0.5) + mod(index, u_subtransformSize * 0.5);
    
    #ifdef HORIZONTAL
        vec4 even = texture2D(u_input, vec2(evenIndex + 0.5, vUV.y) / u_transformSize).rgba;
        vec4 odd = texture2D(u_input, vec2(evenIndex + u_transformSize * 0.5 + 0.5, vUV.y) / u_transformSize).rgba;
    #else
        vec4 even = texture2D(u_input, vec2(vUV.x, evenIndex + 0.5) / u_transformSize).rgba;
        vec4 odd = texture2D(u_input, vec2(vUV.x, evenIndex + u_transformSize * 0.5 + 0.5) / u_transformSize).rgba;
    #endif
    
    float twiddleArgument = -2.0 * PI * (index / u_subtransformSize);
    vec2 twiddle = vec2(cos(twiddleArgument), sin(twiddleArgument));
    
    vec2 outputA = even.xy + multiplyComplex(twiddle, odd.xy);
    vec2 outputB = even.zw + multiplyComplex(twiddle, odd.zw);
    
    gl_FragColor = vec4(outputA, outputB);
    
}

