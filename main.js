
//https://github.com/handsontable/formula-parser
//https://github.com/formulajs/formulajs

var DL = null;

function ExcelDateToJSDate(date) {
  if (date < 3000) return date;
  return '"' + (new Date(Math.round((date - 25569)*86400*1000))).toISOString().split('T')[0] + '"';
}

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
  
	report = function(status, r) {
		
		if (r.state == 'success') {
		
			var v = r.value.data;
    var toInsert = document.createElement("div");
    toInsert.innerHTML = JSON.stringify(status) + '; ' + r.query + ': ' + JSON.stringify(v);
    document.body.appendChild(toInsert);
			
			r.sht.getCell(r.target[0],r.target[1]).getResizedRange(v.length-1, v[0].length-1).values = v;
			r.context.sync();
		}
	}
	
	var DL = new DataLayer([], report);
  
  Excel.run(function (context) {
    
    var sheet = context.workbook.worksheets.getActiveWorksheet();
    
    var rng = sheet.getUsedRange();
    rng.load("formulas");
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
      
      var queries = [];
	
      for (var i=0; i<refreshCells.length; i++) {
	//document.write(JSON.stringify(refreshCells[i]));
        var args = refreshCells[i].args;
        if (args.length == 0) continue;
        
        var freq = (args[1] === undefined ? 'A' : args[1]);
        var dt_start = (args[2] === undefined ? '2000' : ExcelDateToJSDate(args[2]));
        var dt_end = (args[3] === undefined ? '2020' : ExcelDateToJSDate(args[3]));
	var dim = (args[4] === undefined ? 1 : (args[4] % 10 == 1 ? 2 : 1));
	var offset = (args[4] === undefined ? 0 : Math.floor(args[4]/10));
        var region = (args[5] === undefined ? null : args[5].split(',') );
        var target = [];
	      
	if (dim == 1) {
		target[0] = refreshCells[i].i + offset;
		target[1] = refreshCells[i].j;
	} else {
		target[0] = refreshCells[i].i;
		target[1] = refreshCells[i].j + offset;
	}
	      
        var q = 'TS2MAT(' + args[0] + ', ' + dt_start + ', ' + dt_end + ')';
	if (dim == 2) q = 'TRANSPOSE(' + q + ')';
        if (region) q = 'STACK(' + q + ', "country", ' + JSON.stringify(region) + ', ' + dim + ')';
        queries.push({target:target, txt:refreshCells[i].val, query: q, sht: sheet, context: context});
      }
      //document.write(JSON.stringify(queries));
	DL.addRequests(queries);
    
    });
    
    
    
    
  });
});
