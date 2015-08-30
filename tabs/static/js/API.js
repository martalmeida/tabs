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
    }


    function withVelocityGridLocationsJSON(options, callback) {
        if (callback === undefined) console.log('Callback undefined');
        withJSON(urlForVelocityGridLocations(options), callback);
    }

    function withSaltFrameJSON(options, callback) {
        withJSON(urlForSaltFrame(options), callback);
    }

    function withFrameTimestamps(options, callback) {
        withJSON(urlForTimestamps(options), callback);
    }

    return {
        withJSON: withJSON,
        withVelocityFrameJSON: withVelocityFrameJSON,
        withVelocityGridLocationsJSON: withVelocityGridLocationsJSON,
        withSaltFrameJSON: withSaltFrameJSON,
        withFrameTimestamps: withFrameTimestamps
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
        var api_frame = options.frame + options.frameOffset;
        var query = $.query
            .set('datasource', options.datasource);
        return url + api_frame + query;
    }

    function urlForSaltFrame(options) {
        if (options.frame === undefined) {
            console.log('options.frame undefined (default 0)');
            options.frame = 0;
        }
        var url = Config.saltFrameURL;
        var query = $.query
            .set('numSaltLevels', options.numSaltLevels)
            .set('logspace', options.logspaceSaltLevels);
        return url + options.frame + query;
    }

}(Config, jQuery));
