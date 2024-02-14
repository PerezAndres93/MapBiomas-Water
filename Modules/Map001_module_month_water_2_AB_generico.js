 
// var table = ee.FeatureCollection('projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/paises-4')
///*
 
// colecao 2 

var l5_col_2 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2');
var l7_col_2 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2');    
l7_col_2 = l7_col_2.filterDate('1995-01-01', '2012-12-31');
var l8_col_2 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2');

function applyScaleFactors(image) {
      var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2).multiply(10000);
      return image.addBands(opticalBands, null, true)
           .toUint16()
          // .copyProperties(image)
          // .copyProperties(image,['system:time_start'])
          // .copyProperties(image,['system:index'])
          // .copyProperties(image,['system:footprint']);
}
/*
l5_col_2 = l5_col_2.map(applyScaleFactors);
l7_col_2 = l7_col_2.map(applyScaleFactors);
l8_col_2 = l8_col_2.map(applyScaleFactors);
*/
//*/
/*
var shade_min = 65; 
var shade_max = 75;

var gv_soil_min = 0; 
var gv_soil_max = 10;

var cloud_desc_min = 25; 
var cloud_desc_max = 35;

var cloud_asc_min = 0;
var cloud_asc_max = 8;

*/

// Ajuste de La ecuación para los umbrales 
/*
var shade_min = 55; 
var shade_max = 68;

var gv_soil_min = 0; 
var gv_soil_max = 9;

var cloud_desc_min = 23; 
var cloud_desc_max = 33;

var cloud_asc_min = 0;
var cloud_asc_max = 7;
*/
// ajuste de acuerdo a estadísticas en la región-L8
/*
var shade_min = 85; 
var shade_max = 92;

var gv_soil_min = 0; 
var gv_soil_max = 10;

var cloud_desc_min = 20; 
var cloud_desc_max = 30;

var cloud_asc_min = 2;
var cloud_asc_max = 6;
*/
// ajuste de acuerdo a estadísticas en la región-L8
// esto se va a reescriir mas abajo 
var shade_min = 85; 
var shade_max = 92;

var gv_soil_min = 0; 
var gv_soil_max = 10;

var cloud_desc_min = 21; 
var cloud_desc_max = 31;

var cloud_asc_min = 2;
var cloud_asc_max = 7;

// ecuación de regresión para el SMA y landsat 8 
print('shade',shade_min,shade_max)
var shade_Fit = ee.Dictionary(ee.List([[shade_min,0],[shade_max,1]]).reduce(ee.Reducer.linearFit()));
var gv_soil_Fit = ee.Dictionary(ee.List([[gv_soil_min,1],[gv_soil_max,0]]).reduce(ee.Reducer.linearFit()));
var cloud_asc_Fit = ee.Dictionary(ee.List([[cloud_asc_min,0],[cloud_asc_max,1]]).reduce(ee.Reducer.linearFit()));
var cloud_desc_Fit = ee.Dictionary(ee.List([[cloud_desc_min,1],[cloud_desc_max,0]]).reduce(ee.Reducer.linearFit()));


var AplicarSMA = false;
var ecuacionLineal={
        // m     b    --- esto también se reescribe más abajo 
  shade  :[0.8487,14.947],
  gv_soil:[1.1097,0.1702],
  cloud  :[1.0093,1.0273]
}
var reductor = 'median'

exports.setLimeares = function(Limeares){
  shade_min = Limeares.shade_min; 
  shade_max = Limeares.shade_max;
  gv_soil_min = Limeares.gv_soil_min; 
  gv_soil_max = Limeares.gv_soil_max;
  cloud_desc_min = Limeares.cloud_desc_min; 
  cloud_desc_max = Limeares.cloud_desc_max;
  cloud_asc_min = Limeares.cloud_asc_min;
  cloud_asc_max = Limeares.cloud_asc_max;

  print('shadeSet',shade_min,shade_max)
  //print se volvió a establecer los limeares
}
// agregamos un SMA
exports.setParametroSMA = function(ApplySMAe){
  AplicarSMA = ApplySMAe.Apply;
  ecuacionLineal.shade  = ApplySMAe.shade;
  ecuacionLineal.gv_soil= ApplySMAe.gv_soil;
  ecuacionLineal.cloud  = ApplySMAe.cloud;
}

