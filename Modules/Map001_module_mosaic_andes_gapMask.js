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

l5_col_2 = l5_col_2.map(applyScaleFactors);
l7_col_2 = l7_col_2.map(applyScaleFactors);
l8_col_2 = l8_col_2.map(applyScaleFactors);

var bandnamed = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];

function cloudScore(image) {
  
  var rescale = function (obj) {
  
      var image = obj.image.subtract(obj.min).divide(ee.Number(obj.max).subtract(obj.min));
  
      return image;
  };
  
      var cloudThresh = 30;
  
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
      })).multiply(100).byte();
  
      var cond = score.lt(cloudThresh);

      return image.updateMask(cond);
  };

function process_image (image) {
    return sma(image)//.clip(table);
  }

exports.get_Collection2 = function(geometry, cloud_cover){
  var bandnamed = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];
  var bands_l5_2 = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
  var bands_l7_2 = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
  var bands_l8_2 = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'];
  
  var rename_bands = function (imgCol, input) {
    return imgCol.select(input, bandnamed);
  };
  
  var l5_ready = rename_bands(l5_col_2, bands_l5_2)//.map(process_image);
  var l7_ready = rename_bands(l7_col_2, bands_l7_2)//.map(process_image);
  var l8_ready = rename_bands(l8_col_2, bands_l8_2)//.map(process_image);

  var processed_col = l5_ready.merge(l7_ready)
                              .merge(l8_ready)
                              .filterBounds(geometry)
                              .filter(ee.Filter.lte('CLOUD_COVER', cloud_cover))
                              .map(cloudScore);

 return processed_col.select('red', 'nir', 'swir1')
};