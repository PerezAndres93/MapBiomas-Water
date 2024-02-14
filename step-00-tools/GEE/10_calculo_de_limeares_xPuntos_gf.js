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

var pais_name = 'GuianaFrancesa'
var SensorValidacion ='LX' // L5, L8, LX(para todos ) --- Aqui seleccionamos con que sensor queremos correr la validación
var grids = ee.FeatureCollection('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/TEMP/bigGrids_' + pais_name)

var grid_names = [
'NB-22-Y',
'NA-22-V'
]; 

var gridsSeleccionados = ee.FeatureCollection([])
grid_names.forEach(function(gn){
  gridsSeleccionados=gridsSeleccionados.merge(grids.filter(ee.Filter.eq('grid_name',gn)))
})
Map.addLayer(gridsSeleccionados,{},"gridsSeleccionados")

var fechas = []

// mean,median,min,qualitymosaic
// cambiar esto para cambiar el reductor de mosaicos 
var reductor ='median'


var getFechas = function(carta){
  var f =[]
  switch(carta){
    case 'NB-22-Y':// Pantanal
      f=[
        [1989,8],
        [1990,7],
        [2003,8],
        [2004,11],
        [2017,9],
        [2019,11],
        ]
    break;
    case 'NA-22-V':// Pantanal
      f=[
        [1988,7],
        [1989,8],
        [2003,8],
        [2004,12],
        [2017,7],
        [2018,9]
        ]
  }
  //print('f',f)
  return f
  
}



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

// var endmembers = [
//             [119.0, 475.0, 169.0, 6250.0, 2399.0, 675.0], /*gv*/
//             [1514.0, 1597.0, 1421.0, 3053.0, 7707.0, 1975.0], /*npv*/
//             [1799.0, 2479.0, 3158.0, 5437.0, 7707.0, 6646.0], /*soil*/
//             [7970.0, 7900.0, 8170.0, 8620.0, 6960.0, 6010.0], /*cloud*/
//             [7800.0, 7910.0, 7950.0, 6750.0, 310.0, 380.0], /*snow*/
//             [810, 650, 100, 0, 0, 0] /*shade*/
  // ]; 


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
var process_image = function (image) {
    return sma(image);
  };
var rename_bands = function (imgCol, input) {
  return imgCol.select(input, bandnamed);
};


var shade_min = 65; //65
var shade_max = 90;  //75

var gv_soil_min = 0; //0
var gv_soil_max = 7;// 10

var cloud_desc_min = 25; 
var cloud_desc_max = 35;

var cloud_asc_min = 0;
var cloud_asc_max = 8;

var snow_min = 0;
var snow_max = 50;

var shade_Fit = ee.Dictionary(ee.List([[shade_min,0],[shade_max,1]]).reduce(ee.Reducer.linearFit()));
var gv_soil_Fit = ee.Dictionary(ee.List([[gv_soil_min,1],[gv_soil_max,0]]).reduce(ee.Reducer.linearFit()));
var cloud_asc_Fit = ee.Dictionary(ee.List([[cloud_asc_min,0],[cloud_asc_max,1]]).reduce(ee.Reducer.linearFit()));
var cloud_desc_Fit = ee.Dictionary(ee.List([[cloud_desc_min,1],[cloud_desc_max,0]]).reduce(ee.Reducer.linearFit()));
var snow_Fit = ee.Dictionary(ee.List([[snow_min,1],[snow_max,0]]).reduce(ee.Reducer.linearFit()));

