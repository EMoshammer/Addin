"use strict";

function xhr_loader (requests, rerun) {

	var series_cache = {};
	var request_id = null;

	var xhr_readystate = {
		'UNSENT': 0, 			// Client has been created. open() not called yet.
		'OPENED': 1, 			// open() has been called.
		'HEADERS_RECEIVED': 2, 	// send() has been called, and headers and status are available.
		'LOADING': 3,			// Downloading; responseText holds partial data.
		'DONE': 4 				// The operation is complete.
	}

	var xhr_connectors = {
		TestConnector : {
			init : function (a) {
				var r = a.match(/^TESTCONNECTOR:([\w\d]+)\.([\d]+)$/i);
				if (!r) return null;
				return { source: 'TestConnector', result: r[1].toUpperCase(), delay: r[2], id: a.toUpperCase(), txt: a };
			},
			query: function (c) {
				if (c.result == 'ERROR') {
					var timer = setTimeout(c.xhr.onerror, c.delay);
					c.xhr.abort = function() {clearTimeout(timer)};
				} else {
					c.xhr = {readyState: xhr_readystate.DONE, status: 200, responseText: '', statusText: '', onload: c.xhr.onload, abort: function() {}};
					var timer = setTimeout(c.xhr.onload, c.delay);
					c.xhr.abort = function() {clearTimeout(timer)};
				}
			},
			onload: function (xhr, response) {
				return NEW_SCALAR(1);
			}
		},
		DataLayer : {
			init : function (a) {
				var r = a.match(/^([\w\d])+\.([\w\d\.]+)$/i);
				if (!r) return null;
				return { source: 'DataLayer', db: r[1], code: r[2], id: a.toUpperCase(), txt: a };
			},
		},
		Haver : {
			init : function (a) {
				var r = a.match(/^([\w\d])+@([\w\d]+)$/i);
				if (!r) return null;
				return { source: 'Haver', db: r[2], code: r[1], id: a.toUpperCase(), txt: a };
			}
		},
		ECB : {
			init : function (a) {
				var r = a.match(/^ECB:([\w\d]+)\.([^\s]+)$/i);
				if (!r) return null;
				return { source: 'ECB', db: r[1], code: r[2], id: a.toUpperCase(), txt: a };
			},
			get : function (d) {
				return 'https://sdw-wsrest.ecb.europa.eu/service/data/' + d.db + '/' + d.code;
			},
			onload : function (xhr, response) {
				var seriesobj = NEW_EMPTY_TS();
				
				var series = new window.DOMParser().parseFromString(response, 'text/xml').querySelectorAll('Series')[0];

				var freq = series.querySelectorAll('SeriesKey Value#FREQ');
				if (freq) if (freq[0]) {
					xhr.freq = freq[0].attributes.value.value.toUpperCase();
					if (xhr.freq == 'H') xhr.freq = 'S';
					SETATTR(seriesobj, 'freq', xhr.freq);
				}

				let obs = series.querySelectorAll('Obs');
				
				for (let j = 0; j < obs.length; j++) {

					let dim = obs[j].querySelector('ObsDimension').attributes.value.value;
					let value = obs[j].querySelector('ObsValue').attributes.value.value;
					let dt = null;

					let s_match = dim.match(/^(\d{4})-S([1-2])$/i);
					let q_match = dim.match(/^(\d{4})-Q([1-4])$/i);
					if (s_match) 		dt = new Date(s_match[1], s_match[2]*6-1);
					else if (q_match) 	dt = new Date(q_match[1], q_match[2]*3-1);
					else 				dt = new Date(dim);

					PUTDATEVALUE(seriesobj, dt, parseFloat(value), xhr.freq);
				}
				
				return seriesobj;
			}
		},
		FRED : {
			init : function (a) {
				var r = a.match(/^FRED:([\w\d]+)(\.([\d]){8})?$/i);
				if (!r) return null;
				return { source: 'FRED', code: r[1], revision: r[3], id: a.toUpperCase(), txt: a };
			},
			get : function (d) {
				var vint = (d.revision) ? '&vintage_dates=' + d.revision.substring(0, 4) + '-' + d.revision.substring(4, 6) + '-' + d.revision.substring(6, 8) : '';								
				return 'https://cors-anywhere.herokuapp.com/https://api.stlouisfed.org/fred/series/observations?series_id=' + d.code + '&api_key=f48120ec7f3d95054152ebd09afddfee' + vint;
			},
			onload : function (xhr, response) {
				let obs = new window.DOMParser().parseFromString(response, 'text/xml').querySelectorAll('observations observation');

				var seriesobj = NEW_EMPTY_TS();

				for (let j = 0; j < obs.length; j++) {

					let dim = obs[j].attributes.date.value;
					let value = obs[j].attributes.value.value;
					let dt = new Date(dim);

					PUTDATEVALUE(seriesobj, dt, parseFloat(value), xhr.freq);
				}
				
				return seriesobj;
			}
		},
		ESTAT : {
			init : function (a) {
				var r = a.match(/^ESTAT:([\w]+)\.([\S]+)$/i);
				if (!r) return null;
				return { source: 'ESTAT', code: r[2], db: r[1], id: a.toUpperCase(), txt: a };
			},
			get : function (d) {
				return 'https://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/'+d.db+'/'+d.code;
			},
			onload : function (xhr, response) {
				let series = new window.DOMParser().parseFromString(response, 'text/xml').querySelectorAll('GenericData DataSet Series')[0];
				let freq = series.querySelectorAll('SeriesKey Value[id=\'FREQ\']')[0];
				let obs = series.querySelectorAll('Obs');
				
				var seriesobj = NEW_EMPTY_TS();
				
				if (freq) {
					xhr.freq = freq.attributes.value.value.toUpperCase();
					SETATTR(seriesobj, 'freq', xhr.freq);
				}
				
				for (let j = 0; j < obs.length; j++) {

					let dim = obs[j].querySelector('ObsDimension').attributes.value.value;
					let value = obs[j].querySelector('ObsValue').attributes.value.value;
					let dt = new Date(dim);

					PUTDATEVALUE(seriesobj, dt, parseFloat(value), xhr.freq);
				}
				
				return seriesobj;
			}
			
		},
		OECD : {
			init : function (a) {
				var r = a.match(/^OECD:([\w]+)\.([\S]+)$/i);
				if (!r) return null;
				return { source: 'OECD', code: r[2], db: r[1], id: a.toUpperCase(), txt: a };
			},
			get : function (d) {
				return 'https://stats.oecd.org/restsdmx/sdmx.ashx/GetData/'+d.db+'/'+d.code+'/all?format=compact_v2';
			},
			onload : function (xhr, response) {
				let series = new window.DOMParser().parseFromString(response, 'text/xml').querySelectorAll('CompactData DataSet Series')[0];
				let freq = series.attributes.FREQUENCY;
				let obs = series.querySelectorAll('Obs');
				
				var seriesobj = NEW_EMPTY_TS();

				if (freq) {
					xhr.freq = freq.value.toUpperCase();
					SETATTR(seriesobj, 'freq', xhr.freq);
				}
				
				for (let j = 0; j < obs.length; j++) {

					let dim = obs[j].attributes.TIME.value;
					let value = obs[j].attributes.OBS_VALUE.value;
					let dt = new Date(dim);

					PUTDATEVALUE(seriesobj, dt, parseFloat(value), xhr.freq);
				}
				
				return seriesobj;
			}
			
		},
		WEO : {
			init : function (a) {
				var r = a.match(/^WEO:([\w]+)\.([\d]+)\.([\d]{4})\.([12])(\.([01]))?$/i);
				if (!r) return null;
				return { source: 'WEO', ind: r[1], geo: r[2], yr:r[3], issue:r[4], isagg:r[6], id: a.toUpperCase(), txt: a };
			},
			get : function (d) {
				var iss = d.issue == 1 ? 'April' : 'October';
				var ey = (d.yr*1) + (d.yr >= 2008 ? 5 : 2);
				var aggr = d.isaggr == 1 ? 'a=1&' : '';
				return 'https://cors-anywhere.herokuapp.com/https://www.imf.org/en/Publications/WEO/weo-database/'+d.yr+'/'+iss+'/weo-report?'+aggr+'c='+d.geo+',&s='+d.ind+',&sy=1980&ey='+ey+'&ssm=0&scsm=1&scc=0&ssd=1&ssc=0&sic=0&sort=country&ds=.&br=1';	
			},
			onload : function (xhr, response) {
				let obs = new window.DOMParser().parseFromString(response, 'text/html').querySelectorAll('table:first-child th[style="text-align:right;"]');
				let val = new window.DOMParser().parseFromString(response, 'text/html').querySelectorAll('table:first-child td[style="text-align:right;"]')
				
				var seriesobj = NEW_EMPTY_TS();
				
				SETATTR(seriesobj, 'freq', 'A');

				for (let j = 0; j < obs.length; j++) {
					PUTDATEVALUE(seriesobj, new Date(obs[j].innerText), parseFloat(val[j].innerText), 'A');
				}
				
				return seriesobj;
			}
			
		},
		IMFPAYPRJ : {
			init : function (a) {
				var r = a.match(/^IMFPAYPRJ:([\w]+)\.([\d]+)\.([\d]{8})$/i);
				if (!r) return null;
				
				var ind2 = '';
				switch (r[1]) {
				case "NSDRCHARGE":  ind2 = "Net SDR Charges"; break;
				case "GRACHARGE":   ind2 = "GRA Charges"; break;
				case "SDRASS":      ind2 = "SDR Assessments"; break;
				case "GRAREPEFF":   ind2 = "GRA Repurchase (EFF)"; break;
				case "GRAREPSBA":   ind2 = "GRA Repurchase (SBA)"; break;
				case "PRGTREPECF":  ind2 = "PRGT Repayment (ECF)"; break;
				}
				
				return { source: 'IMFPAYPRJ', ind: r[1], 'ind2':ind2, geo: r[2], revision:r[3], id: a.toUpperCase(), txt: a };
			},
			get : function (d) {
				var yr = d.revision.substring(0, 4);
				var rev = d.revision.substring(0, 4) + '-' + d.revision.substring(4, 6) + '-' + d.revision.substring(6, 8);
				return 'https://cors-anywhere.herokuapp.com/http://www.imf.org/external/np/fin/tad/extforth.aspx?memberkey1='+d.geo+'&date1key='+rev+'&year='+yr+'&schedule=exp&extend=y';
			},
			onload : function (xhr, response) {
				let obs = new window.DOMParser().parseFromString(response, 'text/html').querySelectorAll('table.moneyGreen tr');

				var seriesobj = NEW_EMPTY_TS();
				
				SETATTR(seriesobj, 'freq', 'D');
				SETATTR(seriesobj, 'aggr', aggr_type.sum);

				for (let j = 0; j < obs.length; j++) {

					if (obs[j].cells[0].innerText == xhr.ind2) {
						var dt = obs[j].cells[1].innerText;
						var val = parseFloat(obs[j].cells[2].innerText.replace(/,/g, ''));

						PUTDATEVALUE(seriesobj, new Date(Date.parse(dt.trim())), val, 'D');
					}

				}
				
				return seriesobj;
			}
			
		},
		
	};

	function isXHR(a) {
		for (var x in xhr_connectors) {
			var r = xhr_connectors[x].init(a);
			if (r) return r;
		}
		return null;
	}

	this.exportfunc = [{ name: 'XHR_PROBE', func : function (a) {
		
		var r = isXHR(a);
		if (!r) return null;
		
		r.freq = env.freq;
		var c = series_cache[r.id];
		if (c !== undefined) {
			
			if (c.freq != r.freq) {
				return NEW_ERROR(err_type.freqmismatch, 'xhr');
			}
			
			if (c.state != xhr_readystate.DONE) {
				c.dep[request_id] = 1;
				requests[request_id].xhr[r.id] = 1;
			} else {
				var freq = GETATTR(c.ts, 'freq');
				if (freq) return TS_CONVFREQ(cloneObj(c.ts), freq, env.freq);
			}
			return cloneObj(c.ts);
		}
		
		r.state = xhr_readystate.UNSENT;
		r.dep = {};
		r.dep[request_id] = request_id;
		r.ts = NEW_ERROR(err_type.async);
		requests[request_id].xhr[r.id] = r.id;
		
		series_cache[r.id] = r;
		
		return r.ts;

	}}];

	this.abort = function(req) {
		for (var r_id in req.xhr) {
			if (series_cache[r_id].xhr) series_cache[r_id].xhr.abort();
		}
	}

	this.loadall = function() {
		for (var r_id in series_cache) {
			var c = series_cache[r_id];
			if (c.state == xhr_readystate.UNSENT) {
				
				(function (c) {
					
					var conn = xhr_connectors[c.source];
					
					var callback_done = function(ts) {
						c.state = xhr_readystate.DONE;
						c.ts = ts;
						
						for (var i in c.dep) {
							delete requests[i].xhr[c.id];
							if (Object.keys(requests[i].xhr).length === 0) rerun([i]);
						}
					}
					
					c.xhr = new XMLHttpRequest();
					
					c.xhr.onload = function (e) {
						if (c.xhr.readyState === xhr_readystate.DONE) {
							if (c.xhr.status === 200) {
								callback_done(conn.onload(c, c.xhr.responseText));
							} else {
								callback_done(NEW_ERROR(err_type.xhr, c.txt, c.xhr.statusText));
							}
						}
					};
					c.xhr.onerror = function (e) {
						callback_done(NEW_ERROR(err_type.xhr, c.txt, c.xhr.statusText));
					};
					
					if (conn.get) {
						c.xhr.open("GET", conn.get(c), true);
						c.xhr.send(null); 
					} else {
						conn.query(c);
					}
					
					c.state = xhr_readystate.LOADING;
					
				}) (c);
			}
		}
	}
	
	this.setRequestId = function (id) {
		if (!('xhr' in requests[id])) requests[id].xhr = {};
		request_id = id;
	}

}