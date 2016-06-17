var TemperatureView = (function($, L, Models, Config) {

    var defaults = {

        // layer containing temperature contour polylines
        temperatureGroup: L.geoJson(),

        // The number of contour levels to show
        numTemperatureLevels: Config.numTemperatureLevels,

        // The scale to use for setting contour levels
        logspaceTemperatureLevels: Config.logspaceTemperatureLevels,

        // Contour artist parameters
        contourOptions: Config.contourOptions

    };

    var TemperatureView = function TemperatureView(config) {

        var self = this;

        $.extend(self, defaults, config);

        self.sfs = Models.temperatureFrameSource();

    };


    TemperatureView.prototype.addTo = function addTo(mapView) {
        var self = this;

        this.mapView = mapView;

        mapView.layerSelectControl.addToggledOverlay(
            'temperature', self.temperatureGroup, 'Temperature');

        if (self.mapView.visibleLayers.temperature) {
            self.temperatureGroup.addTo(mapView.map);
        }

        return this;
    };


    TemperatureView.prototype.redraw = function redraw(callback) {
        var self = this;

        // If we haven't been added to a map we don't bother redrawing
        if (!self.mapView) {
            return self;
        }

        var config = $.extend({frame: self.mapView.currentFrame, datasource: self.mapView.dataSource},
                              self.contourOptions);
        self.sfs.withTemperatureFrame(config, function(data) {
            drawContours(data, self.temperatureGroup,
                         featureStyleFunc(config));
            callback && callback(data);
        });
        return self;
    };


    return {
        temperatureView: function temperatureView(config) {
            return new TemperatureView(config);
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


    function drawContours(data, temperatureGroup, styleFunc) {
        temperatureGroup.clearLayers();
        temperatureGroup.addLayer(
            L.geoJson(data.contours, {style: styleFunc})
        );
    }

}(jQuery, L, Models, Config));
