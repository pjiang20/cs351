//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda
// became:
//
// ColoredMultiObject.js  MODIFIED for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
//    --converted from 2D to 4D (x,y,z,w) vertices
//    --demonstrate how to keep & use MULTIPLE colored shapes in just one
//			Vertex Buffer Object(VBO). 
//    --demonstrate 'nodes' vs. 'vertices'; geometric corner locations where
//			OpenGL/WebGL requires multiple co-located vertices to implement the
//			meeting point of multiple diverse faces.
//    --Simplify fcn calls: make easy-access global vars for gl,g_vertsMax, etc.
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
 `uniform mat4 u_ModelMatrix;
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  varying vec4 v_Color;
  void main() {
    gl_Position = u_ModelMatrix * a_Position;
    gl_PointSize = 10.0;
    v_Color = a_Color;
  }`

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
 `precision mediump float;

  varying vec4 v_Color;
  void main() {
    gl_FragColor = v_Color;
  }`
  
// Global Variables
// =========================
// Use globals to avoid needlessly complex & tiresome function argument lists,
// and for user-adjustable controls.
// For example, the WebGL rendering context 'gl' gets used in almost every fcn;
// requiring 'gl' as an argument won't give us any added 'encapsulation'; make
// it global.  Later, if the # of global vars grows too large, we can put them 
// into one (or just a few) sensible global objects for better modularity.
//------------For WebGL state-------------------------------------------
var g_canvas = document.getElementById('HTML5_canvas');     
                  // our HTML-5 canvas object that uses 'gl' for drawing.
var gl;                 	// WebGL's rendering context; value set in main()

// ----------For animated shapes----------------------------------------
var g_vertsMax = 0;                 // number of vertices held in the VBO 
                                    // (global: replaces local 'n' variable)
var g_ModelMatrix = new Matrix4();  // Construct 4x4 matrix using the 
																		// 'cuon-matrix-quat03.js' library supplied
																		// by our textbook (chapter 3).  This JS
																		// var's contents is sent to the GPU/Shaders 
																		// to set 'uniform' var. u_ModelMatrix
var g_ModelLoc;             				// that uniform's location in the GPU

var g_lastMS = Date.now();			// Timestamp (in milliseconds) for our 
                                // most-recently-drawn WebGL screen contents.  
                                // Set & used by timerAll() fcn to update all
                                // time-varying params for our webGL drawings.
  // All of our time-dependent params (you can add more!)
var g_angleRate    = 45.0;			// angle-change rate (degrees/second)
var g_currentAngle =  0.0;			// animated angle (degrees)