exports.setParametroReducto = function(Reduc){
  reductor =   Reduc
}



var bandnamed = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];

  var endmembers = [
      [119.0, 475.0, 169.0, 6250.0, 2399.0, 675.0], /*gv*/
      [1514.0, 1597.0, 1421.0, 3053.0, 7707.0, 1975.0], /*npv*/
      [1799.0, 2479.0, 3158.0, 5437.0, 7707.0, 6646.0], /*soil*/
      [4031.0, 8714.0, 7900.0, 8989.0, 7002.0, 6607.0] /*cloud*/
  ];

function sma(image) {
      
      var outBandNames = ['gv', 'npv', 'soil', 'cloud'];
      
      var fractions = ee.Image(image)
          .select(bandnamed)
          .unmix(endmembers)
          .max(0)
          .multiply(100)
          .byte();
      
      fractions = fractions.rename(outBandNames);
      
      var summed = fractions.expression('b("gv") + b("npv") + b("soil")');
      
      var shade = summed
          .subtract(100)
          .abs()
          .byte()
          .rename("shade"); 
      
      fractions = fractions.addBands(shade);
      
      // var CSF = fractions.expression(	
      //   '(shade - (gv + npv + soil))  / (shade+ gv + npv + soil)', 
      //   {	
      //     'gv':    fractions.select('gv'),	
      //     'npv':   fractions.select('npv'),	
      //     'soil':  fractions.select('soil'),
      //     'shade': fractions.select('shade')
      //   }
      //   ).rename('csf');	
      
      // return ee.Image(fractions.copyProperties(image));
      return image.addBands(fractions);//.addBands(CSF);
  }

function cloudScore(image) {
  
  var rescale = function (obj) {
  
      var image = obj.image.subtract(obj.min).divide(ee.Number(obj.max).subtract(obj.min));
  
      return image;
  };
  
      var cloudThresh = 10;
  
      // Compute several indicators of cloudiness and take the minimum of them.
      var score = ee.Image(1.0);
  
      // Clouds are reasonably bright in the blue band.
      score = score.min(rescale({
          'image': image.select(['blue']),
          'min': 1000,
          'max': 3000
      }));
  
      // Clouds are reasonably bright in all visible bands.
      score = score.min(rescale({
          'image': image.expression("b('red') + b('green') + b('blue')"),
          'min': 2000,
          'max': 8000
      }));
  
      // Clouds are reasonably bright in all infrared bands.
      score = score.min(rescale({
          'image': image.expression("b('nir') + b('swir1') + b('swir2')"),
          'min': 3000,
          'max': 8000
      }));
  
      // However, clouds are not snow.
      var ndsi = image.normalizedDifference(['green', 'swir1']);
  
      score = score.min(rescale({
          'image': ndsi,
          'min': 0.8000,
          'max': 0.6000
      })).multiply(10000).uint16();
  
      var cond = score.lt(cloudThresh);

      return image.updateMask(cond);
  };