var class_1_probs = function (image) {
  
  var gv_soil = image.select('gv').addBands(image.select('soil')).reduce(ee.Reducer.sum());

    var cond_1 = image.select('shade').multiply(shade_Fit.getNumber('scale')).add(shade_Fit.getNumber('offset')).clamp(0, 1);
    var cond_2 = gv_soil.multiply(ee.Number(gv_soil_Fit.get('scale'))).add(ee.Number(gv_soil_Fit.get('offset'))).clamp(0, 1);
    var cond_3 = image.select('cloud').multiply(cloud_desc_Fit.getNumber('scale')).add(cloud_desc_Fit.getNumber('offset')).clamp(0, 1)
                  .addBands(
                  image.select('cloud').multiply(cloud_asc_Fit.getNumber('scale')).add(cloud_asc_Fit.getNumber('offset')).clamp(0, 1)  
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

var l5_ready = rename_bands(l5.filterBounds(gridsSeleccionados).filterBounds(), bands_l5);
var l7_ready = rename_bands(l7.filterBounds(gridsSeleccionados), bands_l7);
var l8_ready = rename_bands(l8.filterBounds(gridsSeleccionados), bands_l8);

var l5_ready_sma = rename_bands(l5, bands_l5).map(process_image);
var l7_ready_sma = rename_bands(l7, bands_l7).map(process_image);
var l8_ready_sma = rename_bands(l8, bands_l8).map(process_image);

var processed_col1;
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


var l5_col2 = l5_col_02.filterBounds(gridsSeleccionados).map(applyScaleFactors)
var l7_col2 = l7_col_02.filterBounds(gridsSeleccionados).map(applyScaleFactors).filterDate('1995-01-01', '2012-12-31');
var l8_col2 = l8_col_02.filterBounds(gridsSeleccionados).map(applyScaleFactors)

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
  PtosClass = ee.FeatureCollection('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/'+pais_name.toUpperCase()+'/DATOS_AUXILIARES/Ptos_'+grid_name+'-class2') 
             .filter(ee.Filter.eq('Label','AGUA'))
             //.filter(ee.Filter.eq('Is labeled',1))
             //.filter(ee.Filter.inList('Is labeled',[1,10]))
             //.filter(ee.Filter.inList('Is labeled','AGUA'))
  
  // Map.addLayer(PtosClass,{palette:['black']},'puntos-'+grid_name)
  GrillaSel = grid_name
  
  fechas.forEach(function(fech,i){
    var month= fech[1]
    var start = ee.Date.fromYMD(fech[0], month, 1);
    var end = start.advance(1, 'month');
    FechaSel=fech[0]+'-'+fech[1]+'-1'
    //print('FechaSel',FechaSel)
    // Obteniendo mosaicos Colección 1
    
    processed_col1 = l5_ready
                     .merge(l7_ready)
                     .merge(l8_ready)
                     .filterDate(start, end)
                     .filterBounds(grid)
                     .filter(ee.Filter.lte('CLOUD_COVER', 70));
    
    
    processed_sma1 = l5_ready_sma
                    .merge(l7_ready_sma)
                    .merge(l8_ready_sma)
                    .filterDate(start, end)
                    .filterBounds(grid)
                    .filter(ee.Filter.lte('CLOUD_COVER', 70));
    
    imgs_prob1 = processed_sma1.map(cloudScore)
    imgs_prob1 = imgs_prob1.map(class_1_probs);
    
    mosaic1 = imgs_prob1.qualityMosaic('qualy')
    //mean,median,min,qualitymosaic
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
    // Map.addLayer(mosaic1.clip(grid), imageVisParam, "landsat-c1-"+grid_name+"-"+FechaSel,false)
    
    Map.addLayer(mosaic2.clip(grid), imageVisParam2, "landsat-c2-"+grid_name+"-"+FechaSel,false)
    
    
    Ptos = PtosClass.filter(ee.Filter.eq('fecha',(i+1)))
    col = 'C1'
    Ptos =ee.FeatureCollection(
          ee.Algorithms.If(mosaic1.bandNames().length().gt(0),
           mosaic1.sampleRegions({collection: Ptos, properties: null, scale: 30, geometries: true,tileScale:4}),
          ee.FeatureCollection([]))
          );
    Ptos = Ptos.map(FechaGrid)
    PtosClassRess = PtosClassRess.merge(Ptos)
    
    Ptos = PtosClass.filter(ee.Filter.eq('fecha',(i+1)))
    col = 'C2'
    Ptos =ee.FeatureCollection(
          ee.Algorithms.If(mosaic2.bandNames().length().gt(0),
           mosaic2.sampleRegions({collection: Ptos, properties: null, scale: 30, geometries: true,tileScale:4}),
          ee.FeatureCollection([]))
          );
    Ptos = Ptos.map(FechaGrid)
    PtosClassRess = PtosClassRess.merge(Ptos)
    
    // print('PtosClassRess-2',PtosClassRess.limit(100))
  })
  print('Finalizó el análisis de grillas '+ grid_name)
})
//print('PtosClassRess',PtosClassRess.limit(20))
        

print('El resultado de las estadísticas son:')
print('Colección 2 de landsat ')
var PtosC1 = PtosClassRess.filter(ee.Filter.eq('coleccion','C1'))
var PtosC2 = PtosClassRess.filter(ee.Filter.eq('coleccion','C2'))
if (SensorValidacion==='L8'){
  PtosC1 = PtosC1.filter(ee.Filter.inList('fecha',[4,5]))
  PtosC2 = PtosC2.filter(ee.Filter.inList('fecha',[4,5]))
}
if (SensorValidacion==='L5'){
  PtosC1 = PtosC1.filter(ee.Filter.inList('fecha',[0,1]))
  PtosC2 = PtosC2.filter(ee.Filter.inList('fecha',[0,1]))
}

