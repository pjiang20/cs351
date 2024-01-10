//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// MultiPoint.js (c) 2012 matsuda
// MultiPointJT.js  MODIFIED for EECS 351-1, Northwestern Univ. Jack Tumblin
//						(converted to 2D->4D; 3 verts --> 6 verts; draw as
//						gl.POINTS and as gl.LINE_LOOP, change color, 
//						simplify with globals,
// 

// Vertex shader program; SIMD program written in GLSL; runs only on GPU.
//  Each instance computes all the on-screen values for just one VERTEX,
//  that is part of just one drawing primitive (point, line, or triangle)
//  depicted in the CVV coord. system (+/-1, +/-1, +/-1) that fills our HTML5
//  'canvas' object.
// The 'attribute'  variable(s) (e.g.	a_Position) are taken from a vertex 
// stored in the VBO.

var VSHADER_SOURCE =
  `attribute vec4 a_Position;
   void main() {
     gl_Position = a_Position;	//set on-screen position
     gl_PointSize = 10.0;				// point-size in pixels (for point primitive)
   }`
// !!Wait-Wait-Wait!!  TEXTBOOK uses single-line strings for shader programs,
//	then adds 'newline' and connects them together like this:
//	var VSHADER_SOURCE =
//	  'attribute vec4 a_Position;\n' +
//	  'void main() {\n' +
//	  '  gl_Position = a_Position;\n' +
//	  '  gl_PointSize = 10.0;\n' +
//	  '}\n';
//	BLEAUGHHH!!!   That's *VERY* TEDIOUS!  
//  Instead, use Javascript's multi-line strings -- 
//	   They begin and they end with back-tick (`) char,
//		 Where is it? just left of digit 1 on your US keyboard.

// Fragment shader program
//  Each instance computes all the on-screen attributes for just one PIXEL
var FSHADER_SOURCE =
 `void main() {
    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); // easy! every pixel has this color
  }`

function main() {
//==============================================================================
  // Get 'handle' to our HTML-5 <canvas> element where webGL will draw pictures
  var myCanvas = document.getElementById('HTML5_Canvas');

  // Get the rendering context for WebGL (== giant GPU-controlling object)
  var gl = getWebGLContext(myCanvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize GPU's vertex and fragment shaders programs
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Create an array of vertices, send it into a VBO within the GPU, and 
  // connect that VBO's contents to vertex shaders 
  // as the source of vertex 'attributes':
  var n = initVertexBuffers(gl);	
  if (n < 0) {
    console.log('Failed to load vertices into the GPU');
    return;
  }

  // Specify the color for clearing <canvas>: (Northwestern purple)
  gl.clearColor(78/255, 42/255, 132/255 , 1.0);	// R,G,B,A (A==opacity)
  // NOTE: 0.0 <= RGBA <= 1.0 
  // others to try:
  // gl.clearColor(0.0, 0.0 ,0.0, 1.0);
  // gl.clearColor(0.2, 0.2, 0.2, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw connect-the-dots for 6 vertices (never 'vertexes'!!).
  // see http://www.khronos.org/opengles/sdk/docs/man/xhtml/glDrawArrays.xml
 gl.drawArrays(gl.LINE_LOOP, 0, n); // gl.drawArrays(mode, first, count)
			//mode: sets drawing primitive to use. 
						// WebGL offers these choices: 
						// gl.POINTS
						// gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
						// gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN
			// first: index of 1st element of array.
			// count; number of elements to read from the array.

  // Oh, good! That went well. Let's draw the dots themselves!
  gl.drawArrays(gl.POINTS, 0, n); // gl.drawArrays(mode, first, count)
	// ? what happens if you comment out either of thes 'gl.drawArrays() calls?
	// ? What happens if you change one of them to draw triangles instead?
	
	// STOP. Do nothing else. 
	// (What happens if you cover/uncover the webpage? Why?)
}


function initVertexBuffers(gl) {
//==============================================================================
// first, create a JavaScript typed array with all our vertex attribute values:
  var vertices = new Float32Array([
     0.0,  0.5, 0.0, 1.0,	// CAREFUL! I made these into 4D points/ vertices: x,y,z,w.
    -0.2,  0.0, 0.0, 1.0,	// new point!  (? What happens if I make w=0 instead of 1.0?)
    -0.5, -0.5, 0.0, 1.0, // new point! (note we need a trailing commas here)  
     0.0, -0.2, 0.0, 1.0, 	
     0.5, -0.5, 0.0, 1.0,	
     0.2,  0.0, 0.0, 1.0, 
     
  ]);
  var n = 6; // The number of vertices

  // Then in the GPU, create a vertex buffer object (VBO) to hold vertex data:
  var VBOloc = gl.createBuffer();	// get it's 'handle'
  if (!VBOloc) {
    console.log('Failed to create the vertex buffer object');
    return -1;
  }

  // In the GPU, bind the vertex buffer object to 'target' -(the vertex shaders)
  gl.bindBuffer(gl.ARRAY_BUFFER, VBOloc);
  // COPY data from Javascript 'vertices' array into VBO in the GPU:
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Set up 'attributes' -- the Vertex and Shader vars that get filled from VBO:
  var a_PositionID = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_PositionID < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // Set how the GPU fills the a_Position variable with data from the GPU 
  gl.vertexAttribPointer(a_PositionID, 4, gl.FLOAT, false, 0, 0);
  // vertexAttributePointer(index, x,y,z,w size=4, type=FLOAT, 
  // NOT normalized, NO stride)

  // Enable the GPU to fill the a_Position variable from the VBO.
  gl.enableVertexAttribArray(a_PositionID);

  return n;	// tell us the number of vertices in the GPU's VBO
}
