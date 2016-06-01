import vs_fft from './shaders/fft.3.vs!text';
import fs_fft from './shaders/fft.3.fs!text';
import fs_swap from './shaders/swap.fs!text';
import fs_gaussian_blur from './shaders/gaussian_blur.fs!text';
import fs_f_power_minus_beta from './shaders/f_power_minus_beta.fs!text';

import _ from 'underscore';
import { FFT, FrequencyFilter } from 'fft.js';

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} shaderSource
 * @param {number} shaderType
 * @return {WebGLShader}
 */
function compileShader(gl, shaderSource, shaderType) 
{
    var shader = gl.createShader(shaderType);
    
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success)
    {
        throw "WebGL Shader Compilation Error: " + gl.getShaderInfoLog(shader);
    }
    else
    {
        var log = gl.getShaderInfoLog(shader);
        if (log.length > 0)
        {
            console.log("WebGL Shader Compilation Warning: " + log);    
        }
    }
    
    return shader;
}
 
/**
 * @param {WebGLRenderingContext} gl
 * @param {WebGLShader} vertexShader
 * @param {WebGLShader} fragmentShader
 * @return {WebGLProgram}
 */
function createProgram(gl, vertexShader, fragmentShader)
{
    var program = gl.createProgram();
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    
    gl.linkProgram(program);
    
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success)
    {
        throw "WebGL Program Linking Error: " + gl.getProgramInfoLog(program);
    }
    else
    {
        var log = gl.getProgramInfoLog(program);
        if (log.length > 0)
        {
            console.log("WebGL Program Linking Warning: " + log);    
        }
    }
    
    return program;
}


class fft
{
    
}

/*
class cpu_fft extends fft
{
    
}

class webgl_fft extends fft
{
    
}
*/

class gpu_matrix 
{
    /**
     * @param gl {WebGL2RenderingContext}
     * @param size {{width: number, height: number}}
     * @param channels {number}
     */
    constructor(gl)
    {
        this.gl = gl;
        this.framebuffer = gl.createFramebuffer();
    }
    
    _get_gl_format()
    {
        switch (this.channels)
        {
            case 1: return this.gl.RED;
            case 2: return this.gl.RG;
            case 3: return this.gl.RGB;
            case 4: return this.gl.RGBA;
        }
    }
    
    _get_gl_internal_format()
    {
        switch (this.channels)
        {
            case 1: return this.gl.R32F;
            case 2: return this.gl.RG32F;
            case 3: return this.gl.RGB32F;
            case 4: return this.gl.RGBA32F;
        }
    }
    
