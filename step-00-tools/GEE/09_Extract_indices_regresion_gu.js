var l5 = ee.ImageCollection("LANDSAT/LT05/C01/T1_SR")
var l7 = ee.ImageCollection("LANDSAT/LE07/C01/T1_SR")
var l8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR")

var imageVisParam = {
  bands: ["swir1","nir","red"],
  gamma: 1,
  max: 5183,
  min: 62,
  opacity: 1
}



l7 = l7.filterDate('1995-01-01', '2012-12-31');


/*
* parametros
*
*/

var pais_name = 'Guyana'
var grids = ee.FeatureCollection('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/TEMP/bigGrids_' + pais_name)
var SensorValidacion ='LX' // L5, L8, LX(para todos ) --- Aqui seleccionamos con que sensor queremos correr la validación
var fechas = []

// mean,median,min,qualitymosaic
// cambiar esto para cambiar el reductor de mosaicos 
var reductor ='median'


var getFechas = function(carta){
  var f =[]
  switch(carta){
    case 'NA-21-V':// Amazonía
      f=[
        [1998,9],
        [1999,8],
        [2008,8],
        [2009,9],
        [2017,8],
        [2018,10]
        ]
    break;
    case 'NB-21-V':// Pantanal
      f=[
        [1993,1],
        [1993,8],
        [2007,2],
        [2009,5],
        [2014,1],
        [2015,4],
        ]
    break;
    case 'NB-21-Y':// Andes
      f=[
        [1988,9],
        [1999,11],
        [2011,1],
        [2011,8],
        [2017,10],
        [2017,5],
        ]
  }
  //print('f',f)
  return f
  
}

var grid_names = [
'NA-21-V',
'NB-21-V',
'NB-21-Y'
]; 

var shade_min = 65; 
var shade_max = 75;

var gv_soil_min = 0; 
var gv_soil_max = 8;

var cloud_desc_min = 25; 
var cloud_desc_max = 35;

var cloud_asc_min = 0;
var cloud_asc_max = 10;

var shade_Fit = ee.Dictionary(ee.List([[shade_min,0],[shade_max,1]]).reduce(ee.Reducer.linearFit()));
var gv_soil_Fit = ee.Dictionary(ee.List([[gv_soil_min,1],[gv_soil_max,0]]).reduce(ee.Reducer.linearFit()));
var cloud_asc_Fit = ee.Dictionary(ee.List([[cloud_asc_min,0],[cloud_asc_max,1]]).reduce(ee.Reducer.linearFit()));
var cloud_desc_Fit = ee.Dictionary(ee.List([[cloud_desc_min,1],[cloud_desc_max,0]]).reduce(ee.Reducer.linearFit()));

var year = 2018;
var month = 9;

var start = ee.Date.fromYMD(year, month, 1);
var end = start.advance(1, 'month');

var bandnamed = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];
var bands_l5 = ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'];
var bands_l7 = ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'];
var bands_l8 = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7'];
var bands_l5_2 = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
var bands_l7_2 = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
var bands_l8_2 = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'];

var endmembers = [
    [119.0, 475.0, 169.0, 6250.0, 2399.0, 675.0], /*gv*/
    [1514.0, 1597.0, 1421.0, 3053.0, 7707.0, 1975.0], /*npv*/
    [1799.0, 2479.0, 3158.0, 5437.0, 7707.0, 6646.0], /*soil*/
    [4031.0, 8714.0, 7900.0, 8989.0, 7002.0, 6607.0] /*cloud*/
];

/*
* funcoes
*
*/

var sma = function (image) {
      
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
      
      return image.addBands(fractions);
  };
var cloudScore = function (image) {
  
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
      })).multiply(100).byte();
  
      var cond = score.lt(cloudThresh);
      
      return image.updateMask(cond);
  };
var process_image = function (image) {
    return sma(image);
  };
var rename_bands = function (imgCol, input) {
  return imgCol.select(input, bandnamed);
};
var class_1_probs = function (image) {
  
  var gv_soil = image.select('gv').addBands(image.select('soil')).reduce(ee.Reducer.sum());
  
  var cond_1 = image.select('shade').multiply(0.1).subtract(6.5).clamp(0, 1);
  var cond_2 = gv_soil.multiply(-0.125).add(1).clamp(0, 1);
  var cond_3 = image.select('cloud').multiply(-0.1).add(3.5).clamp(0, 1)
                .addBands(
                image.select('cloud').multiply(0.125).clamp(0, 1)  
                ).reduce(ee.Reducer.min());
  
  var image_prob = cond_1.addBands(cond_2).addBands(cond_3).reduce(ee.Reducer.mean()).rename('prob');
  
  var tmp_img = ee.Image(1).subtract(image_prob).rename('qualy')
  image = image.addBands(tmp_img)
  
  image = image.addBands(cond_1.rename('cond_1'))
  image = image.addBands(cond_2.rename('cond_2'))
  image = image.addBands(cond_3.rename('cond_3'))
  image = image.addBands(gv_soil.rename('gv_soil'))
  
  return image.addBands(image_prob);
};

/*
* mensal landsat collection 1
*
*/

