// Script para calcular el resultado de agua y generar las estadísticas para un 
// piloto determinado
//********************************************************
// Parametrización para procesar piloto 
//********************************************************
var param = {
  pais_name: 'GuianaFrancesa',
  years:[
        2013,2014,2015,2016,2017,2018,2019,2020,2021,2022
        ],
  cloud_cover:70, // porcentage de nubosidad 
  PilotoComparacion:'pilot-4b',
  Clases:[1,2],  // Agua  - No agua -> las clases de agua y no agua a utilizarse clasificado
  CampoClase:'Label ID', // indicar el nombre del atributo que contine las clases 
  ExportAgua:true, // true or false, para exportar el piloto a un asset
  ExportPiloto:'clasificacion-4b', // Nombre del asset donde se guardará el piloto
  Comparacion:false, // si queremos visualizar la diferencia del piloto actual con un anterior piloto
  Validacion:true, // Si queremos imprimir la validación del piloto actual en base a puntos colectados
  Paleta:'pal-2',// paleta 1 - 4 clases ; paleta 2 - 7 a 9 clases  ; 
  vis:{ // Visualizacion de los resultados
      Visualizar_piloto: true,
      listbandMonth: [  // Visualizacion de meses
                    //'w_1',
                    //'w_2','w_3','w_4','w_5','w_6',
                    'w_7',
                    //'w_8','w_9','w_10',
                    'w_11'
                    //,'w_12'
                    ],
      
  },
  cartas:[  // definir las cartas que se van a procesar 
'NB-21-Z',
'NB-22-Y',
'NA-21-X',
'NA-22-V'
    ],

//Umbrales para la clasificación de Agua 
  Limeares:{
    // Propuesta para corrida regional 
    shade_min :88.5, // Percentil 2 
    shade_max : 94.5, // Percentil 8
    gv_soil_min : 0, // Percentil 2
    gv_soil_max : 4, // si el P8 es 0, pasar al percentil 92
    cloud_desc_min : 19, // Percentil 92
    cloud_desc_max : 21, // Percentil 98
    cloud_asc_min : 1,// Percentil 2
    cloud_asc_max : 2,// Percentil 8
  },
  // Ecuación para aplicar SMA
  // mean,median,min,qualitymosaic
  reductorMosaico:'median', // indicamos el reductor que vamos a utilizar para los mosaicos
  ApplySMAe:{
    Apply  :true, // true or false para aplicar o no el SMA estimado
    shade  :[0.664,31.8],// m y b (y=mx+b): corregir con la ecuación de la pendiente
    gv_soil:[0.633,1.14],// m y b: corregir con la ecuación de la pendiente
    cloud  :[0.974,0.603] // m y b: corregir con la ecuación de la pendiente
    
    
  },
  //********************************************************
  // Parametrización para la validación 
  //********************************************************
  SensorValidacion :'LX', // L5, L8, LX(para todos ) --- Aqui seleccionamos con que sensor queremos correr la validación
  cartasFechasVal:[
       ['NB-22-Y',[[1989,8],[1990,7],[2003,8],[2004,11],[2017,9],[2019,11]]],   //g.Francesa SUL
       ['NA-22-V',[[1988,7],[1989,8],[2003,8],[2004,12],[2017,7],[2018,9]]],  //g.Francesa NORTE
  ],
} 

//**************************************************
// Aqui comienza a correr el script y no se necesita ajustas a partir de
// estas líneas de códigos
//**************************************************

var Pais = param.pais_name
var SensorValidacion =param.SensorValidacion

var cartas =param.cartas
//--------------------------------------------------------
//--------------------------------------------------------
var grids = ee.FeatureCollection('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/TEMP/bigGrids_' + param.pais_name)

var modules = require('users/ingperezescobar/MapBiomas_final:Definitivo2/Modules/Map001_module_month_water_2_AB_generico');
var ConlAComp = ee.ImageCollection('projects/mapbiomas-raisg/PRODUCTOS/AGUA/'+param.pais_name.toUpperCase()+'/BETA/'+param.PilotoComparacion)
//cargamos las ecuaciones 
modules.setLimeares(param.Limeares)
// agregamos un SMA
modules.setParametroSMA(param.ApplySMAe)
modules.setParametroReducto(param.reductorMosaico)

var pal ={
  'pal-1':['0000ff','009900','009900','ffffff','000000','ff0000','ff0000','c6c6c6','ffff00'],
  'pal-2':['0000ff','009900','5af100','ffffff','000000','ff0000','ff60c7','c6c6c6','ffff00'],
}
var vis_detec = pal[param.Paleta]
var vis_detecAnt = ['ffffff','0000ff','009900','ff0000','000000']