    allocate(size, channels, options = {})
    {
        /** @type {WebGL2RenderingContext} */ 
        var gl = this.gl;
        
        if (!_.has(this, "texture")) 
        {
            this.size = { width: size.width, height: size.height };
            this.channels = channels;
            this.createTexture();
            this.setTextureParameters(options);
            
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);      
        }
        else
        {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            
            if (this.size.width != size.width || this.size.height != size.height || this.channels != channels)
            {
                // Data type has changed. Re-initialization needed
                this.size = size;
                this.channels = channels;
                gl.texImage2D(gl.TEXTURE_2D, 0, this._get_gl_internal_format(), this.size.width, this.size.height, 0, this._get_gl_format(), gl.FLOAT, null);
            }
            
            gl.bindTexture(gl.TEXTURE_2D, null);
            
            this.setTextureParameters(options);
        }
    }
    
    /**
     * @param matrix {{width: number, height: number, channels: number, data: Float32Array}}
     */
    upload(matrix, options = {})
    {        
        /** @type {WebGL2RenderingContext} */ 
        var gl = this.gl;
            
        if (!_.has(this, "texture")) 
        {
            this.size = { width: matrix.width, height: matrix.height };
            this.channels = matrix.channels;
            this.createTexture(matrix.data);   
            this.setTextureParameters(options);
            
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);    
        }
        else
        {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            
            if (this.size.width != matrix.width || this.size.height != matrix.height || this.channels != matrix.channels)
            {
                // Data type has changed. Re-initialization needed
                this.size = { width: width, height: height };
                this.channels = matrix.channels;
                gl.texImage2D(gl.TEXTURE_2D, 0, this._get_gl_internal_format(), this.size.width, this.size.height, 0, this._get_gl_format(), gl.FLOAT, matrix.data);
            }
            else 
            {
                // Data type is the same. Just re-upload data
                gl.bindTexture(gl.TEXTURE_2D, this.texture);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, this._get_gl_internal_format(), this.size.width, this.size.height, 0, this._get_gl_format(), gl.FLOAT, matrix.data);
            }
            
            gl.bindTexture(gl.TEXTURE_2D, null);
            
            this.setTextureParameters(options);
        }
    }
    
    /**
     * @param size {{width: number, height: number}}
     */
    createTexture(data = null)
    {
        /** @type {WebGL2RenderingContext} */ 
        var gl = this.gl;
        
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, this._get_gl_internal_format(), this.size.width, this.size.height, 0, this._get_gl_format(), gl.FLOAT, data);        
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    
    setTextureParameters(options)
    {
        /** @type {WebGL2RenderingContext} */ 
        var gl = this.gl;
        
        if (!_.has(this, "options"))
            this.options = { filter: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE };
            
        this.options = _.extend(this.options, options);
        
        this.options.minFilter = this.options.minFilter !== undefined ? this.options.minFilter : this.options.filter;
        this.options.magFilter = this.options.magFilter !== undefined ? this.options.magFilter : this.options.filter;
        this.options.wrapS = this.options.wrapS !== undefined ? this.options.wrapS : this.options.wrap;
        this.options.wrapT = this.options.wrapT !== undefined ? this.options.wrapT : this.options.wrap;
        
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.options.minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.options.magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.options.wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.options.wrapT);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    
    download()
    {
        /** @type {WebGL2RenderingContext} */
        var gl = this.gl;
        
        var pixels = new Float32Array(this.size.width * this.size.height * this.channels);
    
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.framebuffer);
        gl.readPixels(0, 0, this.size.width, this.size.height, this._get_gl_format(), gl.FLOAT, pixels);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        
        return {
            width: this.size.width,
            height: this.size.height,
            channels: this.channels,
            data: pixels
        };
    }
}

class webgl2_fft extends fft
{
    /**
     * @param definition {string}
     * @param shaderSource {string}
     * @return {string}
     */
    _shader_inject_definition(definition, shaderSource)
    {
        const placeholder = '/* inject:defines */';
        return shaderSource.replace(placeholder, `#define ${definition}`);
    }
       
