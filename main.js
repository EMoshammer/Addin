Office.onReady(function() {
  
  Excel.run(function (context) {
    var sheet = context.workbook.worksheets.getActiveWorksheet();
    
    var rng = sheet.getUsedRange();
    rng.load("formulasR1C1");
    
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
        
    return context.sync().then(function () {
      //document.write(JSON.stringify(rng.formulas, null, 4));
      
      var refreshCells = new Array();
      
      for(var i = 0; i < rng.formulasR1C1.length; i++) {
        var f = rng.formulasR1C1[i];
        for(var j = 0; j < f.length; j++) {
          
          
          if (/^=(?:.*[ !])?OutData\(.*\)/i.test(f[j])) {
            refreshCells.push({i: i, j: j, val: f[j]});
            //document.write("f[" + i + "][" + j + "] = " + f[j]);
          }
          
        }
      }
      
      document.write(JSON.stringify(refreshCells, null, 4));
      
      
    });
    
  });
});