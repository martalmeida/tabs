
var Trig = {
    relativeAngle: function(start, end) {
        var dx = end[1] - start[1];
        var dy = end[0] - start[0];
        return Math.atan2(dy, dx);
    },

    rotate: function(points, theta) {
        var c0 = Math.cos(theta);
        var s0 = Math.sin(theta);
        var new_points = [];
        for (var i = 0, len = points.length; i < len; i++) {
            var p = points[i];
            var x2 = p[1] * c0 - p[0] * s0;
            var y2 = p[1] * s0 + p[0] * c0;
            new_points.push([y2, x2]);
        }
        return new_points;
    }
};
