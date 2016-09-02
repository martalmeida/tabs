var WindView = (function($, L, Models, Config) {

    var defaults = {

        // Zoom level
        zoomLevel: 0,
        // The number of vectors to display
        numVectorsToDisplay: 0,

        // The locations of the data points
        points: [],

        // Indexes of points
        inds:[],

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


    var WindView = function WindView(config) {

        var self = this;

        $.extend(self, defaults, config);

        // Convert to radians
        self.arrowHeadAngle *= Math.PI / 180;

        self.windfs = Models.windFrameSource({
            barbLocation: self.barbLocation,
            arrowHeadSize: self.arrowHeadSize,
            arrowHeadAngle: self.arrowHeadAngle
        });

        self.glOverlay = new L.WebGLVectorLayer();


    };


    WindView.prototype.addTo = function addTo(mapView) {
        var self = this;

        self.mapView = mapView;

        if (self.mapView.visibleLayers.wind) {
            self.glOverlay.addTo(self.mapView.map);
        }

        self.mapView.map.on('dragend', function() { self.redraw(); });
        self.mapView.map.on('zoomend', function() { self.updateNumVectorsToDisplay(); });

        mapView.layerSelectControl.addToggledOverlay('wind', self.glOverlay, 'Wind');

        self.resetGrid();

        return self;
    };


    WindView.prototype.resetGrid = function resetGrid(callback) {
        var self = this;

        // Build the set of vectors to display
        var options = {datasource: self.mapView.dataSource};
        self.windfs.withWindGridLocations(options, function(points) {
            self.points = points;
            self.updateNumVectorsToDisplay();

        });
    };


    WindView.prototype.clearCache = function clearCache(callback) {
        var self = this;

        self.windfs._wind_frames = {};
    };


    WindView.prototype.redraw = function redraw(callback) {
        var self = this;

        // If we haven't been added to a map we don't bother redrawing
        if (!self.mapView || !self.points.length) {
            return self;
        }

        var options = {frame: self.mapView.currentFrame,
                       points: self.points,
                       mapScale: self.mapView.mapScale(),
                       datasource: mapView.dataSource};
        self.windfs.withWindFrame(options, function(data) {
            // Three lines per arrow
            //var llines = data.vectors.slice(0, self.numVectorsToDisplay * 3);
            //console.log(llines[0]);

            lines = [];
            var indx=data.indx[Math.max(4-self.zoomLevel,1)];
            for (var i = 0; i < indx.length; i++){
                lines.push(data.vectors[indx[i]*3]);
                lines.push(data.vectors[indx[i]*3+1]);
                lines.push(data.vectors[indx[i]*3+2]);
            }

            // XXX: We could be passing colors here now
            self.glOverlay.setLines2D(lines, {}, 'wind');
            callback && callback(data);
        });
    };


    WindView.prototype.updateNumVectorsToDisplay = function() {
        var self = this;
        var density = self.vectorDensity;
        var nPoints = self.points.length;
        var zoom = self.mapView.map.getZoom();
        var minZoom = self.mapView.minZoom;
        var scale = Math.pow(4, zoom - minZoom);
        var n = Math.min(Math.ceil(density * scale), nPoints);
        //n = Math.max(Math.ceil(density * scale), nPoints);
        //n = 5000;
        
        self.zoomLevel=zoom-minZoom;
        
        console.log('Wind show', n, 'at zoom level', zoom);
        self.numVectorsToDisplay = n;
        self.redraw();
    };


    return {
        windView: function windView(config) {
            return new WindView(config);
        }
    };

}(jQuery, L, Models, Config));

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

        self.speedfs = Models.speedFrameSource();

    };


    SpeedView.prototype.addTo = function addTo(mapView) {
        var self = this;

        this.mapView = mapView;

        mapView.layerSelectControl.addToggledOverlay('speed', self.speedGroup, 'Speed');

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
        self.speedfs.withSpeedFrame(config, function(data) {
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

        self.saltfs = Models.saltFrameSource();

    };


    SaltView.prototype.addTo = function addTo(mapView) {
        var self = this;

        this.mapView = mapView;

        mapView.layerSelectControl.addToggledOverlay('salinity', self.saltGroup, 'Salinity');

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

        var config = $.extend({frame: self.mapView.currentFrame, datasource: self.mapView.dataSource},
                              self.contourOptions);
        self.saltfs.withSaltFrame(config, function(data) {
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

var VelocityView = (function($, L, Models, Config) {

    var defaults = {

        // Zoom level
        zoomLevel: 0,

        // The number of vectors to display
        numVectorsToDisplay: 0,

        // The locations of the data points
        points: [],

        // Indexes of points
        inds:[],

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

        self.velocityfs = Models.velocityFrameSource({
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

        self.mapView.map.on('dragend', function() { console.log('dragend Velocity'); self.redraw(); });
        self.mapView.map.on('zoomend', function() { console.log('zoomend Velocity'); self.updateNumVectorsToDisplay(); });

        mapView.layerSelectControl.addToggledOverlay('velocity', self.glOverlay, 'Velocity');

        self.resetGrid();

        return self;
    };


    VelocityView.prototype.resetGrid = function resetGrid(callback) {
        var self = this;

        // Build the set of vectors to display
        var options = {datasource: self.mapView.dataSource};
        self.velocityfs.withVelocityGridLocations(options, function(points) {
            self.points = points;
            self.updateNumVectorsToDisplay();

        });
    };


    VelocityView.prototype.clearCache = function clearCache(callback) {
        var self = this;

        self.velocityfs._velocity_frames = {};
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
        self.velocityfs.withVelocityFrame(options, function(data) {
            // Three lines per arrow
            //var llines = data.vectors.slice(0, self.numVectorsToDisplay * 3);
            //console.log(llines[0]);

            lines = [];
            var indx=data.indx[Math.max(4-self.zoomLevel,1)];

            for (var i = 0; i < indx.length; i++){
                lines.push(data.vectors[indx[i]*3]);
                lines.push(data.vectors[indx[i]*3+1]);
                lines.push(data.vectors[indx[i]*3+2]);
           }
           //console.log(lines.length);
           

            // XXX: We could be passing colors here now
            //self.glOverlay.setLines(lines, {41: 2, 32: 7, 305: 4});
            self.glOverlay.setLines(lines, Array(lines.length).fill(7),'velocity');
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
        //n = Math.max(Math.ceil(density * scale), nPoints);
        //n = 5000;
        
        self.zoomLevel=zoom-minZoom;
        console.log('Velocity show', n, 'at zoom level', zoom);
        self.numVectorsToDisplay = n;
        self.redraw();
    };


    return {
        velocityView: function velocityView(config) {
            return new VelocityView(config);
        }
    };

}(jQuery, L, Models, Config));

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

        self.tempfs = Models.temperatureFrameSource();

    };


    TemperatureView.prototype.addTo = function addTo(mapView) {
        var self = this;

        this.mapView = mapView;

        mapView.layerSelectControl.addToggledOverlay('temperature', self.temperatureGroup, 'Temperature');

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
        self.tempfs.withTemperatureFrame(config, function(data) {
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

var BuoysView = (function($, L, Models, Config) {

    var markers=[];
    var defaults = {

        // Zoom level
        zoomLevel: 0,
        // The number of vectors to display
        numVectorsToDisplay: 0,

        // The locations of the data points
        points: [],

        // Indexes of points
        inds:[],

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


    var BuoysView = function BuoysView(config) {

        var self = this;

        $.extend(self, defaults, config);

        // Convert to radians
        self.arrowHeadAngle *= Math.PI / 180;

        self.buoysfs = Models.buoysFrameSource({
            barbLocation: self.barbLocation,
            arrowHeadSize: self.arrowHeadSize,
            arrowHeadAngle: self.arrowHeadAngle
        });

        self.glOverlay = new L.WebGLVectorLayer();


    };


    BuoysView.prototype.addTo = function addTo(mapView) {
        var self = this;

        self.mapView = mapView;

        if (self.mapView.visibleLayers.buoys) {
            self.glOverlay.addTo(self.mapView.map);
        }

        self.mapView.map.on('dragend', function() { console.log('dragend Buoys'); self.redraw(); });
        self.mapView.map.on('zoomend', function() { console.log('zoomend Buoys'); self.updateNumVectorsToDisplay(); });

        mapView.layerSelectControl.addToggledOverlay('buoys', self.glOverlay, 'Buoys');

        self.resetGrid();

        return self;
    };


    BuoysView.prototype.resetGrid = function resetGrid(callback) {
        var self = this;

        // Build the set of vectors to display
        var options = {datasource: self.mapView.dataSource};
        self.buoysfs.withBuoysGridLocations(options, function(points) {
            self.points = points;
            self.updateNumVectorsToDisplay();

        });
    };


    BuoysView.prototype.clearCache = function clearCache(callback) {
        var self = this;

        self.buoysfs._buoys_frames = {};
    };


    BuoysView.prototype.redraw = function redraw(callback) {
        var self = this;

        // If we haven't been added to a map we don't bother redrawing
        if (!self.mapView || !self.points.length) {
            return self;
        }


        if (self.mapView.visibleLayers.buoys) {
        
            self.removeBuoys();
            
            var mymarker;
            var myIcon = L.icon({
               //iconUrl: 'https://image.winudf.com/1678/025263544a23a5df/icon=30x.png', //'http://leafletjs.com/docs/images/leaf-green.png',
               //iconUrl: 'http://data.glos.us/obs/imgs/3mdiscusbuoy.png',
			   iconUrl: 'imgs/circle.png',
               shadowUrl: '', //'http://leafletjs.com/docs/images/leaf-shadow.png',
               iconSize:  [8,8],   //[38, 95], // size of the icon
               shadowSize:   [50, 64], // size of the shadow
               iconAnchor: [4,4],  //[22, 94], // point of the icon which will correspond to marker's location
               shadowAnchor: [4, 62],  // the same for the shadow
               popupAnchor:  [0,-4] //[-3, -76] // point from which the popup should open relative to the iconAnchor
			   //iconSize:  [30,30],   //[38, 95], // size of the icon
               //shadowSize:   [50, 64], // size of the shadow
               //iconAnchor: [12.5,30],  //[22, 94], // point of the icon which will correspond to marker's location
               //shadowAnchor: [4, 62],  // the same for the shadow
               //popupAnchor:  [0,-30] //[-3, -76] // point from which the popup should open relative to the iconAnchor
            });

            mymarker = new L.marker([25.61, -96.02], {icon: myIcon}).bindPopup('<b>Great, excelent choise!</b>');
            Config.buoysMarkers.push(mymarker);

            mymarker = new L.marker([28.74, -92.99], {icon: myIcon}).bindPopup('<p>bla bla bla</p>');
            Config.buoysMarkers.push(mymarker);

            mymarker = new L.marker([28.73, -89.8], {icon: myIcon}).bindPopup('<b>Great, excelent choise!</b>');
            Config.buoysMarkers.push(mymarker);

            mymarker = new L.marker([27.77, -94.23], {icon: myIcon}).bindPopup('<p>bla bla bla</p>');
            Config.buoysMarkers.push(mymarker);

            for(var i=0;i<Config.buoysMarkers.length;i++){
               self.mapView.map.addLayer(Config.buoysMarkers[i]);
            }
        }
        else
        {
            if( Config.buoysMarkers.length != 0){
                self.removeBuoys();
            }

        }
        

        var options = {frame: self.mapView.currentFrame,
                       points: self.points,
                       mapScale: self.mapView.mapScale(),
                       datasource: mapView.dataSource};
        self.buoysfs.withBuoysFrame(options, function(data) {

            lines = [];
            var indx=data.indx;
            for (var i = 0; i < indx.length; i++){
                lines.push(data.vectors[indx[i]*3]);
                lines.push(data.vectors[indx[i]*3+1]);
                lines.push(data.vectors[indx[i]*3+2]);
            }

            self.glOverlay.setLines2D(lines, {}, 'buoys');
            callback && callback(data);
        });
    };


    BuoysView.prototype.updateNumVectorsToDisplay = function() {
        var self = this;
        var density = self.vectorDensity;
        var nPoints = self.points.length;
        var zoom = self.mapView.map.getZoom();
        var minZoom = self.mapView.minZoom;
        var scale = Math.pow(4, zoom - minZoom);
        var n = Math.min(Math.ceil(density * scale), nPoints);
        //n = Math.max(Math.ceil(density * scale), nPoints);
        //n = 5000;
        
        self.zoomLevel=zoom-minZoom;

        console.log('Buoys show', n, 'at zoom level', zoom);
        self.numVectorsToDisplay = n;
        self.redraw();
    };

    BuoysView.prototype.removeBuoys = function() {
        if( Config.buoysMarkers.length != 0){
            for(var i=0;i<Config.buoysMarkers.length;i++){
                self.mapView.map.removeLayer(Config.buoysMarkers[i]);
            }
            Config.buoysMarkers = [];
        }
    }


    return {
        buoysView: function buoysView(config) {
            return new BuoysView(config);
        }
    };

}(jQuery, L, Models, Config));

var RadarView = (function($, L, Models, Config) {

    var defaults = {

        // Zoom level
        zoomLevel: 0,

        // The number of vectors to display
        numVectorsToDisplay: 0,

        // The locations of the data points
        points: [],

        // Indexes of points
        inds:[],

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

        self.radarfs = Models.radarFrameSource({
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

        self.mapView.map.on('dragend', function() { console.log('dragend radar'); self.redraw(); });
        self.mapView.map.on('zoomend', function() { console.log('zoomend radar'); self.updateNumVectorsToDisplay(); });

        mapView.layerSelectControl.addToggledOverlay('radar', self.glOverlay, 'Radar');

        self.resetGrid();

        return self;
    };


    RadarView.prototype.resetGrid = function resetGrid(callback) {
        var self = this;

        // Build the set of vectors to display
        var options = {datasource: self.mapView.dataSource};
        self.radarfs.withRadarGridLocations(options, function(points) {
            self.points = points;
            self.updateNumVectorsToDisplay();

        });
    };


    RadarView.prototype.clearCache = function clearCache(callback) {
        var self = this;

        self.radarfs._radar_frames = {};
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
        self.radarfs.withRadarFrame(options, function(data) {
            // Three lines per arrow
            //var lines = data.vectors.slice(0, self.numVectorsToDisplay * 3);

            lines = [];
            var indx=data.indx[Math.max(3-self.zoomLevel,1)]

            for (var i = 0; i < indx.length; i++){
				if (data.vectors[indx[i]*3][0][0]!=data.vectors[indx[i]*3][1][0] || data.vectors[indx[i]*3][0][1]!=data.vectors[indx[i]*3][1][1]){
					lines.push(data.vectors[indx[i]*3]);
					lines.push(data.vectors[indx[i]*3+1]);
					lines.push(data.vectors[indx[i]*3+2]);
				}

           }

            // XXX: We could be passing colors here now
            //self.glOverlay.setLines(lines, {41: 2, 32: 7, 305: 4});
            self.glOverlay.setLines(lines, Array(lines.length).fill(7),'radar');
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
        self.zoomLevel=zoom-minZoom;
        console.log('RadarView show', n, 'at zoom level', zoom, 'scale:', scale);
        self.numVectorsToDisplay = n;
        self.redraw();
    };


    return {
        radarView: function radarView(config) {
            return new RadarView(config);
        }
    };

}(jQuery, L, Models, Config));