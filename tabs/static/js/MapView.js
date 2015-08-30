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

        // Use forecast or hindcast data?
        dataSource: 'hindcast',

        // Number of time steps to use
        nFrames: Config.nFrames,

        // Offset in index to request from API from current frame number
        frameOffset: 20000,

        // Initial zoom level
        minZoom: Config.minZoom,
        defaultZoom: Config.defaultZoom,
        maxZoom: Config.maxZoom,
        mapCenter: Config.mapCenter,

        tileLayerURL: Config.tileLayerURL,

        attribution: "© <a href='https://www.mapbox.com/map-feedback/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap contributors</a>",

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
        self.map = L.map('map', {center: self.mapCenter,
                                 zoom: self.defaultZoom,
                                 layers: [mapboxTiles]});

        // Re-render when map conditions change
        self.map.on('viewreset', function() {
            if (self.runState === RUN_STOPPED) {
                self.redraw();
            }
        });

        // Add map components
        self.tabsControl = new TABSControl.tabsControl({
            nFrames: self.nFrames,
            onclick: function onclick() { self.toggleRunState(); }
        });
        self.tabsControl.addTo(self.map);

        L.Control.Toggle = L.Control.extend({
            options: {
                position: 'topright',
                onclick: function onclick() { self.changeDataSource(); }
            },
            onAdd: function(map) {
                var self = this;
                this._map = map;

                var classes = ['tabs-control',
                               'leaflet-control-attribution',
                               'leaflet-control'].join(' ');
                this.container = L.DomUtil.create('div', classes);

                this.updateText();

                L.DomEvent.on(this.container, 'click', function(event) {
                    L.DomEvent.stopPropagation(event);
                    self.options.onclick(event);
                    self.updateText(event);
                });
                return this.container;
            },
            updateText: function() {
                console.log('Switch data source to', self.dataSource);
                self.dataSourceButton.container.innerHTML = self.dataSource;
            }

        });
        self.dataSourceButton = new L.Control.Toggle;
        self.dataSourceButton.addTo(self.map);

        self.sliderControl = L.control.sliderControl({
            minValue: 0,
            maxValue: self.nFrames,
            slide: function(e, ui) {
                self.queueFrame(ui.value);
                self.start(RUN_SYNC);
            },
            renderValue: function(value) {
                var seconds = self.timestamps[value] * 1e3;
                return renderDate(new Date(seconds));
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

        // Load timestamps for all frames
        var options = {datasource: self.dataSource,
                       frameOffset: self.framOffset};
        API.withFrameTimestamps(options, function(data) {
            self.timestamps = data.timestamps;
        });

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
        if (self.runState !== RUN_FOREVER) {
            self.start(RUN_FOREVER);
        } else {
            self.start(RUN_SYNC);
        }
    };

    MapView.prototype.changeDataSource = function changeDataSource() {
        var self = this;
        if (self.dataSource !== 'hindcast') {
            self.dataSource = 'hindcast';
        } else {
            self.dataSource = 'forecast';
        }
        self.start(RUN_SYNC);
        // clear vector cache
        self.velocityView.clearCache();
        // reload timestamps for all frames
        var options = {datasource: self.dataSource};
        API.withFrameTimestamps(options, function(data) {
            self.timestamps = data.timestamps;
            // reset the number of frames
            self.nFrames = self.timestamps.length;
            self.tabsControl.nFrames = self.nFrames;
        });
        self.currentFrame = 0;
        if (self.visibleLayers.velocity) {
            self.velocityView && self.velocityView.resetGrid()
            self.redraw();
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
        var zoom = self.map.getZoom();
        return scale * Math.pow(2, self.defaultZoom - zoom);
    };


    // hard-coded region of interest outline
    MapView.prototype.addRegionOutline = function addRegionOutline() {
        var self = this;
        var featureLayer = L.mapbox.featureLayer()
            .loadURL(self.domainURL)
            .on('ready', function(layer) {
                // NOT self
                this.eachLayer(function(poly) {
                    poly.setStyle({
                        color: 'red',
                        fill: false
                    });
                });
            })
            .addTo(self.map);
    };


    // update vector data at each time step
    MapView.prototype.showTimeStep = function showTimeStep(i, callback) {
        var self = this;
        self.currentFrame = i;
        self.sliderControl.value(i);
        L.Util.requestAnimFrame(function do_redraw() {
            this.redraw(callback);
        }, self, true);
    };


    MapView.prototype.start = function start(newState) {
        var self = this;
        var prevState = self.runState;
        self.runState = newState === undefined ? RUN_FOREVER : newState;
        if (prevState === RUN_STOPPED) {
            self._run();
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
        self.showTimeStep(self.queuedFrame, function() {
            var waitTime;

            if (self._dirty()) {
                waitTime = 0;
            } else {
                waitTime = Math.max(0, t - Date.now() + self.delay);
            }


            // XXX: Remove eventually
            var reportableFrame = (self.currentFrame % showFPS) === 0;
            if (showFPS && self.runState === RUN_FOREVER && reportableFrame) {
                var fps = (showFPS / ((t - self.t) / 1000))
                          .toFixed(2) + ' FPS';
                var ms = waitTime.toFixed(0) + '/' + self.delay + 'ms';
                console.log(fps + '\tdelay: ' + ms);
                self.t = t;
            }

            // If we're caught up but we are supposed to keep
            // going, then queue the next frame. Otherwise stop.
            if (!self._dirty()) {
                if (self.runState === RUN_FOREVER) {
                    self.queueFrame();
                } else {
                    self.stop();
                }
            }
            setTimeout(self._run.bind(self), waitTime);
        });
    };


    MapView.prototype.stop = function stop() {
        var self = this;
        self.runState = RUN_STOPPED;
    };


    MapView.prototype.redraw = function redraw(callback) {
        var self = this;

        if (self.visibleLayers.velocity) {
            self.velocityView && self.velocityView.redraw(
                function vv_call(data) {
                    self.tabsControl && self.tabsControl.updateInfo(
                        {frame: self.currentFrame, date: data.date});
                        callback && callback(data);
                }
            );
        }

        if (self.visibleLayers.salinity) {
            self.saltView && self.saltView.redraw(
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

    function renderDate(d) {
        var day_month_year = [d.getUTCDate().padLeft(),
                              Config.monthStrings[d.getUTCMonth()],
                              d.getFullYear()].join(' '),
            hour_min = [d.getHours().padLeft(),
                        d.getMinutes().padLeft()].join(':');
        return day_month_year + ' ' + hour_min + ' UTC';
    }

}(jQuery, L, Models, Config));
