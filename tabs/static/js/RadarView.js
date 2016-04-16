var RadarView = (function($, L, Models, Config) {

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


    var RadarView = function RadarView(config) {

        var self = this;

        $.extend(self, defaults, config);

        // Convert to radians
        self.arrowHeadAngle *= Math.PI / 180;

        self.vfs = Models.radarFrameSource({
            barbLocation: self.barbLocation,
            arrowHeadSize: self.arrowHeadSize,
            arrowHeadAngle: self.arrowHeadAngle
        });

        self.glOverlay = new L.WebGLVectorLayer();


    };


    RadarView.prototype.addTo = function addTo(mapView) {
        var self = this;

        self.mapView = mapView;

        if (self.mapView.visibleLayers.radar) {
            self.glOverlay.addTo(self.mapView.map);
        }

        self.mapView.map.on('dragend', function() { self.redraw(); });
        self.mapView.map.on('zoomend', function() { self.updateNumVectorsToDisplay(); });

        mapView.layerSelectControl.addToggledOverlay(
            'radar', self.glOverlay, 'Radar');

        self.resetGrid();

        return self;
    };


    RadarView.prototype.resetGrid = function resetGrid(callback) {
        var self = this;

        // Build the set of vectors to display
        var options = {datasource: self.mapView.dataSource};
        self.vfs.withRadarGridLocations(options, function(points) {
            self.points = points;
            self.updateNumVectorsToDisplay();

        });
    };


    RadarView.prototype.clearCache = function clearCache(callback) {
        var self = this;

        self.vfs._radar_frames = {};
    };


    RadarView.prototype.redraw = function redraw(callback) {
        var self = this;

        // If we haven't been added to a map we don't bother redrawing
        if (!self.mapView || !self.points.length) {
            return self;
        }

        var options = {frame: self.mapView.currentFrame,
                       points: self.points,
                       mapScale: self.mapView.mapScale(),
                       datasource: mapView.dataSource};
        self.vfs.withRadarFrame(options, function(data) {
            // Three lines per arrow
            var lines = data.vectors.slice(0, self.numVectorsToDisplay * 3);

            // XXX: We could be passing colors here now
            self.glOverlay.setLines(lines, {41: 2, 32: 7, 305: 4});
            callback && callback(data);
        });
    };


    RadarView.prototype.updateNumVectorsToDisplay = function() {
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
        radarView: function radarView(config) {
            return new RadarView(config);
        }
    };

}(jQuery, L, Models, Config));