function sma_estimated (image) {
   
  var gv_soil = image.select('gv').addBands(image.select('soil')).reduce(ee.Reducer.sum());
  
  // var shade_e = image.select('shade').multiply(0.678578911).add(30.5788504308248).rename('shade_e');
  // var gv_soil_e = gv_soil.multiply(0.662247635943461).add(0.74519973547778).rename('gv_soil_e');
  // var cloud_e = image.select('cloud').multiply(0.709964102066556).add(1.28343843989521).add(0).rename('cloud_e');
  
  // Modificamos esto de acuerdo a la nueva ecuación que tenemos para Bolivia
  // var shade_e = image.select('shade').multiply(0.7548).add(23.907).rename('shade_e');
  // var gv_soil_e = gv_soil.multiply(1.0778).add(0.2013).rename('gv_soil_e');
  // var cloud_e = image.select('cloud').multiply(1.0234).add(0.9838).rename('cloud_e');
  
  // Modificamos esto de acuerdo a la nueva ecuación que tenemos para Bolivia y LandSat 8 
  // var shade_e = image.select('shade').multiply(0.8487).add(14.947).rename('shade_e');
  // var gv_soil_e = gv_soil.multiply(1.1097).add(0.1702).rename('gv_soil_e');
  // var cloud_e = image.select('cloud').multiply(1.0093).add(1.0273).rename('cloud_e');
  
  // Modificamos esto de acuerdo a la nueva ecuación que tenemos para Bolivia y LandSat 5 
  // var shade_e = image.select('shade').multiply(0.8441).add(15.076).rename('shade_e');
  // var gv_soil_e = gv_soil.multiply(1.0361).add(0.1542).rename('gv_soil_e');
  // var cloud_e = image.select('cloud').multiply(1.0012).add(0.8183).rename('cloud_e');
  
  // Modificamos esto de acuerdo a la nueva ecuación que tenemos para Bolivia
  // amazonia baja y solo para Landsat 8
  
  //print('shadeEstimated',shade_min,shade_max)
  //print('shade_FitEstimated',shade_Fit)
  var shade_e,gv_soil_e,cloud_e;
  if (AplicarSMA){
    shade_e = image.select('shade').multiply(ecuacionLineal.shade[0]).add(ecuacionLineal.shade[1]).rename('shade_e');
    gv_soil_e = gv_soil.multiply(ecuacionLineal.gv_soil[0]).add(ecuacionLineal.gv_soil[1]).rename('gv_soil_e');
    cloud_e = image.select('cloud').multiply(ecuacionLineal.cloud[0]).add(ecuacionLineal.cloud[1]).rename('cloud_e');
  }else{
    shade_e = image.select('shade').rename('shade_e');
    gv_soil_e = gv_soil.rename('gv_soil_e');
    cloud_e = image.select('cloud').rename('cloud_e');
  }
  return image.addBands(shade_e).addBands(gv_soil_e).addBands(cloud_e);
  
  }

function class_1_probs (image) {
  
    var shade_Fit = ee.Dictionary(ee.List([[shade_min,0],[shade_max,1]]).reduce(ee.Reducer.linearFit()));
    var gv_soil_Fit = ee.Dictionary(ee.List([[gv_soil_min,1],[gv_soil_max,0]]).reduce(ee.Reducer.linearFit()));
    var cloud_asc_Fit = ee.Dictionary(ee.List([[cloud_asc_min,0],[cloud_asc_max,1]]).reduce(ee.Reducer.linearFit()));
    var cloud_desc_Fit = ee.Dictionary(ee.List([[cloud_desc_min,1],[cloud_desc_max,0]]).reduce(ee.Reducer.linearFit()));
    
    var cond_1 = image.select('shade_e').multiply(shade_Fit.getNumber('scale')).add(shade_Fit.getNumber('offset')).clamp(0, 1);
    var cond_2 = image.select('gv_soil_e').multiply(ee.Number(gv_soil_Fit.get('scale'))).add(ee.Number(gv_soil_Fit.get('offset'))).clamp(0, 1);
    var cond_3 = image.select('cloud_e').multiply(cloud_desc_Fit.getNumber('scale')).add(cloud_desc_Fit.getNumber('offset')).clamp(0, 1)
                  .addBands(
                  image.select('cloud_e').multiply(cloud_asc_Fit.getNumber('scale')).add(cloud_asc_Fit.getNumber('offset')).clamp(0, 1)  
                  ).reduce(ee.Reducer.min());
    
    // var gv_soil = image.select('gv_soil_e')
  
    // var cond_1 = image.select('shade_e').multiply(0.1).subtract(8.5).clamp(0, 1);
    // var cond_2 = gv_soil.multiply(-0.1).add(1).clamp(0, 1);
    // var cond_3 = image.select('cloud_e').multiply(-0.1).add(3.5).clamp(0, 1)
    //             .addBands(
    //             image.select('cloud_e').multiply(0.125).clamp(0, 1)  
    //             ).reduce(ee.Reducer.min());

    var image_prob = cond_1.addBands(cond_2).addBands(cond_3).reduce(ee.Reducer.mean()).rename('prob');
    
    return image_prob;

  }
  
