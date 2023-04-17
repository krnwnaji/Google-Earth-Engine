var table = ee.FeatureCollection("users/krnwnaji1995/AOI_Target_PL"),
    firms = ee.ImageCollection("FIRMS"),
    KHDTK_Tumbang_Nusa = 
    /* color: #d63000 */
    /* shown: false */
    ee.Feature(
        ee.Geometry.Polygon(
            [[[114.00281780691927, -2.3463919715536297],
              [114.09620159598177, -2.473309021663233],
              [114.17722576590364, -2.4527286869071663],
              [114.10444134207552, -2.3607993630998423],
              [114.02959698172396, -2.2942497013515983]]]),
        {
          "system:index": "0"
        }),
    Lokasi_Terbakar = 
    /* color: #ffec08 */
    /* shown: false */
    ee.Feature(
        ee.Geometry.MultiPoint(
            [[113.82847865292388, -2.368873162323681],
             [114.1924007720645, -2.289288089633419],
             [114.307757217377, -2.3935710553656477],
             [113.96615469223698, -2.7212829172956603],
             [114.10073721176823, -2.386533212343586],
             [113.80127986133955, -2.219127072756204]]),
        {
          "system:index": "0"
        }),
    roi_tn = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[113.85690886701578, -2.175203392754999],
          [113.85690886701578, -2.638964920712441],
          [114.32382781232828, -2.638964920712441],
          [114.32382781232828, -2.175203392754999]]], null, false);

//////////////////////////////////Image Vis///////////////////////////////////////////////////

var ndviVisParams = {"opacity":1,"bands":["NDVI"],"min":0,"palette":["d00706","fdb000","fff700","7aff02","37dc02","2bad01"]};
var firesVis = {
  min: 325,
  max: 6000,
  palette: ['red', 'orange', 'yellow'],
};

var imageVisParam2 = {"opacity":1,"bands":["SR_B5","SR_B4","SR_B3"],"min":0.010668699999999991,"max":0.43132630000000005,"gamma":1};

var visualization = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0.0,
  max: 0.3,
};

//////////////////////////////////Fungsi///////////////////////////////////////////////////

// This example demonstrates the use of the Landsat 4, 5, 7 Collection 2,
// Level 2 QA_PIXEL band (CFMask) to mask unwanted pixels.

function maskL457sr(image) {
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud
  // Bit 2 - Unused
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);

  // Apply the scaling factors to the appropriate bands.
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBand = image.select('ST_B6').multiply(0.00341802).add(149.0);

  // Replace the original bands with the scaled ones and apply the masks.
  return image.addBands(opticalBands, null, true)
      .addBands(thermalBand, null, true)
      .updateMask(qaMask)
      .updateMask(saturationMask);
}

//Fungsi menambahkan NDVI
var addNDVI = function(image) {
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  return image.addBands(ndvi);
};

//Fungsi Cloudmasking Landsat 8
function maskL8sr(image) {
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud
  // Bit 2 - Cirrus
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);

  // Apply the scaling factors to the appropriate bands.
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);

  // Replace the original bands with the scaled ones and apply the masks.
  return image.addBands(opticalBands, null, true)
      .addBands(thermalBands, null, true)
      .updateMask(qaMask)
      .updateMask(saturationMask);
}

//////////////////////////////////Dataset///////////////////////////////////////////////////

// firms dataset 2019
var dataset19 = firms.filter(
    ee.Filter.date('2019-01-01', '2019-12-31'));
var fires19 = dataset19.select('T21').sum().clip(roi_tn);

// firms dataset 2015
var dataset15 = firms.filter(
    ee.Filter.date('2015-01-01', '2015-12-31'));
var fires15 = dataset15.select('T21').sum().clip(roi_tn);

//image L5
var l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
    .filterDate('1984-06-01', '2012-01-01')
    .filterBounds(table)
    .map(maskL457sr)
    .map(function(a){
      return a.set('year',ee.Image(a).date().get('year'))
    });
    
//Image L8
var l8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
    .filterDate('2012-01-01', '2022-09-01')
    .filterBounds(roi_tn)
    .map(maskL8sr)
    .map(function(a){
      return a.set('year',ee.Image(a).date().get('year'))
    });
    

/////////////////////////////////Code///////////////////////////////////////////////////////
var list = ee.List([])

for (var a = 2000;a <= 2022;a++){
  if(a < 2012){
    var filL5 = l5.filterMetadata('year','equals',a).median();
    var finalL5 = filL5.set('year',a)
                      .set('product','L05')
    list = list.add(finalL5)
  } else {
    var filL8 = l8.filterMetadata('year','equals',a).median();
    var finalL8 = filL8.set('year',a)
                      .set('product','L08')
    list = list.add(finalL8)
  }
}

var finalCol = ee.ImageCollection(list)
              .map(function(a){
                return a.set('bands',ee.Image(a).bandNames().length())
              })
              .filterMetadata('bands','greater_than',0);


////////////////////////////////////////add layer/////////////////////////////////////////

for (var a = 2010;a <= 2022;a++){
  Map.addLayer(finalCol.filterMetadata('year','equals',a)
                      .median()
                      .clip(roi_tn)
                      ,visualization,'Tahun '+a,false)
}

for (var a = 2010;a <= 2022;a++){
  Map.addLayer(addNDVI(finalCol.filterMetadata('year','equals',a)
                      .median()
                      .clip(roi_tn))
                      ,ndviVisParams,'NDVITahun '+a,false)
}

Map.addLayer(fires19,firesVis,'hotspot tahun 2019')
Map.addLayer(fires15,firesVis,'hotspot tahun 2015')
Map.addLayer(KHDTK_Tumbang_Nusa,{},'batas kajian',false);
Map.centerObject(roi_tn)

/////////////////////////////////////////export//////////////////////////////////////////////

for (var a = 2010;a <= 2022;a++){
  Export.image.toDrive({
    image : addNDVI(finalCol.filterMetadata('year','equals',a)
                    // .select('SR_B4', 'SR_B3', 'SR_B2')
                    .median()
                    .clip(roi_tn)).toDouble().select('SR_B2','SR_B3','SR_B4','SR_B5','NDVI'),
    fileNamePrefix : 'NDVITumbangN3_'+a,
    description : 'NDVITumbangN3_'+a,
    folder : 'GEE/COBA',
    maxPixels: 1e8,
    scale : 30
  })
}

for (var a = 2010;a <= 2022;a++){
  Export.image.toDrive({
    image : finalCol.filterMetadata('year','equals',a)
                    .select('SR_B4', 'SR_B3', 'SR_B2','SR_B5')
                    .median()
                    .clip(roi_tn),
    fileNamePrefix : 'TumbangNus_'+a,
    description : 'TumbangNus_'+a,
    folder : 'GEE/COBA',
    maxPixels: 1e8,
    scale : 30
  })
}

//Hotspot
Export.image.toDrive({
 image : fires19,
 fileNamePrefix : 'Hotspot 2019',
    description : 'Hotspot 2019',
    folder : 'GEE/COBA',
    maxPixels: 1e9,
    scale : 30
})
Export.image.toDrive({
 image : fires15,
 fileNamePrefix : 'Hotspot 2015',
    description : 'Hotspot 2015',
    folder : 'GEE/COBA',
    maxPixels: 1e9,
    scale : 30
})