var get_Collection = modules.get_Collection2;
var p_img_month_func = modules.p_img_month_func;
var p_year_func = modules.p_year_func;
var p_month_func =modules.p_month_func;
//

// if(vis.Visualizar_piloto){
// Map.addLayer(Collection.filterDate(year+'-01-01', year+'-12-31').median(),{"bands":["swir1","nir","red"],"min":200,"max":4000},'mosaic'+year,false)
// }


var grid_names = param.cartas

// -------------------------------------------------------------------------------------
// Seleccionamos las grillas que vamos a procesar 
var Grillas = ee.FeatureCollection([])
grid_names.forEach(function(grid_name){
  Grillas = Grillas.merge(grids.filter(ee.Filter.eq('grid_name', grid_name)))
})
// obtenemos las imagenes para empezar a clasificar 
var Collection = get_Collection(Grillas, param.cloud_cover,param.years);

// water func
var water_y_m_func = function (year, moving_window, collection) {
  
  var p_img_month = p_img_month_func(year, moving_window, collection);
  var p_year = p_year_func(year, collection);
  var p_month = p_month_func(year, moving_window, collection);
  
  var fill_gap = p_month.gte(0.5).and(p_year.gte(0.5)).selfMask();
  
  // var deteccao = p_img_month.gte(0.67);
  // // Cuando no hay imágenes disponibles 
  // //var deteccao = ee.Image(0).addBands(p_img_month).gte(0.67).reduce('sum').selfMask();
  
  var deteccao = ee.Algorithms.If(p_img_month.bandNames().length().eq(1), 
                                  p_img_month.gte(0.67), 
                                  ee.Image(0).rename("p_water").selfMask())
  deteccao = ee.Image(deteccao);
  
  var remv = p_year.lt(0.35).selfMask();

  // var gap = fill_gap.mask(deteccao.unmask(0).eq(0)).selfMask().multiply(2);
  // var no_data = deteccao.add(1).unmask().eq(0).selfMask();
  // var water = no_data.multiply(4).blend(deteccao).blend(gap).blend(remv.multiply(3));
  
  var gap = fill_gap.mask(deteccao.unmask(0).eq(0)).selfMask().multiply(3);
  var no_data = deteccao.add(1).unmask().eq(0).selfMask();
  var water = no_data.multiply(5).blend(deteccao).blend(gap).blend(remv.multiply(7));
  
  var month= moving_window
  var start = ee.Date.fromYMD(year, month, 1);
  var end = start.advance(1, 'month');
  var col = Collection.filterDate(start, end).median()
  
  water = water.where(water.eq(0),4)
  water = ee.Algorithms.If(col.bandNames().length().gt(0), 
                          water.where(col.select(0).and(water.eq(3)),2),
                          water)
  water = ee.Image(water)     
  
  water = ee.Algorithms.If(col.bandNames().length().gt(0), 
                          water.where(col.select(0).and(water.eq(7)),6),
                          water)
  water = ee.Image(water)

  
  return water;
};


var ColVisAnt;
var  dif,img1,img2; 
var image_colAnt = ee.ImageCollection([])
var image_ress = ee.ImageCollection([])
var image_moss = ee.ImageCollection([])


