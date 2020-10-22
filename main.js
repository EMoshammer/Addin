// todo: getDirectPrecedents()
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

Office.onReady(function() {
  
  Excel.run(function (context) {
    
    var sheet = context.workbook.worksheets.getActiveWorksheet();
    
    var rng = sheet.getUsedRange();
    rng.load("formulas");
    
    sheet.getRange("A1").values = [[ 1 ]];
    sheet.getRange("A2").values = [[ 2 ]];
    sheet.getRange("A3").values = [[ 4 ]];
    
    var f = new Array("A1", "A2", "A3")
    var res = new Array();
    var refreshCells = new Array();
    var refreshCells2 = new Array();
    
    refreshCells.push(sheet.getRange("B1"));
    refreshCells.push(sheet.getRange("B2"));

    refreshCells[0].formulas = "=" + f[0];
    refreshCells[1].formulas = "=" + f[1];
    
    refreshCells[0].load("values");
    refreshCells[1].load("values");
    
    return context.sync().then(function () {
      
      var OutData_regex = /^=(?:.*[ \+\-\*\/!])?OutData\((.*)$/i;
      
      for(var i=0; i < rng.formulas.length; i++) {
        var rng_slice = rng.formulas[i];
        for(var j = 0; j < rng_slice.length; j++) {
          if (OutData_regex.test(rng_slice[j])) {
            var mtch = rng_slice[j].match(OutData_regex);
            refreshCells2.push({i: i, j: j, val: rng_slice[j], args: ParseArguments(mtch[1]), c:rng.getCell(i,j) });
          }
        }
      }
      
      for(var i=0; i < refreshCells2.length; i++) {
        if (refreshCells2[i]['args'].length >= 0) {
          refreshCells2[i][c].formulas = '=' + refreshCells2[i]['args'][0];
          //refreshCells2[i][c].load('values');
        }
      }
      
      
      res.push(refreshCells[0].values[0][0]);
      res.push(refreshCells[1].values[0][0]);
      refreshCells[0].formulas = "=" + f[1];
      refreshCells[0].load("values");
    })
    .then(context.sync)
    .then(function () {
      res.push(refreshCells[0].values[0][0]);
      refreshCells[0].formulas = "=" + f[2];
      refreshCells[0].load("values");
    })
    .then(context.sync)
    .then(function () {
      res.push(refreshCells[0].values[0][0]);
      document.write(JSON.stringify(res, null, 4));
      document.write(JSON.stringify(refreshCells2, null, 4));
    });
    
    
    if (false) {
    
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
      
    }
  });
});
