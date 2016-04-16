Models = {}
Models.velocityFrameSource = (function($, Trig, Config) {

    var defaults = {
        barbLocation: Config.barbLocation,
        barbDescriptions: Config.barbDescriptions,
        arrowHeadSize: Config.arrowHeadSize,
        arrowHeadAngle: Config.arrowHeadAngle
    };

    function VelocityFrameSource(config) {
        $.extend(this, defaults, config);
        this._velocity_frames = {};
        this.setBarbLocation(this.barbLocation);
    };

    VFS_proto = VelocityFrameSource.prototype;


    // parse the velocity frames and return lines in lat/lon space
    VFS_proto._getDataSnapshot = function _getDataSnapshot(
            points, scale, velocityVectors) {
        var nPoints = points.length;
        var vectors = [];
        for (var i = 0; i < nPoints; i++) {
            var dlat = velocityVectors.v[i] * scale * 0.5;
            var dlon = velocityVectors.u[i] * scale * 0.5;
            var endpoint = [points[i][0] + dlat, points[i][1] + dlon];
            var startpoint = [points[i][0] - dlat, points[i][1] - dlon];

            var barb = make_barb(startpoint, endpoint, this.barbPosition,
                                 this.arrowHeadSize, this.arrowHeadAngle);
            vectors.push([barb[0], barb[1]],
                         [barb[2], barb[1]],
                         [endpoint, startpoint]);
        }
        date = velocityVectors.date;
        return {date: date, vectors: vectors};
    };


    VFS_proto.setBarbLocation = function setBarbLocation(
            barbLocation) {
        this.barbPosition = barbPositionFrom(
            this.barbDescriptions[barbLocation]);
    };


    VFS_proto.withVelocityGridLocations = function withVelocityGridLocations(
            options, callback) {
        API.withVelocityGridLocationsJSON(options, function(data) {
            if (callback === undefined) console.log('Callback undefined');
            var nPoints = data['lat'].length;
            var points = new Array(nPoints);
            for (var i = 0; i < nPoints; i++) {
                points[i] = [data.lat[i], data.lon[i]];
            }
            callback && callback(points);
        });
    };


    VFS_proto.withVelocityFrame = function withVelocityFrame(
            options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        var self = this;
        var scale = options.mapScale;
        var frame = options.frame;
        var points = options.points;
        if (self._velocity_frames[scale] === undefined) {
            self._velocity_frames[scale] = [];
        }
        if (self._velocity_frames[scale][frame] === undefined) {
            API.withVelocityFrameJSON(options, function(obj) {
                var vector_frame = self._getDataSnapshot(points, scale, obj);
                self._velocity_frames[scale][frame] = vector_frame;
                callback && callback(vector_frame);
            });
        } else {
            callback && callback(self._velocity_frames[scale][frame]);
        }
    };


    return function velocityFrameSource(config) {
        return new VelocityFrameSource(config);
    };


    // Private functions

    function make_barb(
            start, end, barbPosition, arrowHeadSize, arrowHeadAngle) {
        barbPosition = barbPosition == undefined ? 1.0 : barbPosition;
        // Return the three points needed to put a 'barb' on a line segment
        // left tail, center, right tail
        var theta = Trig.relativeAngle(start, end);
        var lat = start[0] * (1 - barbPosition) + end[0] * barbPosition;
        var lon = start[1] * (1 - barbPosition) + end[1] * barbPosition;
        var p = Trig.rotate([[lat, lon]], -theta)[0];

        var dx2 = Math.pow(end[1] - start[1], 2);
        var dy2 = Math.pow(end[0] - start[0], 2);
        var length = Math.sqrt(dx2 + dy2) * arrowHeadSize;
        var arrowX = length * Math.cos(arrowHeadAngle);
        var arrowY = length * Math.sin(arrowHeadAngle);
        var lng = p[1] - arrowX;
        var latL = p[0] + arrowY;
        var latR = p[0] - arrowY;

        var barb_points = Trig.rotate([[latL, lng], p, [latR, lng]], theta);

        return barb_points;
    }

    function barbPositionFrom(barbLocation) {
        if (Number.isFinite(barbLocation)) {
            return Math.min(Math.max(barbLocation, 0), 1);
        } else {
            console.log('Invalid barbLocation (' + barbLocation + ')');
            return 1.0;
        }
    }

}(jQuery, Trig, Config));