    constructor() 
    {
        super();
        
        var canvas = document.createElement('canvas');
        var gl = canvas.getContext("webgl2");
        
        this.canvas = canvas;
        this.gl = gl;
        
        // console.log(gl);
        
        gl.getExtension('EXT_color_buffer_float');
        
        var vertexShader = compileShader(gl, vs_fft, gl.VERTEX_SHADER);
        var horizontalFragmentShader = compileShader(gl, this._shader_inject_definition('HORIZONTAL', fs_fft), gl.FRAGMENT_SHADER);
        var verticalFragmentShader = compileShader(gl, fs_fft, gl.FRAGMENT_SHADER);
        var swapFragmentShader = compileShader(gl, fs_swap, gl.FRAGMENT_SHADER);
        var gaussianBlurFragmentShader = compileShader(gl, fs_gaussian_blur, gl.FRAGMENT_SHADER);
        var fPowerMinusBetaFragmentShader = compileShader(gl, fs_f_power_minus_beta, gl.FRAGMENT_SHADER);
        
        var horizontalShaderProgram = createProgram(gl, vertexShader, horizontalFragmentShader);
        var verticalShaderProgram = createProgram(gl, vertexShader, verticalFragmentShader);
        var swapShaderProgram = createProgram(gl, vertexShader, swapFragmentShader);
        var gaussianBlurShaderProgram = createProgram(gl, vertexShader, gaussianBlurFragmentShader);
        var fPowerMinusBetaShaderProgram = createProgram(gl, vertexShader, fPowerMinusBetaFragmentShader);
                
        this.loadUniformsLocation(horizontalShaderProgram, 'u_transformSize', 'u_subtransformSize', 'u_input', 'u_forward')
        this.loadUniformsLocation(verticalShaderProgram, 'u_transformSize', 'u_subtransformSize', 'u_input', 'u_forward')
        this.loadUniformsLocation(swapShaderProgram, 'u_input', 'u_transformSize');
        this.loadUniformsLocation(gaussianBlurShaderProgram, 'u_input', 'u_transformSize', 'u_stdDev');
        this.loadUniformsLocation(fPowerMinusBetaShaderProgram, 'u_input', 'u_transformSize', 'u_power');
        
        gl.deleteShader(vertexShader);
        gl.deleteShader(horizontalFragmentShader);
        gl.deleteShader(verticalFragmentShader);
        gl.deleteShader(swapFragmentShader);
        gl.deleteShader(gaussianBlurFragmentShader);
        gl.deleteShader(fPowerMinusBetaFragmentShader);
        
        var positionAttributeLocation = 0;
        
        var vertices = new Float32Array([
           -1,  1,
            1,  1,
           -1, -1,
            1, -1 
        ]);
        
        var indices = new Uint16Array([ 0, 2, 1, 2, 3, 1 ]);
        
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        var vertexArray = gl.createVertexArray();
        gl.bindVertexArray(vertexArray);    
        
        var vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        var indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        
        gl.bindVertexArray(null);
        
        this.horizontalShaderProgram = horizontalShaderProgram;
        this.verticalShaderProgram = verticalShaderProgram;
        this.swapShaderProgram = swapShaderProgram;
        this.gaussianBlurShaderProgram = gaussianBlurShaderProgram;
        this.fPowerMinusBetaShaderProgram = fPowerMinusBetaShaderProgram;
        this.vertexArray = vertexArray;
        this.vertexBuffer = vertexBuffer;
        this.indexBuffer = indexBuffer;
    }
    
    /**
     * @param   program {WebGLProgram}
     * @param   ...uniformNames {string}
     */
    loadUniformsLocation(program, ...uniformNames)
    {
        if (program.uniformsLocation === undefined)
        {
            program.uniformsLocation = {};
        }
        
        for (name of uniformNames)
        {
             var loc = this.gl.getUniformLocation(program, name);
             if (loc == null)
             {
                 throw `WebGL Error: Couldn't find uniform with name ${name}.`;
             }
             
             program.uniformsLocation[name] = loc;
        }
    }
    
