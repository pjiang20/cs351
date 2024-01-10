// HelloPoint1.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = 
 `void main() {
		gl_Position = vec4(0.0, 0.0, 0.0, 1.0);	// Set the vertex coordinates
    gl_PointSize = 10.0;              			// CAREFUL! !!float, not integer!!
  }`

// Fragment shader program
var FSHADER_SOURCE =
 `void main() {
	 gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);	// Set the point color
   }`

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  console.log('Hey! we have all our shaders initialized!');

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw a point
  gl.drawArrays(gl.POINTS, 0, 1);
}