function process_image (image) {
    return sma(image)//.clip(table);
  }


// exports.get_Collection1 = function(geometry, cloud_cover){
//   var bandnamed = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];

//   var bands_l5_1 = ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'];
//   var bands_l7_1 = ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'];
//   var bands_l8_1 = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7'];

//   var rename_bands = function (imgCol, input) {
//     return imgCol.select(input, bandnamed);
//   };

//     var l5_ready = rename_bands(l5_col_1, bands_l5_1).map(process_image);
//     var l7_ready = rename_bands(l7_col_1, bands_l7_1).map(process_image);
//     var l8_ready = rename_bands(l8_col_1, bands_l8_1).map(process_image);

//   var processed_col = l5_ready.merge(l7_ready).merge(l8_ready).filter(ee.Filter.lte('CLOUD_COVER', cloud_cover));

// return processed_col
// }


exports.get_Collection2 = function(geometry, cloud_cover,years){
  var bandnamed = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];
  var bands_l5_2 = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
  var bands_l7_2 = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
  var bands_l8_2 = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'];
  
  var rename_bands = function (imgCol, input) {
    return imgCol.select(input, bandnamed);
  };
  var l5_col_2_sel = ee.ImageCollection([])
  var l7_col_2_sel = ee.ImageCollection([])
  var l8_col_2_sel = ee.ImageCollection([])
  var ymin=2100;
  var ymax=1983;
  years.forEach(function(y){
    (ymin > y) ? ymin=y : ymin;
    (ymax < y) ? ymax=y : ymax;
    
  })
  print('ymin',ymin)
  print('ymax',ymax)
  l5_col_2_sel = l5_col_2_sel.merge(l5_col_2.filterDate((ymin-5)+'-01-01',(ymax+5)+'-12-31'))
  l7_col_2_sel = l7_col_2_sel.merge(l7_col_2.filterDate((ymin-5)+'-01-01',(ymax+5)+'-12-31'))
  l8_col_2_sel = l8_col_2_sel.merge(l8_col_2.filterDate((ymin-5)+'-01-01',(ymax+5)+'-12-31'))
  
  l5_col_2_sel = l5_col_2_sel.filterBounds(geometry.geometry().bounds()).map(applyScaleFactors)    
  l7_col_2_sel = l7_col_2_sel.filterBounds(geometry.geometry().bounds()).map(applyScaleFactors)
  l8_col_2_sel = l8_col_2_sel.filterBounds(geometry.geometry().bounds()).map(applyScaleFactors)
  //print('l5_col_2_sel',l5_col_2_sel.size())
  //print('l7_col_2_sel',l7_col_2_sel.size())
  print('l8_col_2_sel',l8_col_2_sel.size())
  
  var l5_ready = rename_bands(l5_col_2_sel, bands_l5_2).map(process_image);
  var l7_ready = rename_bands(l7_col_2_sel, bands_l7_2).map(process_image);
  var l8_ready = rename_bands(l8_col_2_sel, bands_l8_2).map(process_image);

  var processed_col = l5_ready.merge(l7_ready)
                              .merge(l8_ready)
  //var processed_col = l8_ready
                              
                              .filter(ee.Filter.lte('CLOUD_COVER', cloud_cover))
                              .map(cloudScore);

 return processed_col
};

exports.csf = function(image) {

      var CSF = image.expression(	
      '(shade - (gv + npv + soil))  / (shade+ gv + npv + soil)', 
      {	
        'gv':    image.select('gv'),	
        'npv':   image.select('npv'),	
        'soil':  image.select('soil'),
        'shade': image.select('shade')
      }
      ).rename('csf');	
      
      // return ee.Image(fractions.copyProperties(image));
      return image.addBands(CSF);
  };

