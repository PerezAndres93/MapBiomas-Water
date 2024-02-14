 //var years = [2005];
var years = ee.List.sequence(2013,2022).getInfo()

var versionOut = 1  //definir version de acuerdo com cambio de regiones o del dato de entrada
var paisName = 'Suriname'; // Ecuador, Perú, Bolivia, Venezuela, Combia, Suriname, Guiana Francesa, Guyana
var paisName1 = 'Suriname'
var version = 1
var vis_month = 'w_1'
var region = 1 // 1 - Andes (por region)  -- 2 -Amazonia baja (por carta) 
var asset = 'users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/SURINAME/COLECCION1/clasificacion-4b76'
// actualizar la ruta que se utilizara para la masccara de la region de andes

var MaskAndes = ee.Image('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/RASTERS/clasificacion-mosaicos-4')
var regAndes = ee.FeatureCollection('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/VECTORES/clasificacion-mosaicos-4')

// actualizar la ruta que se utilizara para la masccara de la region de andes

var regAndesexport = regAndes.filter(ee.Filter.inList('id_region',[802]))

print('regAndesexport',regAndesexport)

//var tierrasBajas = ee.Image('projects/mapbiomas-raisg/DATOS_AUXILIARES/RASTERS/clasificacion-mosaicos-4')
//var mosaicPais = 200
var tierrasBajas = MaskAndes.eq(802).selfMask()
                     

print(tierrasBajas)

tierrasBajas = tierrasBajas//.where(MaskAndes.gt(0),0).selfMask()
Map.addLayer(tierrasBajas,{},'MASK',false)
Map.addLayer(regAndesexport,{},'LIMITE',false)


// Listado de regiones y biggrids que se van a integrar
var tableRegions = [
    //Idregion ,version, Region pais (1 Andes region; 2 Amazonia baja BigGrid)
    // Regiones de Andes

    // Region Amazonia baja o pacifico

        ['NA-21-Z',1,2],
        ['NA-21-V',1,2],
        ['NA-21-X',1,2],
        ['NA-22-V',1,2],
        ['NB-21-Y',1,2],
        ['NB-21-Z',1,2],
        ['NB-22-Y',1,2],
        ['NB-21-X',1,2]
    
  ]
var lits_imgs=[]
var temp;

// Listado de los biggrid que se van a vectorizar 
var grid_names = [
  // actualizar las grillas de cada pais
'NA-21-Z',
'NA-21-V',
'NA-21-X',
'NA-22-V',
'NB-21-Y',
'NB-21-Z',
'NB-22-Y',
'NB-21-X',
  ];

