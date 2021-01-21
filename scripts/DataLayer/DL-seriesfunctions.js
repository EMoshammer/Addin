"use strict";

// supply functions to DL queries


var obj_type = {
	scalar : 'scalar',
	text : 'text',
	date : 'date',
	ts : 'ts',
	mat : 'mat',
	error: 'error'
}

var aggr_type = {
	avg : 'A', // Average of observations through period
	beg : 'B', // Beginning of period
	end : 'E', // End of period
	max : 'H', // Highest in period
	min : 'L', // Lowest in period
	mid : 'M', // Middle of period
	sum : 'S', // Summed through period
	none: 'U', // Unknown
}

var disaggr_type = {
	cons: 'C', // Constant in all periods
	beg : 'B', // Beginning of period
	end : 'E', // End of period
	mid : 'M', // Middle of period
	none: 'U', // Unknown
}

var err_type = {
	ret_nonmat: 'Transform the final output to a matrix, by calling ts2mat(time series)!',
	nonmat: 'Requires matrix input!',
	matwrongdim: 'Matrix dimensions do not match!',
	nonts: 'Requires a time series input!',
	numargs: 'Wrong number of arguments!',
	parse: 'Argument cannot be parsed!',
	argtype: 'Received wrong argument type!',
	freqmismatch: 'Frequency mismatch!',
	aggr: 'No aggregation method specified!',
	disaggr: 'No disaggregation method specified!',
	xhr: 'External retrieval error!',
	duplrepl: 'Duplicated replacements!',
	async: 'async',
	unknident: 'Unknown identifier!',
	timeout: 'Timeout!',
}

