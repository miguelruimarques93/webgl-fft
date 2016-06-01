precision mediump int; 
precision highp float; 
precision highp sampler2D; 

const float MINUS_TWO_PI = - 8.0 * atan(1.0);

uniform sampler2D u_input;
uniform float u_transformSize;
uniform float u_subtransformSize; 

vec2 multiplyComplex(vec2 a, vec2 b)
{
    return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

vec2 butterfly(vec2 v0, vec2 v1, float angle)
{
    return v0 + multiplyComplex(vec2(cos(angle), sin(angle)), v1);
}

vec2 fft_op(vec2 p, bool use_second) 
{ 
    #ifdef HORIZONTAL
    
        float index = floor(p.x); 
    
    #else
    
        float index = floor(p.y); 
    
    #endif
    
    float base = floor(index / u_subtransformSize) * (u_subtransformSize/2.0); 
    float offset = mod(index, u_subtransformSize/2.0); 
    
    #ifdef HORIZONTAL
    
        float iy0 = p.y / u_transformSize; 
        float iy1 = iy0;
        float ix0 = (base + offset) / u_transformSize; 
        float ix1 = ix0 + 0.5; 
    
    #else
    
        float ix0  = p.x / u_transformSize;
        float ix1 = ix0; 
        float iy0 = (base + offset) / u_transformSize; 
        float iy1 = iy0 + 0.5; 
    
    #endif
    
    vec2 v0 = use_second ? texture2D(u_input, vec2(ix0, iy0) ).zw : texture2D(u_input, vec2(ix0, iy0) ).xy;   
    vec2 v1 = use_second ? texture2D(u_input, vec2(ix0, iy0) ).zw : texture2D(u_input, vec2(ix1, iy1) ).xy;
    float angle = MINUS_TWO_PI * index / u_subtransformSize; 
    
    return butterfly(v0, v1, angle);
} 

void main() {  
    gl_FragColor = vec4(fft_op( gl_FragCoord.xy, false), fft_op( vec2(gl_FragCoord.x + 1.0 / u_transformSize, gl_FragCoord.y), true) ); 
}