param.years.forEach(function(year){
// Empezamos seleccionando las imagenes que vamos a procesar en las cartas seleccionadas
Collection = Collection.filterBounds(Grillas)
var water_y = 
  water_y_m_func(year, 1, Collection).rename('w_1').addBands(
  water_y_m_func(year, 2, Collection).rename('w_2')).addBands(
  water_y_m_func(year, 3, Collection).rename('w_3')).addBands(
  water_y_m_func(year, 4, Collection).rename('w_4')).addBands(
  water_y_m_func(year, 5, Collection).rename('w_5')).addBands(
  water_y_m_func(year, 6, Collection).rename('w_6')).addBands(
  water_y_m_func(year, 7, Collection).rename('w_7')).addBands(
  water_y_m_func(year, 8, Collection).rename('w_8')).addBands(
  water_y_m_func(year, 9, Collection).rename('w_9')).addBands(
  water_y_m_func(year, 10, Collection).rename('w_10')).addBands(
  water_y_m_func(year, 11, Collection).rename('w_11')).addBands(
  water_y_m_func(year, 12, Collection).rename('w_12'));

for (var i=0; i<grid_names.length; i++) {
  var grid_name = grid_names[i];
  
  var grid = grids.filter(ee.Filter.eq('grid_name', grid_name));
  
  var image = water_y.clip(grid).selfMask()
    .set('year', year)
    .set('region', 0)
    .set('version', 1)
    .set('grid_name', grid_name)
    .set('pais', param.pais_name);
  
  image_colAnt = image_colAnt.merge(ConlAComp
                .filter(ee.Filter.eq('year',year))
                .filter(ee.Filter.eq('grid_name', grid_name))
                //.filterBounds(Grillas)
                )
  
  image_ress = image_ress.merge(image)
  if (param.ExportAgua){
    //print('image',image)
    Export.image.toAsset({
        image: image.byte(), 
        description: 'class_water_' + year + '_' + grid_name, 
        assetId: 'users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/' + param.pais_name.toUpperCase()  +'/COLECCION1/'+param.ExportPiloto+'/class_water_' + year + '_' + grid_name, 
        region: grid.first().geometry().bounds(), 
        scale: 30, 
        pyramidingPolicy: {
        '.default': 'mode'
      },
        maxPixels: 1e13
    })
  }
  }
  if(param.vis.Visualizar_piloto){
      param.vis.listbandMonth.forEach(function(bandMonth){
        var month= parseInt(bandMonth.split('_')[1])
        var start = ee.Date.fromYMD(year, month, 1);
        var end = start.advance(1, 'month');
        Map.addLayer(Collection.filterBounds(Grillas).filterDate(start, end).median(),
                  {"bands":["swir1","nir","red"],"min":200,"max":4000},'mosaic-'+month+'-'+year,false);
        
        Map.addLayer(image_colAnt.select(bandMonth),{"min":0,"max":4,"palette":vis_detecAnt },
                'clasif-C4'+bandMonth+'-'+year,false); 
        img2 = image_ress.filter(ee.Filter.eq('year',year))
        Map.addLayer(img2.select(bandMonth),{"min":1,"max":9,"palette":vis_detec },
                'clasif-C4-Corr-'+bandMonth+'-'+year,false);
        if (param.Comparacion){
          img1 = image_colAnt.select(bandMonth)
                 .median()
          img2 = img2.select(bandMonth)
                 .median()
                 
          img1 = img1.eq(1).or(img1.eq(2))
          img2 = img2.eq(1).or(img2.eq(2)).or(img2.eq(3))
          dif = img1.unmask(img2).multiply(0)
          dif = dif.where(img1.and(img2),2)
          dif = dif.where(dif.neq(2).and(img1),1)
          dif = dif.where(dif.neq(2).and(img2),3).selfMask()
          Map.addLayer(dif.select(bandMonth),{"min":1,"max":3,"palette":['ff0000','00ff00','0000ff'] },
                          'dif-PilAnt-vs-PilAjus-'+bandMonth+'-'+year,false);
        }
      })
  }
    
  Map.addLayer(Grillas,{},'Grillas-Seleccionadas',false)
  //print(Grillas)
  var img_input_freq = image.gte(1).and(image.lte(2)).selfMask()
                          .reduce(ee.Reducer.sum());
  
  var img_input = img_input_freq.gte(6).selfMask();
  
  var colorRamp = ['ffffff','02ffe8','0417ff','000da7'];
  
  if(param.vis.Visualizar_piloto){
  Map.addLayer (img_input_freq, {palette: colorRamp, min:0, max:12}, 'freq',false);
  Map.addLayer (img_input, {palette: 'blue'}, 'annual',false)
  }
  
  
})


