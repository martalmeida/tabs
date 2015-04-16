
var Config = {

    // API
    velocityGridLocationsURL: '/data/thredds/velocity/grid',
    velocityFrameURL: '/data/thredds/velocity/step/',
    saltFrameURL: '/data/thredds/salt/step/',
    domainURL: '/data/prefetched/domain',
    tileLayerURL: 'https://{s}.tiles.mapbox.com/v4/tabs-enthought.j3nibphe/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoidGFicy1lbnRob3VnaHQiLCJhIjoiX0RNTzlmbyJ9.gio9AiDol4CT13yJ2GyRHw',

    // Vector style
    barbLocation: 'head',
    barbDescriptions: {tail: 0, center: 0.5, head: 1.0},
    arrowHeadSize: 0.15,
    arrowHeadAngle: 60,

    // Contour style
    contourOptions: {
        numSaltLevels: 10,
        logspaceSaltLevels: false,

        // Parameters defined here override the data
        // Contour outline color (Undefined matches the fill color)
        // color: 'black',
        // Contour outline weight
        weight: 0.5,
        // Contour outline opacity
        opacity: 1,
        // Contour fill opacity
        fillOpacity: 0.5
    },


    // Map view config
    minZoom: 7,
    defaultZoom: 7,
    maxZoom: 11,

    // Pause between frames (in ms)
    delay: 90,

    // Does the animation automatically start?
    isRunning: true,

    // Number of time steps to use
    nFrames: 90,

    // Distance scale configuration
    distanceScaleOptions: {
        // The position of the control (one of the map corners).
        // ('top' x 'bottom') + ('left' x 'right')
        position: 'bottomleft',
        // Maximum width of the control in pixels.
        maxWidth: 400,
        // Whether to show the metric scale line (m/km).
        metric: true,
        // Whether to show the imperial scale line (mi/ft).
        imperial: true,
        // If true, the control is only updated after the map has stopped
        // moving, otherwise it's always up-to-date (updated on move).
        updateWhenIdle: false
    },

    // Which data is shown by default?
    visibleLayers: {
        velocity: true,
        salinity: false
    }

};
