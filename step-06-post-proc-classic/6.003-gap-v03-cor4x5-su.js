
var paisName = 'Suriname'; // Ecuador, Perú, Bolivia, Venezuela, Colombia, Suriname, Guiana Francesa, Guyana  
var paisName1 = 'Suriname'

var imput_imgColl = '021-pre-gap-03'

var namecountry = paisName.replace('ú', 'u')
var paises = ee.FeatureCollection("users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/VECTORES/paises-4");
var pais = paises.filter(ee.Filter.eq('pais', paisName1));  



var  imageVisParam = {"opacity":1,"bands":["w_1_2"],"min":1,"max":9,"palette":['0000ff','009900','5af100','ffffff','000000','ff0000','ff60c7','c6c6c6','ffff00']};

var y_start = 2013 // no cambiar usar el for para dividir tareas
var y_end = 2022   // no cambiar
var cant = y_end - y_start + 1
var years = ee.List.sequence(y_start,y_end).getInfo()
//var year = 2022
var viz_month = 'w_1'


for (var i=0; i<cant; i++) {
  var year = years[i];
  
  
  var y_window = ee.List(ee.Array([0,1,2,3,4]).add(ee.Algorithms.If(
      ee.Number(year).gt(y_end - 2),
      ee.Number(y_end - year - 4).add(year),
      ee.Number(y_start - year).max(-2).add(year)))).getInfo()
      
  print(y_window)    
  var img =           ee.Image('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/COLECCION1/POSTPROCESSING/' + imput_imgColl + '/water-gap-' + y_window[0])               
            .addBands(ee.Image('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/COLECCION1/POSTPROCESSING/' + imput_imgColl + '/water-gap-' + y_window[1]))               
            .addBands(ee.Image('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/COLECCION1/POSTPROCESSING/' + imput_imgColl + '/water-gap-' + y_window[2]))              
            .addBands(ee.Image('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/COLECCION1/POSTPROCESSING/' + imput_imgColl + '/water-gap-' + y_window[3]))               
            .addBands(ee.Image('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/COLECCION1/POSTPROCESSING/' + imput_imgColl + '/water-gap-' + y_window[4]))               

  print ("first img", img)
  //Map.addLayer(img, imageVisParam,'input')
  
  var n_bands = img.bandNames().size(); 
  var bands_size = ee.List.sequence(1, n_bands, 1);
  
  var bands = bands_size.map(function(index){ 
    return ee.String('w_').cat(index).slice(0,-2);
  });
  
  //collection = collection.toBands().rename(bands);
  
  img = img.rename(bands)
  
  //print('img rename',img)
  
  var water = img
  // no hacer remap
  //var water = bands_size.map(function(month){
  //     var water_remapped = collection.select(ee.String('w_').cat(month).slice(0,-2)).remap([0,1,2,3,4], [0,1,1,0,2]);
  //     return water_remapped;
  //});
  //
  //water = ee.ImageCollection(water).toBands().rename(bands);
  
  //Map.addLayer(water.select(0).mask(water.select(0).neq(5)))
  
  // ----------------------------------------------------------------------
  
  var ListMonths = ee.List.sequence(1, n_bands, 1);
  
  if (year - y_start == 0 ){
    var process_block = ListMonths.slice(0,12)
  } else { 
    if (year - y_start == 1 ){
      var process_block = ListMonths.slice(12,24)
    } else {
      if (y_end - year == 1){       
        var process_block = ListMonths.slice(36,48)
      }else {
        if (y_end - year == 0){       
          var process_block = ListMonths.slice(48,60)
        }else {
          var process_block = ListMonths.slice(24,36)
        }  
      }
    }    
  }
  print('process_block',process_block)
  
  var output = process_block.map(function(month) {
    
    var actual = water.select(ee.String('w_').cat(month).slice(0,-2))
                .updateMask(water.select(ee.String('w_').cat(month).slice(0,-2)).neq(5));
    
    var list_prev = ListMonths.slice(0, ee.Number(month).subtract(1)).reverse();
    var list_next = ListMonths.slice(month, n_bands);
    
    var z_loop = list_next.zip(list_prev);
    
    var list_month_gap  = ee.List (
    ee.Algorithms.If(
    ee.Number (list_next.size()).gt(list_prev.size()),
    ee.List(z_loop.flatten().cat(list_next).distinct()),
    ee.List(z_loop.flatten().cat(list_prev).distinct())
    ));
    
    
    var z_size = list_month_gap.size();
    
    var forLoop2 = ee.List.sequence (0, z_size.subtract(1),1).map(function(i) {
      var m_next = list_month_gap.get(i);
      var next = water.select(ee.String('w_').cat(m_next).slice(0,-2))
                 .updateMask(water.select(ee.String('w_').cat(m_next).slice(0,-2)).neq(5));
      return next.rename("w").set("w", ee.Number(i).add(1));
    });
    
    forLoop2 = ee.ImageCollection(forLoop2);
    
    return ee.ImageCollection.fromImages([actual.rename("w").set("w", ee.Number(0))]).merge(forLoop2).sort("w", false).mosaic();
    
  });
  
  // ----------------------------------------------------------------------
  //print('forLoop1',forLoop1)
  
   var bNames = function(prefix){return ee.List.sequence(1,12,1).map(function(i){ return ee.String(prefix).cat(ee.String(i).slice(0,-2))})}
   output = ee.ImageCollection(output).toBands().rename(bNames('w_'))
   print('output',output)
   
   output = output.set('year',year)
  
  var  imageVisParam1 = {"min":1,"max":9,'bands':viz_month,"palette":['0000ff','009900','5af100','ffffff','000000','ff0000','ff60c7','c6c6c6','ffff00']};
  
  Export.image.toAsset({
    image: output, 
    description: 'water_gap_' + year + '_' + paisName, 
    assetId: 'users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/COLECCION1/POSTPROCESSING/02-gap-05/' + 'water-gap-' + year, 
    region: pais.geometry().bounds(), 
    scale: 30,
    pyramidingPolicy: {
        '.default': 'mode'
    },
    maxPixels: 1e13
  });
  
  Map.addLayer(img.select(ee.List(ee.Array(process_block).subtract(1).toByte()).getInfo()).rename(bNames('w_')),imageVisParam1,'imput ' + viz_month + ' '  + year, false)
  Map.addLayer(output,imageVisParam1,'output ' + viz_month + ' '  + year, false)  
  
  //return
}         
            
               
//var collection = col_2020.merge(col_2021).merge(col_2022);