function main() {
//==============================================================================
/*REPLACED THIS: 
// Retrieve <canvas> element:
 var gCanvas = document.getElementById('HTML5_canvas'); 
//with global variable 'g_canvas' declared & set above.
*/
  
 	// Then get the WebGL 'rendering context' from within the canvas:
 	// Success? if so, all WebGL functions are now members of the 'gl' object.
 	// For example, gl.clearColor() calls the WebGL function 'clearColor()'.
  gl = getWebGLContext(g_canvas);
  if (!gl) {
    console.log('Failed to get the WebGL rendering context from g_canvas');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Create a Vertex Buffer Object (VBO) in the GPU, and then fill it with
  // g_vertsMax vertices.  (builds a float32array in JS, copies contents to GPU)
  initVertexBuffer();
  if (g_vertsMax <= 0) {
    console.log('Failed to set the vertex information');
    return;
  }

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one...

  //----------------SOLVE THE 'REVERSED DEPTH' PROBLEM:------------------------
  // IF the GPU doesn't transform our vertices by a 3D Camera Projection Matrix
  // (and it doesn't -- not until Project B) then the GPU will compute reversed 
  // depth values:  depth==0 for vertex z == -1;   (but depth = 0 means 'near') 
  //		    depth==1 for vertex z == +1.   (and depth = 1 means 'far').
  //				(Why? historical reasons--backwards compatibility)
  // To correct the 'REVERSED DEPTH' problem, we could:
  //  a) reverse the sign of z before we render it (e.g. scale(1,1,-1); ugh.)
  //  b) reverse the usage of the depth-buffer's stored values: YES! DO THIS!:
  gl.enable(gl.DEPTH_TEST); // enabled by default, but let's be SURE.
  gl.clearDepth(0.0);       // each time we 'clear' our depth buffer, set all
                            // pixel depths to 0.0  (1.0 is DEFAULT)
  gl.depthFunc(gl.GREATER); // draw a pixel only if its depth value is GREATER
                            // than the depth buffer's stored value.
                            // (gl.LESS is DEFAULT; reverse it!)  
	

  // Get handle to graphics system's storage location of u_ModelMatrix
  g_ModelLoc = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!g_ModelLoc) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
  // Initialize the JavaScript matrix (careful! it's not in the GPU yet!)
  g_ModelMatrix.setIdentity(); // (not req'd: constructor makes identity matrix)
  
  // Transfer g_modelMatrix values to the u_ModelMatrix variable in the GPU
   gl.uniformMatrix4fv(g_ModelLoc, false, g_ModelMatrix.elements);
   
//-----------------  DRAW STUFF! (Pick one method or the other method)
  //---------------Beginner's method: DRAW ONCE and END the program.
/* DELETE THIS!
  // (makes a static, non-responsive image)
  gl.drawArrays(gl.TRIANGLES,   // drawing primitive. (try gl.LINE_LOOP too!)
                0, 			// start at vertex 0  (the first vertex), and
                12);		// draw 12 vertices (vertex 0 thru 11).
  // says to WebGL: draw these vertices held in the currently-bound VBO.
*/
  //---------------Interactive Animation: draw repeatedly
  // Create an endlessly repeated 'tick()' function by this clever method:
  // a)  Declare the 'tick' variable whose value is this function:
  var tick = function() {
    timerAll();  // Animate! -- Update all time-dependent vars 
    drawAll();   // Draw all shapes in current poses
    console.log('g_currentAngle=',g_currentAngle);
    requestAnimationFrame(tick, g_canvas);   
    									// Request that the browser re-draw the webpage when ready
  };
  //	b) endlessly call and repeat tick() to
  tick();							// start (and continue) animation: 
                      // HOW?  Execution jumps to the inline 'tick()' function;
                      // it completes each statement inside the curly-braces {}
                      // and then goes on to the next statement.  That next
                      // statement calls 'tick()'--thus an infinite loop!

}     