//probabilidade do mês
exports.p_img_month_func = function (year, moving_window, processed_col) {

  var start = ee.Date.fromYMD(year, moving_window, 1);
  var end = start.advance(1, 'month');

  var imgs_prob = processed_col
                  .filterDate(start, end)
                  // .map(cloudScore)
                  .map(sma_estimated)
                  .map(class_1_probs);
  
  //var prob_class_1 = imgs_prob.median();
  var prob_class_1;
  switch(reductor){
    case 'mean':// Amazonía
      prob_class_1 = imgs_prob.mean()
      
    break;
    case 'median':// Amazonía
      prob_class_1 = imgs_prob.median()
      
    break;
    case 'min':// Amazonía
      prob_class_1 = imgs_prob.min()
      
    break;
    case 'qualitymosaic':// Amazonía
      prob_class_1 = imgs_prob.qualityMosaic('qualy')
    }
  
  return prob_class_1.rename('p_water');
};

exports.p_year_func = function (year, processed_col) {
  
  var water_year_month = function (ano, mes,collection) {
  
  var start = ee.Date.fromYMD(ano, mes, 1);
  var end = start.advance(1, 'month');

  var imgs_prob = collection
    .filterDate(start, end)
    // .map(cloudScore)
    .map(sma_estimated)
    .map(class_1_probs);
  
  //var prob_class_1 = imgs_prob.median();
  var prob_class_1;
  switch(reductor){
    case 'mean':// Amazonía
      prob_class_1 = imgs_prob.mean()
      
    break;
    case 'median':// Amazonía
      prob_class_1 = imgs_prob.median()
      
    break;
    case 'min':// Amazonía
      prob_class_1 = imgs_prob.min()
      
    break;
    case 'qualitymosaic':// Amazonía
      prob_class_1 = imgs_prob.qualityMosaic('qualy')
    }
  
  return prob_class_1;
  };
  
  var annual_freq = water_year_month(year, 1,processed_col)
    .addBands(water_year_month(year, 2,processed_col))
    .addBands(water_year_month(year, 3,processed_col))
    .addBands(water_year_month(year, 4,processed_col))
    .addBands(water_year_month(year, 5,processed_col))
    .addBands(water_year_month(year, 6,processed_col))
    .addBands(water_year_month(year, 7,processed_col))
    .addBands(water_year_month(year, 8,processed_col))
    .addBands(water_year_month(year, 9,processed_col))
    .addBands(water_year_month(year, 10,processed_col))
    .addBands(water_year_month(year, 11,processed_col))
    .addBands(water_year_month(year, 12,processed_col))
    .reduce(ee.Reducer.mean());

  return annual_freq.rename('p_year');
};

// //janela movel mensal, processa colecao 2
// exports.p_year12_func = function (year, moving_window,processed_col1,processed_col2) {
  
// var mes_list = [1,2,3,4,5,6,7,8,9,10,11,12].slice(0,moving_window);
// var mes_list2 = [1,2,3,4,5,6,7,8,9,10,11,12].slice(moving_window,12);

// var year_list = mes_list.map(function(num){
  
// var list_decision = ee.List(mes_list).containsAll([num]);

// if(list_decision || true){
//   year
// }

//   return ee.Number (year);
// });

// var year_list_2 = mes_list2.map(function(num){
  
// var list_decision = ee.List (mes_list2).containsAll([num]);

// if(list_decision || true){
//   year
// }

//   return ee.Number (year).subtract(1);
// });

// var year_list_f = ee.List (year_list_2).cat(ee.List(year_list));
// var month_list_f = ee.List (mes_list2).cat(ee.List(mes_list));
  
// var water_year_month = function (ano, mes) {
  
//   var start = ee.Date.fromYMD(ano, mes, 1);
//   var end = start.advance(1, 'month');
  
//   if (ano == 2022) {
//       processed_col = processed_col2
//   } else {
//       processed_col = processed_col1
//   }
  
//   var imgs_prob,prob_class_1;
//   if (year == 2022) {
//   imgs_prob = processed_col
//                 .filterDate(start, end)
//                 .map(cloudScore)
//                 .map(sma_estimated)
//                 .map(class_1_probs);
  
//   prob_class_1 = imgs_prob.median();

//   } else {
//   imgs_prob = processed_col
//                 .filterDate(start, end)
//                 .map(cloudScore)
//                 .map(class_1_probs_padrao);
  
//   prob_class_1 = imgs_prob.min();
//   }
  
