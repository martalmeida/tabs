MapView = (function($, L, Models, Config) {

    var RUN_STOPPED = 0;
    var RUN_SYNC = 1;
    var RUN_FOREVER = 2;

    var defaults = {

        visibleLayers: Config.visibleLayers,

        // Speed of animation (larger is slower)
        delay: Config.delay,

        // Does the animation automatically start?
        runState: RUN_STOPPED,

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

        // The frame we're looking at
        self.currentFrame = 0;

        // The frame we'd like to load
        self.queuedFrame = 0;

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
            if (self.runState === RUN_STOPPED) {
                self.redraw();
            }
        });

        // Add map components
        this.tabsControl = new TABSControl.tabsControl({
            nFrames: self.nFrames,
            onclick: function onclick() { self.toggleRunState(); }
        });
        self.tabsControl.addTo(self.map);

        self.sliderControl = L.control.sliderControl({
            minValue: 0,
            maxValue: self.nFrames,
            slide: function(e, ui) {
                self.queueFrame(ui.value);
                self.start(RUN_SYNC);
            }
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
            if (oKeyEvent.charCode === 32) { self.toggleRunState(); }
        };

    };

    MapView.prototype.toggleRunState = function toggleRunState() {
        var self = this;
        if (self.runState === RUN_STOPPED) {
            self.start(RUN_FOREVER);
        } else {
            self.stop();
        }
    };

    MapView.prototype.queueFrame = function queueFrame(i) {
        var self = this;
        var nxt = i === undefined ? (self.currentFrame + 1) % self.nFrames : i;
        self.queuedFrame = nxt;
    };


    MapView.prototype.mapScale = function mapScale() {
        var self = this;
        var scale = 0.5;     // vector scaling (m/s -> degrees) at default zoom
        var zoom = this.map.getZoom();
        return scale * Math.pow(2, this.defaultZoom - zoom);
    };


    // hard-coded region of interest outline
    MapView.prototype.addRegionOutline = function addRegionOutline() {
        var self = this;
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
        var self = this;
        this.currentFrame = i;
        this.sliderControl.value(i);
        L.Util.requestAnimFrame(function do_redraw() {
            this.redraw(callback);
        }, this, true);
    };


    MapView.prototype.start = function start(newState) {
        var self = this;
        var prevState = this.runState;
        this.runState = newState === undefined ? RUN_FOREVER : newState;
        if (prevState === RUN_STOPPED) {
            console.log('runnin!');
            this._run();
        }
    };


    MapView.prototype._dirty = function _dirty() {
        var self = this;
        return self.currentFrame !== self.queuedFrame;
    };


    MapView.prototype._run = function _run() {
        var self = this;
        if (self.runState === RUN_STOPPED) {
            return;
        }

        var t = Date.now();
        this.showTimeStep(this.queuedFrame, function() {
            var dirty = self._dirty();
            // var waitTime = dirty ? 0 : Math.max(0, t - Date.now() + self.delay);
            var waitTime = Math.max(0, t - Date.now() + self.delay);

            // XXX: Remove eventually
            if (showFPS && ((self.currentFrame % showFPS) === 0)) {
                var fps = showFPS / ((t - self.t) / 1000);
                fps = fps.toFixed(2) + ' FPS';
                var ms = waitTime.toFixed(0) + '/' + self.delay + 'ms';
                console.log(fps + '\tdelay: ' + ms);
                self.t = t;
            }

            // If we're caught up but we are supposed to keep
            // going, then queue the next frame.
            if (self.runState === RUN_FOREVER && !dirty) {
                self.queueFrame();
            }

            if (!self._dirty()) {
                self.runState = RUN_STOPPED;
            }
            setTimeout(self._run.bind(self), waitTime);
        });
    };


    MapView.prototype.stop = function stop() {
        var self = this;
        this.runState = RUN_STOPPED;
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