function initVertexBuffer() {
//==============================================================================
	var c30 = Math.sqrt(0.75);					// == cos(30deg) == sqrt(3) / 2
	var sq2	= Math.sqrt(2.0);						 

  var colorShapes = new Float32Array([
  // Javascript array we will use to fill the VBO on the GPU.
  //Vertex coordinates(x,y,z,w) and color (R,G,B) for a color tetrahedron:
	//		Apex on +z axis; equilateral triangle base at z=0
/*	Nodes:  (a 'node' is a 3D location where we specify 1 or more vertices)
		 0.0,	 0.0, sq2, 1.0,			1.0, 	1.0,	1.0,	// Node 0 (apex, +z axis;  white)
     c30, -0.5, 0.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 1 (base: lower rt; red)
     0.0,  1.0, 0.0, 1.0,  		1.0,  0.0,  0.0,	// Node 2 (base: +y axis;  grn)
    -c30, -0.5, 0.0, 1.0, 		0.0,  1.0,  0.0, 	// Node 3 (base:lower lft; blue)

  Build tetrahedron from individual triangles (gl.TRIANGLES); each triangle
  requires us to specify 3 vertices in CCW order.  
*/
			// Face 0: (left side)
     0.0,	 0.0, sq2, 1.0,			1.0, 	1.0,	1.0,	// Node 0
     c30, -0.5, 0.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 1
     0.0,  1.0, 0.0, 1.0,  		1.0,  0.0,  0.0,	// Node 2
			// Face 1: (right side)
		 0.0,	 0.0, sq2, 1.0,			1.0, 	1.0,	1.0,	// Node 0
     0.0,  1.0, 0.0, 1.0,  		1.0,  0.0,  0.0,	// Node 2
    -c30, -0.5, 0.0, 1.0, 		0.0,  1.0,  0.0, 	// Node 3
    	// Face 2: (lower side)
		 0.0,	 0.0, sq2, 1.0,			1.0, 	1.0,	1.0,	// Node 0 
    -c30, -0.5, 0.0, 1.0, 		0.0,  1.0,  0.0, 	// Node 3
     c30, -0.5, 0.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 1 
     	// Face 3: (base side)  
    -c30, -0.5, -0.2, 1.0, 		0.0,  1.0,  0.0, 	// Node 3
     0.0,  1.0, -0.2, 1.0,  	1.0,  0.0,  0.0,	// Node 2
     c30, -0.5, -0.2, 1.0, 		0.0,  0.0,  1.0, 	// Node 1
 
/*    // Cube Nodes  ('node': a 3D location where we specify 1 or more vertices)
    -1.0, -1.0, -1.0, 1.0	// Node 0
    -1.0,  1.0, -1.0, 1.0	// Node 1
     1.0,  1.0, -1.0, 1.0	// Node 2
     1.0, -1.0, -1.0, 1.0	// Node 3
    
     1.0,  1.0,  1.0, 1.0	// Node 4
    -1.0,  1.0,  1.0, 1.0	// Node 5
    -1.0, -1.0,  1.0, 1.0	// Node 6
     1.0, -1.0,  1.0, 1.0	// Node 7
*/
		// +x face: RED
     1.0, -1.0, -1.0, 1.0,		1.0, 0.0, 0.0,	// Node 3
     1.0,  1.0, -1.0, 1.0,		1.0, 0.0, 0.0,	// Node 2
     1.0,  1.0,  1.0, 1.0,	  1.0, 0.0, 0.0,  // Node 4
     
     1.0,  1.0,  1.0, 1.0,	  1.0, 0.1, 0.1,	// Node 4
     1.0, -1.0,  1.0, 1.0,	  1.0, 0.1, 0.1,	// Node 7
     1.0, -1.0, -1.0, 1.0,	  1.0, 0.1, 0.1,	// Node 3

		// +y face: GREEN
    -1.0,  1.0, -1.0, 1.0,	  0.0, 1.0, 0.0,	// Node 1
    -1.0,  1.0,  1.0, 1.0,	  0.0, 1.0, 0.0,	// Node 5
     1.0,  1.0,  1.0, 1.0,	  0.0, 1.0, 0.0,	// Node 4

     1.0,  1.0,  1.0, 1.0,	  0.1, 1.0, 0.1,	// Node 4
     1.0,  1.0, -1.0, 1.0,	  0.1, 1.0, 0.1,	// Node 2 
    -1.0,  1.0, -1.0, 1.0,	  0.1, 1.0, 0.1,	// Node 1

		// +z face: BLUE
    -1.0,  1.0,  1.0, 1.0,	  0.0, 0.0, 1.0,	// Node 5
    -1.0, -1.0,  1.0, 1.0,	  0.0, 0.0, 1.0,	// Node 6
     1.0, -1.0,  1.0, 1.0,	  0.0, 0.0, 1.0,	// Node 7

     1.0, -1.0,  1.0, 1.0,	  0.1, 0.1, 1.0,	// Node 7
     1.0,  1.0,  1.0, 1.0,	  0.1, 0.1, 1.0,	// Node 4
    -1.0,  1.0,  1.0, 1.0,	  0.1, 0.1, 1.0,	// Node 5

		// -x face: CYAN
    -1.0, -1.0,  1.0, 1.0,	  0.0, 1.0, 1.0,	// Node 6	
    -1.0,  1.0,  1.0, 1.0,	  0.0, 1.0, 1.0,	// Node 5 
    -1.0,  1.0, -1.0, 1.0,	  0.0, 1.0, 1.0,	// Node 1
    
    -1.0,  1.0, -1.0, 1.0,	  0.1, 1.0, 1.0,	// Node 1
    -1.0, -1.0, -1.0, 1.0,	  0.1, 1.0, 1.0,	// Node 0  
    -1.0, -1.0,  1.0, 1.0,	  0.1, 1.0, 1.0,	// Node 6  
    
		// -y face: MAGENTA
     1.0, -1.0, -1.0, 1.0,	  1.0, 0.0, 1.0,	// Node 3
     1.0, -1.0,  1.0, 1.0,	  1.0, 0.0, 1.0,	// Node 7
    -1.0, -1.0,  1.0, 1.0,	  1.0, 0.0, 1.0,	// Node 6

    -1.0, -1.0,  1.0, 1.0,	  1.0, 0.1, 1.0,	// Node 6
    -1.0, -1.0, -1.0, 1.0,	  1.0, 0.1, 1.0,	// Node 0
     1.0, -1.0, -1.0, 1.0,	  1.0, 0.1, 1.0,	// Node 3

     // -z face: YELLOW
     1.0,  1.0, -1.0, 1.0,	  1.0, 1.0, 0.0,	// Node 2
     1.0, -1.0, -1.0, 1.0,	  1.0, 1.0, 0.0,	// Node 3
    -1.0, -1.0, -1.0, 1.0,	  1.0, 1.0, 0.0,	// Node 0		

    -1.0, -1.0, -1.0, 1.0,	  1.0, 1.0, 0.1,	// Node 0
    -1.0,  1.0, -1.0, 1.0,	  1.0, 1.0, 0.1,	// Node 1
     1.0,  1.0, -1.0, 1.0,	  1.0, 1.0, 0.1,	// Node 2
 
  ]);
  g_vertsMax =48; // 12 tetrahedron vertices; 36 cube verts (6 per side*6 sides)
	
  // Create a buffer object
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?
  
  // Connect a VBO Attribute to Shaders------------------------------------------
  //Get GPU's handle for our Vertex Shader's position-input variable: 
  var a_PositionLoc = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_PositionLoc < 0) {
    console.log('Failed to get attribute storage location of a_Position');
    return -1;
  }
  // Use handle to specify how Vertex Shader retrieves position data from VBO:
  gl.vertexAttribPointer(
  		a_PositionLoc, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * 7, 		// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_PositionLoc);  
  									// Enable assignment of vertex buffer object's position data
//-----------done.
// Connect a VBO Attribute to Shaders-------------------------------------------
  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_ColorLoc = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_ColorLoc < 0) {
    console.log('Failed to get the attribute storage location of a_Color');
    return -1;
  }
  // Use handle to specify how Vertex Shader retrieves color data from our VBO:
  gl.vertexAttribPointer(
  	a_ColorLoc, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w 									
  gl.enableVertexAttribArray(a_ColorLoc);  
  									// Enable assignment of vertex buffer object's position data
//-----------done.
  // UNBIND the buffer object: we have filled the VBO & connected its attributes
  // to our shader, so no more modifications needed.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return;
}