var l5_ready = rename_bands(l5, bands_l5);
var l7_ready = rename_bands(l7, bands_l7);
var l8_ready = rename_bands(l8, bands_l8);

var l5_ready_sma = rename_bands(l5, bands_l5).map(process_image);
var l7_ready_sma = rename_bands(l7, bands_l7).map(process_image);
var l8_ready_sma = rename_bands(l8, bands_l8).map(process_image);

// var processed_col1 = l5_ready.merge(l7_ready).merge(l8_ready).filterDate(start, end).filterBounds(geometry).filter(ee.Filter.lte('CLOUD_COVER', 70));
// var processed_sma1 = l5_ready_sma.merge(l7_ready_sma).merge(l8_ready_sma).filterDate(start, end).filterBounds(geometry).filter(ee.Filter.lte('CLOUD_COVER', 70));
// var imgs_prob1 = processed_sma1.map(cloudScore)
// var imgs_prob1 = imgs_prob1.map(class_1_probs);

// var mosaic1 = imgs_prob1.qualityMosaic('qualy')

/*
* mensal landsat collection 2
*
*/

var l5_col_02 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
var l7_col_02 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')    
var l8_col_02 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')


function applyScaleFactors(image) {
      var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2).multiply(10000);
      return image.addBands(opticalBands, null, true)
           .uint16()
           .copyProperties(image)
           .copyProperties(image,['system:time_start'])
           .copyProperties(image,['system:index'])
           .copyProperties(image,['system:footprint'])
}


var l5_col2 = l5_col_02.map(applyScaleFactors)
var l7_col2 = l7_col_02.map(applyScaleFactors).filterDate('1995-01-01', '2012-12-31');
var l8_col2 = l8_col_02.map(applyScaleFactors)

var l5_ready2 = rename_bands(l5_col2, bands_l5_2);
var l7_ready2 = rename_bands(l7_col2, bands_l7_2);
var l8_ready2 = rename_bands(l8_col2, bands_l8_2);
  
var l5_ready2_sma = rename_bands(l5_col2, bands_l5_2).map(process_image);
var l7_ready2_sma = rename_bands(l7_col2, bands_l7_2).map(process_image);
var l8_ready2_sma = rename_bands(l8_col2, bands_l8_2).map(process_image);

//var processed_col = l5_ready2.merge(l7_ready2).merge(l8_ready2).filterDate(start, end).filterBounds(geometry).filter(ee.Filter.lte('CLOUD_COVER', 70));
//var processed_sma = l5_ready2_sma.merge(l7_ready2_sma).merge(l8_ready2_sma).filterDate(start, end).filterBounds(geometry).filter(ee.Filter.lte('CLOUD_COVER', 70));

// *******************************************************************************************************
// ***************************************
//********************************************************************************************************
var GrillaSel,FechaSel,reductor,col;
var FechaGrid = function(ele){
  ele = ele.set('grilla',GrillaSel)
  ele = ele.set('fechaT',FechaSel)
  ele = ele.set('reductor',reductor)
  ele = ele.set('coleccion',col)
  return ele
}

// Recorriendo todos los grids para obtener los valores 
var PtosClass,Ptos,mos1,mos2,grid;
var PtosClassRess = ee.FeatureCollection([])

var mosaic1,mosaic2,processed_sma1,processed_sma2,imgs_prob1,imgs_prob2