var import_functions = {

	// concatenate matrices, iterating over a certain object (e.g. obj='country', iter=['AT','BE'])
	// 	the iterate object is stored in the environment variable and used when interpreting identifiers.
	STACK : function STACK (func, obj, iter, dim) {
		
		if (dim == undefined) dim = 1;

		if (env.iter[obj] !== undefined) {
			return NEW_ERROR(err_type.duplrepl, 'stack');
		}

		var r = null;

		for (var i=0; i<iter.length; i++) {
			SETENVITER(obj,iter[i]);
			var r = (i==0) ? func() : CONCAT(r, func(), dim);
		}
		
		SETENVITER(obj, undefined);
		
		return r;
	},

	// evaluate func() in a specific frequency, and handle the conversion to the parent freqency of the return
	FREQ : function FREQ (func, freq, aggr, disaggr) {
		var p = SETENVFREQ(freq, aggr, disaggr);
		return SETENVFREQ(p.freq, p.aggr, p.disaggr, func());
	},
	
	// catch errors and return null instead
	CATCH : function CATCH (func) {
		try {
			var r = func();
			if (ISERROR(a)) return NEW_SCALAR(null);
			return r;
		}
		catch(e) {
			return NEW_SCALAR(null);
		}
	},
	
	
	// ensures the output is a matrix
	WRAPPER : function (a) {
	
		if (ISERROR(a)) return a;
		if (GETTYPE(a) != obj_type.mat) return NEW_ERROR(err_type.ret_nonmat);
		
		return a;
	},

	// iteratively call the interpreter to evaluate an expression (in the sandbox)
	EVAL : function (a) {
		var r = evalreq({query: GETDATA(a) + ""}, env);
		return (isObj(r)) ? r : LIT(r);
	},

	// return the size of the matrix
	SIZE : function (mat, dim) {
		var m = GETDATA(mat);
		var d = GETDATA(dim);
		switch (d) {
			case 1: return m.length;
			case 2: return m[0].length;
			default : return [ m.length, m[0].length ];
			return m.length
		}
	},

	// concatenate multiple matrices
	CONCAT : function() {
		
		var dim = GETDATA(arguments[arguments.length-1]);
		var dimT = (dim == 1) ? 2 : 1;
		
		for (var i=0; i<arguments.length-1; i++) {
			var m = arguments[i];
			if (ISERROR(m)) return m;
			if (GETTYPE(m) != obj_type.mat) return NEW_ERROR(err_type.nonmat, 'concat');

			if (i == 0) {
				var s0 = SIZE(m, dimT);
				var r0 = GETDATA(m);
			} else {
				if (SIZE(m, dimT) != s0) return NEW_ERROR(err_type.matwrongdim, 'concat');
				var r1 = GETDATA(m);
				r0 = (dim == 1) ? r0.concat(r1) : r0.map(function (rw, r) { return rw.concat(r1[r]); });
			}
		}
		
		return NEW_MAT(r0);

	},

	// replace text
	STRREPLACE : function (a, old_code, new_code) {
		return a.replace(old_code, new_code);
	},
	
	// handling of identifiers. In non-strict mode all identifiers are converted to call 
	//	this function with the identier converted to string (a => IDENT('a'))
	IDENT : function (a) {
		
		if (env.strict) {
			return NEW_ERROR(err_type.unknident, 'ident', a);
		} else {
			
			for (var iter in env.iter) {
				a = STRREPLACE(a, iter, env.iter[iter]);
			}
			
			var r = XHR_PROBE(a); // check whether the identifier is a request to load external data
			if (r) return r;
			
			if (a.toUpperCase() == 'DATE') return NEW_DATE_TS();
			if (a.toUpperCase() == 'YEAR') return YEAR(NEW_DATE_TS());
			
			return NEW_ERROR(err_type.unknident, 'ident', a);
		}
	},
	
	// handling of literals (e.g. 'abc' or 123) In non-strict mode all identifiers are converted to call 
	//	this function with the identier converted to string ('a' => LIT('a'))
	LIT : function (a) {
		
		if (isObj(a)) {
			if (GETTYPE(a)) return a;
			a = GETDATA(a);
		}
		
		if (a instanceof Date) {
			return NEW_DATE(a);
		} else if (typeof a === 'string' || a instanceof String) {
			for (var iter in env.iter) {
				a = STRREPLACE(a, iter, env.iter[iter]);
			}
			return NEW_TEXT(a);		
		} else {
			return NEW_SCALAR(a);
		}
	},
	
	// create a time series object from a function
	NEW_TS_FROMFUNC : function (func) {
		var ind_max = DATE2INDEX(env.tsdt_max);
		var data = [];
		for (var i=0; i<=ind_max; i++) {
			data[i] = func(i,INDEX2DATE(i));
		}
		return NEW_TS(data);
	},
	
	// create time series objects
	NEW_DATE_TS : function() { return NEW_TS_FROMFUNC( function (i, dt) { return dt; } ); },
	NEW_EMPTY_TS : function(i, dt) { return NEW_TS_FROMFUNC( function () { return null; } ); },
	
	// create a new object of a specific type
	NEW_OBJ: function (obj, data) {

		var me = createObj();
		SETTYPE(me,obj);
		SETDATA(me,data);
		
		return me;
	},
	
	NEW_TEXT: function (data) { return NEW_OBJ(obj_type.text, data); },
	NEW_SCALAR: function (data) { return NEW_OBJ(obj_type.scalar, data); },
	NEW_TS: function (data) { return NEW_OBJ(obj_type.ts, data || []); },
	NEW_MAT: function (data) { return NEW_OBJ(obj_type.mat, data); },
	NEW_DATE: function (data) { return NEW_OBJ(obj_type.date, data || new Date()); },

	NEW_ERROR: function (desc, loc, detail) {
		
		if (loc !== undefined) desc = loc + ': ' + desc;
		if (detail !== undefined) desc = desc + ' ' + detail;
		
		return NEW_OBJ(obj_type.error, desc);
	},

	// convert a scalar to a time series, where each data point has the value of the scalar
	SCALAR2TS : function(a) {
		if (ISERROR(a)) return a;
		if (GETTYPE(a) != obj_type.scalar && GETTYPE(a) != obj_type.text && GETTYPE(a) != obj_type.date) return NEW_ERROR(err_type.argtype, 'scalar2ts');
		
		return NEW_TS_FROMFUNC( function (i, dt) { return GETDATA(a); } );
	},

	// convert a time series to a matrix
	TS2MAT : function (ts, start, end) {
	
		if (ISERROR(ts)) return ts;
		
		if (GETTYPE(ts) == obj_type.scalar || GETTYPE(ts) == obj_type.text || GETTYPE(ts) == obj_type.date) ts = SCALAR2TS(ts);
		
		if (GETTYPE(ts) != obj_type.ts) return NEW_ERROR(err_type.nonts, 'ts2mat');
		
		if (end === undefined) end = start;
		
		var start = DATE2INDEX(DATE_PARSE(start, 'bop'));
		var end = DATE2INDEX(DATE_PARSE(end));
		var data = GETDATA(ts);
		
		if (end >= data.length) data[end] = null;
		
		var mat = NEW_MAT([data.slice(start, end+1)]);
		var mat = TRANSPOSE(mat);
		
		return mat;
	},
	
	// transpose a matrix
	TRANSPOSE : function(mat) {
		var data = GETDATA(mat);
		
		if (ISERROR(mat)) return mat;
		if (GETTYPE(mat) != obj_type.mat) return NEW_ERROR(err_type.nonmat, 'transpose');
		
		data = data[0].map(function (col, c) {
			return data.map(function (row, r) { 
				return data[r][c]; 
			}); 
		});
		
		SETDATA(mat, data);
		return mat;
	},
	
	// parse a date in string format
	DATE_PARSE : function(a, bop) {
		var a = '' + GETDATA(a);
		var bop = GETDATA(bop);
		
		var isyyyy = a.match(/^([\d]{4})$/i);
		var isyyyymmdd = a.match(/^([\d]{4})[/-]?([\d]{1,2})[/-]?([\d]{1,2})$/i);
		var isyyyyHh = a.match(/^([\d]{4})[HS]([1,2])$/i);
		var isyyyyQq = a.match(/^([\d]{4})[Q]([1,4])$/i);
		var isyyyyMmm = a.match(/^([\d]{4})[M]([\d]{1,2})$/i);
		var isyyyyWww = a.match(/^([\d]{4})[W]([\d]{1,2})$/i);
		
		if (isyyyymmdd) return NEW_DATE(new Date(isyyyymmdd[1],isyyyymmdd[2]-1,isyyyymmdd[3]));
		
		if (bop) { // if beginning-of-period is set, the earliest date of a period is returned
			if (isyyyy) 	return NEW_DATE(new Date(isyyyy[1],0,1));
			if (isyyyyHh) 	return NEW_DATE(new Date(isyyyyHh[1],(isyyyyHh[2]-1)*6,1));
			if (isyyyyQq) 	return NEW_DATE(new Date(isyyyyQq[1],(isyyyyQq[2]-1)*3,1));
			if (isyyyyMmm) 	return NEW_DATE(new Date(isyyyyMmm[1],(isyyyyMmm[2]-1),1));
			if (isyyyyWww) {
				var r = new Date(isyyyyWww[1], 0, 2 + (isyyyyWww[2] - 2) * 7);
				if (r.getDay() <= 4)	r.setDate(r.getDate() - r.getDay() + 1);
				else					r.setDate(r.getDate() + 8 - r.getDay());
				return r;
			}
		} else {
			if (isyyyy) 	return NEW_DATE(new Date(isyyyy[1],12,0));
			if (isyyyyHh) 	return NEW_DATE(new Date(isyyyyHh[1],isyyyyHh[2]*6,0));
			if (isyyyyQq) 	return NEW_DATE(new Date(isyyyyQq[1],isyyyyQq[2]*3,0));
			if (isyyyyMmm) 	return NEW_DATE(new Date(isyyyyMmm[1],isyyyyMmm[2],0));
			if (isyyyyWww) {
				var r = new Date(isyyyyWww[1], 0, 1 + (isyyyyWww[2] - 1) * 7);
				if (r.getDay() <= 4)	r.setDate(r.getDate() - r.getDay() + 1);
				else					r.setDate(r.getDate() + 8 - r.getDay());
				return r;
			}
		}
		
		return NEW_ERROR(err_type.parse, 'dt', 'Try yyyy-mm-dd!');
	},
	
	// parse a date (either DT(y,m,d) or with a string parameter parsable by DATE_PARSE
	DT : function () {
		if (arguments.length == 1) {
	
			if (arguments[0] instanceof Date) return NEW_DATE(arguments[0]);
			if (GETTYPE(arguments[0]) == obj_type.date) return arguments[0];
			if (GETTYPE(arguments[0]) == obj_type.text) return DATE_PARSE(arguments[0]);
			if (GETTYPE(arguments[0]) == obj_type.scalar) return NEW_DATE(new Date(GETDATA(arguments[0]),12,0));
			return NEW_ERROR(err_type.argtype, 'dt', 'Try dt(\'yyyy-mm-dd\') or dt(yyyy,mm,dd).');
			
		} 
		else if (arguments.length == 3) {
			if (GETTYPE(arguments[0]) == obj_type.scalar && GETTYPE(arguments[1]) == obj_type.scalar && GETTYPE(arguments[2]) == obj_type.scalar) {
				return NEW_DATE(new Date(GETDATA(arguments[0]),GETDATA(arguments[1])-1,GETDATA(arguments[2])));
			}
			return NEW_ERROR(err_type.argtype, 'dt', 'Try dt(\'yyyy-mm-dd\') or dt(yyyy,mm,dd).');
		}
		else {
			return NEW_ERROR(err_type.numargs, 'dt', 'Requires one or three arguments!');
		}
	},

	// helper function for STACK
	setEnvIter: function(obj, iter) {

		obj = GETDATA(obj);
		iter = GETDATA(iter);
		var envIter = env.iter;

		if (obj.toUpperCase() == 'COUNTRY') {
			var c = countrycodes[iter || 'AT'];
			for (var i in c) {
				if (iter) 	envIter[i] = c[i];
				else		delete envIter[i];
			}
		} else {
			if (iter) 	envIter[obj] = iter;
			else		delete envIter[obj];
		}
		
		setProp(getPropNative(null,'env'), 'iter', envIter);
	},

	// frequency conversion of a time series
	TS_CONVFREQ: function (ts, freq_old, freq_new) {
		if (ISERROR(ts)) return ts;
		if (GETTYPE(ts) != obj_type.ts) return NEW_ERROR(err_type.nonts,'freq');
		
		var freqfactor_new = FREQFACTOR(freq_new);
		var freqfactor_old = FREQFACTOR(freq_old);
		
		if (freqfactor_old == freqfactor_new) {
			return ts;
		}
		else if (freqfactor_old > freqfactor_new) { //aggr
			if (GETATTR(ts, 'aggr')) aggr = GETATTR(ts, 'aggr');
			if (aggr == aggr_type.none) return NEW_ERROR(err_type.aggr, 'freq');
			
			var data_old = GETDATA(ts);
			var data_new = [];
			var new_ind_max = INDEXFREQCONV(data_old.length-1, freq_old, freq_new);
			
			switch(aggr) {
				case aggr_type.avg : var red = function (r, x, i, arr) { return r+x/arr.length; }; break;
				case aggr_type.beg : var red = function (r, x, i, arr) { return (i==0) ? x : r; }; break;
				case aggr_type.end : var red = function (r, x, i, arr) { return (i==arr.length-1) ? x : r; }; break;
				case aggr_type.max : var red = function (r, x, i, arr) { return Math.max(r,x); }; break;
				case aggr_type.min : var red = function (r, x, i, arr) { return Math.min(r,x); }; break;
				case aggr_type.mid : var red = function (r, x, i, arr) { return (i*2>=arr.length-1) ? x : r; }; break;
				case aggr_type.sum : var red = function (r, x, i, arr) { return r+x; }; break;
			}

			for (var i=0;i<=new_ind_max;i++) {
			
				var old_ind_beg = INDEXFREQCONV(i-1, freq_new, freq_old)+1;
				var old_ind_end = INDEXFREQCONV(i, freq_new, freq_old);
				var slice_old = data_old.slice(old_ind_beg, old_ind_end+1);
			
				data_new[i] = slice_old.reduce(red, 0);
			}

			return NEW_TS(data_new);
		}
		else if (freqfactor_old < freqfactor_new) { //disaggr
			if (GETATTR(ts, 'disaggr')) disaggr = GETATTR(ts, 'disaggr');
			
			if (disaggr == disaggr_type.none) return NEW_ERROR(err_type.disaggr, 'freq');
			
			var data_old = GETDATA(ts);
			var data_new = [];
			
			for (var i=0;i<data_old.length;i++) {
			
				var new_ind_beg = INDEXFREQCONV(i-1, freq_old, freq_new)+1;
				var new_ind_end = INDEXFREQCONV(i, freq_old, freq_new);
				
				switch (disaggr) {
					case disaggr_type.beg: data_new[new_ind_beg] = data_old[i]; break;
					case disaggr_type.end: data_new[new_ind_end] = data_old[i]; break;
					case disaggr_type.mid: data_new[Math.round((new_ind_beg+new_ind_end)/2)] = data_old[i]; break;
					case disaggr_type.cons:
						for (var j=new_ind_beg; j<=new_ind_end; j++) data_new[j] = data_old[i];
						break;
				}
			}

			return NEW_TS(data_new);

		}
	},

	// helper function to FREQ
	setEnvFreq: function (freq, aggr, disaggr, ts) {
		
		aggr 	= typeof aggr 	 !== 'undefined' ? aggr 	: aggr_type.none;
		disaggr = typeof disaggr !== 'undefined' ? disaggr 	: '';

		var p_orig = {
			freq: SETENV('freq', freq),
			aggr: SETENV('aggr', aggr),
			disaggr: SETENV('disaggr', disaggr)
		};
		
		if (ts === undefined) return p_orig;
		
		return TS_CONVFREQ(ts, p_orig.freq, freq);
	},
	
	// set an environment variable
	setEnv: function (prop, val) {
		var val_old = env[prop];
		env[prop] = GETDATA(val).toUpperCase();
		setProp(null, 'env', env);
		return val_old;
	},
	
	// functions to convert between index and date
	DATE2INDEX_HELPER: function (d, freq) {
		switch (freq.toUpperCase()) {
			case 'A': return d.getFullYear();
			case 'S': return d.getFullYear() * 2 + Math.floor(d.getMonth()/6);
			case 'Q': return d.getFullYear() * 4 + Math.floor(d.getMonth()/3);
			case 'M': return d.getFullYear() * 12 + d.getMonth();
			case 'W': return Math.floor((d.getTime() / (24 * 60 * 60 * 1000) - (d.getDay()+6)%7 ) / 7);
			case 'B': return Math.floor((d.getTime() / (24 * 60 * 60 * 1000) - (d.getDay()+6)%7 ) / 7)*5 + Math.min((d.getDay()+6)%7, 4);
			case 'D': return Math.floor(d.getTime() / (24 * 60 * 60 * 1000));
		}
		return NEW_ERROR(err_type.freqmismatch, 'date2index_helper');
	},
		
	DATE2INDEX: function (date, freq) {		
		if (freq == undefined) freq = env.freq;
		return DATE2INDEX_HELPER(GETDATA(date), freq) - DATE2INDEX_HELPER(env.tsdt_min, freq);
	},
	INDEX2DATE: function (i, freq) {
		i = GETDATA(i);
		if (freq == undefined) freq = env.freq;
		switch (freq.toUpperCase()) {
			case 'A': return new Date(env.tsdt_min.getFullYear()+i,11,31);
			case 'S': return new Date(env.tsdt_min.getFullYear(), Math.floor(env.tsdt_min.getMonth()/6 + i+1)*6, 0);
			case 'Q': return new Date(env.tsdt_min.getFullYear(), Math.floor(env.tsdt_min.getMonth()/3 + i+1)*3, 0);
			case 'M': return new Date(env.tsdt_min.getFullYear(), env.tsdt_min.getMonth() + i+1, 0);
			case 'W': return new Date(((DATE2INDEX_HELPER(env.tsdt_min, 'W') + i) * 7 + 10) * (24 * 60 * 60 * 1000));
			case 'B': return new Date(((DATE2INDEX_HELPER(env.tsdt_min, 'W') + Math.floor(i/5)) * 7 + 4 + (i%5)) * (24 * 60 * 60 * 1000));
			case 'D': return new Date(i * (24 * 60 * 60 * 1000) + env.tsdt_min.getTime());
		}
		return NEW_ERROR(err_type.freqmismatch, 'index2date');
	},
	INDEXFREQCONV: function (index, freqOld, freqNew) {
		return DATE2INDEX(INDEX2DATE(index, freqOld), freqNew);
	},
	
	// set the value for a specific date of a time series
	PUTDATEVALUE: function (s, date, value, freq, add) {
		var data = GETDATA(s);
		var ind = DATE2INDEX(DT(date), freq);
		if (add) {
			data[ind] = (data[ind]||0) + GETDATA(value);
		} else {
			data[ind] = GETDATA(value);
		}
		SETDATA(s, data);
		return s;
	},
	
	// a timeseries operation, where each value depends on historic observations of the resulting timeseries
	LAGEXPR: function(s, op, lag, inv) {
		
		if (ISERROR(s)) return s;
		if (GETTYPE(s) != obj_type.ts) return NEW_ERROR(err_type.nonts, 'lagexpr');
		
		var data = GETDATA(s);
		var lag = PARSEDURATION(s, lag);
		
		var r = [];
		
		if (inv) {
			for (var t=data.length-1; t >= 0; t--) {
				r[t] = op(r[t+lag], data[t], data, t);
			}
		} else {
			for (var t=0; t < data.length; t++) {
				r[t] = op(r[t-lag], data[t], data, t);
			}
		}
		
		SETDATA(s, r);
		return s;
	},
	
	// a time series operation, where each value depends on a specific time range
	RANGEEXPR: function(s, start, dur, op, ignorenull, invert) {

		ignorenull = typeof ignorenull !== 'undefined' ? ignorenull : false;
		invert = typeof invert !== 'undefined' ? invert : true;

		var data = GETDATA(s);
	
		if (ISERROR(s)) return s;
		if (GETTYPE(s) != obj_type.ts) return NEW_ERROR(err_type.nonts, 'rangeexpr');
		
		start = GETDATA(start);
		dur = GETDATA(dur);
		
		var absolute = (start instanceof Date);
		
		if (absolute) {
			start = DATE2INDEX(start);
			
			if (dur instanceof Date) {
				dur = DATE2INDEX(dur) - start;
			} else {
				dur = PARSEDURATION(s, dur);
			}
		} else {
			start = PARSEDURATION(s, start);
			dur = PARSEDURATION(s, dur);
			
			if (invert) {
				start = -start;
				dur = -dur;
			}
		}
		
		if (dur < 0) {
			start = start + (dur+1);
			dur = -dur;
		}
		
		var r = [];
		for (var t=0; t < (absolute ? 1 : data.length); t++) {
			var arr = data.slice(t+start, t+start+dur);
			
			var defined = arr.filter(function(v) { return v != null });
			var hasnull = arr.length - defined.length;
			
			if ((defined.length == 0) || (hasnull && !ignorenull) || (t+start+dur < 1)) {
				r[t] = null;
			} else {
				if (hasnull) arr = defined;				
				r[t] = arr.reduce(op);
			}
		}
		
		if (absolute) {
			SETTYPE(s, obj_type.scalar);
			SETDATA(s, r[0]);
		} else {
			SETDATA(s, r);
		}
		return s;
	},
	
	// perform an operation on one or multiple time series or scalars. 
	//	the result does only depend on values at the same index across inputs
	EXPR: function (op) {
	
		var s = Array.prototype.slice.call(arguments);
		s.shift();
		
		var ignorenull = (s[s.length-1] == 'ignorenull');
		if (ignorenull) s.pop();
					
		var isnull = function () { return Array.prototype.slice.call(arguments).some(function (v) {return v == null;}) };
		
		var expr_functions = {
			'1+':  function (v) { return +v; },
			'1-':  function (v) { return -v; },
			'1!':  function (v) { return !v; },
			'1~':  function (v) { return ~v; },
			'1++': function (v) { return ++v; },
			'1--': function (v) { return --v; },
			'2+':  function (v1,v2) { return v1+v2; },
			'2-':  function (v1,v2) { return v1-v2; },
			'2*':  function (v1,v2) { return v1*v2; },
			'2/':  function (v1,v2) { return v1/v2; },
			'2%':  function (v1,v2) { return (v1/v2-1)*100; },
			'2^':  function (v1,v2) { return Math.pow(v1,v2); },
			'2**': function (v1,v2) { return Math.pow(v1,v2); },
			'2&':  function (v1,v2) { return v1&v2; },
			'2>>': function (v1,v2) { return v1>>v2; },
			'2>>>':function (v1,v2) { return v1>>>v2; },
			'2<<': function (v1,v2) { return v1<<v2; },
			'2==': function (v1,v2) { return v1==v2; },
			'2===':function (v1,v2) { return v1===v2; },
			'2!==':function (v1,v2) { return v1!==v2; },
			'2!=': function (v1,v2) { return v1!=v2; },
			'2>=': function (v1,v2) { return v1>=v2; },
			'2<=': function (v1,v2) { return v1<=v2; },
			'2>':  function (v1,v2) { return v1>v2; },
			'2<':  function (v1,v2) { return v1<v2; },
			
			'1year':function(d) { return d.getFullYear(); },
			'2round':function(v1,v2) { return Math.round((v1 + Number.EPSILON) * Math.pow(10, v2)) / Math.pow(10, v2); },
			'2mod':function (v1,v2) { return v1%v2; },
			'2log':function (v1,v2) { return Math.log(v1) / Math.log(v2); },
			'2format':function (v1,v2) { return dateFormat(v1, v2); },
			'3iif':function (v1,v2,v3) { return isnull(v1) ? null : (v1 ? v2 : v3); },
			
			'min': function () { return [].slice.call(arguments).reduce(function(r, v) { return (r > v ? v : r); }); },
			'max': function () { return [].slice.call(arguments).reduce(function(r, v) { return (r < v ? v : r); }); },
			'overlay': function () { return [].slice.call(arguments).reduce(function(r, v) { return (r == null ? v : r); }); },
			'iferror': function () { return [].slice.call(arguments).reduce(function(r, v) { return (ISERROR(r) ? v : r); }); }
		};
		
		if (expr_functions[s.length + op]) 	var fid = s.length + op;
		else if (expr_functions[op]) 		var fid = op;
		else return NEW_ERROR(err_type.numargs, op);
		
		var allownull = (['3iif','overlay','iferror'].indexOf(fid) >= 0);
		
		if (allownull)	var f = expr_functions[fid];
		else 			var f = function () { return isnull.apply(null,arguments) ? null : expr_functions[fid].apply(null,arguments); };
					
		
		var type = [];
		var data = [];
		var ubound = null;
		
		for (var i = 0; i < s.length; i++) {
			if (typeof s[i] !== 'object') {
				type.push(obj_type.scalar);
				data.push(s[i]);
			} else {
				
				var type_i = GETTYPE(s[i]);
				if (type_i == obj_type.error) return s[i];
				type.push(type_i);
				
				if (type_i == obj_type.ts) {
					
					var data_i = GETDATA(s[i]);
					data.push(data_i);
					
					if (ubound < data_i.length) ubound = data_i.length;
				} else {
					data.push(GETDATA(s[i]));
				}
			}
		}
		
		var r = [];
		for (var t = 0; (t < ubound) || (t == 0); t++) {
			var v = [];
			for (var i = 0; i < s.length; i++) {
				if (type[i] == obj_type.ts) {
					v.push(data[i][t]);
				} else {
					v.push(data[i]);
				}
			}

			r[t] = f.apply(null,v);

		}

		if (ubound == null) {
			return r[0];
		} else {
			SETTYPE(s[0], obj_type.ts);
			SETDATA(s[0], r);
			return s[0];
		}
	},

	// parse a duration. either a number or e.g. '1A' for one year
	PARSEDURATION: function (s, dur) {
		if (dur === undefined) return 1;
		dur = GETDATA(dur);
		if (Number.isInteger(+dur)) return dur;

		var a = dur.match(/^(-?\d+)([ASQMWBD])$/i);			
		if (a) {
			var freq = env.freq;
			return +a[1] * FREQFACTOR(freq) / FREQFACTOR(a[2]);
		} else {
			return null;
		}
	},

	//get and set attributes
	GETATTR:function (s,attr) { return (!isObj(s)) ? null : getProp(s, attr); },
	GETDATA:function (s) { return (!isObj(s)) ? s : (getPropNative(s, 'data')); },
	GETTYPE:function (s) { return GETATTR(s, 'type'); },
	GETENV: function ()  { return env; },
	ISERROR:function (s) { return GETTYPE(s) == obj_type.error; },
	
	SETATTR:function (s,attr,v) { setProp(s, attr, v); },
	SETDATA:function (s,v) { setPropNative(s, 'data', (v)); },
	SETTYPE:function (s,v) { setProp(s, 'type', v); },
	SETDESC:function (s,v) { setProp(s, 'description', v); },
	
	// timeseries operations
	// inverse percentage growth
	IPCT: 	function (s, lag) { return LAGEXPR(IIF(LAG(cloneObj(s), -PARSEDURATION(s,lag)), OVERLAY(s,0),s), function (t,v) { return (v!=null)?(t||1)*(v/100+1):null; }, lag||1); },
	// increment a counter for consecutive periods s is true, and 0 otherwise
	INCIF: 	function (s) { return LAGEXPR(s, function (t,v) {return v?(t||0)+1:null}); },
	// percentage growth
	PCT: 	function (s, lag) { return EXPR('%', s, LAG(cloneObj(s), lag)); },
	// first difference
	DIFF: 	function (s, lag) {	return EXPR('-', s, LAG(cloneObj(s), lag));	},
	// contribution in growth rate
	CONTR: 	function (s1, s2, lag) { return EXPR('%', DIFF(s1, lag), LAG(s2, lag)); },
	// index a time series to 100 at a specific date
	REBASE: function (s, dt) { return EXPR('*', EXPR('/', s, VAL(cloneObj(s),dt)), 100); },
	// inverse year-to-date
	IYTD:	function (s) { return IIF(DIFF(YEAR(NEW_DATE_TS())), s, DIFF(s)); },
	// return the value at a specific point in time
	VAL: 	function (s, dt) { return RANGEEXPR(s, DT(dt), 1, function () {}); },
	// return the leaded or lagged time series
	LAG: 	function (s, lag) { return RANGEEXPR(s, lag || 1, 1, function () {}); },
	// moving sum, count, product, max, min
	MSUM: 	function (s, dur, ignorenull) { return RANGEEXPR(s, 0, dur, function (t,v) {return t+v}, ignorenull); },
	MCOUNT:	function (s, dur) { return RANGEEXPR(s, 0, dur, function (t,v) {return t+1}, true); },
	MPROD: 	function (s, dur, ignorenull) { return RANGEEXPR(s, 0, dur, function (t,v) {return t*v}, ignorenull); },
	MMAX: 	function (s, dur, ignorenull) { return RANGEEXPR(s, 0, dur, function (t,v) {return t>v?t:v}, ignorenull); },
	MMIN: 	function (s, dur, ignorenull) { return RANGEEXPR(s, 0, dur, function (t,v) {return t<v?t:v}, ignorenull); },
				
	//operations on scalars or individual values of time series
	// year of a date
	YEAR: 	function (s) { return EXPR('year', s); },
	// date formatting
	FORMAT: function (s, frmt) { return EXPR('format', s, frmt); },
	// if s1 is true return s2, else return s3; executed at each time period
	IIF: 	function (s1, s2, s3) { return EXPR('iif', s1, s2, s3); },
	// take the datapoint from the first argument where it is non-null
	OVERLAY:function () { var args = [].slice.call(arguments); args.unshift('overlay'); return EXPR.apply(null, args); },	
	// return the first non-error argument
	IFERROR: function () { var args = [].slice.call(arguments);	args.unshift('iferror'); return EXPR.apply(null, args); },
	
	//simple math functions
	MOD: 	function (s1, s2) { return EXPR('mod', s1, s2); },
	ROUND: 	function (s1, s2) { return EXPR('round', s1, s2 || 0); },
	LN: 	function (s) { return EXPR('log', s, Math.E); },
	LOG: 	function (s, base) { return EXPR('log', s, base || 10); },
	MIN:	function () { var args = [].slice.call(arguments); args.unshift('min'); return EXPR.apply(null, args); },
	MAX:	function () { var args = [].slice.call(arguments); args.unshift('max'); return EXPR.apply(null, args); },	

	//a lookup for the observations per year at a frequency
	FREQFACTOR: function (f) { return [1,2,4,12,52,260,365]['ASQMWBD'.indexOf(f.toUpperCase())]; }
};