    /**
     * @param   matrix  {{ width: number, height: number, channels: number, data: (Float32Array | Array<number>) }}
     * @param   forward {Boolean}
     */
    compute(matrix, forward = true)
    {
        /** @type {WebGL2RenderingContext} */ 
        var gl; gl = this.gl;
        
        var size = { width: matrix.width, height: matrix.height };
        
        gl.viewport(0, 0, size.width, size.height);
        
        var start = performance.now();
        
        let pingPongOptions = { filter: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE };
        let inputTextureOptions = { filter: gl.NEAREST, wrap: gl.REPEAT };
        
        var pingTransform = new gpu_matrix(gl); 
        var pongTransform = new gpu_matrix(gl);       
        var displacementMap = new gpu_matrix(gl);  
        
        displacementMap.upload(matrix, inputTextureOptions);
        pingTransform.allocate(size, 2, pingPongOptions);
        pongTransform.allocate(size, 2, pingPongOptions);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, displacementMap.texture);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, pingTransform.texture);
        
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, pongTransform.texture);
        
        console.log(`GPU setup took ${performance.now() - start} ms`);
        
        start = performance.now();
        
        var horizontal_iterations = Math.log2(size.width);
        var vertical_iterations = Math.log2(size.height);
        var iterations = horizontal_iterations + vertical_iterations;
        
        gl.bindVertexArray(this.vertexArray);
        
        var subtransformProgram = this.horizontalShaderProgram;
        gl.useProgram(subtransformProgram);
        
        /** @type {WebGLFramebuffer} */ var frameBuffer;
        /** @type {WebGLTexture} */ var inputTextureNumber;
        
        gl.uniform1f(subtransformProgram.uniformsLocation.u_transformSize, size.width);
        gl.uniform1i(subtransformProgram.uniformsLocation.u_forward, forward);
        
        var subtransformSize = 1;
        var swap = true && forward;
        for (var i = 0; i < iterations; ++i) 
        {
            if (i === 0) 
            {
                inputTextureNumber = 0;
                frameBuffer = pingTransform.framebuffer;
            }
            else if (!swap && i === iterations - 1)
            {
                inputTextureNumber = ((iterations % 2 === 0) ? 1 : 2);
                frameBuffer = displacementMap.framebuffer;      
            }
            else if (i % 2 === 1)
            {
                inputTextureNumber = 1;
                frameBuffer = pongTransform.framebuffer;
            }
            else
            {
                inputTextureNumber = 2;
                frameBuffer = pingTransform.framebuffer;
            }
            
            if (i === horizontal_iterations)
            {
                subtransformProgram = this.verticalShaderProgram;
                gl.useProgram(subtransformProgram);
                
                gl.uniform1f(subtransformProgram.uniformsLocation.u_transformSize, size.height);
                gl.uniform1i(subtransformProgram.uniformsLocation.u_forward, forward);
                subtransformSize = 1;
            }
            
            subtransformSize *= 2;

            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, frameBuffer);
            
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            gl.uniform1i(subtransformProgram.uniformsLocation.u_input, inputTextureNumber);
            gl.uniform1f(subtransformProgram.uniformsLocation.u_subtransformSize, subtransformSize);
            
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        }

        console.log(`GPU compute took ${performance.now() - start} ms`);
        
        if (swap)
        {
            start = performance.now();
            
            inputTextureNumber = ((iterations % 2 === 0) ? 2 : 1);
            frameBuffer = displacementMap.framebuffer;

            gl.useProgram(this.swapShaderProgram);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, frameBuffer);
            gl.uniform1i(this.swapShaderProgram.uniformsLocation.u_input, inputTextureNumber);
            gl.uniform2f(this.swapShaderProgram.uniformsLocation.u_transformSize, size.width, size.height);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
            gl.bindVertexArray(null);
            
            console.log(`GPU swap took ${performance.now() - start} ms`);
        }
        
        start = performance.now();
        
        var result = displacementMap.download();
        
        if (!forward)
        {
            var result_size = result.width * result.height * result.channels;
            
            var newData = new Float32Array(result.width * result.height);
            for (var i = 0, j = 0; i < result_size; i += result.channels, ++j)
            {
                newData[j] = Math.sqrt(result.data[i] * result.data[i] + result.data[i+1] * result.data[i+1]);
            }
            
            result.data = newData;
            result.channels = 1;
        }
        
        console.log(`GPU download took ${performance.now() - start} ms`);
        
        return result;
    }
    
    /**
     * @param   matrix  {{ width: number, height: number, channels: number, data: (Float32Array | Array<number>) }}
     * @param   stdDev  {number}
     */
    blur(matrix, stdDev = 10.0)
    {
        /** @type {WebGL2RenderingContext} */ 
        var gl; gl = this.gl;
        
        var size = { width: matrix.width, height: matrix.height };
        
        gl.viewport(0, 0, size.width, size.height);
        
        var start = performance.now();
        
        let pingPongOptions = { filter: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE };
        let inputTextureOptions = { filter: gl.NEAREST, wrap: gl.REPEAT };
        
        var original = new gpu_matrix(gl);      
        var blurred = new gpu_matrix(gl);  
        
        original.upload(matrix, inputTextureOptions);
        blurred.allocate(size, 2, pingPongOptions);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, original.texture);
        
        console.log(`GPU setup took ${performance.now() - start} ms`);
        
        start = performance.now();
        
        gl.bindVertexArray(this.vertexArray);
        
        gl.useProgram(this.gaussianBlurShaderProgram);
        
        gl.uniform2f(this.gaussianBlurShaderProgram.uniformsLocation.u_transformSize, size.width, size.height);
        gl.uniform1i(this.gaussianBlurShaderProgram.uniformsLocation.u_input, 0);
        gl.uniform1f(this.gaussianBlurShaderProgram.uniformsLocation.u_stdDev, stdDev);

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, blurred.framebuffer);
        
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

        console.log(`GPU compute took ${performance.now() - start} ms`);
        
        start = performance.now();
        
        var result = blurred.download();
        
        console.log(`GPU download took ${performance.now() - start} ms`);
        
        return result;
    }
    
    fPowerMinusBeta(matrix, power = 1.8)
    {
        /** @type {WebGL2RenderingContext} */ 
        var gl; gl = this.gl;
        
        var size = { width: matrix.width, height: matrix.height };
        
        gl.viewport(0, 0, size.width, size.height);
        
        var start = performance.now();
        
        let pingPongOptions = { filter: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE };
        let inputTextureOptions = { filter: gl.NEAREST, wrap: gl.REPEAT };
        
        var original = new gpu_matrix(gl);      
        var filtered = new gpu_matrix(gl);  
        
        original.upload(matrix, inputTextureOptions);
        filtered.allocate(size, 2, pingPongOptions);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, original.texture);
        
        console.log(`GPU setup took ${performance.now() - start} ms`);
        
        start = performance.now();
        
        gl.bindVertexArray(this.vertexArray);
        
        gl.useProgram(this.fPowerMinusBetaShaderProgram);
        
        gl.uniform2f(this.fPowerMinusBetaShaderProgram.uniformsLocation.u_transformSize, size.width, size.height);
        gl.uniform1i(this.fPowerMinusBetaShaderProgram.uniformsLocation.u_input, 0);
        gl.uniform1f(this.fPowerMinusBetaShaderProgram.uniformsLocation.u_power, power);

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, filtered.framebuffer);
        
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

        console.log(`GPU compute took ${performance.now() - start} ms`);
        
        start = performance.now();
        
        var result = filtered.download();
        
        console.log(`GPU download took ${performance.now() - start} ms`);
        
        return result;
    }
}

