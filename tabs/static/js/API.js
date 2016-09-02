API = (function(Config, $) {

    var _json = {};

    function withJSON(url, callback) {
        if (_json[url] === undefined) {
            $.getJSON(url, function(json) {
                _json[url] = json;
                if (callback === undefined) console.log('Callback undefined');
                callback && callback(json);
            });
        } else {
            callback(_json[url]);
        }
    }

    function withVelocityFrameJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForVelocityFrame(options), callback);
        callback = callback;
    }

    function withVelocityGridLocationsJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForVelocityGridLocations(options), callback);
    }

    function withWindFrameJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForWindFrame(options), callback);
        callback = callback;
    }

    function withWindGridLocationsJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForWindGridLocations(options), callback);
    }

    function withBuoysFrameJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForBuoysFrame(options), callback);
        callback = callback;
    }

    function withBuoysGridLocationsJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForBuoysGridLocations(options), callback);
    }

    function withNoneFrameJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForNoneFrame(options), callback);
        callback = callback;
    }

    function withNoneGridLocationsJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForNoneGridLocations(options), callback);
    }

    function withSpeedFrameJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForSpeedFrame(options), callback);
        callback = callback;
    }

    function withSpeedGridLocationsJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForSpeedGridLocations(options), callback);
    }

    function withRadarFrameJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForRadarFrame(options), callback);
    }

    function withRadarGridLocationsJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForRadarGridLocations(options), callback);
    }

    function withSaltFrameJSON(options, callback) {
        withJSON(urlForSaltFrame(options), callback);
    }

    function withTemperatureFrameJSON(options, callback) {
        withJSON(urlForTemperatureFrame(options), callback);
    }

    function withFrameTimestamps(options, callback) {
        withJSON(urlForTimestamps(options), callback);
    }

    return {
        withJSON: withJSON,
        withVelocityFrameJSON: withVelocityFrameJSON,
        withVelocityGridLocationsJSON: withVelocityGridLocationsJSON,
        withWindFrameJSON: withWindFrameJSON,
        withWindGridLocationsJSON: withWindGridLocationsJSON,
        withBuoysFrameJSON: withBuoysFrameJSON,
        withBuoysGridLocationsJSON: withBuoysGridLocationsJSON,
        withSaltFrameJSON: withSaltFrameJSON,
        withTemperatureFrameJSON: withTemperatureFrameJSON,
        withSpeedFrameJSON: withSpeedFrameJSON,
        withFrameTimestamps: withFrameTimestamps,
        withRadarFrameJSON: withRadarFrameJSON,
        withRadarGridLocationsJSON: withRadarGridLocationsJSON,
        withNoneFrameJSON: withNoneFrameJSON,
        withNoneGridLocationsJSON: withNoneGridLocationsJSON
    };


    // Private functions
    function urlForTimestamps(options) {
        if (options.datasource === undefined) {
            console.log('options.datasource undefined');
            options.datasource = '';
        }
        url = Config.timestampURL;
        var query = $.query
            .set('datasource', options.datasource);
        return url + query;
    }

    function urlForVelocityGridLocations(options) {
        if (options.datasource === undefined) {
            console.log('options.datasource undefined');
            options.datasource = '';
        }
        url = Config.velocityGridLocationsURL;
        var query = $.query
            .set('datasource', options.datasource);
        return url + query;
    }

    function urlForVelocityFrame(options) {
        if (options.frame === undefined) {
            console.log('options.frame undefined (default 0)');
            options.frame = 0;
        }
        if (options.datasource === undefined) {
            console.log('options.datasource undefined');
            options.datasource = '';
        }
        url = Config.velocityFrameURL;
        var query = $.query
            .set('datasource', options.datasource);
        return url + options.frame + query;
    }

    function urlForWindFrame(options) {
        if (options.frame === undefined) {
            console.log('options.frame undefined (default 0)');
            options.frame = 0;
        }
        if (options.datasource === undefined) {
            console.log('options.datasource undefined');
            options.datasource = '';
        }
        url = Config.windFrameURL;
        var query = $.query
            .set('datasource', options.datasource);
        return url + options.frame + query;
    }

    function urlForWindGridLocations(options) {
        if (options.datasource === undefined) {
            console.log('options.datasource undefined');
            options.datasource = '';
        }
        url = Config.windGridLocationsURL;
        var query = $.query
            .set('datasource', options.datasource);
        return url + query;
    }

    function urlForBuoysFrame(options) {
        if (options.frame === undefined) {
            console.log('options.frame undefined (default 0)');
            options.frame = 0;
        }
        if (options.datasource === undefined) {
            console.log('options.datasource undefined');
            options.datasource = '';
        }
        url = Config.buoysFrameURL;
        var query = $.query
            .set('datasource', options.datasource);
        return url + options.frame + query;
    }

    function urlForBuoysGridLocations(options) {
        if (options.datasource === undefined) {
            console.log('options.datasource undefined');
            options.datasource = '';
        }
        url = Config.buoysGridLocationsURL;
        var query = $.query
            .set('datasource', options.datasource);
        return url + query;
    }

    function urlForSpeedGridLocations(options) {
        if (options.datasource === undefined) {
            console.log('options.datasource undefined');
            options.datasource = '';
        }
        url = Config.speedGridLocationsURL;
        var query = $.query
            .set('datasource', options.datasource);
        return url + query;
    }

    function urlForSpeedFrame(options) {
        if (options.frame === undefined) {
            console.log('options.frame undefined (default 0)');
            options.frame = 0;
        }
        var url = Config.speedFrameURL;
        var query = $.query
            .set('numTemperatureLevels', options.numSpeedLevels)
            .set('datasource', options.datasource)
            .set('logspace', options.logspaceSpeedLevels)
            .set('varname', 'speed');
        return url + options.frame + query;
    }

    function urlForSaltFrame(options) {
        if (options.frame === undefined) {
            console.log('options.frame undefined (default 0)');
            options.frame = 0;
        }
        var url = Config.saltFrameURL;
        var query = $.query
            .set('numSaltLevels', options.numSaltLevels)
            .set('datasource', options.datasource)
            .set('logspace', options.logspaceSaltLevels);
        return url + options.frame + query;
    }

    function urlForTemperatureFrame(options) {
        if (options.frame === undefined) {
            console.log('options.frame undefined (default 0)');
            options.frame = 0;
        }
        var url = Config.temperatureFrameURL;
        var query = $.query
            .set('numTemperatureLevels', options.numTemperatureLevels)
            .set('datasource', options.datasource)
            .set('logspace', options.logspaceTemperatureLevels)
            .set('varname', 'temp');
        return url + options.frame + query;
    }

    function urlForRadarGridLocations(options) {
        if (options.datasource === undefined) {
            console.log('options.datasource undefined');
            options.datasource = '';
        }
        url = Config.radarGridLocationsURL;
        var query = $.query
            .set('datasource', options.datasource);
        return url + query;
    }

    function urlForRadarFrame(options) {
        if (options.frame === undefined) {
            console.log('options.frame undefined (default 0)');
            options.frame = 0;
        }
        if (options.datasource === undefined) {
            console.log('options.datasource undefined');
            options.datasource = '';
        }
        url = Config.radarFrameURL;
        var query = $.query
            .set('datasource', options.datasource);
        return url + options.frame + query;
    }

}(Config, jQuery));