var getPercentile = function(ptos,Nindice,percentile){
  return ee.Number(ptos.reduceColumns(ee.Reducer.percentile([percentile]),[Nindice]).get('p'+percentile));
}
var getMin = function(ptos,Nindice){
  return ee.Number(ptos.reduceColumns(ee.Reducer.min(),[Nindice]).get('min'));
}
var getMean = function(ptos,Nindice){
  return ee.Number(ptos.reduceColumns(ee.Reducer.mean(),[Nindice]).get('mean'));
}
var getMedian = function(ptos,Nindice){
  return ee.Number(ptos.reduceColumns(ee.Reducer.median(),[Nindice]).get('median'));
}
var getMax = function(ptos,Nindice){
  return ee.Number(ptos.reduceColumns(ee.Reducer.max(),[Nindice]).get('max'));
}

print('Landsat-C2-'+SensorValidacion+'-shade:')
print(ee.String('C2 - mínimo           ').cat(getMin(PtosC2,'shade')))
print(ee.String('C2 - maximo           ').cat(getMax(PtosC2,'shade')))
print(ee.String('C2 - promedio         ').cat(getMean(PtosC2,'shade')))
print(ee.String('C2 - mediana          ').cat(getMedian(PtosC2,'shade')))
print(ee.String('C2 - percentil  2     ').cat(getPercentile(PtosC2,'shade',2)))
print(ee.String('C2 - percentil  8     ').cat(getPercentile(PtosC2,'shade',8)))
print(ee.String('C2 - percentil  75     ').cat(getPercentile(PtosC2,'shade',75)))
print(ee.String('C2 - percentil 92     ').cat(getPercentile(PtosC2,'shade',92)))
print(ee.String('C2 - percentil 98     ').cat(getPercentile(PtosC2,'shade',98)))
print('--------------------------------------')
print('Landsat-C2-'+SensorValidacion+'-gv_soil:')
print(ee.String('C2 - mínimo           ').cat(getMin(PtosC2,'gv_soil')))
print(ee.String('C2 - maximo           ').cat(getMax(PtosC2,'gv_soil')))
print(ee.String('C2 - promedio         ').cat(getMean(PtosC2,'gv_soil')))
print(ee.String('C2 - mediana          ').cat(getMedian(PtosC2,'gv_soil')))
print(ee.String('C2 - percentil  2     ').cat(getPercentile(PtosC2,'gv_soil',2)))
print(ee.String('C2 - percentil  8     ').cat(getPercentile(PtosC2,'gv_soil',8)))
print(ee.String('C2 - percentil  75     ').cat(getPercentile(PtosC2,'gv_soil',75)))
print(ee.String('C2 - percentil 92     ').cat(getPercentile(PtosC2,'gv_soil',92)))
print(ee.String('C2 - percentil 98     ').cat(getPercentile(PtosC2,'gv_soil',98)))
print('--------------------------------------')
print('Landsat-C2-'+SensorValidacion+'-cloud:')
print(ee.String('C2 - mínimo           ').cat(getMin(PtosC2,'cloud')))
print(ee.String('C2 - maximo           ').cat(getMax(PtosC2,'cloud')))
print(ee.String('C2 - promedio         ').cat(getMean(PtosC2,'cloud')))
print(ee.String('C2 - mediana          ').cat(getMedian(PtosC2,'cloud')))
print(ee.String('C2 - percentil  2     ').cat(getPercentile(PtosC2,'cloud',2)))
print(ee.String('C2 - percentil  8     ').cat(getPercentile(PtosC2,'cloud',8)))
print(ee.String('C2 - percentil 75     ').cat(getPercentile(PtosC2,'cloud',75)))
print(ee.String('C2 - percentil 92     ').cat(getPercentile(PtosC2,'cloud',92)))
print(ee.String('C2 - percentil 98     ').cat(getPercentile(PtosC2,'cloud',98)))


// exportamos los resultados 
// Export.table.toDrive({
//   collection:PtosClassRess, 
//   description:'Ptos-bg-bol-'+reductor, 
//   fileNamePrefix:'Ptos-bg-bol-'+reductor, 
//   folder:'Agua-regre', 
//   fileFormat:'CSV',
// })


// var Pto_raro = ee.FeatureCollection('projects/mapbiomas-raisg/PRODUCTOS/AGUA/BOLIVIA/DATOS_AUXILIARES/Ptos_'+'SE-19-Z'+'-class')
//               //.filter(ee.Filter.eq('Label','agua'))
//               ///.filter(ee.Filter.eq('Is labeled',1))
//             .filter(ee.Filter.inList('ID',[4344]))
// print('Pto_raro',Pto_raro)
// Map.addLayer(Pto_raro,{palette:['ffffff']},'punto dudoso')