var import_list = [
		// pseudo functions
		// the function is interpreted just-in-time; slow, but needed for calling dynamic code
	{ name: 'STACK', 	func : import_functions.STACK, pseudo : true },
	{ name: 'FREQ', 	func : import_functions.FREQ, pseudo : true },
	{ name: 'CATCH', 	func : import_functions.CATCH, pseudo : true },
	
		// native functions
		// the function is compiled, and can be called both, from pseudo and compiled functions
	{ name: 'EVAL', 	func : import_functions.EVAL }, 
	{ name: 'IDENT', 	func : import_functions.IDENT }, 
	{ name: 'LIT', 		func : import_functions.LIT }, 
	{ name: 'ALERT', 	func : alert }, 
	{ name: 'PCT', 		func : import_functions.PCT }, 
	{ name: 'IPCT', 	func : import_functions.IPCT }, 
	{ name: 'DIFF', 	func : import_functions.DIFF }, 
	{ name: 'CONTR', 	func : import_functions.CONTR }, 
	{ name: 'VAL', 		func : import_functions.VAL }, 
	{ name: 'LAG', 		func : import_functions.LAG }, 
	{ name: 'MSUM', 	func : import_functions.MSUM }, 
	{ name: 'MCOUNT', 	func : import_functions.MCOUNT }, 
	{ name: 'MPROD', 	func : import_functions.MPROD }, 
	{ name: 'MMAX', 	func : import_functions.MMAX }, 
	{ name: 'MMIN', 	func : import_functions.MMIN }, 
	{ name: 'MOD', 		func : import_functions.MOD }, 
	{ name: 'ROUND', 	func : import_functions.ROUND }, 
	{ name: 'LN', 		func : import_functions.LN }, 
	{ name: 'LOG', 		func : import_functions.LOG	}, 
	{ name: 'IYTD', 	func : import_functions.IYTD	}, 
	{ name: 'SETENVITER', func : import_functions.setEnvIter }, 
	{ name: 'SETENVFREQ', func : import_functions.setEnvFreq }, 
	{ name: 'SETENV', 	func : import_functions.setEnv }, 
	
	{ name: 'STRREPLACE',func : import_functions.STRREPLACE }, 
	{ name: 'YEAR', 	func : import_functions.YEAR },
	
	{ name: 'FORMAT', 	func : import_functions.FORMAT }, 
	{ name: 'IIF', 		func : import_functions.IIF }, 
	{ name: 'INCIF', 	func : import_functions.INCIF }, 
	{ name: 'REBASE', 	func : import_functions.REBASE }, 
	{ name: 'MIN',		func : import_functions.MIN }, 
	{ name: 'MAX', 		func : import_functions.MAX }, 
	{ name: 'OVERLAY', 	func : import_functions.OVERLAY }, 
	{ name: 'IFERROR', 	func : import_functions.IFERROR }, 
	{ name: 'EXPR', 	func : import_functions.EXPR }, 
	{ name: 'RANGEEXPR',func : import_functions.RANGEEXPR }, 
	{ name: 'LAGEXPR',	func : import_functions.LAGEXPR }, 
	{ name: 'TS2MAT', 	func : import_functions.TS2MAT }, 
	{ name: 'DT', 		func : import_functions.DT }, 
	{ name: 'DATE_PARSE',func : import_functions.DATE_PARSE }, 
	{ name: 'TRANSPOSE',func : import_functions.TRANSPOSE }, 
	{ name: 'CONCAT', 	func : import_functions.CONCAT }, 
	{ name: 'WRAPPER', 	func : import_functions.WRAPPER }, 
	{ name: 'SIZE', 	func : import_functions.SIZE }, 
	{ name: 'FREQFACTOR', func : import_functions.FREQFACTOR }, 
	{ name: 'DATE2INDEX', func : import_functions.DATE2INDEX }, 
	{ name: 'DATE2INDEX_HELPER', func : import_functions.DATE2INDEX_HELPER }, 
	
	{ name: 'INDEX2DATE', func : import_functions.INDEX2DATE }, 
	{ name: 'PUTDATEVALUE', func : import_functions.PUTDATEVALUE }, 
	{ name: 'PARSEDURATION', func : import_functions.PARSEDURATION }, 
	{ name: 'NEW_DATE_TS', func: import_functions.NEW_DATE_TS },
	{ name: 'NEW_TS_FROMFUNC', func: import_functions.NEW_TS_FROMFUNC },
	{ name: 'SCALAR2TS', func: import_functions.SCALAR2TS },

	{ name: 'INDEXFREQCONV', func : import_functions.INDEXFREQCONV }, 
	{ name: 'TS_CONVFREQ', func : import_functions.TS_CONVFREQ }, 
	
	
	{ name: 'NEW_OBJ', 	func : import_functions.NEW_OBJ },
	{ name: 'NEW_TEXT', func : import_functions.NEW_TEXT },
	{ name: 'NEW_SCALAR',func : import_functions.NEW_SCALAR },
	{ name: 'NEW_TS', 	func : import_functions.NEW_TS },
	{ name: 'NEW_EMPTY_TS', func : import_functions.NEW_EMPTY_TS },
	{ name: 'NEW_MAT', 	func : import_functions.NEW_MAT },
	{ name: 'NEW_DATE', func : import_functions.NEW_DATE },
	{ name: 'NEW_ERROR',func : import_functions.NEW_ERROR },
	
	{ name: 'SETDATA',func : import_functions.SETDATA },
	{ name: 'SETTYPE',func : import_functions.SETTYPE },
	{ name: 'SETDESC',func : import_functions.SETDESC },
	{ name: 'SETATTR',func : import_functions.SETATTR },
	
	{ name: 'GETATTR',func : import_functions.GETATTR },
	{ name: 'GETDATA',func : import_functions.GETDATA },
	{ name: 'GETTYPE',func : import_functions.GETTYPE },
	{ name: 'ISERROR',func : import_functions.ISERROR },

];
