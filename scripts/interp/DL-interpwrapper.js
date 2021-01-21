"use strict";

// defines the interface to the external libraries to handle parsing and interpreting

function interpreter_wrapper(importFunctionParam) {
	
	var importfunc = [];
	var interp = {};
	
	var globalObject = null;
	
	// functions to deal with Interpreter Objects
	function isObj(obj) { return (obj instanceof interp.OBJECT_PROTO.constructor); }
	function createObj() { return interp.createObjectProto(interp.OBJECT_PROTO); }
	function cloneObj(obj) { return interp.createObjectProto(obj); }
	function getPropNative(obj, prop) { return (interp.getProperty(obj || globalObject, prop)); }
	function setPropNative(obj, prop, val) { interp.setProperty(obj || globalObject, prop, val); return obj; }
	function getProp(obj, prop) { return interp.pseudoToNative(getPropNative(obj, prop)); }
	function setProp(obj, prop, val) { setPropNative(obj, prop, interp.nativeToPseudo(val)); return obj; }
	
	//define scope to be used in native functions passed to interpreter
	var scope = {
		'isObj': 		isObj,
		'createObj':	createObj,
		'cloneObj':		cloneObj,
		'getProp':		getProp,
		'setProp':		setProp,
		'getPropNative':getPropNative,
		'setPropNative':setPropNative,
		'evalreq':		evalreq,
	};
	
	//replace characters in queries to ensure JavaScript compliance; they will be replaced back during compiling
	var escapechars = {
		'.': '_____DOT_____',
		':': '_____COLON_____',
		'@': '_____AT_____',
	}	
	Babel.options.parserOpts = {};
	Babel.options.parserOpts.replescape = function(a) {
		for (var esc in escapechars) {
			a = a.replace(new RegExp(escapechars[esc], "gi"), esc);
		}
		return a;
	};
	
	// load functions to be passed to the interpreter
	importFunction(importFunctionParam);
	
	// evaluate a request
	function evalreq(req, env) {
		
		// use a cached Abstract syntax tree (AST) from a previous run, if available
		if (req.ast) {
			var ast = req.ast;
		} else {
			var code = req.query || req;
			
			// only replace escape characters in non-strict mode
			if (!env.strict) {
				for (var esc in escapechars) {
					var r = new RegExp(esc.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), "gi");
					code = code.replace(r, escapechars[esc]);
				}
			}
			
			//pass environment options to babel plugins
			Babel.options.parserOpts.env = env;
			
			// first run Babel to preprocess the query, then run acorn to parse it.
			try {
				var babel_code = Babel.transform(code, Babel.options).code;
				var ast = acorn.parse(babel_code, Interpreter.PARSE_OPTIONS);
			}
			catch(e) {
				req.state = 'error';
				return error(e.code+': '+ e.message);
			}
			
			if (req.query) req.ast = ast;
		}
		
		// prepare interpreter object (external dependency)
		interp = new Interpreter(ast, function(i, g) { globalObject = g; });
		
		// feed the interpreter with existing functions ('pseudo' refers to interpreted functions, and alternatively 'native' functions)
		// pseudo functions are interpreted just-in-time; slow, but needed for calling dynamic code
		// native functions are compiled
		importfunc.forEach(function (h) {
			
			if (h.pseudo) {
				interp.appendCode(h.func_txt); 
			} else {
				interp.setProperty(globalObject, h.name, interp.createNativeFunction(h.func_wrapped));
			}
		});
		
		// feed the interpreter with the environment variable
		env = Object.assign({}, env);
		setProp(null, 'env', env);

		// run the interpreter
		try {
			interp.run();
		}
		catch(e) {
			req.state = 'error';
			return error(e.message);
		}

		// return the result
		var val = {type:GETTYPE(interp.value), data: GETDATA(interp.value)};
		if (val.type == obj_type.error && val.data == err_type.async) {
			req.state = 'progress';
		} else if (val.type == obj_type.error) {
			req.state = 'error';
		} else {
			req.state = 'success';
		}
		
		return val;

	}

	// load functions available to the DL queries
	function importFunction(func) {
		
		func.forEach(function (h) {
			
			var f = {};
			
			f.name = h.name.toUpperCase();
			f.pseudo = h.pseudo;
			f.func = h.func;
			
			if (f.pseudo) {
				// for 'pseudo' functions we only care about the actual source code in string format
				f.func_txt = h.func.toString();
			} else {
				
				// for 'native' functions we prepare a wrapper that converts inputs and outputs received from the function
				f.func_wrapped = function() { 
					var args = Array.prototype.slice.call(arguments);
					var env = getProp(null, 'env');
					
					// ensure 'scope' is available to the executed native function
					var g = (typeof globalThis !== 'undefined') ? globalThis : self;
					Object.assign(g, scope, {env:env});
					
					var r = f.func.apply(null, args);
					if (!isObj(r)) {
						var a = r;
						r = createObj();

						if (a instanceof Date) setPropNative(r, 'type', obj_type.date);
						else if (typeof a === 'string' || a instanceof String) setPropNative(r, 'type', obj_type.text);
						else if (typeof a === 'object') return interp.nativeToPseudo(a);
						else setPropNative(r, 'type', obj_type.scalar);
						setPropNative(r, 'data', a);
					}
					return r;
				}
			
				scope[f.name] = f.func;

			}
			
			importfunc.push(f);
		});
	}

	function error(txt) {
		return {type: obj_type.error, data: txt};
	}
	
	//export methods and functions
	
	this['evalreq'] = evalreq;
	this['error'] = error;
	this['importFunction'] = importFunction;

};