Models.saltFrameSource = (function($, Config) {

    var defaults = {
    };

    function SaltFrameSource(config) {
        $.extend(this, defaults, config);

        // We don't need to cache salt frames because they currently come
        // straight from the geoJSON.
        // If that changes, we'll have to think about the right way to cache
        // with multiple parameters and JS's ridiculous handling of Object.
    };

    SFS_proto = SaltFrameSource.prototype;

    SFS_proto.withSaltFrame = function withSaltFrame(config, callback) {
        var self = this;
        API.withSaltFrameJSON(config, function(obj) {
            callback && callback(obj);
        });
    };

    return function saltframeSource(config) {
        return new SaltFrameSource(config);
    };


}(jQuery, Config));

Models.radarFrameSource = (function($, Trig, Config) {

    var defaults = {
        barbLocation: Config.barbLocation,
        barbDescriptions: Config.barbDescriptions,
        arrowHeadSize: Config.arrowHeadSize,
        arrowHeadAngle: Config.arrowHeadAngle
    };

    function RadarFrameSource(config) {
        $.extend(this, defaults, config);
        this._redar_frames = {};
        this.setBarbLocation(this.barbLocation);
    };

    RFS_proto = RadarFrameSource.prototype;


    // parse the radar frames and return lines in lat/lon space
    RFS_proto._getDataSnapshot = function _getDataSnapshot(
            points, scale, radarVectors) {
        var nPoints = points.length;
        var vectors = [];
        for (var i = 0; i < nPoints; i++) {
            var dlat = radarVectors.v[i] * scale * 0.5;
            var dlon = radarVectors.u[i] * scale * 0.5;
            var endpoint = [points[i][0] + dlat, points[i][1] + dlon];
            var startpoint = [points[i][0] - dlat, points[i][1] - dlon];

            var barb = make_barb(startpoint, endpoint, this.barbPosition,
                                 this.arrowHeadSize, this.arrowHeadAngle);
            vectors.push([barb[0], barb[1]],
                         [barb[2], barb[1]],
                         [endpoint, startpoint]);
        }
        date = velocityVectors.date;
        return {date: date, vectors: vectors};
    };


    RFS_proto.setBarbLocation = function setBarbLocation(
            barbLocation) {
        this.barbPosition = barbPositionFrom(
            this.barbDescriptions[barbLocation]);
    };


    RFS_proto.withRadarGridLocations = function withRadarGridLocations(
            options, callback) {
        API.withRadarGridLocationsJSON(options, function(data) {
            if (callback === undefined) console.log('Callback undefined');
            var nPoints = data['lat'].length;
            var points = new Array(nPoints);
            for (var i = 0; i < nPoints; i++) {
                points[i] = [data.lat[i], data.lon[i]];
            }
            callback && callback(points);
        });
    };


    RFS_proto.withRadarFrame = function withRadarFrame(
            options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        var self = this;
        var scale = options.mapScale;
        var frame = options.frame;
        var points = options.points;
        if (self._radar_frames[scale] === undefined) {
            self._radar_frames[scale] = [];
        }
        if (self._radar_frames[scale][frame] === undefined) {
            API.withRadarFrameJSON(options, function(obj) {
                var vector_frame = self._getDataSnapshot(points, scale, obj);
                self._radar_frames[scale][frame] = vector_frame;
                callback && callback(vector_frame);
            });
        } else {
            callback && callback(self._radar_frames[scale][frame]);
        }
    };


    return function radarFrameSource(config) {
        return new RadarFrameSource(config);
    };


    // Private functions

    function make_barb(
            start, end, barbPosition, arrowHeadSize, arrowHeadAngle) {
        barbPosition = barbPosition == undefined ? 1.0 : barbPosition;
        // Return the three points needed to put a 'barb' on a line segment
        // left tail, center, right tail
        var theta = Trig.relativeAngle(start, end);
        var lat = start[0] * (1 - barbPosition) + end[0] * barbPosition;
        var lon = start[1] * (1 - barbPosition) + end[1] * barbPosition;
        var p = Trig.rotate([[lat, lon]], -theta)[0];

        var dx2 = Math.pow(end[1] - start[1], 2);
        var dy2 = Math.pow(end[0] - start[0], 2);
        var length = Math.sqrt(dx2 + dy2) * arrowHeadSize;
        var arrowX = length * Math.cos(arrowHeadAngle);
        var arrowY = length * Math.sin(arrowHeadAngle);
        var lng = p[1] - arrowX;
        var latL = p[0] + arrowY;
        var latR = p[0] - arrowY;

        var barb_points = Trig.rotate([[latL, lng], p, [latR, lng]], theta);

        return barb_points;
    }

    function barbPositionFrom(barbLocation) {
        if (Number.isFinite(barbLocation)) {
            return Math.min(Math.max(barbLocation, 0), 1);
        } else {
            console.log('Invalid barbLocation (' + barbLocation + ')');
            return 1.0;
        }
    }

}(jQuery, Trig, Config));

