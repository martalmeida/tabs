var TABSControl = (function(Config) {

    Number.prototype.padLeft = function(width, chr) {
        var len = ((width || 2) - String(this).length) + 1;
        return len > 0 ? new Array(len).join(chr || '0') + this : this;
    };

    var defaults = {
        nFrames: 0
    };

    var TABSControl = L.Control.extend({

        initialize: function(options) {
            L.setOptions(this, defaults);
            L.setOptions(this, options);
            this.frame = 0;
            this.numSaltLevels = 0;
            this.date = new Date();
        },

        onAdd: function(map) {
            this._map = map;

            // Steal the attribution CSS for now
            var classes = ['tabs-control',
                           'leaflet-control-attribution',
                           'leaflet-control'].join(' ');
            this.container = L.DomUtil.create('div', classes);

            // Toggle the run state
            this.container.onclick = this.options.onclick;

            this._redraw();
            return this.container;
        },

        updateInfo: function(info) {
            if (info) {

                if (info.frame !== undefined) {
                    this.frame = info.frame;
                }

                if (info.date !== undefined) {
                    if (info.date[info.date.length - 1] != 'Z') {
                        info.date += 'Z';
                    }
                    this.date = new Date(Date.parse(info.date));
                }

                if (info.numSaltLevels !== undefined) {
                    this.numSaltLevels = info.numSaltLevels;
                }

                if (info.nFrames !== undefined) {
                    this.nFrames = info.nFrames;
                }

                this._redraw();
            }
        },

        _redraw: function() {
            var self = this;
            var nFrames = this.options.nFrames;
            this.container.innerHTML = this._renderLines([
                self._renderDate(self.date),
                self._renderFrameCount(self.frame, nFrames),
                self._renderSaltLevels(self.numSaltLevels)
            ]);
        },

        _renderLines: function renderLines(lines) {
            text = [];
            for (var i = 0, len = lines.length; i < len; i++) {
                if (lines[i]) {
                    text.push(lines[i]);
                }
            }
            return text.join('<br/>');
        },

        _renderFrameCount: function renderFrameCount(frame, nFrames) {
            return 'Frame: ' + frame.padLeft(2) + ' / ' + nFrames;
        },

        _renderSaltLevels: function renderSaltLevels(levels) {
            return levels ? 'Contour Levels: ' + levels : '';
        },

        _renderDate: function renderDate(d) {
            var day_month_year = [d.getUTCDate().padLeft(),
                                  Config.monthStrings[d.getUTCMonth()],
                                  d.getFullYear()].join(' ');
            var hour_min = [d.getHours().padLeft(),
                            d.getMinutes().padLeft()].join(':');
            return day_month_year + '<br/>' + hour_min + ' UTC';
        }
    });


    return {
        tabsControl: function(options) {
            return new TABSControl(options);
        }
    };

}(Config));
