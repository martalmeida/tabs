/*AUX MathFunctions*/
function dot(a,b){
	return a.x*b.x+a.y*b.y;
}

function norm2(a,b){
	return Math.sqrt(Math.pow(a.x-b.x,2)+Math.pow(a.y-b.y,2));
}

function norm(a){
	return Math.sqrt(Math.pow(a.x,2)+Math.pow(a.y,2));
}

function somVect(a,b){
	var v = new Object;
	var v_x = a.x+b.x;
	var v_y = a.y+b.y;
	v.x=v_x;
	v.y=v_y;
	return v;
}

function prodScalar(a,k){
	var v = new Object;
	var v_x = a.x*k;
	var v_y = a.y*k;
	v.x=v_x;
	v.y=v_y;
	return v;
}

/*AUX Colors and Legends*/

function getColorSalinity(d) {
  return d == 0  ? '#2b136f' : // <5
         d == 5   ? '#2c1b86' : // 5-8
         d == 8   ? '#183a95' :
         d == 11  ? '#08558d' :
         d == 14  ? '#1a6a88' :
         d == 17  ? '#2e7d87' :
         d == 20  ? '#3e9187' :
         d == 23  ? '#4ea684' :
         d == 26  ? '#64ba7b' :
         d == 29  ? '#88cc6e' :
         d == 32  ? '#bdda70' :
         d == 35  ? '#eae69e' : // 35--38
                    '#cccccc';
}

function getColorTemperature(d) {
  return d == 0  ? '#032333' : 
         d == 20   ? '#082d54' : 
         d == 20.5   ? '#39339d' :
         d == 21  ? '#6c4594' :
         d == 21.5  ? '#985789' :
         d == 22  ? '#c86675' :
         d == 22.5  ? '#f07e50' :
         d == 23  ? '#fbac3c' :
         d == 23.5  ? '#f2e04d' :
                    '#e7fa5a';
}

function getColorSpeed(d) {
  return d == 0  ? '#f5ecaf' : 
         d == 0.22   ? '#e0cd72' : 
         d == 0.44   ? '#bfb537' :
         d == 0.66  ? '#92a30e' :
         d == 0.88  ? '#5f910c' :
         d == 1.11  ? '#2d7d20' :
         d == 1.33  ? '#0b662b' :
         d == 1.55  ? '#144a2a' :
         d == 1.77  ? '#19301c' :
         '#000';
}

function legendTemperature() {
    var div = L.DomUtil.create('div', 'info legend leaflet-control'),
        grades = ['0', '20.0', '20.5', '21.0', '21.5', '22.0', '22.5', '23.0', '23.5', '24.0', '100'],
        labels = [],
        from, to;

    for (var i = grades.length-2; i >= 0; i--) {
        from = grades[i];
        to = grades[i + 1];

          if (i==0){
            labels.push('<i style="background:' + getColorTemperature(from) + '"></i> ' + '&lt' +to);
          }else if (i==grades.length-2){
            labels.push('<i style="background:' + getColorTemperature(from) + '"></i> ' + '&gt' +from);
        } else {
            labels.push('<i style="border-bottom: 0px solid white;background:' + getColorTemperature(from) + '"></i> ' + from + '&ndash;' +to);
        }
    }

    div.id = 'temperature_legend';
    div.innerHTML = labels.join('<br>');
    div.innerHTML += '<div id=\"opacityslidertemperature\"></div>';
    return div;
};

