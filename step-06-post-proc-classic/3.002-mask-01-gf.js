var paisName = 'GuianaFrancesa'; // Ecuador, Perú, Bolivia, Venezuela, Colombia, Suriname, Guiana Francesa, Guyana  
var paisName1 = 'Guiana Francesa'
//var years = [2020]; 
var years = ee.List.sequence(2013,2022).getInfo()
var version = 1
var cloud_cover = 70; 

var useMask_Mapbiomas = true
var vis = { // Visualizacion solo un grid 
      Map_addLayer: true,
      listbandMonth: [  // Visualizacion de meses
                    // 'w_1',
                    // 'w_2',
                    // 'w_3','w_4',
                    // 'w_5',
                    'w_6',
                    // 'w_7',
                    // 'w_8',
                    // 'w_9','w_10',
                    // 'w_11',
                    // 'w_12'
                    ]
  }
var Vectores_Sin_NombVer = []  
var namecountry = paisName.replace('ú', 'u')
var paises = ee.FeatureCollection("users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/VECTORES/paises-4");
var grids = ee.FeatureCollection('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/TEMP/bigGrids_' + namecountry);
var pais = paises.filter(ee.Filter.eq('pais', paisName1));  

// para el enmasacaramiento de Tierras bajas
// cambiar la ruta que se cuenta la version de Andes...
var MaskAndes = ee.Image('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/RASTERS/clasificacion-mosaicos-4')
var regAndes = ee.FeatureCollection('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/VECTORES/clasificacion-mosaicos-4')

var tierrasBajas = ee.Image('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/RASTERS/clasificacion-mosaicos-4')
// Corresponde al codigo de pais y mosaico
var mosaicPais = 200
var tierrasBajas = MaskAndes.eq(602).selfMask()

//tierrasBajas = tierrasBajas.where(MaskAndes.gt(0),0).selfMask()

// --------------------------------------------------------------------------------------------------------------------------   
var modules = require('users/ingperezescobar/MapBiomas_final:Definitivo2/Modules/Map001_module_mosaic_andes1');

var get_Collection =modules.get_Collection2;
var get_csf =modules.csf;
var Collection_all = get_Collection(pais.geometry().bounds(),cloud_cover);
// --------------------------------------------------------------------------------------------------------------------------   

var srtm = ee.Image("USGS/SRTMGL1_003");
var slopes = ee.Terrain.slope(srtm);

var threshold_freq_mean = 1.8; 
var threshold_freq_recap = 8; // 8
var threshold_srtm_mean = 20; // 20
// --------------------------------------------------------------------------------------------------------------------------   

function list_folder_to_featColl(e) {
  var path = e.id;
  var yearPosition = ee.String (path.split('_')[4]); //75, 79 (72, 76) //74, 78          path.substring(74, 78)         
  var fc = ee.FeatureCollection(path)
  .set('year', ee.Number.parse(yearPosition));
  
  return fc; 
}

