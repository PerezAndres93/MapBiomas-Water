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

var endmembers = [
            [119.0, 475.0, 169.0, 6250.0, 2399.0, 675.0], /*gv*/
            [1514.0, 1597.0, 1421.0, 3053.0, 7707.0, 1975.0], /*npv*/
            [1799.0, 2479.0, 3158.0, 5437.0, 7707.0, 6646.0], /*soil*/
            [4031.0, 8714.0, 7900.0, 8989.0, 7002.0, 6607.0], /*cloud*/
            // [7970.0, 7900.0, 8170.0, 8620.0, 6960.0, 6010.0], /*cloud*/
            [7800.0, 7910.0, 7950.0, 6750.0, 310.0, 380.0], /*snow*/
            [810, 650, 100, 0, 0, 0] /*shade*/
  ]; 

function sma(image) {
      
      var outBandNames = ['gv', 'npv', 'soil', 'cloud','snow','shade'];
      // var outBandNames = ['gv', 'npv', 'soil','shade'];

      var fractions = ee.Image(image)
          .select(bandnamed)
          .unmix(endmembers,true,true)
          .max(0)
          .multiply(100)
          .byte();
      
      fractions = fractions.rename(outBandNames);
      
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
  
  var l5_ready = rename_bands(l5_col_2, bands_l5_2).map(process_image);
  var l7_ready = rename_bands(l7_col_2, bands_l7_2).map(process_image);
  var l8_ready = rename_bands(l8_col_2, bands_l8_2).map(process_image);

  var processed_col = l5_ready.merge(l7_ready)
                              .merge(l8_ready)
                              .filterBounds(geometry)
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
  
exports.NDWImf  = function  (image) {

	var exp = '( b("green") - b("nir") ) / ( b("green") + b("nir") )';

	var ndwimf = image.expression(exp).rename("ndwi_mcfeeters")
		.add(1).multiply(10000)
		.toInt16();

	return image.addBands(ndwimf, ["ndwi_mcfeeters"], true);
 }

exports.mNDWI  = function  (image) {

	var exp = '( b("green") - b("swir1") ) / ( b("green") + b("swir1") )';

	var ndwimf = image.expression(exp).rename("mndwi")
		.add(1).multiply(10000)
		.toInt16();

	return image.addBands(ndwimf, ["mndwi"], true);
 }
  
  
  
  
  
  
  
  
