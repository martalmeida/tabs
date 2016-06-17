var SpeedView = (function($, L, Models, Config) {

    var defaults = {

        // layer containing speed contour polylines
        speedGroup: L.geoJson(),

        // The number of contour levels to show
        numSpeedLevels: Config.numSpeedLevels,

        // The scale to use for setting contour levels
        logspaceSpeedLevels: Config.logspaceSpeedLevels,

        // Contour artist parameters
        contourOptions: Config.contourOptions

    };

    var SpeedView = function SpeedView(config) {

        var self = this;

        $.extend(self, defaults, config);

        self.sfs = Models.speedFrameSource();

    };


    SpeedView.prototype.addTo = function addTo(mapView) {
        var self = this;

        this.mapView = mapView;

        mapView.layerSelectControl.addToggledOverlay(
            'speed', self.speedGroup, 'Speed');

        if (self.mapView.visibleLayers.speed) {
            self.speedGroup.addTo(mapView.map);
        }

        return this;
    };


    SpeedView.prototype.redraw = function redraw(callback) {
        var self = this;

        // If we haven't been added to a map we don't bother redrawing
        if (!self.mapView) {
            return self;
        }

        var config = $.extend({frame: self.mapView.currentFrame, datasource: self.mapView.dataSource},
                              self.contourOptions);
        self.sfs.withSpeedFrame(config, function(data) {
            drawContours(data, self.speedGroup,
                         featureStyleFunc(config));
            callback && callback(data);
        });
        return self;
    };


    return {
        speedView: function speedView(config) {
            return new SpeedView(config);
        }
    };


    // Private Functions

    function featureStyleFunc(options) {
        function featureStyleFuncInner(feature) {
            var config = $.extend({}, feature.properties, options);
            config.color = config.color || config.fillColor;
            return config;
        }
        return featureStyleFuncInner;
    }


    function drawContours(data, speedGroup, styleFunc) {
        speedGroup.clearLayers();
        speedGroup.addLayer(
            L.geoJson(data.contours, {style: styleFunc})
        );
    }

}(jQuery, L, Models, Config));
