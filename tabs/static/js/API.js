API = (function(Config, $) {

    var _json = {};

    function withJSON(url, callback) {
        if (_json[url] == undefined) {
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
        withJSON(Config.velocityGridLocationsURL, callback);
    }

    function withSaltFrameJSON(options, callback) {
        withJSON(urlForSaltFrame(options), callback);
    }

    return {
        withJSON: withJSON,
        withVelocityFrameJSON: withVelocityFrameJSON,
        withVelocityGridLocationsJSON: withVelocityGridLocationsJSON,
        withSaltFrameJSON: withSaltFrameJSON
    };


    // Private functions

    function urlForVelocityFrame(options) {
        if (options.frame === undefined) {
            console.log('options.frame undefined (default 0)');
            options.frame = 0;
        }
        url = Config.velocityFrameURL;
        return url + options.frame;
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