for (var i=0; i<years.length; i++) {
  var year = years[i];
  var start = String(year) + '-01-01';
  var end = String(year) + '-12-31';
  
  var CollectionYear = Collection_all.filterDate(start, end)
                                     .map(get_csf);
                                     
  var csf_year = CollectionYear.select('csf').median();
  // Map.addLayer(csf_year,{},'csf_year')
  
  //
  var mapbiomas = ee.Image('users/ingperezescobar/mapbiomas-raisg/public/collection4/mapbiomas_raisg_panamazonia_collection4_integration_v1')
  
  if (pais ==='Perú'){
    mapbiomas ='projects/mapbiomas-raisg/PRODUCTOS/PERU/COLECCION4/INTEGRACION/integracion-pais/Integracion-PERU-6'
  }
  if (pais ==='Bolivia'){
    mapbiomas ='projects/mapbiomas-raisg/PRODUCTOS/BOLIVIA/COLECCION4/INTEGRACION/integracion-pais/BOLIVIA-4'
  }
  mapbiomas = mapbiomas.addBands(mapbiomas.select('classification_2021').rename('classification_2022'))
                       .select('classification_'+year)
                       .selfMask()
  // ----------------------------------------------------------------------------------------------------------------------------------------------------   
  
  // var folder = 'projects/mapbiomas-raisg/PRODUCTOS/AGUA/' + paisName.replace('ú', 'u').toUpperCase() + '/BETA/ANDES_VECS_1';
  var folder = 'users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/' + namecountry.toUpperCase() + '/COLECCION1/POSTPROCESSING/01-VECT-03';
  
  var lista1 = ee.data.listAssets(folder)
  var listaAsset1 = lista1['assets']
  print('listaAsset2',listaAsset1)
  
  var list = listaAsset1.map(list_folder_to_featColl);
  list = ee.FeatureCollection(list).flatten().filter(ee.Filter.eq('year', year))
        //.filter(ee.Filter.inList('version', versiones))

  if(lista1.nextPageToken !== null){
    var lista2 = ee.data.listAssets(folder, {pageToken: lista1.nextPageToken})
    var listaAsset2 = lista2['assets']
    
    var list2 = listaAsset2.map(list_folder_to_featColl);
    list2 = ee.FeatureCollection(list2).flatten().filter(ee.Filter.eq('year', year));
    list =list.merge(list2)
    
    print('listaAsset2',listaAsset2)
  }
  print('list_grid',list.size())
  // print(list)
  // list = list.toList(list.size());
  
  // var tables_merged = ee.List(list).iterate(
  //   function (table, tables_merged) {
  //     return ee.FeatureCollection(tables_merged).merge(table);
  //   },
  //   ee.FeatureCollection([])
  //   );
  
  // tables_merged = ee.FeatureCollection(tables_merged);
  var tables_merged = list
  // var water = ee.ImageCollection('projects/mapbiomas-raisg/PRODUCTOS/AGUA/' + namecountry.toUpperCase()  + '/COLECCION1/clasificacion-01')
  //             .filter(ee.Filter.eq('year', year))
  //             .filter(ee.Filter.eq('version', version)).mosaic();
  
  if(true){
    // Listado de regiones y biggrids que se van a integrar
    var tableRegions = [
          //Idregion ,version, Region pais (1 Andes region; 2 Amazonia baja BigGrid)
          // Regiones de Andes, Costa, Amaz Alta

    // Region Amazonia baja
    //[1411,1,1],
        ['NA-22-V',1,2],
        ['NB-22-Y',1,2],
        ['NB-21-Z',1,2],
        ['NA-21-X',1,2]
            ]
    
    var asset = 'users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/'+namecountry.toUpperCase()+'/COLECCION1/clasificacion-4b'
    // var MaskRegions = ee.Image("projects/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/RASTERS/"+namecountry.toUpperCase()+"/clasificacion-regiones-agua-v3")
    // var MaskAndes = MaskRegions.updateMask(MaskRegions.neq(1322))  // 1322 es amazonia baja en el Perú
    // var tierrasBajas = MaskRegions.eq(1322).selfMask(); 

    var lits_imgs=[];
    var temp;
    
    tableRegions.forEach(function(ele){
      temp = ee.Image();
      
      //if(ele[0] == 1309 || ele[0] == 1310 || ele[0] == 1311){ 
        if (Vectores_Sin_NombVer.indexOf(ele[0])===-1){
          temp = ee.Image(asset+'/class_water_'+year+'_'+ele[0])//+'_'+ele[1])
      } else {
          temp = ee.Image(asset+'/class_water_'+year+'_'+ele[0])
      }
      
      if (ele[2]===2){// Amazonia baja
        // temp = temp.where(MaskAndes.gt(0),0).selfMask()
        temp = temp.mask(tierrasBajas).selfMask()
      }
      lits_imgs.push(temp)
    })
    // print('lits_imgs',lits_imgs)
    
    var water = ee.ImageCollection(lits_imgs)
                  // .filter(ee.Filter.eq('version', version))
                  .mosaic().selfMask()
    print('water',water)
  }
  
  var freq_year = water.gte(1).and(water.lte(3)).reduce('sum').selfMask().rename('freq');  
  
  var mean_freq_img = tables_merged.reduceToImage(['mean_freq'], ee.Reducer.firstNonNull());
  var srtm_mean_img = tables_merged.reduceToImage(['mean_srtm'], ee.Reducer.firstNonNull());
  
  var ok_img = mean_freq_img.gte(threshold_freq_mean).and(srtm_mean_img.lt(threshold_srtm_mean));
  ok_img = ok_img.addBands(freq_year.gte(threshold_freq_recap).and(srtm_mean_img.lt(threshold_srtm_mean))).reduce(ee.Reducer.max());
  
  //Map.addLayer (mean_freq_img, {palette: ['ffffff','04fff4','0c2aff','001b9d'], min:1,max:12}, 'mean_freq_img');
  //Map.addLayer (srtm_mean_img, {palette: ['ffffff','04fff4','0c2aff','001b9d'], min:1,max:40}, 'srtm_mean_img');
  //Map.addLayer (freq_year, {palette: ['ffffff','04fff4','0c2aff','001b9d'], min:1,max:12}, 'freq_year');
  //Map.addLayer (csf_year, {palette: ['ffffff','04fff4','0c2aff','001b9d'], min: 0, max:1}, 'csf_year');
  //Map.addLayer (ok_img, {palette: ['000000','1921ff'], min: 0, mas: 1 }, 'ok_img') ; 
    
  var months = [1,2,3,4,5,6,7,8,9,10,11,12];
  
  var water_month_col = months.map(function (month) {
    
    var water_month = water
                      .select('w_' + month);
  
    // 1° teste 
    var mask_freq = ok_img.eq(0).selfMask();
    
    // 2° teste 
    var detet   = water_month.eq(1).multiply(1).selfMask().where(mask_freq.eq(1), 4)
                                                          .where(csf_year.lte(0.35).or(freq_year.lte(3).and(csf_year.lte(0.7))), 4);
    var fil_1   = water_month.eq(2).multiply(2).selfMask().where(mask_freq.eq(1), 4)
                                                          .where(csf_year.lte(0.35).or(freq_year.lte(3).and(csf_year.lte(0.7))), 4);
    var fil_2   = water_month.eq(3).multiply(3).selfMask().where(mask_freq.eq(1), 4)
                                                          .where(csf_year.lte(0.35).or(freq_year.lte(3).and(csf_year.lte(0.7))), 4);
  
    var water0 = detet.blend(fil_1).blend(fil_2);
    
    // var img_ref = water_month.mask(water_month.eq(0).or(water_month.eq(3)).or(water_month.eq(4)));
    var img_ref = water_month.mask(water_month.gte(4))
                              // .or(water_month.eq(6))
                              // .or(water_month.eq(7))
                              // .or(water_month.eq(8))
                              // .or(water_month.eq(9)));

    return water0.blend(img_ref).rename('w_' + month).set('system:index', 'w_' + month);
  });
  
  water_month_col = ee.ImageCollection.fromImages(water_month_col);
  
  var water_img = water_month_col.toBands().select(0,1,2,3,4,5,6,7,8,9,10,11)
  .rename('w_1', 'w_2', 'w_3', 'w_4', 'w_5', 'w_6', 'w_7', 'w_8', 'w_9', 'w_10', 'w_11', 'w_12').set('year', year);
  
  var color = ['ffffff','063cff','13ff10','ff0000','000000'];
  
  print ('year ' + year, water_img);
  // Map.addLayer (water_img, {bands: 'w_7', palette: color, min:0,max:4}, 'just water');
  if(useMask_Mapbiomas){
  var water_img2 = water_img.where((water_img.gte(1).and(water_img.lte(3))).and(mapbiomas.eq(30)), 4)
                            .where((water_img.gte(1).and(water_img.lte(3))).and(mapbiomas.eq(24)), 4)
  }
  
  if(vis.Map_addLayer){
    vis.listbandMonth.forEach(function(bandMonth){
        var month= parseInt(bandMonth.split('_')[1])
        var start = ee.Date.fromYMD(year, month, 1);
        var end = start.advance(1, 'month');
          Map.addLayer(CollectionYear.filterDate(start, end).median(),{"bands":["swir1","nir","red"],"min":200,"max":4000},'mosaic-'+month+'-'+year,false);
          Map.addLayer(water.select(bandMonth),{"min":0,"max":4,"palette":['ffffff','0000ff','00aa00','ff0000','000000'] },'clasif-pilot-4'+bandMonth,false);
          Map.addLayer(water_img.select(bandMonth),{"min":0,"max":4,"palette":['ffffff','0000ff','00aa00','ff0000','000000'] },'clasif-'+bandMonth,false);
          
        if(useMask_Mapbiomas){
          Map.addLayer(water_img2.select(bandMonth),{"min":0,"max":4,"palette":['ffffff','0000ff','00aa00','ff0000','000000'] },'clasif-mask-'+bandMonth,false);
          Map.addLayer(mapbiomas,{min:0, max:34, palette:['ffffff', '129912', '1f4423', '006400', '00ff00', '687537', '76a5af',
                                            '29eee4', '77a605', '935132', 'bbfcac', '45c2a5', 'b8af4f', 'f1c232', 
                                            'ffffb2', 'ffd966', 'f6b26b', 'f99f40', 'e974ed', 'd5a6bd', 'c27ba0',
                                            'fff3bf', 'ea9999', 'dd7e6b', 'aa0000', 'ff99ff', '0000ff', 'd5d5e5',
                                            'dd497f', 'b2ae7c', 'af2a2a', '8a2be2', '968c46', '0000ff', '4fd3ff']},'mapbiomasRaisg-'+year,false)
        }
          //Map.addLayer(tables_merged.filterBounds(geometry.buffer(5000)),{},'poligon',false)
    });
    }
    
    var img_input_freq = water_img.gte(1).and(water_img.lte(3)).selfMask()
                            .reduce(ee.Reducer.sum());
    
    var img_input = img_input_freq
    .gte(6)
    .selfMask();
    
    var colorRamp = ['ffffff','02ffe8','0417ff','000da7'];
    
    if(vis.Map_addLayer){
    Map.addLayer (img_input_freq, {palette: colorRamp, min:0, max:12}, 'freq',false);
    Map.addLayer (img_input, {palette: 'blue'}, 'annual',false)
    }
    
  if(useMask_Mapbiomas){
    var water_img = water_img2;
  }
  
  water_img = water_img.set('year', year)
                       .set('version', version)
                       .set('country', namecountry.toUpperCase());
  
  print(water_img)
  
  Export.image.toAsset({
    image: water_img, 
    description: 'water_' + year, 
    assetId: 'users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/COLECCION1/POSTPROCESSING/02-mask-03/' + 'water-' + year, 
    region: pais.geometry().bounds(), 
    scale: 30,
    pyramidingPolicy: {
        '.default': 'mode'
    },
    maxPixels: 1e13
  });
  
}