var VelocityView = (function($, L, Models, Config) {

    var defaults = {

        // The number of vectors to display
        numVectorsToDisplay: 0,

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

        var self = this;

        $.extend(self, defaults, config);

        // Convert to radians
        self.arrowHeadAngle *= Math.PI / 180;

        self.vfs = Models.velocityFrameSource({
            barbLocation: self.barbLocation,
            arrowHeadSize: self.arrowHeadSize,
            arrowHeadAngle: self.arrowHeadAngle
        });

        self.glOverlay = new L.WebGLVectorLayer();


    };


    VelocityView.prototype.addTo = function addTo(mapView) {
        var self = this;

        self.mapView = mapView;

        if (self.mapView.visibleLayers.velocity) {
            self.glOverlay.addTo(self.mapView.map);
        }

        self.mapView.map.on('dragend', function() { self.redraw(); });
        self.mapView.map.on('zoomend', function() { self.updateNumVectorsToDisplay(); });

        mapView.layerSelectControl.addToggledOverlay(
            'velocity', self.glOverlay, 'Velocity');

        // Currently ignored. Need to sort out the GLSL for this.
        // var style = {
            // color: self.color,
            // weight: self.weight
        // };
        self.resetGrid();

        return self;
    };


    VelocityView.prototype.resetGrid = function resetGrid(callback) {
        var self = this;

        // Build the set of vectors to display
        var options = {datasource: self.mapView.dataSource};
        self.vfs.withVelocityGridLocations(options, function(points) {
            self.points = points;
            self.updateNumVectorsToDisplay();

        });
    };


    VelocityView.prototype.clearCache = function clearCache(callback) {
        var self = this;

        self.vfs._velocity_frames = {};
    };


    VelocityView.prototype.redraw = function redraw(callback) {
        var self = this;

        // If we haven't been added to a map we don't bother redrawing
        if (!self.mapView || !self.points.length) {
            return self;
        }

        var options = {frame: self.mapView.currentFrame,
                       points: self.points,
                       mapScale: self.mapView.mapScale(),
                       datasource: mapView.dataSource};
        self.vfs.withVelocityFrame(options, function(data) {
            // Three lines per arrow
            var lines = data.vectors.slice(0, self.numVectorsToDisplay * 3);

            // XXX: We could be passing colors here now
            //self.glOverlay.setLines(lines, {41: 2, 32: 7, 305: 4});
			self.glOverlay.setLines(lines, Array(lines.length).fill(7));
            callback && callback(data);
        });
    };


    VelocityView.prototype.updateNumVectorsToDisplay = function() {
        var self = this;
        var density = self.vectorDensity;
        var nPoints = self.points.length;
        var zoom = self.mapView.map.getZoom();
        var minZoom = self.mapView.minZoom;
        var scale = Math.pow(4, zoom - minZoom);
        var n = Math.min(Math.ceil(density * scale), nPoints);
        console.log('show', n, 'at zoom level', zoom);
        self.numVectorsToDisplay = n;
        self.redraw();
    };


    return {
        velocityView: function velocityView(config) {
            return new VelocityView(config);
        }
    };

}(jQuery, L, Models, Config));