//**************************************************
// Ahora hacemos correr la validación
//**************************************************
if (param.Validacion){
  var meses=[1,2,3,4,5,6,7,8,9,10,11,12]
  //var Piloto = ee.ImageCollection('projects/mapbiomas-raisg/PRODUCTOS/AGUA/'+Pais.toUpperCase()+'/BETA/'+NombrePiloto)
  var Piloto = image_ress
  var Grids = ee.FeatureCollection('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/TEMP/bigGrids_'+Pais)
  var assetsPtos = []
  var GrillasGeom = ee.FeatureCollection([])
  var PuntosClass = ee.FeatureCollection([])
  
  cartas.forEach(function(carta){
    print('procesando-carta:'+carta)
    PuntosClass = PuntosClass.merge(ee.FeatureCollection('users/ingperezescobar/mapbiomas-raisg/PRODUCTOS/AGUA/'+Pais.toUpperCase()+'/DATOS_AUXILIARES/Ptos_'+carta+'-class'))
    GrillasGeom = GrillasGeom.merge(
                  Grids.filter(ee.Filter.eq('grid_name',carta))
    )
  })
  var colorRamp = ['ffffff','0000ff','00aa00','ff0000','000000'];
  
  // Clases de agua y no-agua 
  var clases = param.Clases
  var remapImg = [[1,              2,              3,              4,              6,             7,               8,             9],
  [param.Clases[0],param.Clases[0],param.Clases[0],param.Clases[1],param.Clases[1],param.Clases[1],param.Clases[1],param.Clases[1]]]
  PuntosClass = PuntosClass
                .filter(ee.Filter.inList(param.CampoClase,clases))
  
  Piloto = Piloto.filter(ee.Filter.inList('grid_name',cartas))
  
  /*
  meses.forEach(function(mes){
    Map.addLayer(Piloto,{bands:'w_'+mes,palette:colorRamp,min:0,max:4},'Pil-w-'+mes,false)  
  })
  */
  Map.addLayer(PuntosClass,{},'PuntosClass',false)
  Map.addLayer(GrillasGeom,{},'GrillasGeom',false)
  
  // Confusion Matrix
  
  // Extrac values from clasification 
  //Ptos = mosaic1.sampleRegions({collection: Ptos, properties: null, scale: 30, geometries: true,tileScale:4});
  
  var ptosValidacion = ee.FeatureCollection([]);
  var imgTemp,ptosTemp,fechas,grid,FechaSel,fechas,grid_name;
  param.cartasFechasVal.forEach(function(cartaFecha){
    //fechas = getFechas(grid_name)
    
    grid_name = cartaFecha[0] //obtenemos el nombre de la carta 
    fechas = cartaFecha[1] // obtenemos las fechas de las cartas
    grid = Grids.filter(ee.Filter.eq('grid_name', grid_name));
    
    fechas.forEach(function(fech,i){
      //revisamos que se procesó el año que se quiere validar 
      if (param.years.indexOf(fech[0])>-1){
        var month= fech[1]
        var start = ee.Date.fromYMD(fech[0], month, 1);
        var end = start.advance(1, 'month');
        FechaSel=fech[0]+'-'+fech[1]+'-1'
        imgTemp = Piloto
                  .filter(ee.Filter.eq('grid_name',grid_name))
                  .filter(ee.Filter.eq('year',fech[0]))
                  .select('w_'+fech[1])
                  .first()
                  .remap(remapImg[0],remapImg[1])
                  .rename('class_predict')
        ptosTemp = PuntosClass
                   .filterBounds(grid)
                   .filter(ee.Filter.eq('fecha',i+1))
                   .map(function(ele){
                     return ele.set('class_actual',ele.get(param.CampoClase))
                   })
        
        if (SensorValidacion==='L5'){
          ptosTemp = ptosTemp.filter(ee.Filter.inList('fecha',[1,2]))
          ptosTemp = imgTemp.sampleRegions({collection: ptosTemp, properties: null, scale: 30, geometries: true,tileScale:2});
          ptosValidacion = ptosValidacion.merge(ptosTemp)
        }else{
          if (SensorValidacion==='L8'){
            ptosTemp = ptosTemp.filter(ee.Filter.inList('fecha',[5,6]))
            ptosTemp = imgTemp.sampleRegions({collection: ptosTemp, properties: null, scale: 30, geometries: true,tileScale:2});
            ptosValidacion = ptosValidacion.merge(ptosTemp)
          }
          else{ // SensorValidacion==='LX'
            ptosTemp = imgTemp.sampleRegions({collection: ptosTemp, properties: null, scale: 30, geometries: true,tileScale:2});
            ptosValidacion = ptosValidacion.merge(ptosTemp)
          }
        }
      }
      //aqui termina el bucle
    })
  print('Carta : '+grid_name)
  })
  /*
  var errorMatrix = ptosValidacion.errorMatrix({
  		actual:'class_actual',
  		predicted:'class_predict',
  //	order:null,
  })
  */
  //print('ptosValidacion',ptosValidacion.limit(1000))
  print('Ya generó el resultado del piloto....')
  print('... Ahora calculamos la presición')
  var CalPtosFiltro=function(pto,c1,c2){
    return pto.filter(ee.Filter.eq('class_actual',c1))
           .filter(ee.Filter.eq('class_predict',c2))
           .reduceColumns(ee.Reducer.count(),['class_actual'])
  }
  var Lista = {
    TN:ee.Number(CalPtosFiltro(ptosValidacion,param.Clases[1],param.Clases[1]).get('count')),
    FN:ee.Number(CalPtosFiltro(ptosValidacion,param.Clases[0],param.Clases[1]).get('count')),
    FP:ee.Number(CalPtosFiltro(ptosValidacion,param.Clases[1],param.Clases[0]).get('count')),
    TP:ee.Number(CalPtosFiltro(ptosValidacion,param.Clases[0],param.Clases[0]).get('count')),
  }
  print('LA matriz de confusión es:')
  print('     (Observado)')
  print('       '+'N-Agua Agua')
  print(ee.String('N-Agua ').cat(Lista.TN).cat('    ').cat(Lista.FN))
  print(ee.String('Agua   ').cat(Lista.FP).cat('    ').cat(Lista.TP))
  
  //print('Lista',Lista)
  
  // Calculamos toda la presición 
  var ApplyEcu= function(p1,p2,p3){
    return p1.divide(p2.add(p3))
              .multiply(10000)
              .round()
              .divide(100)
  }
  var ApplyEcuF1= function(p1,p2){
    return p1.multiply(p2)
             .divide(p1.add(p2))
             .multiply(2)
             .multiply(100)
             .round()
             .divide(100)
  }
  
  var ResultadosPres ={ 
    Precision :ApplyEcu(Lista.TP,Lista.TP,Lista.FP),
    Recall    :ApplyEcu(Lista.TP,Lista.TP,Lista.FN),
    TPR       :ApplyEcu(Lista.TP,Lista.TP,Lista.FN),
    FPR       :ApplyEcu(Lista.FP,Lista.TN,Lista.FP),
    TNR       :ApplyEcu(Lista.TN,Lista.TN,Lista.FP),
    FNR       :ApplyEcu(Lista.FN,Lista.TP,Lista.FN),
    F1        :0
  }
  ResultadosPres.F1 = ApplyEcuF1(ResultadosPres.Precision,ResultadosPres.Recall)
  print('Los resultado para el actual piloto  son:');
  //ResultadosPres.push((Lista.TP / (Lista.TP+Lista.FP)))
  print(ee.String('Precision: ').cat(ResultadosPres.Precision));
  //print('Recall   : ' +  (ResultadosPres[1]*100).toFixed(2))
  print(ee.String('Recall: ').cat(ResultadosPres.Recall));
  //ResultadosPres.push(Lista.TP.divide(Lista.TP.add(Lista.FN)))
  //print('True Positive Rate : ' +  (ResultadosPres[2]*100).toFixed(2))
  print(ee.String('True Positive Rate: ').cat(ResultadosPres.TPR));
  //print('False Positive Rate: ' +  (ResultadosPres[3]*100).toFixed(2))
  print(ee.String('False Positive Rate: ').cat(ResultadosPres.FPR));
  //print('True Negative Rate : ' +  (ResultadosPres[4]*100).toFixed(2))
  print(ee.String('True Negative Rate: ').cat(ResultadosPres.TNR));
  //print('False Negative Rate: ' +  (ResultadosPres[5]*100).toFixed(2))
  print(ee.String('False Negative Rate: ').cat(ResultadosPres.FNR));
  //ResultadosPres.push(((2*(ResultadosPres[0]*ResultadosPres[1]))/(ResultadosPres[0]+ResultadosPres[1])))
  //print('F1 Score           : ' +  (ResultadosPres[6]*100).toFixed(2))
  print(ee.String('F1 Score           : ').cat(ResultadosPres.F1));
}  



