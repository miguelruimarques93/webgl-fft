attribute vec3 position;

uniform float u_transformSize;

varying vec2 vUV;

void main (void)
{
    vUV = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}