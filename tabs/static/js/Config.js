
var Config = {

    // API
    velocityGridLocationsURL: '/data/thredds/velocity/grid',
    velocityFrameURL: '/data/thredds/velocity/step/',
    saltFrameURL: '/data/thredds/salt/step/',
    domainURL: '/data/prefetched/domain',
    timestampURL: '/data/thredds/timestamps',
    buoyURL: '/data/thredds/buoys',
    tileLayerURL: 'https://{s}.tiles.mapbox.com/v4/tabs-enthought.j3nibphe/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoidGFicy1lbnRob3VnaHQiLCJhIjoiX0RNTzlmbyJ9.gio9AiDol4CT13yJ2GyRHw',

    // Vector style
    barbLocation: 'head',
    barbDescriptions: {tail: 0, center: 0.5, head: 1.0},
    arrowHeadSize: 0.15,
    arrowHeadAngle: 60,
    vectorDensity: 1000,

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

    // Data Sources
    enableVelocity: true,
    enableSalinity: false,


    // Map view config
    minZoom: 7,
    defaultZoom: 7,
    maxZoom: 11,
    mapCenter: [26.946556420812623, -92.8289794921875],

    // Pause between frames (in ms)
    delay: 90,

    // Does the animation automatically start?
    isRunning: true,

    // Number of time steps to use
    nFrames: 30,

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
    },

    monthStrings: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    buoyLocations: {
        'B': {'lat': 28.9823, 'lon': -94.89906},
        'D': {'lat': 27.9396, 'lon': -96.8429 },
        'F': {'lat': 28.8425, 'lon': -94.2416 },
        'J': {'lat': 26.1914, 'lon': -97.0507 },
        'K': {'lat': 26.2168, 'lon': -96.4998 },
        'N': {'lat': 27.8903, 'lon': -94.0367 },
        'R': {'lat': 29.635 , 'lon': -93.6417 },
        'V': {'lat': 27.8966, 'lon': -93.5973 },
        'W': {'lat': 28.3507, 'lon': -96.0058 }
    }
};
