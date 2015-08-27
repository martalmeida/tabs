var showFPS = 30;
var mapView = MapView.mapView({isRunning: false});
// mapView.addRegionOutline();
if (Config.isRunning) {
    // FIXME: This can crash if frame 1 tries to load before mapView populates
    // mapView.start();
}
