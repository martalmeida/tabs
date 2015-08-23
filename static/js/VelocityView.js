var VelocityView = (function($, L, Models, Config) {

    var defaults = {

        // layer containing currently displayed vector polylines
        vectorGroup: L.layerGroup([]),

        // The number of vectors to display
        displayPoints: 0,

        // Collection of all vector polylines
        allVectors: [],

        // The locations of the data points
        points: [],

        // Position of the barbs on the arrows ('head', 'center', 'tail')
        barbLocation: Config.barbLocation,

        // Fraction of vector length to make arrow strokes
        arrowHeadSize: Config.arrowHeadSize,

        // Degrees!
        arrowHeadAngle: Config.arrowHeadAngle,

        // Number of vectors at full zoom
        vectorDensity: Config.vectorDensity,

        // Vector artist parameters
        color: 'black',
        weight: 1

    };


    var VelocityView = function VelocityView(config) {

        $.extend(this, defaults, config);

        // Convert to radians
        this.arrowHeadAngle *= Math.PI / 180;

        this.vfs = Models.velocityFrameSource({
            barbLocation: this.barbLocation,
            arrowHeadSize: this.arrowHeadSize,
            arrowHeadAngle: this.arrowHeadAngle
        });

        this.glOverlay = new L.WebGLOverlay();


    };


    VelocityView.prototype.addTo = function addTo(mapView) {
        var self = this;

        self.mapView = mapView;

        self.mapView.map.on('dragend', function() {self.redraw();});

        if (self.mapView.visibleLayers.velocity) {
            this.glOverlay.addTo(self.mapView.map);
        }

        mapView.layerSelectControl.addToggledOverlay(
            'velocity', self.glOverlay, 'Velocity');

        // Currently ignored. Need to sort out the GLSL for this.
        // var style = {
            // color: self.color,
            // weight: self.weight
        // };

        // Build the set of vectors to display
        self.vfs.withVelocityGridLocations({}, function(points) {
            self.points = points;

            var options = {frame: mapView.currentFrame,
                           points: points,
                           mapScale: mapView.mapScale()};

            // Put the initial velocity vectors on the map
            self.redraw();

        });

        return self;
    };


    VelocityView.prototype.redraw = function redraw(callback) {
        var self = this;

        // If we haven't been added to a map we don't bother redrawing
        if (!self.mapView || !self.points.length) {
            return this;
        }

        var options = {frame: self.mapView.currentFrame,
                       points: self.points,
                       mapScale: self.mapView.mapScale()};
        self.vfs.withVelocityFrame(options, function(data) {
            self.glOverlay.setLines(data.vectors);
            callback && callback(data);
        });
    };


    VelocityView.prototype.updateDisplayPoints = function updateDisplayPts() {
        var self = this;
        var density = self.vectorDensity;
        var nPoints = self.points.length;
        var zoom = self.mapView.map.getZoom();
        var minZoom = self.mapView.minZoom;
        var scale = Math.pow(4, zoom - minZoom);
        var n = Math.min(Math.ceil(density * scale), nPoints);
        // console.log('show', n, 'at zoom level', zoom);
        self.displayPoints = n;
    };


    return {
        velocityView: function velocityView(config) {
            return new VelocityView(config);
        }
    };

}(jQuery, L, Models, Config));