function grayscale(image) {    
    var canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    var ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, image.width, image.height);
    
    var image_data = ctx.getImageData(0, 0, image.width, image.height);
    var data_buffer = image_data.data;
    
    var width = image.width;
    var size = image.width * image.height;
    
    var data = new Float32Array(size * 2);
    
    for (var i = 0, j = 0; i < data_buffer.length; i += 4, j += 2) {
        data[j] = (data_buffer[i] + data_buffer[i+1] + data_buffer[i+2]) / 3;
        data[j+1] = 0.0;
    }
    
    return {
        data: data,
        width: image.width,
        height: image.height,
        channels: 2
    };
}

function appendImageToBody(image) {
    var img = document.createElement('img');
    img.src = image;
    document.body.appendChild(img);
}

function create_canvas_from_matrix(matrix, channelToDraw = undefined) {
    return create_canvas_from_matrix_(matrix.data, matrix.width, matrix.height, matrix.channels, channelToDraw);
}

function create_canvas_from_matrix_(src, width, height, channels, channelToDraw = undefined) {
    var max = new Array(channels);
    var min = new Array(channels);

    for (var c = 0; c < channels; ++c)
    {
        max[c] = src[c];
        min[c] = src[c];
    }

    var size = width * height * channels;
    for (var i = 0; i < size; i += channels) 
    {
        for (var c = 0; c < channels; ++c)
        {
            max[c] = Math.max(max[c], src[i + c]);
            min[c] = Math.min(min[c], src[i + c]);
        }
    }
    
    var canvas = document.createElement('canvas');

    if (channelToDraw !== undefined && channelToDraw < 0 || channelToDraw > channels)
    {
        throw "Invalid channel specified.";
    }

    canvas.width = width;
    canvas.height = height;

    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    var context = canvas.getContext('2d');
    var imageData = context.getImageData(0, 0, width, height);
    var data = imageData.data;
    var src_buffer = src;
    var incr = channels;
    var num_channels_to_draw = channelToDraw === undefined ? channels : 1;
    var offset = channelToDraw === undefined ? 0 : channelToDraw - 1;

    for (var i = 0, j = 0; i < data.length; i += 4, j += incr) {
        data[i] = (src_buffer[j + offset] - min[offset]) / (max[offset] - min[offset]) * 255;
        
        if (num_channels_to_draw == 3) {
        data[i + 1] = (src_buffer[j + 1] - min[1]) / (max[1] - min[1]) * 255;
        data[i + 2] = (src_buffer[j + 2] - min[2]) / (max[2] - min[2]) * 255;
        } else {
        data[i + 1] = data[i];
        data[i + 2] = data[i];
        }
        
        data[i + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);

    return canvas.toDataURL();
}

function normalize(matrix) {
    var max = new Array(matrix.channels);
    var min = new Array(matrix.channels);
    
    for (var c = 0; c < matrix.channels; ++c)
    {
        max[c] = matrix.data[c];
        min[c] = matrix.data[c];
    }
    
    var size = matrix.width * matrix.height * matrix.channels;
    for (var i = 0; i < size; i += matrix.channels) 
    {
        for (var c = 0; c < matrix.channels; ++c)
        {
            max[c] = Math.max(max[c], matrix.data[i + c]);
            min[c] = Math.min(min[c], matrix.data[i + c]);
        }
    }
    
    for (var i = 0; i < size; i += matrix.channels) 
    {
        for (var c = 0; c < matrix.channels; ++c)
        {
            matrix.data[i + c] = (matrix.data[i + c] - min[c]) / (max[c] - min[c]) * 255;
        }
    }
}

function js_fft(matrix) {
    var start = performance.now();
    
    var size = matrix.width * matrix.height;
    
    var re = [];
    var im = [];
    
    for (var i = 0; i < size; ++i)
    {
        re[i] = matrix.data[2 * i];
        im[i] = matrix.data[2 * i + 1];
    }
    
    console.log(`CPU initial format conversion took ${performance.now() - start}`);
    
    start = performance.now();
    FFT.init(matrix.width);
    console.log(`CPU init took ${performance.now() - start}`);
    
    start = performance.now();
    FFT.fft2d(re, im);
    console.log(`CPU compute took ${performance.now() - start}`);
    
    start = performance.now();
    var result = new Array(2 * size);
    
    for (var i = 0; i < size; ++i) 
    {
        result[2 * i] = re[i];
        result[2 * i + 1] = im[i];
    }
    console.log(`CPU final format conversion took ${performance.now() - start}`);
    
    return {
        data: result,
        width: matrix.width,
        height: matrix.height,
        channels: 2
    };
}

/**
 * @param matrix {{ width: number, height: number, channels: number, data: Float32Array }}
 */
function swap(matrix) {
    let len = matrix.width / 2;
    for(var y=0; y<len; y++) {
        let yn = y + len;
        for(var x=0; x<len; x++) {
            
            let xn = x + len;
            var i = 2 * (x  + y  * matrix.width);
            var j = 2 * (xn + yn * matrix.width);
            var k = 2 * (x  + yn * matrix.width);
            var l = 2 * (xn + y  * matrix.width);
            
            var tmp = matrix.data[i];
            matrix.data[i] = matrix.data[j];
            matrix.data[j] = tmp;
            
            tmp = matrix.data[k];
            matrix.data[k] = matrix.data[l];
            matrix.data[l] = tmp;
            
            i += 1;
            j += 1;
            k += 1;
            l += 1;
            
            tmp = matrix.data[i];
            matrix.data[i] = matrix.data[j];
            matrix.data[j] = tmp;
            
            tmp = matrix.data[k];
            matrix.data[k] = matrix.data[l];
            matrix.data[l] = tmp;
        }
    }
}

/**/
// var image = new Image();
// image.src = "images/lena.png";
// // image.src = "images/1024x1024.jpg";
// // image.src = "images/2048x2048.jpg";
// // image.src = "images/4096x4096.jpg";
// // image.src = "images/8192x8192.jpg";

// image.onload = () => {
//     var matrix = grayscale(image);
    
//     var start = performance.now();
//     var fft_calculator = new webgl2_fft();
//     var gpu_init_time = performance.now() - start;
    
//     console.log(`Gpu init took ${gpu_init_time} ms`);
    
//     start = performance.now();
//     var fft_1 = fft_calculator.compute(matrix);
//     var gpu_time = performance.now() - start;
    
//     console.log(`Gpu took ${gpu_time} ms`);
    
//     appendImageToBody(create_canvas_from_matrix(fft_1, 1));
//     appendImageToBody(create_canvas_from_matrix(fft_1, 2));
    
//     var blurred_fourier = fft_calculator.blur(fft_1, 0.1);
    
//     var ifft_1 = fft_calculator.compute(blurred_fourier, false);
//     appendImageToBody(create_canvas_from_matrix(ifft_1));
    
//     // start = performance.now();
//     // var fft_2 = js_fft(matrix);
//     // var cpu_time = performance.now() - start;
    
//     // console.log(`Cpu took ${cpu_time} ms`);
    
//     // start = performance.now();
//     // swap(fft_2);
//     // var swap_time = performance.now() - start;
    
//     // appendImageToBody(create_canvas_from_matrix(fft_2, 1));
//     // appendImageToBody(create_canvas_from_matrix(fft_2, 2));
    
//     // console.log(`CPU swap ${swap_time} ms`);
// };
/*/

var line = {
    data: new Float32Array([
    100, 0, 
    200, 0,
    150, 0, 
    90,  0,
    100,  0,
    200, 0, 
    150, 0, 
    80, 0
    ]),
    width: 8,
    height: 1,
    channels: 1
};


console.log(line.data);

var fft_calculator = new webgl2_fft();

var line_fft = fft_calculator.compute(line);

console.log(line_fft.data);
*/

var first_start = performance.now();

var size = { width: 2048, height: 2048 };

var matrix = {
    width: size.width,
    height: size.height,
    channels: 2,
    data: new Float32Array(size.width * size.height * 2)
};

for (var i = 0; i < matrix.data.length; i += 2)
{
    matrix.data[i] = Math.random();
    matrix.data[i+1] = 0.0;
}

console.log(`Random took ${performance.now() - first_start}`);

var start = performance.now();
var fft_calculator = new webgl2_fft();
var gpu_init_time = performance.now() - start;

console.log(`Gpu init took ${gpu_init_time} ms`);

start = performance.now();
var fft_1 = fft_calculator.compute(matrix);

console.log(`FFT took ${performance.now() - start} ms`);

var filtered_fourier = fft_calculator.fPowerMinusBeta(fft_1, 1.8);
var blurred_filtered_fourier = fft_calculator.blur(filtered_fourier, 0.1);

var ifft_1 = fft_calculator.compute(filtered_fourier, false);
var ifft_2 = fft_calculator.compute(blurred_filtered_fourier, false);
console.log(`Done in ${performance.now() - first_start}`);

start = performance.now();

appendImageToBody(create_canvas_from_matrix(fft_1, 1));
appendImageToBody(create_canvas_from_matrix(fft_1, 2));
appendImageToBody(create_canvas_from_matrix(ifft_1));
appendImageToBody(create_canvas_from_matrix(ifft_2));

console.log(`Present in ${performance.now() - start}`);

