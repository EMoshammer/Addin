Office.onReady(function() {
  
  Excel.run(function (context) {
    var sheet = context.workbook.worksheets.getActiveWorksheet();
    
    var rng = sheet.getUsedRange();
    rng.load("formulas, address");
    
    sheet.getRange("C1").values = [[ 5 ]];
    
    
   //document.write(JSON.stringify(rng3.formulas, null, 4));
    
    var data2 = [[1, 2]];
    var rng2 = sheet.getRange("A1:B1");
    rng2.values = data2;
    
    // Create the headers and format them to stand out.
    var headers = [
      ["Product", "Quantity", "Unit Price", "Totals"]
    ];
    var headerRange = sheet.getRange("B2:E2");
    headerRange.values = headers;
    headerRange.format.fill.color = "#4472C4";
    headerRange.format.font.color = "white";

    // Create the product data rows.
    var productData = [
      ["Almonds", 9, 7.5],
      ["Coffee", 20, 34.5],
      ["Chocolate", 10, 9.56],
    ];
    var dataRange = sheet.getRange("B3:D5");
    dataRange.values = productData;

    // Create the formulas to total the amounts sold.
    var totalFormulas = [
      ["=C3 * D3"],
      ["=C4 * D4"],
      ["=C5 * D5"],
      ["=SUM(E3:E5)"], 
      ["=1"]
    ];
    var totalRange = sheet.getRange("E3:E7");
    totalRange.formulas = totalFormulas;
    totalRange.format.font.bold = true;

    // Display the totals as US dollar amounts.
    //totalRange.numberFormat = [["$0.00"]];
        
    var refreshCells = new Array();
    var refreshCells2 = new Array();
    var cell;

      //var cell = rng.getCell(3,3);
      //cell.load('address');
    
    return context.sync().then(function () {
      
      rng.getCell(0,0).formulas = [[ "=B2" ]];
      
      //cell = rng.getCell(3,3);
      //cell.load('address');
      
      //document.write(JSON.stringify(cell.address, null, 4));
      
      
      for(var i = 0; i < rng.formulas.length; i++) {
        var f = rng.formulas[i];
        for(var j = 0; j < f.length; j++) {
          
          
          if (/^=(?:.*[ !])?OutData\(.*\)/i.test(f[j])) {
            
            //var c = sheet.getRange("A1");
            //c.load('address');
            //refreshCells2.push(c);
            //var directPrecedents = sheet.getCell(i,j).getDirectPrecedents();
            //var directPrecedents = rng.getDirectPrecedents();
            //directPrecedents.areas.load("address");
            
            refreshCells.push({i: i, j: j, val: f[j]}); //, rng: sheet.getCell(i,j), dpa: directPrecedents.areas});
          }
          
        }
      }
      
      document.write(JSON.stringify(1, null, 4));
      
    })
    .then(context.sync)
    .then(function () {
      
      //cell = rng.getCell(0,0);
      //cell.load('values');
      
      for (var i = 0; i < refreshCells.length; i++) {
        //var c = rng.getCell(refreshCells[i]['i'],refreshCells[i]['j']);
        //refreshCells2.push(sheet.getCell(refreshCells[i]['i'],refreshCells[i]['j']));
      }
    })
    .then(context.sync)
    .then(function () {
      
      for (var i = 0; i < refreshCells.length; i++) {
        refreshCells[i]['abc'] = '1';
      }
      
        //sheet.getCell(0,0).values = sheet.getCell(0,0).values;
      
        document.write(JSON.stringify(refreshCells, null, 4));
        //document.write(JSON.stringify(2, null, 4));
      });
    
  });
});
