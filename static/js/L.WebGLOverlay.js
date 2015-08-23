
/*
  Generic WebGL Overlay for leaflet, John Tyree
*/

if(typeof(L) !== 'undefined') {

L.WebGLOverlay = L.Class.extend({

  options: {
    initialized: false
  },

  initialize: function (options) {
    L.setOptions(this, options);
  },

  onAdd: function (map) {
    this._map = map;
    this._co = L.canvasOverlay().addTo(map);
    this._gl = this._co.canvas().getContext('experimental-webgl', { antialias: true });
    this._co.drawing(this.draw.bind(this))
            .params(this.options);
    var glLayer = this._co;
    var canvas = glLayer.canvas();

    // FIXME: What is this? Assigning to a function?
    glLayer.canvas.width = canvas.clientWidth;
    glLayer.canvas.height = canvas.clientHeight;

    var gl = this._gl;

    // -- WebGl setup
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, document.getElementById('vshader').text);
    gl.compileShader(vertexShader);

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, document.getElementById('fshader').text);
    gl.compileShader(fragmentShader);

    // link shaders to create our program
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // look up the locations for the inputs to our shaders.
    this._u_matLoc = gl.getUniformLocation(program, "u_matrix");
    this._vertLoc = gl.getAttribLocation(program, "a_vertex");

    // Set the matrix to some that makes 1 unit 1 pixel.
    this._pixelsToWebGLMatrix = new Float32Array(16);
    this._mapMatrix = new Float32Array(16);
    this._pixelsToWebGLMatrix.set([2 / canvas.width,  0                , 0, 0,
                                   0               , -2 / canvas.height, 0, 0,
                                   0               ,  0                , 0, 0,
                                  -1               ,  1                , 0, 1]);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniformMatrix4fv(this._u_matLoc, false, this._pixelsToWebGLMatrix);
    this.initialized = false;
  },

  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  onRemove: function (map) {
    this._co.onRemove(map);
    this._gl = null;
    this._map = null;
    // FIXME: unintialize gl or someting?
  },

  LatLongToPixelXY: function(latitude, longitude) {
    var pi_180 = Math.PI / 180.0;
    var pi_4 = Math.PI * 4;
    var sinLatitude = Math.sin(latitude * pi_180);
    var pixelY = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (pi_4)) * 256;
    var pixelX = ((longitude + 180) / 360) * 256;
    var pixel = {x: pixelX, y: pixelY};
    return pixel;
  },

  translateMatrix: function(matrix, tx, ty) {
    // translation is in last column of matrix
    matrix[12] += matrix[0] * tx + matrix[4] * ty;
    matrix[13] += matrix[1] * tx + matrix[5] * ty;
    matrix[14] += matrix[2] * tx + matrix[6] * ty;
    matrix[15] += matrix[3] * tx + matrix[7] * ty;
  },

  scaleMatrix: function(matrix, scaleX, scaleY) {
    // scaling x and y, which is just scaling first two columns of matrix
    matrix[0] *= scaleX;
    matrix[1] *= scaleX;
    matrix[2] *= scaleX;
    matrix[3] *= scaleX;

    matrix[4] *= scaleY;
    matrix[5] *= scaleY;
    matrix[6] *= scaleY;
    matrix[7] *= scaleY;
  },

  // Returns a random integer from 0 to range - 1.
  randomInt: function(range) {
      return Math.floor(Math.random() * range);
  },

  initializeBuffers: function(size) {
    var gl = this._gl;
    var canvas = this._co.canvas();
    this.vertArray = new Float32Array(size);
    this.vertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
    gl.enableVertexAttribArray(this._vertLoc);
    gl.vertexAttribPointer(this._vertLoc, 2, gl.FLOAT, false, 0, 0);

    this._pixelsToWebGLMatrix.set([2 / canvas.width,  0                , 0, 0,
                                   0               , -2 / canvas.height, 0, 0,
                                   0               ,  0                , 0, 0,
                                  -1               ,  1                , 0, 1]);
    gl.viewport(0, 0, canvas.width, canvas.height);
    this.initialized = true;
  },

  setLines: function(lines) {
    console.log('setlines');
    // Two points per line
    this._numPoints = lines.length * 2;
    if (!this.initialized) {
      // Two floats per point
      this.initializeBuffers(this._numPoints * 2);
    }
    // one line is [[x1, y1], [x2, y2]]
    var idx = 0;
    for (var i = 0; i < lines.length; i++) {
      var pixel = this.LatLongToPixelXY(lines[i][0][0], lines[i][0][1]);
      this.vertArray[idx++] = pixel.x;
      this.vertArray[idx++] = pixel.y;
      pixel = this.LatLongToPixelXY(lines[i][1][0], lines[i][1][1]);
      this.vertArray[idx++] = pixel.x;
      this.vertArray[idx++] = pixel.y;
    }
    var gl = this._gl;
    gl.bufferData(gl.ARRAY_BUFFER, this.vertArray, gl.STATIC_DRAW);
    this._co.redraw();
  },


  draw: function(canvasOverlay, params) {
    var gl = this._gl;
    if (gl === null) return;

    var canvas = this._co.canvas();

    gl.clear(gl.COLOR_BUFFER_BIT);

    // -- set base matrix to translate canvas pixel coordinates -> webgl coordinates
    this._mapMatrix.set(this._pixelsToWebGLMatrix);

    var bounds = this._map.getBounds();
    var topLeft = new L.LatLng(bounds.getNorth(), bounds.getWest());
    var offset = this.LatLongToPixelXY(topLeft.lat, topLeft.lng);

    // -- Scale to current zoom
    var scale = Math.pow(2, this._map.getZoom());
    this.scaleMatrix(this._mapMatrix, scale, scale);

    this.translateMatrix(this._mapMatrix, -offset.x, -offset.y);

    // -- attach matrix value to 'mapMatrix' uniform in shader
    gl.uniformMatrix4fv(this._u_matLoc, false, this._mapMatrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
    gl.drawArrays(gl.LINES, 0, this._numPoints);

  },

  nop: undefined

});

}
