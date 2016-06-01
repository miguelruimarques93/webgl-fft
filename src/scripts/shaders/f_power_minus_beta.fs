#version 300 es

/* inject:defines */

precision mediump int; 
precision highp float; 
precision highp sampler2D; 

uniform sampler2D u_input;
uniform vec2 u_transformSize;
uniform float u_power;

out vec2 smoothed_frequency;

void main() 
{  
    vec2 uv = gl_FragCoord.xy / u_transformSize - 0.5;
    
    float one_over_width = 1.0 / u_transformSize.x;

    float f = sqrt(uv.x*uv.x + uv.y*uv.y);
    f = max(f, one_over_width);
    f = 1.0 / pow(f, u_power);
        
    smoothed_frequency = texture(u_input, gl_FragCoord.xy / u_transformSize).xy * f;
}
