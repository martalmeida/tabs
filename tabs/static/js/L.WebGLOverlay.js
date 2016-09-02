
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
    this._u_paletteFactorLoc = gl.getUniformLocation(program, "u_paletteFactor");
    this._vertLoc = gl.getAttribLocation(program, "a_vertex");
    this._colorLoc = gl.getAttribLocation(program, "a_color");

    // We will make a 1xN texture image, where each pixel is a different color
    // On the GPU we index into this palette get the color of a line

    // // Set the color palette
    // this.palette = new Uint8Array([
      // 0   , 0   , 0   , 255 , // 0 Black
      // 255 , 0   , 0   , 255 , // 1 Red
      // 0   , 255 , 0   , 255 , // 2 Green
      // 0   , 0   , 255 , 255 , // 3 Blue
      // 255 , 0   , 255 , 255 , // 4 Purple
      // 255 , 255 , 0   , 255 , // 5 Orange
      // 0   , 255 , 255 , 255 , // 6 Teal
      // 255 , 255 , 255 , 255   // 7 White
    // ]);
    this.palette = new Uint8Array([
      255 , 255, 255, 255 , // 0 White
      114 , 247   , 173 , 255 , // 1 
      113 , 247 , 135 , 255 , // 2 
      112 , 245   , 95 , 255 , // 3 
      112 , 245   , 56 , 255 , // 4 
      116 , 246 , 47   , 255 , // 5 
      134   , 246 , 49 , 255 , // 6 
      159 , 246 , 51 , 255,   // 7 
      187 , 248 , 53 , 255,   // 8 
      217 , 246 , 56 , 255,   // 9 
      246 , 250 , 59 , 255,   // 10 Yellow
      250 , 225 , 56 , 255,   // 11 
      245 , 190 , 49 , 255,   // 12 
      241 , 155 , 44 , 255,   // 13 
      238 , 118 , 39 , 255,   // 14 
      236 , 82 , 35 , 255,   // 15 
      235 , 59 , 34 , 255,    // 16 
      139 , 0 , 0 , 255,    // 17 DarkRed
      128 , 0 , 0 , 255,    // 18 Maroon
      78 , 0 , 0 , 255,    // 19 Maroon
      35 , 0 , 0 , 255,    // 20 Maroon
      0 , 0 , 0 , 255,    // 21 Black
      0, 34, 102, 255     // 22 Dark Blue
    ]);
    this.paletteSize = this.palette.length / 4;

    gl.uniform1f(this._u_paletteFactorLoc, 1 / this.paletteSize);

    this.paletteTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Full the texture with our palette
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.paletteSize, 1, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, this.palette);


    // Set the matrix to some that makes 1 unit 1 pixel.
    this._pixelsToWebGLMatrix = new Float32Array(16);
    this._mapMatrix = new Float32Array(16);
  },

  allocateBuffers: function(numElements) {
    // Two points per element (line)
    var prevNumPoints = this._numPoints;
    this._numPoints = numElements * 2;
    if (this._numPoints <= prevNumPoints) {
      return;
    }

    var gl = this._ctx;

    // Two coordinates per point
    this.vertArray = new Float32Array(this._numPoints * 2);
    this.vertBuffer = gl.createBuffer();
    gl.enableVertexAttribArray(this._vertLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
    gl.vertexAttribPointer(this._vertLoc, 2, gl.FLOAT, false, 0, 0);

    // One value (palette index) per point
    this.colorArray = new Uint8Array(this._numPoints);
    this.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.enableVertexAttribArray(this._colorLoc);
    gl.vertexAttribPointer(this._colorLoc, 1, gl.UNSIGNED_BYTE, false, 0, 0);
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
  
  distanceBetwPixelToColor: function(pixel1,pixel2) {
    var distance = Math.sqrt(Math.pow(pixel2.x-pixel1.x,2)+Math.pow(pixel2.y-pixel1.y,2));
    return distance;
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

  setLines: function(lines, colors, source) {
    // Expects an array of points and an optional array or object of colors such
    // that the line from lines[i] has color colors[i].
    // one line is [[x1, y1], [x2, y2]]
    // one color is an index into the palette
    // Example:
    //   // draws a black line on the x axis and a white line on the y axis
    //   lines = [[[0, 0], [1, 0]], [[0, 0], [0, 1]]]
    //   colors = {0: 0, 1: 7}
    //

    // Get space if needed
    this.allocateBuffers(lines.length);
    var vidx = 0;
    var cidx = 0;

    colors = colors || {};
    
    //Draw all arrows with same color
    var constM = 25;
    var selectedZoom = mapView.map.getZoom();
    var minZoom = mapView.minZoom;
    var scaleColor = Math.pow(2, selectedZoom - minZoom);

    for (var i = 0; i < lines.length; i+=3) {
        
      // Define first line header arrow
      // First point in the line
      var pixel_h11 = this.latLongToPixelXY(lines[i][0][0], lines[i][0][1]);
      // Second point in the line
      var pixel_h12 = this.latLongToPixelXY(lines[i][1][0], lines[i][1][1]);

      // Define second line header arrow
      var pixel_h21 = this.latLongToPixelXY(lines[i+1][0][0], lines[i+1][0][1]);
      var pixel_h22 = this.latLongToPixelXY(lines[i+1][1][0], lines[i+1][1][1]);
      
      // Define body line
      var pixel1 = this.latLongToPixelXY(lines[i+2][0][0], lines[i+2][0][1]);
      var pixel2 = this.latLongToPixelXY(lines[i+2][1][0], lines[i+2][1][1]);
      
      //var color = colors[i] | 0;
      var color = source=='wind' ? 21 : source=='radar' ? 5 : Math.floor(constM*scaleColor*this.distanceBetwPixelToColor(pixel1,pixel2));
      //console.log(color);
      
      //construct first line header arrow
      this.vertArray[vidx++] = pixel_h11.x;
      this.vertArray[vidx++] = pixel_h11.y;
      this.colorArray[cidx++] = color;
      this.vertArray[vidx++] = pixel_h12.x;
      this.vertArray[vidx++] = pixel_h12.y;
      this.colorArray[cidx++] = color;
      
      //construct second line header arrow
      this.vertArray[vidx++] = pixel_h21.x;
      this.vertArray[vidx++] = pixel_h21.y;
      this.colorArray[cidx++] = color;
      this.vertArray[vidx++] = pixel_h22.x;
      this.vertArray[vidx++] = pixel_h22.y;
      this.colorArray[cidx++] = color;
      
      //construct first line header arrow
      this.vertArray[vidx++] = pixel1.x;
      this.vertArray[vidx++] = pixel1.y;
      this.colorArray[cidx++] = color;
      this.vertArray[vidx++] = pixel2.x;
      this.vertArray[vidx++] = pixel2.y;
      this.colorArray[cidx++] = color;
    }

    var gl = this._ctx;

    // Copy vertex data to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertArray, gl.STATIC_DRAW);

    // Copy color data to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.colorArray, gl.STATIC_DRAW);
    this.redraw();
  },
  
  setLines2D: function(lines, colors, source) {

    this.allocateBuffers(lines.length*8/3);
    var vidx = 0;
    var cidx = 0;

    colors = colors || {};
    
    //Draw all arrows with same color
    var constM = 25;
    var selectedZoom = mapView.map.getZoom();
    var minZoom = mapView.minZoom;
    var scaleColor = Math.pow(2, selectedZoom - minZoom);

    var param1 = source=='buoys' ? 3/4 : 2/3;
    var param2 = source=='buoys' ? 0.02 : 1/3;
    var param3 = source=='buoys' ? 0 : 1/3;

    var theta = source=='buoys' ? Math.PI/6 : Math.PI/4;
    
    for (var i = 0; i < lines.length; i+=3) {
    
      var p0 = this.latLongToPixelXY(lines[i+2][1][0], lines[i+2][1][1]);
      var p4 = this.latLongToPixelXY(lines[i+2][0][0], lines[i+2][0][1]);

      var L = norm2(p0,p4);
      if (L>0){

          var V = {x:p4.x-p0.x, y:p4.y-p0.y};
          var r = prodScalar(V,1/L);
          var pi = somVect(p0,prodScalar(r,param1 * L));
          var aux = V.y==0 ? Math.PI/2 : Math.atan(-V.x/V.y);
          
          var ri = {x:Math.cos(aux), y:Math.sin(aux)};
          var PiP3 = norm2(p4,pi)*Math.tan(theta);

          var p3 = somVect(pi,prodScalar(ri,PiP3));
          var p5 = somVect(pi,prodScalar(ri,-PiP3));
          var p1 = somVect(p0,prodScalar(ri,PiP3*param2));
          
          var b1 = param3 * norm(somVect(p4,prodScalar(pi,-1)));
          var b2 = b1 / PiP3 * (PiP3 - norm(somVect(p1,prodScalar(p0,-1))));
          
          var p7 = somVect(p0,prodScalar(ri,-PiP3*param2));
          var p2 = somVect(p1,prodScalar(r,param1 * L + b2));
          var p6 = somVect(p7,prodScalar(r,param1 * L + b2));
      }      
        
      // Define first line header arrow
      // First point in the line
      var pixel_h11 = this.latLongToPixelXY(lines[i][0][0], lines[i][0][1]);
      // Second point in the line
      var pixel_h12 = this.latLongToPixelXY(lines[i][1][0], lines[i][1][1]);

      // Define second line header arrow
      var pixel_h21 = this.latLongToPixelXY(lines[i+1][0][0], lines[i+1][0][1]);
      var pixel_h22 = this.latLongToPixelXY(lines[i+1][1][0], lines[i+1][1][1]);
      
      // Define body line
      var pixel1 = this.latLongToPixelXY(lines[i+2][0][0], lines[i+2][0][1]);
      var pixel2 = this.latLongToPixelXY(lines[i+2][1][0], lines[i+2][1][1]);
      
      
      //var color = colors[i] | 0;
      var color = source=='wind' ? 21 : source=='buoys' ? 16 : Math.floor(constM*scaleColor*this.distanceBetwPixelToColor(pixel1,pixel2));
      
      this.vertArray[vidx++] = p0.x;
      this.vertArray[vidx++] = p0.y;
      this.colorArray[cidx++] = 22;      
      this.vertArray[vidx++] = p1.x;
      this.vertArray[vidx++] = p1.y;
      this.colorArray[cidx++] = 22;
      
      this.vertArray[vidx++] = p1.x;
      this.vertArray[vidx++] = p1.y;
      this.colorArray[cidx++] = 22;
      this.vertArray[vidx++] = p2.x;
      this.vertArray[vidx++] = p2.y;
      this.colorArray[cidx++] = 22;
      
      this.vertArray[vidx++] = p2.x;
      this.vertArray[vidx++] = p2.y;
      this.colorArray[cidx++] = 22;
      this.vertArray[vidx++] = p3.x;
      this.vertArray[vidx++] = p3.y;
      this.colorArray[cidx++] = 22;
      
      this.vertArray[vidx++] = p3.x;
      this.vertArray[vidx++] = p3.y;
      this.colorArray[cidx++] = 22;
      this.vertArray[vidx++] = p4.x;
      this.vertArray[vidx++] = p4.y;
      this.colorArray[cidx++] = 22;

      this.vertArray[vidx++] = p4.x;
      this.vertArray[vidx++] = p4.y;
      this.colorArray[cidx++] = 22;
      this.vertArray[vidx++] = p5.x;
      this.vertArray[vidx++] = p5.y;
      this.colorArray[cidx++] = 22;

      this.vertArray[vidx++] = p5.x;
      this.vertArray[vidx++] = p5.y;
      this.colorArray[cidx++] = 22;
      this.vertArray[vidx++] = p6.x;
      this.vertArray[vidx++] = p6.y;
      this.colorArray[cidx++] = 22;

      this.vertArray[vidx++] = p6.x;
      this.vertArray[vidx++] = p6.y;
      this.colorArray[cidx++] = 22;
      this.vertArray[vidx++] = p7.x;
      this.vertArray[vidx++] = p7.y;
      this.colorArray[cidx++] = 22;

      this.vertArray[vidx++] = p7.x;
      this.vertArray[vidx++] = p7.y;
      this.colorArray[cidx++] = 22;
      this.vertArray[vidx++] = p0.x;
      this.vertArray[vidx++] = p0.y;
      this.colorArray[cidx++] = 22;      
    }

    var gl = this._ctx;

    // Copy vertex data to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertArray, gl.STATIC_DRAW);

    // Copy color data to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.colorArray, gl.STATIC_DRAW);
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

  _updateOpacity: function () { },

  _render: function() {
    if (this.currentAnimationFrame >= 0) {
      this.cancelAnimationFrame.call(window, this.currentAnimationFrame);
    }
    this.currentAnimationFrame = this.requestAnimationFrame.call(window, this.render);
  },

  // use direct: true if you are inside an animation frame call
  redraw: function(direct) {
    if(this._map !== undefined){
        var domPosition = L.DomUtil.getPosition(this._map.getPanes().mapPane);
        if (domPosition) {
          L.DomUtil.setPosition(this._canvas, { x: -domPosition.x, y: -domPosition.y });
        }
        if (direct) {
          this.render();
        } else {
          this._render();
        }
    }
  },

  onResize: function() {
    var gl = this._ctx,
        canvas = this.getCanvas();
    var w = canvas.clientWidth,
        h = canvas.clientHeight;
    this._pixelsToWebGLMatrix.set([2 / w,  0    , 0, 0,
                                   0    , -2 / h, 0, 0,
                                   0    ,  0    , 0, 0,
                                  -1    ,  1    , 0, 1]);
    gl.viewport(0, 0, w, h);
  },

  render: function() {
    var gl = this._ctx;
    if (gl === null) return;

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

    // Draw the lines
    gl.drawArrays(gl.LINES, 0, this._numPoints);

  }

});

} //L defined
