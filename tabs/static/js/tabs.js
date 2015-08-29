var showFPS = 30;
var mapView = MapView.mapView({});
if (Config.isRunning) {
    // FIXME: This can crash if frame 1 tries to load before mapView populates
    // mapView.start();
}
