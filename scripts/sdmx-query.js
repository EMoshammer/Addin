
function xhr_loader (requests) {

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
		DataLayer : {
			init : function (a) {
				var r = a.match(/^([\w\d])+\.([\w\d\.]+)$/i);
				if (!r) return null;
				return { source: 'DataLayer', db: r[1], code: r[2], txt: a };
			},
		},
		Haver : {
			init : function (a) {
				var r = a.match(/^([\w\d])+@([\w\d]+)$/i);
				if (!r) return null;
				return { source: 'Haver', db: r[2], code: r[1], txt: a };
			}
		},
		ECB : {
			init : function (a) {
				var r = a.match(/^ECB:([\w\d]+)\.([^\s]+)$/i);
				if (!r) return null;
				return { source: 'ECB', db: r[1], code: r[2], txt: a };
			},
			query : function (d) {
				return 'http://sdw-wsrest.ecb.europa.eu/service/data/' + d.db + '/' + d.code;
			},
			onload : function (xhr, response) {
				
				var seriesobj = NEW_TS([]);
				
				var series = new window.DOMParser().parseFromString(response, 'text/xml').querySelectorAll('Series');

				var series_keys = {};

				for (let i = 0; i < series.length; i++) {

					let keys = series[i].querySelectorAll('SeriesKey Value');

					for (let j = 0; j < keys.length; j++) {
						let id = keys[j].attributes.id.value;
						let value = keys[j].attributes.value.value;
						series_keys[id] = value;
					}
					
					if (series_keys.FREQ) {
						if (series_keys.FREQ.toUpperCase() != xhr.freq.toUpperCase()) {
							return NEW_ERROR(err_type.freqmismatch, xhr.txt, 'Trying to retrieve at frequency ' + xhr.freq.toUpperCase()
								+ ' while the source is ' + series_keys.FREQ + '.');
						}
					}

					let obs = series[i].querySelectorAll('Obs');

					for (let j = 0; j < obs.length; j++) {

						let dim = obs[j].querySelector('ObsDimension').attributes.value.value;
						let value = obs[j].querySelector('ObsValue').attributes.value.value;
						let dt = null;

						let q_match = dim.match(/^(\d{4})-Q([1-4])$/i);
						if (q_match) {
							dt = new Date(q_match[1], q_match[2]*3-1);
						} else {
							dt = new Date(dim);
						}

						PUTDATEVALUE(seriesobj, dt, parseFloat(value), xhr.freq);

					}
				}
				
				return seriesobj;
			}
		}
	};

	function isXHR(a) {
		for (const x in xhr_connectors) {
			var r = xhr_connectors[x].init(a);
			if (r) return r;
		}
		return null;
	}

	import_list.push({ name: 'XHR_PROBE', func : function (a) {
		
		var r = isXHR(a);
		if (!r) return null;
		
		r.freq = env.freq;
		r.id = [r.source, r.db, r.code, r.freq]; 
		var c = series_cache[r.id];
		if (c !== undefined) {
			if (c.state != xhr_readystate.DONE) {
				c.dep[request_id] = 1;
				requests[request_id].xhr[r.id] = 1;
			}
			return c.ts;
		}
		
		r.state = xhr_readystate.UNSENT;
		r.dep = {};
		r.dep[request_id] = 1;
		r.ts = NEW_ERROR(err_type.async);
		requests[request_id].xhr[r.id] = 1;
		
		series_cache[r.id] = r;
		
		return r.ts;

	}});

	this.loadall = function() {
		for (const r_id in series_cache) {
			c = series_cache[r_id];
			if (c.state == xhr_readystate.UNSENT) {
				var query = xhr_connectors[c.source].query(c);
				
				var callback_done = function(ts) {
					c.state = xhr_readystate.DONE;
					c.ts = ts;
					DL.rerun(c.dep);
				}
				
				var xhr = new XMLHttpRequest();
				xhr.open("GET", query, true);
				xhr.onload = function (e) {
					if (xhr.readyState === xhr_readystate.DONE) {
						if (xhr.status === 200) {
							callback_done(xhr_connectors[c.source].onload(c, xhr.responseText));
						} else {
							callback_done(NEW_ERROR(err_type.xhr, c.txt, xhr.statusText));
						}
					}
				};
				xhr.onerror = function (e) {
					callback_done(NEW_ERROR(err_type.xhr, c.txt, xhr.statusText));
				};
				xhr.send(null); 
				
				c.state = xhr_readystate.LOADING;
			}
		}
	}
	
	this.setRequestId = function (id) {
		if (!('xhr' in requests[id])) requests[id].xhr = {};
		request_id = id;
	}

}