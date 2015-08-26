MapView = (function($, L, Models, Config) {

    var defaults = {

        visibleLayers: Config.visibleLayers,

        // Speed of animation (larger is slower)
        delay: Config.delay,

        // Does the animation automatically start?
        isRunning: Config.isRunning,

        // Number of time steps to use
        nFrames: Config.nFrames,

        // Initial zoom level
        minZoom: Config.minZoom,
        defaultZoom: Config.defaultZoom,
        maxZoom: Config.maxZoom,
        mapCenter: Config.mapCenter,

        tileLayerURL: Config.tileLayerURL,

        attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>',

        // Outline of the region of interest
        domainURL: Config.domainURL

    };


    var MapView = function MapView(config) {

        var self = this;

        $.extend(self, defaults, config);

        self.currentFrame = 0;

        var mapboxTiles = L.tileLayer(self.tileLayerURL, {
            attribution: self.attribution,
            maxZoom: self.maxZoom,
            minZoom: self.minZoom
        });

        // Leaflet map object
        this.map = L.map('map', {center: self.mapCenter,
                                 zoom: self.defaultZoom,
                                 layers: [mapboxTiles]});

        // Re-render when map conditions change
        this.map.on('viewreset', function() {
            if (!self.isRunning) {
                self.redraw();
            }
        });

        // Add map components
        this.tabsControl = new TABSControl.tabsControl({
            nFrames: self.nFrames,
            onclick: function onclick() {
                self.isRunning ? self.stop() : self.start();
            }
        });
        self.tabsControl.addTo(self.map);

        self.sliderControl = L.control.sliderControl({
            minValue: 0,
            maxValue: self.nFrames,
            slide: function(e, ui) {self.showTimeStep(ui.value);}
        });
        self.map.addControl(self.sliderControl);
        self.sliderControl.startSlider();

        self.distanceScaleControl = L.control.scale(
            Config.distanceScaleOptions).addTo(self.map);

        // Add layer selector and hook up toggling of visibility flag
        var lsc = self.layerSelectControl = L.control.layers([], [],
            {position: 'topleft'}).addTo(self.map);
        lsc.addToggledOverlay = function addToggledOverlay(key, layer, name) {
            lsc.addOverlay(layer, name);
            self.map.on(
                'overlayadd', _setLayerVisibility(self, key, layer, true));
            self.map.on(
                'overlayremove', _setLayerVisibility(self, key, layer, false));
        };

        // Add visualization layers
        if (Config.enableSalinity) {
            self.saltView = SaltView.saltView(config).addTo(self);
        }
        if (Config.enableVelocity) {
            self.velocityView = VelocityView.velocityView(config).addTo(self);
        }

        self.redraw();

        // Register hotkeys
        window.onkeypress = function startStop(oKeyEvent) {
            if (oKeyEvent.charCode === 32) {
                self.isRunning ? self.stop() : self.start();
            }
        };

    };


    MapView.prototype.mapScale = function mapScale() {
        var scale = 0.5;     // vector scaling (m/s -> degrees) at default zoom
        var zoom = this.map.getZoom();
        return scale * Math.pow(2, this.defaultZoom - zoom);
    };


    // hard-coded region of interest outline
    MapView.prototype.addRegionOutline = function addRegionOutline() {
        var featureLayer = L.mapbox.featureLayer()
            .loadURL(this.domainURL)
            .on('ready', function(layer) {
                this.eachLayer(function(poly) {
                    poly.setStyle({
                        color: 'red',
                        fill: false
                    });
                });
            })
            .addTo(this.map);
    };


    // update vector data at each time step
    MapView.prototype.showTimeStep = function showTimeStep(i, callback) {
        this.currentFrame = i;
        this.sliderControl.value(i);
        L.Util.requestAnimFrame(function do_redraw() {
            this.redraw(callback);
        }, this, true);
    };


    MapView.prototype.start = function start() {
        this.isRunning = true;
        this.t = Date.now();
        this._run();
    };


    MapView.prototype._run = function _run() {
        var self = this;
        if (this.isRunning) {
            var t = Date.now();
            self.currentFrame = (self.currentFrame + 1) % self.nFrames;
            this.showTimeStep(this.currentFrame, function() {
                var waitTime = Math.max(0, self.delay - (Date.now() - t));

                // XXX: Remove eventually
                if (showFPS && ((self.currentFrame % showFPS) === 0)) {
                    var fps = showFPS / ((t - self.t) / 1000);
                    fps = fps.toFixed(2) + ' FPS';
                    var ms = waitTime.toFixed(0) + '/' + self.delay + 'ms';
                    console.log(fps + '\tdelay: ' + ms);
                    self.t = t;
                }

                setTimeout(function() {self._run();}, waitTime);
            });
        }
    };


    MapView.prototype.stop = function stop() {
        this.isRunning = false;
    };


    MapView.prototype.redraw = function redraw(callback) {
        var self = this;

        if (this.visibleLayers.velocity) {
            this.velocityView && this.velocityView.redraw(
                function vv_call(data) {
                    self.tabsControl && self.tabsControl.updateInfo(
                        {frame: self.currentFrame, date: data.date});
                        callback && callback(data);
                }
            );
        }

        if (this.visibleLayers.salinity) {
            this.saltView && this.saltView.redraw(
                function salt_call(data) {
                    self.tabsControl && self.tabsControl.updateInfo(
                        {frame: self.currentFrame, date: data.date,
                         numSaltLevels: self.saltView.numSaltLevels});
                        callback && callback(data);
                }
            );
        }
    };


    return {
        mapView: function mapView(config) { return new MapView(config); }
    };


    // Private functions

    function _setLayerVisibility(mapView, key, layer, value) {
        function setLayerVisibilityInner(e) {
            if (e.layer === layer) {
                mapView.visibleLayers[key] = value;
                mapView.redraw();
            }
        }
        return setLayerVisibilityInner;
    }

}(jQuery, L, Models, Config));
