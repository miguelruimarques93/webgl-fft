#version 300 es

/* inject:defines */

precision mediump int; 
precision highp float; 
precision highp sampler2D; 

const float MINUS_TWO_PI = - 8.0 * atan(1.0);

uniform sampler2D u_input;
uniform float u_transformSize;
uniform float u_subtransformSize; 
uniform bool u_forward;

out vec2 fourier_result;

vec2 multiplyComplex(vec2 a, vec2 b)
{
    return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

vec2 butterfly(vec2 v0, vec2 v1, float angle)
{
    return v0 + multiplyComplex(vec2(cos(angle), sin(angle)), v1);
}

vec2 fft_op(vec2 p) 
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
    
    float angle = MINUS_TWO_PI * index / u_subtransformSize; 
    
    vec2 v0 = texture(u_input, vec2(ix0, iy0) ).xy;   
    vec2 v1 = texture(u_input, vec2(ix1, iy1) ).xy;
    
    #if 0
    
    if (!u_forward)
    {
        v0.y *= -1.0;
        v1.y *= -1.0;
    }
    
    #else
    
    if (!u_forward)
    {
        v0 = v0.yx;
        v1 = v1.yx;
    }
    
    #endif
    
    vec2 result = butterfly(v0, v1, angle);
    
    #if 0
    
    return u_forward ? result : vec2(result.x, -result.y) / u_subtransformSize;
    
    #else
    
    return u_forward ? result : result.yx / u_subtransformSize;
    
    #endif
} 

void main() {  
    fourier_result = fft_op(gl_FragCoord.xy); 
}
