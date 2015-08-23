var SaltView = (function($, L, Models, Config) {

    var defaults = {

        // layer containing salt contour polylines
        saltGroup: L.geoJson(),

        // The number of contour levels to show
        numSaltLevels: Config.numSaltLevels,

        // The scale to use for setting contour levels
        logspaceSaltLevels: Config.logspaceSaltLevels,

        // Contour artist parameters
        contourOptions: Config.contourOptions

    };

    var SaltView = function SaltView(config) {

        var self = this;

        $.extend(self, defaults, config);

        self.sfs = Models.saltFrameSource();

    };


    SaltView.prototype.addTo = function addTo(mapView) {
        var self = this;

        this.mapView = mapView;

        mapView.layerSelectControl.addToggledOverlay(
            'salinity', self.saltGroup, 'Salinity');

        if (self.mapView.visibleLayers.salinity) {
            self.saltGroup.addTo(mapView.map);
        }

        return this;
    };


    SaltView.prototype.redraw = function redraw(callback) {
        var self = this;

        // If we haven't been added to a map we don't bother redrawing
        if (!self.mapView) {
            return self;
        }

        var config = $.extend({frame: self.mapView.currentFrame},
                              self.contourOptions);
        self.sfs.withSaltFrame(config, function(data) {
            drawContours(data, self.saltGroup,
                         featureStyleFunc(config));
            callback && callback(data);
        });
        return self;
    };


    return {
        saltView: function saltView(config) {
            return new SaltView(config);
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


    function drawContours(data, saltGroup, styleFunc) {
        saltGroup.clearLayers();
        saltGroup.addLayer(
            L.geoJson(data.contours, {style: styleFunc})
        );
    }

}(jQuery, L, Models, Config));
