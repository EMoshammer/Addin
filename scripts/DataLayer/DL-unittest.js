"use strict";


function unittest(t, report) {

	var tests_xhr = [
		//ECB test
		{query: "stack(ts2mat(ECB:AME.A.$a3$.1.0.0.0.OVGD,2000), '$a3$', ['AUT', 'BEL'])", assert: {"type":"mat","data":[[280.4766],[329.6142]]}},
		{query: "stack(ts2mat(ECB:AME.A.$a3$.1.0.0.0.OVGD,2000), 'country', ['AT', 'BE'])", assert: {"type":"mat","data":[[280.4766],[329.6142]]}},
		{query: "ts2mat(ECB:AME.A.AUT.1.0.0.0.OVGD,2013)", 				assert: {"type":"mat","data":[[338.5728]]}, env: {freq:'A'} },
		{query: "ts2mat(ECB:AME.A.AUT.1.0.0.0.OVGD,2013)", 				assert: {"type":"error","data":"xhr: Frequency mismatch!"}, env: {freq:'Q'} },
		{query: "ts2mat(ECB:BLS.Q.AT.ALL.BC.E.LE.B3.ST.S.DINX,2013)", 	assert: {"type":"mat","data":[[0],[-7.142857074737549],[0],[0]]}, env: {freq:'Q'} },
		{query: "ts2mat(ECB:CBD.H.AT.11.A.01000.X.1.Z5.0000.Z0Z.Z,2013)", assert: {"type":"mat","data":[[629],[613]]}, env: {freq:'S'} },
		{query: "ts2mat(ECB:FM.B.U2.EUR.4F.KR.DFR.CHG,'20190918')", 	assert: {"type":"mat","data":[[-0.1]]}, env: {freq:'B'} },
		{query: "ts2mat(ECB:BSI.M.AT.N.A.T00.A.1.Z5.0000.Z01.E,'2013M12')", assert: {"type":"mat","data":[[913617]]}, env: {freq:'M'} },
		{query: "ts2mat(ECB:EXR.D.E5.EUR.EN00.A,'20151231')", 			assert: {"type":"mat","data":[[93.19376096442984]]}, env: {freq:'D'} },
		//ESTAT test
		{query: "ts2mat(ESTAT:nama_10_gdp.A.CLV10_MEUR.B1GQ.BE,2013)",  assert: {"type":"mat","data":[[373731.9]]}, env: {freq:'A'} },
		//OECD test
		{query: "ts2mat(OECD:EO108_INTERNET.AUT.GDPV_ANNPCT.A,2013)", 	assert: {"type":"mat","data":[[-0.0339382523324576]]}, env: {freq:'A'} },
		//FRED test
		//{query: "ts2mat(FRED:NGMPUSMP,2013)", 							assert: {"type":"mat","data":[[14832150.055]]}, env: {freq:'A'} },
		//WEO test
		//{query: "ts2mat(WEO:NGDP_R.122.2016.2,2013)", 					assert: {"type":"mat","data":[[306.175]]}, env: {freq:'A'} },
		//IMFPAYPRJ test
		//{query: "ts2mat(IMFPAYPRJ:NSDRCHARGE.360.20201130,2021)", 		assert: {"type":"mat","data":[[993140]]}, env: {freq:'A'} },
	];

	var tests_general = [
		{query: "ts2mat(format(date,'yyq'),2005)", 						assert: {"type":"mat","data":[["051"],["052"],["053"],["054"]]}, env: {freq:'Q'}},
		{query: "ts2mat(year,2005)", 									assert: {"type":"mat","data":[[2005]]}},
		{query: "concat(ts2mat(year,2006), ts2mat(year/2,2006), 2)", 	assert: {"type":"mat","data":[[2006,1003]]}},
		{query: "concat(ts2mat(year,2006), ts2mat(year/2,2006), 1)", 	assert: {"type":"mat","data":[[2006],[1003]]}},
		{query: "ts2mat(1,2006,2007)",									assert: {"type":"mat","data":[[1],[1]]}},
		{query: "eval(1)", 												assert: {"type":"scalar","data":1}},
		{query: "CATCH(throw 'error!')", 								assert: {"type":"scalar","data":null}},
		{query: "#",  													assert: {"type":"error","data":"BABEL_PARSE_ERROR: unknown: Unexpected token (1:0)\n\n> 1 | #\n    | ^"}},
		{query: "freq(2,'M')",											assert: {"type":"error","data":"freq: Requires a time series input!"}},
		{query: "(()=>{return 1+1;})()",								assert: {"type":"scalar","data":2}},
		{query: "LIT((()=>{var now = new Date().getTime(); while(new Date().getTime() < now + 100){}; return 1;})())", assert: {"type":"scalar","data":1}, env: {strict: 1}},
		{query: "TESTCONNECTOR:ERROR.0",								assert: {"type":"error","data":"TESTCONNECTOR:ERROR.0: External retrieval error! "}},
		{query: "TESTCONNECTOR:SUCCESS.100",							assert: {"type":"error","data":"Timeout!"}, env: {timeout:0.05}},
		{query: "TESTCONNECTOR:SUCCESS.101",							assert: {"type":"scalar","data":1}, env: {timeout:5}},
		{query: "ts2mat(round(pct(year,1),5),2000)",					assert: {"type":"mat","data":[[0.05003]]}},
	];
	
	var test_tsformulas = [
		{query: "ts2mat(val(year,2005),2000)",							assert: {"type":"mat","data":[[2005]]}},
		{query: "ts2mat(rebase(year,2000),2005)",						assert: {"type":"mat","data":[[100.25]]}},
		{query: "ts2mat(iytd(format(date,'yyq')),2005)",				assert: {"type":"mat","data":[[7],[1],[1],[1]]}, env:{freq:'Q'}},
		{query: "ts2mat(PUTDATEVALUE(NEW_TS(),2005,1),2004,2006)",		assert: {"type":"mat","data":[null,[1],[null]]}},
		{query: "ts2mat(MCOUNT(PUTDATEVALUE(NEW_EMPTY_TS(),2005,1),5),2004,2006)",assert: {"type":"mat","data":[[null],[1],[1]]}},
		{query: "ts2mat(2005*IPCT(PCT(IIF(YEAR>=2005,YEAR,null))),2004,2006)",assert:  {"type":"mat","data":[[null],[2005],[2006]]}},
		{query: "ts2mat(INCIF(YEAR>=2005,YEAR,null),2004,2006)",		assert : {"type":"mat","data":[[null],[1],[2]]}},
	];
	
	var tests_dateindex = [
		{query: "format(index2date(date2index(dt('2008-12-31'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2008-12-31"}, env:{freq:'A', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-01'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-12-31"}, env:{freq:'A', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2008-12-30'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2008-12-31"}, env:{freq:'A', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2008-12-31'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2008-12-31"}, env:{freq:'S', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-01'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-06-30"}, env:{freq:'S', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2008-12-30'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2008-12-31"}, env:{freq:'S', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2008-12-31'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2008-12-31"}, env:{freq:'Q', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-01'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-03-31"}, env:{freq:'Q', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2008-12-30'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2008-12-31"}, env:{freq:'Q', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2008-12-31'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2008-12-31"}, env:{freq:'M', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-01'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-31"}, env:{freq:'M', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2008-12-30'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2008-12-31"}, env:{freq:'M', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-01'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-04"}, env:{freq:'W', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-02'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-04"}, env:{freq:'W', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-03'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-04"}, env:{freq:'W', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-04'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-04"}, env:{freq:'W', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-05'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-11"}, env:{freq:'W', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-06'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-11"}, env:{freq:'W', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-07'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-11"}, env:{freq:'W', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-08'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-11"}, env:{freq:'W', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-01'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-01"}, env:{freq:'B', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-02'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-02"}, env:{freq:'B', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-03'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-02"}, env:{freq:'B', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-04'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-02"}, env:{freq:'B', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-05'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-05"}, env:{freq:'B', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-06'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-06"}, env:{freq:'B', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-07'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-07"}, env:{freq:'B', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-08'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-08"}, env:{freq:'B', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-01'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-01"}, env:{freq:'D', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-02'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-02"}, env:{freq:'D', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-03'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-03"}, env:{freq:'D', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-04'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-04"}, env:{freq:'D', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-05'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-05"}, env:{freq:'D', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-06'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-06"}, env:{freq:'D', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-07'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-07"}, env:{freq:'D', tsdt_min: new Date(1900,0,1)} },
		{query: "format(index2date(date2index(dt('2009-01-08'))),'yyyy-mm-dd')", assert: {"type":"text","data":"2009-01-08"}, env:{freq:'D', tsdt_min: new Date(1900,0,1)} },
	]
	
	var tests = [].concat(
		tests_general, 
		test_tsformulas,
		tests_dateindex,
		tests_xhr,
		[]);
	
	var req = t || tests;

	var report_unittest = function(status, r) {
		if (!status.progress) {
			var failed = 0;
			
			for (var i=0; i<req.length; i++) {
				if (!compareObjects(req[i].assert, req[i].value)) {
					report('FAILED | ' + JSON.stringify({query: req[i].query, result: req[i].value, assert: req[i].assert, env: req[i].env}));
					failed = failed + 1;
				}
			}
				
			report('Unittest: ' + (failed ? (failed + '/' + req.length + ' tests failed') : ('all ' + req.length + ' tests succeeded')));
		}
	}
	
	var DL_unittest = new DataLayer(req, report_unittest);
	
	function compareObjects(o1, o2) {
		return JSON.stringify(o1) == JSON.stringify(o2);
	}
	
};