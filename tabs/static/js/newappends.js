function getColor(d) {
  return d == 0  ? '#2b136f' : // <5
         d == 5   ? '#2c1b86' : // 5-8
         d ==8   ? '#183a95' :
         d ==11  ? '#08558d' :
         d ==14  ? '#1a6a88' :
         d ==17  ? '#2e7d87' :
         d ==20  ? '#3e9187' :
         d ==23  ? '#4ea684' :
         d ==26  ? '#64ba7b' :
         d ==29  ? '#88cc6e' :
         d ==32  ? '#bdda70' :
         d ==35  ? '#eae69e' : // 35--38
                   '#cccccc';
}

function legend() {
    var div = L.DomUtil.create('div', 'info legend leaflet-control'),
        grades = [0, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        labels = [],
        from, to;

    for (var i = 0; i < grades.length; i++) {
        from = grades[i];
        to = grades[i + 1];

          if (i==0){
            labels.push('<i style="background:' + getColor(from) + '"></i> ' + '&lt' +to);
          }else if (i==grades.length-1){
            labels.push('<i style="background:' + getColor(from) + '"></i> ' + '&gt' +from);
        } else {
            labels.push('<i style="border-bottom: 0px solid white;background:' + getColor(from) + '"></i> ' + from + '&ndash;' +to);
        }
    }

    div.id = 'salinity_legend';
    div.innerHTML = labels.join('<br>');
    div.innerHTML += '<div id=\"opacityslider\"></div>';
    return div;
};


$(function() {
    //atribuição de opacidade de 50% para o SVG
    $('.leaflet-bottom.leaflet-right>.leaflet-control-attribution').before(legend());

    if(mapView.visibleLayers.salinity) {
        $('#salinity_legend').show();
    }
    else {
        $('#salinity_legend').hide();
    }
    
    $('#opacityslider').slider({
        min:25,
    max:100,
    value:50,
    step:1,
    slide: function( event, ui ) {
        var opa = ui.value/100;
        $('svg').css('opacity', opa);
        $('#salinity_legend > i').css('opacity', opa);
    }
    });
    
    $('#opacityslider').mousedown(function () {
        mapView.map.dragging.disable()
    });
   
});