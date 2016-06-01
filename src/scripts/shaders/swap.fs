#version 300 es

/* inject:defines */

precision mediump int; 
precision highp float; 
precision highp sampler2D; 

uniform sampler2D u_input;
uniform vec2 u_transformSize;

out vec4 swapped;

void main() {  
    float x = gl_FragCoord.x / u_transformSize.x - 0.5;
    float y = gl_FragCoord.y / u_transformSize.y - 0.5;
    
    if (x < 0.0)
        x += 1.0;
    if (y < 0.0)
        y += 1.0;
        
    swapped = texture(u_input, vec2(x, y));
}