//   return prob_class_1;
  
//   };
  
// var annual_freq = water_year_month(year_list_f.get(0), month_list_f.get(0))
//   .addBands(water_year_month(year_list_f.get(1), month_list_f.get(1)))
//   .addBands(water_year_month(year_list_f.get(2), month_list_f.get(2)))
//   .addBands(water_year_month(year_list_f.get(3), month_list_f.get(3)))
//   .addBands(water_year_month(year_list_f.get(4), month_list_f.get(4)))
//   .addBands(water_year_month(year_list_f.get(5), month_list_f.get(5)))
//   .addBands(water_year_month(year_list_f.get(6), month_list_f.get(6)))
//   .addBands(water_year_month(year_list_f.get(7), month_list_f.get(7)))
//   .addBands(water_year_month(year_list_f.get(8), month_list_f.get(8)))
//   .addBands(water_year_month(year_list_f.get(9), month_list_f.get(9)))
//   .addBands(water_year_month(year_list_f.get(10), month_list_f.get(10)))
//   .addBands(water_year_month(year_list_f.get(11), month_list_f.get(11)))
//   .reduce(ee.Reducer.mean());

//   return annual_freq.rename('p_year');
// };

//decendial
exports.p_month_func = function (year, moving_window,processed_col) {

var water_year_month = function (ano, mes) {

  var start = ee.Date.fromYMD(ano, mes, 1);
  var end = start.advance(1, 'month');

  var imgs_prob = processed_col
                   .filterDate(start, end)
                  // .map(cloudScore)
                   .map(sma_estimated)
                   .map(class_1_probs);
    
    var prob_class_1 = imgs_prob.median();  

   return prob_class_1;
};

var year_5 = ee.Number(year).subtract(5);
var year_4 = ee.Number(year).subtract(4);
var year_3 = ee.Number(year).subtract(3);
var year_2 = ee.Number(year).subtract(2);
var year_1 = ee.Number(year).subtract(1);

var year5 = ee.Number(year).add(5);
var year4 = ee.Number(year).add(4);
var year3 = ee.Number(year).add(3);
var year2 = ee.Number(year).add(2);
var year1 = ee.Number(year).add(1);

year5 = ee.Number(
  ee.Algorithms.If(
    year5.gte(2022),
    2022,
    year5
  ));
  
year4 = ee.Number(
  ee.Algorithms.If(
    year4.gte(2022),
    2022,
    year4
  ));
  
year3 = ee.Number(
  ee.Algorithms.If(
    year3.gte(2022),
    2022,
    year3
  ));
  
year2 = ee.Number(
  ee.Algorithms.If(
    year2.gte(2022),
    2022,
    year2
  ));
  
year1 = ee.Number(
  ee.Algorithms.If(
    year1.gte(2022),
    2022,
    year1
  ));


year_5 = ee.Number(
  ee.Algorithms.If(
    year_5.lte(1985),
    1985,
    year_5
  ));
  
year_4 = ee.Number(
  ee.Algorithms.If(
    year_4.lte(1985),
    1985,
    year_4
  ));
  
year_3 = ee.Number(
  ee.Algorithms.If(
    year_3.lte(1985),
    1985,
    year_3
  ));
  
year_2 = ee.Number(
  ee.Algorithms.If(
    year_2.lte(1985),
    1985,
    year_2
  ));
  
year_1 = ee.Number(
  ee.Algorithms.If(
    year_1.lte(1985),
    1985,
    year_1
  ));


var month_freq = water_year_month(year_5, moving_window)
  .addBands(water_year_month(year_4, moving_window))
  .addBands(water_year_month(year_3, moving_window))
  .addBands(water_year_month(year_2, moving_window))
  .addBands(water_year_month(year_1, moving_window))
  .addBands(water_year_month(year, moving_window))
  .addBands(water_year_month(year1, moving_window))
  .addBands(water_year_month(year2, moving_window))
  .addBands(water_year_month(year3, moving_window))
  .addBands(water_year_month(year4, moving_window))
  .addBands(water_year_month(year5, moving_window))
  .reduce(ee.Reducer.mean());

return month_freq.rename('p_month');
};
