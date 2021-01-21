"use strict";

// defines the DataLayer Query Parser object

/*
TODO:
	Functions:
		MSTD
		MAG 
		HAVE 
		HSTD 
		ZSCORE 
		FILL 
		ATTR 
		SPLINE 
		HP 
		UNION 
	other:
		Attributes
		OfficeJs
		DL prep
*/

// default environment settings
var env_proto = {
	freq: 'A',
	aggr: aggr_type.avg,
	tsdt_min: new Date(1900,0,1),
	tsdt_max: new Date(2099,11,31),
	timeout: 60, //in seconds
	iter: {},
	strict: 0
}

// the DataLayer Query Parser object
// Parameters:
//	req: can be an array of queries to load data; alternatively use addRequests
//	callback: a function to be called with status updates
//	env: change the environment variables (e.g. time series frequency)
function DataLayer(req, callback, env) {
	
	var requests = [];
	
	//merge default parameters with additional parameters
	env = Object.assign({}, env_proto, env);
	
	//create an instance of xhr_loader, to load data from rest interfaces
	var xhr = new xhr_loader(requests, rerun);
	
	//create an instance of interpreter_wrapper, to interact with parser and interpreter
	var interp = new interpreter_wrapper(import_list);
	interp.importFunction(xhr.exportfunc);
	
	var status = {progress: 0, success: 0, error: 0, total: 0}; 
	
	addRequests(req);
	
	//inform DL that specific queries were updated and need to be reloaded
	function updateRequests(ids) {
		rerun(ids);
		xhr.loadall();
	}
	
	//rerun the interpreter on certain queries (mainly after a certain rest data load finished)
	function rerun(ids) {
		for (var i in ids) {
			if (ids instanceof Array) i = ids[i];
				
			var req = requests[i];
			
			if (req.state != 'progress') {
				status[req.state] = status[req.state] -1;
				req.state = 'progress';
				status[req.state] = status[req.state] +1;
				callback(status, req);
			}
			
			xhr.setRequestId(i*1);
			var env_join = Object.assign({}, env_proto, env, req.env);
			req.value = interp.evalreq(req, env_join, true);
			
			if (req.state == 'progress') {
				if (req.timeout) clearTimeout(req.timeout);
				req.timeout = setTimeout(timeout.bind(null, i), env_join.timeout*1000);
			} else {
				if (req.timeout) clearTimeout(req.timeout);
				statusupdate(req);
			}
		}
	}
	
	// a query did not resolve in the preset timeout period
	function timeout(i) {
		xhr.abort(requests[i]);
		
		requests[i].value = interp.error(err_type.timeout);
		requests[i].state = 'error';
		statusupdate(requests[i]);
	}
	
	//change the status of the request
	function statusupdate(req) {
		status[req.state] = status[req.state] +1;
		status.progress = status.progress -1;
		callback(status, req);
	}
	
	//add a list of requests to be interpreted
	function addRequests(req) {
		
		var ind_old = requests.length;
		
		status.total = status.total + req.length;
		status.progress = status.progress + req.length;
	
		requests.push.apply(requests, req);
		
		for (var i=ind_old; i<requests.length; i++) {
		
			requests[i].id = i;
		
			xhr.setRequestId(i);
			var env_join = Object.assign({}, env_proto, env, requests[i].env);
			
			// call the interpreter to evaluate the request
			requests[i].value = interp.evalreq(requests[i], env_join, true);
		
			if (requests[i].state == 'progress') {
				requests[i].timeout = setTimeout(timeout.bind(null, i), env_join.timeout*1000);
			} else {
				statusupdate(requests[i]);
			}

		}
		
		xhr.loadall();
	}
	
	// export functions
	this.addRequests = addRequests;
	this.updateRequests = updateRequests;
	this.env = env;
}