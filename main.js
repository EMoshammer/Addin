
//https://github.com/handsontable/formula-parser
//https://github.com/formulajs/formulajs
//https://stackoverflow.com/questions/64464114/excel-function-parsing-in-office-js

function ParseArguments(expr) {

  args = [];
  openBr = 0;
  spos = 0;
  
  for (var pos=spos; pos<expr.length; pos++) {
  
    switch(expr[pos]) {
      case '"':
        pos = expr.indexOf('"', pos+1);
        break;
      case "'":
        pos = expr.indexOf("'", pos+1);
        break;
      case "(": 
        openBr++;
        break;
      case ")":     		
        if(openBr==0) {
          args.push(expr.substring(spos, pos));
          return args;
        }
        openBr--;
        break;
      case ",":
          if(openBr==0) {
          args.push(expr.substring(spos, pos));
          spos=pos+1;
        }
        break;
    }
  }

  return args;
}

function LoadNextParam(refreshCells, iter) {

  for(var i=0; i < refreshCells.length; i++) {
    if (refreshCells[i]['args'].length > iter+1) {
      refreshCells[i]['args'][iter+1] = refreshCells[i]['c'].values[0][0];
    }
    if (iter >= 0) { 
      if (refreshCells[i]['args'].length > iter) {
        refreshCells[i]['c'].formulas = '=' + refreshCells[i]['args'][iter];
        refreshCells[i]['c'].load('values');
      }
    } else {
      refreshCells[i]['c'].formulas = refreshCells[i]['val'];
    }
  }

}
  
Office.onReady(function() {
  
  Excel.run(function (context) {
    
    var sheet = context.workbook.worksheets.getActiveWorksheet();
    
    var rng = sheet.getUsedRange();
    rng.load("formulas");
    
    sheet.getRange("A1").values = [[ 1 ]];
    sheet.getRange("A2").values = [[ 2 ]];
    sheet.getRange("A3").values = [[ 4 ]];
    sheet.getRange("B1").values = [[ 5 ]];
    sheet.getRange("B2").values = [[ 2 ]];

    var refreshCells = new Array();
    
    
    return context.sync().then(function () {
      
      var OutData_regex = /^=(?:.*[ \+\-\*\/!])?OutData\((.*)$/i;
      
      for(var i=0; i < rng.formulas.length; i++) {
        var rng_slice = rng.formulas[i];
        for(var j = 0; j < rng_slice.length; j++) {
          if (OutData_regex.test(rng_slice[j])) {
            var mtch = rng_slice[j].match(OutData_regex);
            refreshCells.push({i: i, j: j, val: rng_slice[j], args: ParseArguments(mtch[1]), c:rng.getCell(i,j) });
          }
        }
      }

    })
    .then(function () { LoadNextParam(refreshCells, 5);}).then(context.sync)
    .then(function () { LoadNextParam(refreshCells, 4);}).then(context.sync)
    .then(function () { LoadNextParam(refreshCells, 3);}).then(context.sync)
    .then(function () { LoadNextParam(refreshCells, 2);}).then(context.sync)
    .then(function () { LoadNextParam(refreshCells, 1);}).then(context.sync)
    .then(function () { LoadNextParam(refreshCells, 0);}).then(context.sync)
    .then(function () { LoadNextParam(refreshCells, -1);})
    .then(function () {
      
      document.write(JSON.stringify(refreshCells, null, 4));
    
    });
    
    
    
    
  });
});
