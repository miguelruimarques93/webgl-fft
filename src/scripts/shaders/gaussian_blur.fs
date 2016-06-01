#version 300 es

/* inject:defines */

precision mediump int; 
precision highp float; 
precision highp sampler2D; 

uniform sampler2D u_input;
uniform vec2 u_transformSize;
uniform float u_stdDev;

out vec2 smoothed_frequency;

void main() 
{  
    vec2 uv = gl_FragCoord.xy / u_transformSize - 0.5;
    
    float gauss = exp(-(uv.x*uv.x + uv.y*uv.y) / (u_stdDev * u_stdDev));
    
    float x = gl_FragCoord.x / u_transformSize.x;
    float y = gl_FragCoord.y / u_transformSize.y;
        
    smoothed_frequency = texture(u_input, gl_FragCoord.xy / u_transformSize).xy * gauss;
}
