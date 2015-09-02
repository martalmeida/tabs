L.Control.DatetimePickerControl = L.Control.extend({
    options: {
        position: 'topright',
        layers: null,
        language: 'en',
    },

    value: function(value) {
        if (value !== undefined) {
            this.picker.setDate(new Date(value));
        }
        return this.picker.getDate().getTime();
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
        this.startPicker();
        return this;
    },

    onAdd: function (map) {
        this.options.map = map;

        var classes = ['tabs-control',
                       'datetimepicker',
                       'leaflet-control'].join(' ');
        this.container = L.DomUtil.create('div', classes, this._container);

        $container = $(this.container);

        // Add the datetime picker
        $container.append(
            '<div>' +
            '  <div id="datetimepicker" class="input-append">' +
            '    <input data-format="MM/dd/yyyy HH:mm:ss PP" type="text"></input>' +
            '    <span class="add-on">' +
            '      <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>' +
            '    </span>' +
            '  </div>' +
            '</div>'
        );

        //Prevent map panning/zooming while using the picker
        $container.mousedown(function () {
            map.dragging.disable();
            map.doubleClickZoom.disable();
        });
        $(document).mouseup(function () {
            map.dragging.enable();
            map.doubleClickZoom.enable();
        });

        return this.container;
    },

    onRemove: function (map) {
        // Remove the picker div
        $('#leaflet-datetimepicker').remove();
    },

    picker: null,

    startPicker: function () {
        var _options = this.options;
        var picker = $('#datetimepicker').datetimepicker(_options);
        picker.on('changeDate', this.options.onChangeDate);
        this.picker = picker.data('datetimepicker');
        this.picker.setDate(new Date());
    }
});

L.control.datetimePickerControl = function (options) {
    return new L.Control.DatetimePickerControl(options);
};