years.forEach(function(year){
lits_imgs = []
tableRegions.forEach(function(ele){

  if (ele[2]===2){// Amazonia baja
    temp = ee.Image(asset+'/class_water_'+year+'_'+ele[0])
    temp = temp.mask(tierrasBajas).selfMask()
  } else{
    temp = ee.Image()
    temp = ee.Image(asset+'/class_water_'+year+'_'+ele[0]+'_'+ele[1])
  }
  lits_imgs.push(temp)
})
print('lits_imgs',lits_imgs)

var col = ee.ImageCollection(lits_imgs).mosaic().selfMask()

var pall = ['0000ff','009900','5af100','ffffff','000000','ff0000','ff60c7','c6c6c6','ffff00']
Map.addLayer(col,{palette:pall,min:1, max:9,bands:vis_month},'mosaico ' + year)

var namecountry = paisName  //.replace('ú', 'u')
//var col = ee.ImageCollection('projects/mapbiomas-raisg/PRODUCTOS/AGUA/' + namecountry.toUpperCase()  + '/BETA/pilot-andes')
//            // .filter(ee.Filter.eq('region', regionId))
//            .filter(ee.Filter.eq('version', version))
//

var srtm = ee.Image("USGS/SRTMGL1_003");

var paises = ee.FeatureCollection("users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/VECTORES/paises-4");

var pais = paises.filter(ee.Filter.eq('pais', paisName1));  

Map.addLayer (pais, {}, 'limit ' + paisName,false);
Map.addLayer(regAndes,{},'region andes',false)

var grids = ee.FeatureCollection('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/TEMP/bigGrids_' + namecountry)
Map.addLayer(grids,{},'grids cartas',false)

// var regionVectorPath = "projects/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/VECTOR/PERU/subregiones_andes";
// var regionRasterPath = "projects/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/RASTERS/PERU/subregiones_andes";

// var region = ee.FeatureCollection(regionVectorPath)
//               .filterMetadata("id_region", "equals", regionId);
// var regionMask = ee.Image(regionRasterPath).eq(regionId).selfMask();

var slppost2 = ee.Image("users/ingperezescobar/mapbiomas-raisg/MOSAICOS/slppost2_30_v3");

var subgrids = ee.FeatureCollection('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/TEMP/sub_grid_0_25_america_sul')
                .filterBounds(pais);
                // .filterBounds(regAndes);
Map.addLayer(subgrids,{},'subgrids',false)

var slopes = ee.Terrain.slope(srtm);

// //var urban_year = mapb.select('classification_' + year).eq(24);
// var bloque =0  // 0,1,2


var water = col.gte(1).and(col.lte(3))   //convertido a zero y uno agua/noagua

var freq_year = water.reduce('sum')
      //.blend(urban_year)
      .selfMask()
      .rename('freq');

var vec_img = freq_year.gt(0).selfMask();

for (var i=0; i< grid_names.length; i++) {
  // if (grid_names.length>i){
    var grid_name = grid_names[i];
    
    var grid = grids.filter(ee.Filter.eq('grid_name', grid_name));
    
    var subgrids_grid = subgrids
      .filterBounds(grid.first().geometry().buffer(-100))
      .filterBounds(pais); 
      
    //Map.addLayer(subgrids_grid,{},'subgrids',false)
    
    var subg 
    var vecs = subgrids_grid.map(function (sub) {
      subg = vec_img.clip(sub.geometry())
      var subg2 = ee.Algorithms.If(subg.bandNames().length().gt(0),subg.reduceToVectorsStreaming({
        geometry: sub.geometry(), 
        scale: 30, 
        maxPixels: 1e13, 
        }),ee.FeatureCollection([]))
      return ee.FeatureCollection(subg2)
    });
    
    // var vecs = subgrids_grid.map(function (sub) {
    //     return vec_img.clip(sub.geometry()).reduceToVectorsStreaming({
    //       geometry: sub.geometry(), 
    //       scale: 30, 
    //       maxPixels: 1e13, 
    //       });
    
    
    var vecs_flattened = vecs.flatten();
    
    var vecs_prop = vecs_flattened.map(function (f) {
          
          var mean_freq = freq_year.reduceRegion({
            reducer: ee.Reducer.mean(), 
            geometry: f.geometry(), 
            scale: 30, 
            bestEffort: true, 
            maxPixels: 1e13
          }).get('freq');
          
          var mean_srtm = slopes.reduceRegion({
            reducer: ee.Reducer.mean(), 
            geometry: f.geometry(), 
            scale: 30, 
            bestEffort: true, 
            maxPixels: 1e13
          }).get('slope');
          
          return f
            .set('mean_freq', mean_freq)
            .set('mean_srtm', mean_srtm)
            .set('year', year)
            .set('grid_name', grid_name)
            .set('region',region)
            .set('versionOut',versionOut)
        });
    
    // print('Export asset','projects/mapbiomas-raisg/PRODUCTOS/AGUA/' + namecountry.toUpperCase()  + '/BETA/ANDES_VECS_1/water_objs_' + year + '_' + grid_name + '_' + versionOut)
    /*
    Export.table.toAsset(
      vecs_prop, 
      'water_objs_' + year + '_' + grid_name, 
      'projects/mapbiomas-raisg/PRODUCTOS/AGUA/' + paisName.toUpperCase()  + '/BETA/PILOT_VECS_4/water_objs_' + year + '_' + grid_name
    );
    */
    Export.table.toAsset({
		    collection:vecs_prop,
      	description:'water_objs_' + year + '_' + grid_name,
      	assetId:'users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/' + namecountry.toUpperCase()  + '/COLECCION1/POSTPROCESSING/01-VECT-03/water_objs_' + year + '_' + grid_name + '_' + versionOut,
      //maxVertices:1e13,
    })
  // }  
}
})
//Map.addLayer(ee.FeatureCollection('projects/mapbiomas-raisg/PRODUCTOS/AGUA/SURINAME/COLECCION1/POSTPROCESSING/01-VECT-01/water_objs_2020_ND-18-Z_1'))
