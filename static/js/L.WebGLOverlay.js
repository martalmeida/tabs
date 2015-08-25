
// Based on CartoDB's canvas overlay
// https://github.com/CartoDB/Leaflet.CanvasLayer

if(typeof(L) !== 'undefined') {

L.WebGLVectorLayer = L.Class.extend({

  includes: [L.Mixin.Events, L.Mixin.TileLoader],

  options: {},

  initialize: function (options) {
    var self = this;
    options = options || {};
    //this.project = this._project.bind(this);
    this.render = this.render.bind(this);
    L.Util.setOptions(this, options);
    this._canvas = this._createCanvas();
    var canvas = this._canvas;
    this._ctx = canvas.getContext('experimental-webgl', { antialias: true });
    // backCanvas for zoom animation
    this._backCanvas = this._createCanvas();
    this.currentAnimationFrame = -1;
    this.requestAnimationFrame = window.requestAnimationFrame ||
                                 window.mozRequestAnimationFrame ||
                                 window.webkitRequestAnimationFrame ||
                                 window.msRequestAnimationFrame ||
                                 function(callback) {
                                     return window.setTimeout(callback, 1000 / 60);
                                 };
    this.cancelAnimationFrame = window.cancelAnimationFrame ||
                                window.mozCancelAnimationFrame ||
                                window.webkitCancelAnimationFrame ||
                                window.msCancelAnimationFrame ||
                                function(id) { clearTimeout(id); };


    var gl = this._ctx;

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

  _createCanvas: function() {
    var canvas;
    canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = this.options.zIndex || 0;
    var className = 'leaflet-tile-container leaflet-zoom-animated';
    canvas.setAttribute('class', className);
    return canvas;
  },

  onAdd: function (map) {
    this._map = map;

    // add container with the canvas to the tile pane
    // the container is moved in the oposite direction of the
    // map pane to keep the canvas always in (0, 0)
    var tilePane = this._map._panes.tilePane;
    var _container = L.DomUtil.create('div', 'leaflet-layer');
    _container.appendChild(this._canvas);
    _container.appendChild(this._backCanvas);
    this._backCanvas.style.display = 'none';
    tilePane.appendChild(_container);

    this._container = _container;

    // hack: listen to predrag event launched by dragging to
    // set container in position (0, 0) in screen coordinates
    if (map.dragging.enabled()) {
      map.dragging._draggable.on('predrag', function() {
        var d = map.dragging._draggable;
        L.DomUtil.setPosition(this._canvas, { x: -d._newPos.x, y: -d._newPos.y });
      }, this);
    }

    map.on({
        'viewreset': this._reset,
        'move': this.redraw,
        'resize': this._reset,
        'zoomanim': this._animateZoom,
        'zoomend': this._endZoomAnim
    }, this);

    if(this.options.tileLoader) {
      this._initTileLoader();
    }

    this._reset();
  },

  _animateZoom: function() {
    // FIXME: Do something clever with a backbuffer here to fix the zoom
  },

  _endZoomAnim: function() {
    // FIXME: hide the backbuffer again
  },

  latLongToPixelXY: function(latitude, longitude) {
    // We're using this rather than any of the built-in leaflet functions
    // because we're converting lat long to a global pixel value that has
    // nothing to do with actual map location, and then building a
    // transformation matrix to do the appropriate shifting around on the GPU.
    // TODO: could use some more investigation about efficiency here (is it
    // really worth it?)
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
    var gl = this._ctx;
    var canvas = this.getCanvas();
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
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
    // Two points per line
      this._numPoints = lines.length * 2;
    if (!this.initialized || this._numPoints * 2 > this.vertArray.length) {
      // Two floats per point
      this.initializeBuffers(this._numPoints * 2);
    }
    // one line is [[x1, y1], [x2, y2]]
    var idx = 0;
    for (var i = 0; i < lines.length; i++) {
      var pixel = this.latLongToPixelXY(lines[i][0][0], lines[i][0][1]);
      this.vertArray[idx++] = pixel.x;
      this.vertArray[idx++] = pixel.y;
      pixel = this.latLongToPixelXY(lines[i][1][0], lines[i][1][1]);
      this.vertArray[idx++] = pixel.x;
      this.vertArray[idx++] = pixel.y;
    }
    var gl = this._ctx;
    gl.bufferData(gl.ARRAY_BUFFER, this.vertArray, gl.STATIC_DRAW);
    this.redraw();
  },

  // _animateZoom: function (e) {
      // if (!this._animating) {
          // this._animating = true;
      // }
      // var back = this._backCanvas;

      // back.width = this._canvas.width;
      // back.height = this._canvas.height;

      // // paint current canvas in back canvas with trasnformation
      // var pos = this._canvas._leaflet_pos || { x: 0, y: 0 };
      // back.getContext('2d').drawImage(this._canvas, 0, 0);

      // // hide original
      // this._canvas.style.display = 'none';
      // back.style.display = 'block';
      // var map = this._map;
      // var scale = map.getZoomScale(e.zoom);
      // var newCenter = map._latLngToNewLayerPoint(map.getCenter(), e.zoom, e.center);
      // var oldCenter = map._latLngToNewLayerPoint(e.center, e.zoom, e.center);

      // var origin = {
        // x:  newCenter.x - oldCenter.x,
        // y:  newCenter.y - oldCenter.y
      // };

      // var bg = back;
      // var transform = L.DomUtil.TRANSFORM;
      // bg.style[transform] =  L.DomUtil.getTranslateString(origin) + ' scale(' + e.scale + ') ';
  // },

  // _endZoomAnim: function () {
      // this._animating = false;
      // this._canvas.style.display = 'block';
      // this._backCanvas.style.display = 'none';
  // },

  getCanvas: function() {
    return this._canvas;
  },

  // getAttribution: function() {
    // return this.options.attribution;
  // },

  draw: function() {
    return this._reset();
  },

  onRemove: function (map) {
    this._container.parentNode.removeChild(this._container);
    map.off({
      'viewreset': this._reset,
      'move': this._render,
      'resize': this._reset,
      'zoomanim': this._animateZoom,
      'zoomend': this._endZoomAnim
    }, this);
  },

  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  setOpacity: function (opacity) {
    this.options.opacity = opacity;
    this._updateOpacity();
    return this;
  },

  setZIndex: function(zIndex) {
    this._canvas.style.zIndex = zIndex;
  },

  bringToFront: function () {
    return this;
  },

  bringToBack: function () {
    return this;
  },

  _reset: function () {
    var size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;

    // fix position
    var pos = L.DomUtil.getPosition(this._map.getPanes().mapPane);
    if (pos) {
      L.DomUtil.setPosition(this._canvas, { x: -pos.x, y: -pos.y });
    }
    this.onResize();
    this._render();
  },

  /*
  _project: function(x) {
    var point = this._map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
    return [point.x, point.y];
  },
  */

  _updateOpacity: function () { },

  _render: function() {
    if (this.currentAnimationFrame >= 0) {
      this.cancelAnimationFrame.call(window, this.currentAnimationFrame);
    }
    this.currentAnimationFrame = this.requestAnimationFrame.call(window, this.render);
  },

  // use direct: true if you are inside an animation frame call
  redraw: function(direct) {
    var domPosition = L.DomUtil.getPosition(this._map.getPanes().mapPane);
    if (domPosition) {
      L.DomUtil.setPosition(this._canvas, { x: -domPosition.x, y: -domPosition.y });
    }
    if (direct) {
      this.render();
    } else {
      this._render();
    }
  },

  onResize: function() {
  },

  render: function() {
    var gl = this._ctx;
    if (gl === null) return;

    var canvas = this.getCanvas();

    gl.clear(gl.COLOR_BUFFER_BIT);

    // -- set base matrix to translate canvas pixel coordinates -> webgl coordinates
    this._mapMatrix.set(this._pixelsToWebGLMatrix);

    var bounds = this._map.getBounds();
    var topLeft = new L.LatLng(bounds.getNorth(), bounds.getWest());
    var offset = this.latLongToPixelXY(topLeft.lat, topLeft.lng);

    // -- Scale to current zoom
    var scale = Math.pow(2, this._map.getZoom());
    this.scaleMatrix(this._mapMatrix, scale, scale);

    this.translateMatrix(this._mapMatrix, -offset.x, -offset.y);

    // -- attach matrix value to 'mapMatrix' uniform in shader
    gl.uniformMatrix4fv(this._u_matLoc, false, this._mapMatrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
    gl.drawArrays(gl.LINES, 0, this._numPoints);

  }

});

} //L defined