// Adicionamos la leyenda para visualización de las clases
if(param.vis.Visualizar_piloto){



/* Proción de código para adicionar una leyenda
*/
  var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
  
});
 
var legendTitle = ui.Label({
  value: 'Leyenda',
  style: {
    fontWeight: 'bold',
    fontSize: '16px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
 
legend.add(legendTitle);
var texinfo = ui.Label({
  value: 'Clasificación de agua',
  style: {
    //fontWeight: 'bold',
    fontSize: '10px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
legend.add(texinfo);

var makeRow = function(color, name) {
       var colorBox = ui.Label({ 
        style: {
          backgroundColor: '#' + color,
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
 
var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};


var Elemento =[
  [vis_detec[0],'C1-Agua detectada'],
  [vis_detec[1],'C2-Agua Incluida obs'],
  [vis_detec[2],'C3-Agua Incluida no obs'],
  [vis_detec[3],'C4-No Agua'],
  [vis_detec[4],'C5-No observado'],
  [vis_detec[5],'C6-Exclusión obs'],
  [vis_detec[6],'C7-Exclusión no obs'],
  [vis_detec[7],'C8-Agua en sombra'],
  [vis_detec[8],'C9-Agua en pendiente']
   ]
  
Elemento.forEach(function(ele){
  legend.add(makeRow(ele[0], ele[1]))
})
Map.add(legend);
}