L.Control.SliderControl = L.Control.extend({
    options: {
        position: 'topright',
        layers: null,
        maxValue: -1,
        minValue: -1,
        markers: null,
        range: false,
        follow: false,
    },

    value: function(value) {
        if (value !== undefined) {
            $('#leaflet-slider').slider("value", value);
        }
        return $('#leaflet-slider').slider("value");
    },

    initialize: function (options) {
        L.Util.setOptions(this, options);
        this._layer = this.options.layer;

    },

    setPosition: function (position) {
        var map = this._map;

        if (map) {
            map.removeControl(this);
        }

        this.options.position = position;

        if (map) {
            map.addControl(this);
        }
        this.startSlider();
        return this;
    },

    onAdd: function (map) {
        this.options.map = map;

        // Create a control sliderContainer with a jquery ui slider
        var sliderContainer = L.DomUtil.create('div', 'slider', this._container);
        $(sliderContainer).append('<div id="leaflet-slider" style="width:200px"><div class="ui-slider-handle"></div><div id="slider-timestamp" style="width:200px; margin-top:10px;background-color:#FFFFFF"></div></div>');
        //Prevent map panning/zooming while using the slider
        $(sliderContainer).mousedown(function () {
            map.dragging.disable();
        });
        $(document).mouseup(function () {
            map.dragging.enable();
            //Only show the slider timestamp while using the slider
            $('#slider-timestamp').html('');
        });

        var options = this.options;
        this.options.markers = [];

        //If a layer has been provided: calculate the min and max values for the slider
        if (this._layer) {
            this._layer.eachLayer(function (layer) {
                if (options.minValue === -1) {
                    options.minValue = layer._leaflet_id;
                }
                options.maxValue = layer._leaflet_id;
                options.markers[layer._leaflet_id] = layer;
            });
            this.options = options;
        } else {
            // console.log("Error: You have to specify a layer via new SliderControl({layer: your_layer});");
        }
        return sliderContainer;
    },

    onRemove: function (map) {
        // Remove the slider div
        $('#leaflet-slider').remove();
    },

    startSlider: function () {
        _options = this.options;
        $("#leaflet-slider").slider({
            range: _options.range,
            value: _options.minValue,
            min: _options.minValue,
            max: _options.maxValue,
            step: 1,
            slide: function (e, ui) {
                var map = _options.map;
                $('#slider-timestamp').html(ui.value);
                _options.slide && _options.slide(e, ui);
            }
        });
    }
});

L.control.sliderControl = function (options) {
    return new L.Control.SliderControl(options);
};