function drawAll() {
//==============================================================================
  // Clear <canvas>  colors AND the depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //-------Draw Spinning Tetrahedron
  g_ModelMatrix.setTranslate(-0.4,-0.4, 0.0); // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 

  g_ModelMatrix.scale(0.5, 0.5, 0.5);
  						// if you DON'T scale, tetra goes outside the CVV; clipped!
  g_ModelMatrix.rotate(g_currentAngle, 0, 1, 0); // Make new drawing axes that
  						// that spin around y axis (0,1,0) of the previous 
  						// drawing axes, using the same origin.

  // DRAW TETRA:  Use this matrix to transform & draw 
  //						the first set of vertices stored in our VBO:
  		// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(g_ModelLoc, false, g_ModelMatrix.elements);
  		// Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 0, 12);
 //gl.drawArrays(gl.LINE_LOOP, 0, 12);   // TRY THIS INSTEAD of gl.TRIANGLES... 
  
  // NEXT, create different drawing axes, and...
  g_ModelMatrix.setTranslate(0.4, 0.4, 0.0); // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV.
  g_ModelMatrix.scale(0.3, 0.3, 0.3);
  						// Make it smaller:
  g_ModelMatrix.rotate(g_currentAngle, 1, 1, 0);  // Spin on XY diagonal axis
	// DRAW CUBE:		Use ths matrix to transform & draw
	//						the second set of vertices stored in our VBO:
  gl.uniformMatrix4fv(g_ModelLoc, false, g_ModelMatrix.elements);
  		// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                12,                     // start at vertex 12,
                36);                    // and draw exactly 36 vertices.
}


function timerAll() {
//==============================================================================
// Update all time-dependent global variables:  g_currentAngle, etc.
// Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_lastMS;
  g_lastMS = now;

  // Update the current rotation angle (adjusted by the elapsed time)
  g_currentAngle += (g_angleRate * elapsed) / 1000.0;  
/*      //  limit the angle to move smoothly between +120 and -85 degrees:
  if(g_currentAngle >  120.0 && g_angleRate > 0) g_angleRate = -g_angleRate;
  if(g_currentAngle <  -85.0 && g_angleRate < 0) g_angleRate = -g_angleRate;
*/
  g_currentAngle %= 360;	// stay within 0 to 360 degrees	
}

//==================HTML Button Callbacks
function spinUp() {
  g_angleRate += 20.0; 
}

function spinDown() {
 g_angleRate -= 20.0; 
}

function runStop() {
  if(g_angleRate*g_angleRate > 0.1) {
    myTmp = g_angleRate;
    g_angleRate = 0;
  }
  else {
  	g_angleRate = myTmp;
  }
}
 