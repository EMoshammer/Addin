// todo: getDirectPrecedents()

Office.onReady(function() {
  
  Excel.run(function (context) {
    
    document.write(JSON.stringify(navigator, null, 4));
    
    var sheet = context.workbook.worksheets.getActiveWorksheet();
    
    var rng = sheet.getUsedRange();
    rng.load("formulas");
    
    sheet.getRange("B2").values = [[ 5 ]];
    
    var refreshCells = new Array();

    //var cell;

      //var cell = rng.getCell(3,3);
      //cell.load('address');
    
    return context.sync().then(function () {
      
      //rng.getCell(0,0).formulas = [[ "=B2" ]];
      rng.formulas[0][0] = "=B2";
      
      //cell = rng.getCell(3,3);
      //cell.load('address');
      
      //document.write(JSON.stringify(cell.address, null, 4));
      
      
      for(var i = 0; i < rng.formulas.length; i++) {
        var f = rng.formulas[i];
        for(var j = 0; j < f.length; j++) {
          if (/^=(?:.*[ !])?OutData\(.*\)/i.test(f[j])) {
            refreshCells.push({i: i, j: j, val: f[j]}); //, rng: sheet.getCell(i,j), dpa: directPrecedents.areas});
          }
          
        }
      }
      
      document.write("1 ");
      
      return context.sync();
    })
    //.then(context.sync)
    .then(function () {
      
      //cell = sheet.getCell(0,0);
      //cell.load('values');
      
      for (var i = 0; i < refreshCells.length; i++) {
        //var c = rng.getCell(refreshCells[i]['i'],refreshCells[i]['j']);
        //refreshCells2.push(sheet.getCell(refreshCells[i]['i'],refreshCells[i]['j']));
      }
      
      return context.sync();
    })
    //.then(context.sync)
    .then(function () {
      
      for (var i = 0; i < refreshCells.length; i++) {
        refreshCells[i]['abc'] = '1';
      }
      
        //sheet.getCell(0,0).values = sheet.getCell(0,0).values;
      
        document.write(JSON.stringify(refreshCells, null, 4));
        //document.write(JSON.stringify(2, null, 4));
      });
    
    return context.sync();
  });
});