grid_names.forEach(function(grid_name){
  fechas = getFechas(grid_name)  
  grid = grids.filter(ee.Filter.eq('grid_name', grid_name));
  PtosClass = ee.FeatureCollection('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/GUYANA/DATOS_AUXILIARES/Ptos_'+grid_name+'-class')
              .filter(ee.Filter.eq('Label','AGUA'))
              ///.filter(ee.Filter.eq('Is labeled',1))
             //.filter(ee.Filter.inList('Is labeled',[1,10]))
             //.filter(ee.Filter.inList('Is labeled',[1,10]))
              
  //print('PtosClass',PtosClass.limit(3000))
  GrillaSel = grid_name
  
  fechas.forEach(function(fech,i){
    var month= fech[1]
    var start = ee.Date.fromYMD(fech[0], month, 1);
    var end = start.advance(1, 'month');
    FechaSel=fech[0]+'-'+fech[1]+'-1'
    //print('FechaSel',FechaSel)
    // Obteniendo mosaicos Colección 1
    /*
    processed_col1 = l5_ready
                     .merge(l7_ready)
                     .merge(l8_ready)
                     .filterDate(start, end)
                     .filterBounds(grid)
                     .filter(ee.Filter.lte('CLOUD_COVER', 70));
    */
    processed_sma1 = l5_ready_sma
                     .merge(l7_ready_sma)
                     .merge(l8_ready_sma)
                     .filterDate(start, end)
                     .filterBounds(grid)
                     .filter(ee.Filter.lte('CLOUD_COVER', 70));
    
    imgs_prob1 = processed_sma1.map(cloudScore)
    imgs_prob1 = imgs_prob1.map(class_1_probs);
    
    //mosaic1 = imgs_prob1.qualityMosaic('qualy')
    // mean,median,min,qualitymosaic
    switch(reductor){
    case 'mean':// Amazonía
      mosaic1 = imgs_prob1.mean()
      
    break;
    case 'median':// Amazonía
      mosaic1 = imgs_prob1.median()
      
    break;
    case 'min':// Amazonía
      mosaic1 = imgs_prob1.min()
      
    break;
    case 'qualitymosaic':// Amazonía
      mosaic1 = imgs_prob1.qualityMosaic('qualy')
      
    
    }
    
    
    // Obteniendo mosaicos Colección 2
    //processed_col2 = l8_ready2.filterDate(start, end).filterBounds(geometry).filter(ee.Filter.lte('CLOUD_COVER', 70));
    processed_sma2 = //l8_ready2_sma
                     l5_ready2_sma
                     .merge(l7_ready2_sma)
                     .merge(l8_ready2_sma)
                     .filterDate(start, end)
                     .filterBounds(grid)
                     .filter(ee.Filter.lte('CLOUD_COVER', 70));
    
    imgs_prob2 = processed_sma2.map(cloudScore)
    imgs_prob2 = imgs_prob2.map(class_1_probs);
    
    //mosaic2 = imgs_prob2.qualityMosaic('qualy');
    //mosaic1 = imgs_prob1.qualityMosaic('qualy')
    // mean,median,min,qualitymosaic
    switch(reductor){
    case 'mean':// Amazonía
      mosaic2 = imgs_prob2.mean()
    break;
    case 'median':// Amazonía
      mosaic2 = imgs_prob2.median()
      
    break;
    case 'min':// Amazonía
      mosaic2 = imgs_prob2.min()
      
    break;
    case 'qualitymosaic':// Amazonía
      mosaic2 = imgs_prob2.qualityMosaic('qualy')
    }
    
    //Map.addLayer(mos,{"bands":["swir1","nir","red"],"min":200,"max":4000},'mosaic-'+month+'-'+fech[0]+'-'+grid_name,false);
    Map.addLayer(mosaic1.clip(grid), imageVisParam, "landsat-c1-"+grid_name+"-"+FechaSel,false)
    Map.addLayer(mosaic2.clip(grid), imageVisParam, "landsat-c2-"+grid_name+"-"+FechaSel,false)
    
    
    Ptos = PtosClass.filter(ee.Filter.eq('fecha',(i+1)))
    
    col = 'C1'
    Ptos =ee.FeatureCollection(
          ee.Algorithms.If(mosaic1.bandNames().length().gt(0),
           mosaic1.sampleRegions({collection: Ptos, properties: null, scale: 30, geometries: true,tileScale:4}),
          ee.FeatureCollection([]))
          );
    Ptos = Ptos.map(FechaGrid)
    if (SensorValidacion==='L8'){
      PtosClassRess = PtosClassRess.merge(Ptos.filter(ee.Filter.inList('fecha',[4,5])))
    }else{
        if (SensorValidacion==='L5'){
          PtosClassRess = PtosClassRess.merge(Ptos.filter(ee.Filter.inList('fecha',[0,1])))
        }else{
          PtosClassRess = PtosClassRess.merge(Ptos)
        }
    }
    Ptos = PtosClass.filter(ee.Filter.eq('fecha',(i+1)))
    col = 'C2'
    Ptos =ee.FeatureCollection(
          ee.Algorithms.If(mosaic2.bandNames().length().gt(0),
           mosaic2.sampleRegions({collection: Ptos, properties: null, scale: 30, geometries: true,tileScale:4}),
          ee.FeatureCollection([]))
          );
    Ptos = Ptos.map(FechaGrid)
    if (SensorValidacion==='L8'){
      PtosClassRess = PtosClassRess.merge(Ptos.filter(ee.Filter.inList('fecha',[4,5])))
    }else{
        if (SensorValidacion==='L5'){
          PtosClassRess = PtosClassRess.merge(Ptos.filter(ee.Filter.inList('fecha',[0,1])))
        }else{
          PtosClassRess = PtosClassRess.merge(Ptos)
        }
    }
    
    if (SensorValidacion==='L8'){
      PtosC1 = PtosC1.filter(ee.Filter.inList('fecha',[4,5]))
      PtosC2 = PtosC2.filter(ee.Filter.inList('fecha',[4,5]))
    }
    if (SensorValidacion==='L5'){
      PtosC1 = PtosC1.filter(ee.Filter.inList('fecha',[0,1]))
      PtosC2 = PtosC2.filter(ee.Filter.inList('fecha',[0,1]))
    }
    
    //print('PtosClassRess-2',PtosClassRess.limit(100))
  })
  print('Finalizó el la grilla '+ grid_name)
})
print('PtosClassRess',PtosClassRess.limit(20))
// exportamos los resultados 
Export.table.toDrive({
  collection:PtosClassRess, 
  description:'Ptos-bg-bol-'+reductor+'-02-'+pais_name, 
  fileNamePrefix:'Ptos-bg-bol-'+reductor+'-02'+pais_name, 
  folder:'MapBiomas', 
  fileFormat:'CSV',
})

print('L1:',mosaic1,'L2:',mosaic2);