function legendSalinity() {
    var div = L.DomUtil.create('div', 'info legend leaflet-control'),
        grades = [0, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        labels = [],
        from, to;

    for (var i = 0; i < grades.length; i++) {
        from = grades[i];
        to = grades[i + 1];

          if (i==0){
            labels.push('<i style="background:' + getColorSalinity(from) + '"></i> ' + '&lt' +to);
          }else if (i==grades.length-1){
            labels.push('<i style="background:' + getColorSalinity(from) + '"></i> ' + '&gt' +from);
        } else {
            labels.push('<i style="border-bottom: 0px solid white;background:' + getColorSalinity(from) + '"></i> ' + from + '&ndash;' +to);
        }
    }

    div.id = 'salinity_legend';
    div.innerHTML = labels.join('<br>');
    div.innerHTML += '<div id=\"opacityslidersalinity\"></div>';
    return div;
};

function legendSpeed() {
    var div = L.DomUtil.create('div', 'info legend leaflet-control'),
        grades = [0, 0.22, 0.44, 0.66, 0.88, 1.11, 1.33, 1.55, 1.77, 2],
        labels = [],
        from, to;

    for (var i = 0; i < grades.length; i++) {
        from = grades[i];
        to = grades[i + 1];

          if (i==0){
            labels.push('<i style="background:' + getColorSpeed(from) + '"></i> ' + '&lt' +to);
          }else if (i==grades.length-1){
            labels.push('<i style="background:' + getColorSpeed(from) + '"></i> ' + '&gt' +from);
        } else {
            labels.push('<i style="border-bottom: 0px solid white;background:' + getColorSpeed(from) + '"></i> ' + from + '&ndash;' +to);
        }
    }

    div.id = 'speed_legend';
    div.innerHTML = labels.join('<br>');
    div.innerHTML += '<div id=\"opacitysliderspeed\"></div>';
    return div;
};

function checkLegendsToShow(alpha){
	var selectedleafletcontrol = $('input[class=leaflet-control-layers-selector]:checked').parent().text().toLowerCase();
    $('#salinity_legend').toggle(mapView.visibleLayers.salinity && selectedleafletcontrol.indexOf("salinity")>=0);
    $('#temperature_legend').toggle(mapView.visibleLayers.temperature && selectedleafletcontrol.indexOf("temperature")>=0);
    $('#speed_legend').toggle(mapView.visibleLayers.speed && selectedleafletcontrol.indexOf("speed")>=0);
	$('#opacityslidersalinity').slider({'value': alpha});
	$('#opacityslidertemperature').slider({'value': alpha});
	$('#opacitysliderspeed').slider({'value': alpha});
	$('#salinity_legend > i').css('opacity', alpha);
	$('#temperature_legend > i').css('opacity', alpha);
	$('#speed_legend > i').css('opacity', alpha);
}

$(function() {
    //atribuição de opacidade de 50% para o SVG
    $('.leaflet-bottom.leaflet-right>.leaflet-control-attribution').before(legendSalinity());
    $('.leaflet-bottom.leaflet-right>.leaflet-control-attribution').before(legendTemperature());
    $('.leaflet-bottom.leaflet-right>.leaflet-control-attribution').before(legendSpeed());

    checkLegendsToShow(Config.opacityLegend);

    $('#opacityslidersalinity').slider({
        min:10,
        max:100,
        value:100,
        step:1,
        change: function(event, ui){
           //$('#opacityslidertemperature').slider({'value':ui.value});
           //$('#opacitysliderspeed').slider({'value':ui.value});
        },
        slide: function( event, ui ) {
			Config.opacityLegend=ui.value;
            var opa = ui.value/100;
            $('svg').css('opacity', opa);
            $('#salinity_legend > i').css('opacity', opa);
        }
    });

    $('#opacityslidertemperature').slider({
        min:10,
        max:100,
        value:100,
        step:1,
        change: function(event, ui){
           //$('#opacityslidersalinity').slider({'value':ui.value});
           //$('#opacitysliderspeed').slider({'value':ui.value});
        },
        slide: function( event, ui ) {
			Config.opacityLegend=ui.value;
            var opa = ui.value/100;
            $('svg').css('opacity', opa);
            $('#temperature_legend > i').css('opacity', opa);
        }
    });

    $('#opacitysliderspeed').slider({
        min:10,
        max:100,
        value:100,
        step:1,
        change: function(event, ui){
           //$('#opacityslidersalinity').slider({'value':ui.value});
           //$('#opacityslidertemperature').slider({'value':ui.value});
        },
        slide: function( event, ui ) {
			Config.opacityLegend=ui.value;
            var opa = ui.value/100;
            $('svg').css('opacity', opa);
            $('#speed_legend > i').css('opacity', opa);
        }
    });

    $('#opacityslidersalinity').mousedown(function () {
        mapView.map.dragging.disable()
    });
    $('#opacityslidertemperature').mousedown(function () {
        mapView.map.dragging.disable()
    });
    $('#opacitysliderspeed').mousedown(function () {
        mapView.map.dragging.disable()
    });
    $('#opacityslidersalinity').mouseup(function () {
        var v=$('#opacityslidersalinity').slider("option", "value");
        $('#opacityslidertemperature').slider({'value': v});
        $('#opacitysliderspeed').slider({'value': v});
    });
    $('#opacityslidertemperature').mouseup(function () {
        var v=$('#opacityslidertemperature').slider("option", "value");
        $('#opacityslidersalinity').slider({'value': v});
        $('#opacitysliderspeed').slider({'value': v});
    });
    $('#opacitysliderspeed').mouseup(function () {
        var v=$('#opacitysliderspeed').slider("option", "value");
        $('#opacityslidertemperature').slider({'value': v});
        $('#opacityslidersalinity').slider({'value': v});
    });


    $('input[class=leaflet-control-layers-selector]').change(function() {
        checkLegendsToShow(Config.opacityLegend);
		mapView.redraw();
		
    });
	
	
	//events to append in StepSlider buttons
	$(".leaflet-slider-minus").click(function(){
		var value = $('#leaflet-slider').slider("value");
		var newvalue = (value>0) ? value-1 : 0;
		$('#leaflet-slider').slider("value", newvalue);
		mapView.showTimeStep(newvalue);
	});
	$(".leaflet-slider-plus").click(function(){
		var value = $('#leaflet-slider').slider("value");
		var newvalue = (value<mapView.nFrames) ? value+1 : mapView.nFrames;
		$('#leaflet-slider').slider("value", newvalue);
		mapView.showTimeStep(newvalue);
	});

	
	$('label>span').each(function (i){
		if($(this).html().trim()!="None"){
			var myid = ['Salinity','Temperature','Speed'].indexOf($(this).html().trim())>-1;
			var v = myid ? 's': 'v';
			$(this).prepend('<img src="imgs/' + v + 'field_32.png" class="leaflet-control-icons" alt="" />');
		}
		
	})
	
});

