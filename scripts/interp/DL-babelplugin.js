// register a Babel plugin to add convenience conversions (in non-strict mode):
//	make identifiers case insensitive
//	allow for simple time series operations (e.g. A+B, where A and B are objects)
// 	define functions that are executed before its parameters (e.g. CATCH(a) adds a try/catch term before evaluating a)
//	allow the creation of DL objects for simple identifiers or literals

Babel.registerPlugin('overload',
	function overload(babel) {
		var t = babel.types;

		return {
			visitor: {
				
				// transform identifiers (e.g. function or object names) to upper case
				// excluding builtin identifiers (e.g. Math.E)
				Identifier : function(path) {
					if (this.file.opts.parserOpts.env.strict) return;
					if (path.node.hasOwnProperty('_visited')) return;
					
					path.node['_visited'] = true;
					
					if (path.node.name == 'Math' && path.key == 'object') {
						path.node['_visited'] = true;
						path.parent.property['_visited'] = true;
						return;
					}
					
					if (path.key == 'callee') {
						path.node.name = path.node.name.toUpperCase();
					}
					
					if (path.listKey == 'arguments' || path.key == 'expression') {
						
						var i = path.node.name;
						i = this.file.opts.parserOpts.replescape(i);
						
						path.replaceWith( t.callExpression( t.identifier('IDENT'), [t.stringLiteral(i)] ) );
						path.node.arguments[0]['_visited'] = true;
					}

					path.node['_visited'] = true;
					
				},
				
				// transform unary expressions: -a ... expr('-', a)
				UnaryExpression : function(path) {
					if (this.file.opts.parserOpts.env.strict) return;
					if (path.node.hasOwnProperty('_visited')) return;
					if (path.node.operator == 'throw') return;

					var func = t.callExpression( t.Identifier('EXPR'), [t.StringLiteral(path.node.operator), path.node.argument] );
					func.arguments[0]['_visited'] = true;
					
					path.replaceWith( func );
				},
				
				// transform update expressions: a++ ... expr('++', a)
				UpdateExpression : function(path) {
					if (this.file.opts.parserOpts.env.strict) return;
					if (path.node.hasOwnProperty('_visited')) return;
					
					var func = t.callExpression( t.Identifier('EXPR'), [t.StringLiteral(path.node.operator), path.node.argument] );
					func.arguments[0]['_visited'] = true;

					path.replaceWith( func );
				},
				
				// transform binary expressions: a+b ... expr('+', a, b)
				BinaryExpression : function(path) {
					if (this.file.opts.parserOpts.env.strict) return;
					if (path.node.hasOwnProperty('_visited')) return;

					var func = t.callExpression( t.Identifier('EXPR'), [t.StringLiteral(path.node.operator), path.node.left, path.node.right] );
					func.arguments[0]['_visited'] = true;

					path.replaceWith( func );
				},	
				
				// transform literals: a ... lit(a)
				Literal : function(path) {
					if (this.file.opts.parserOpts.env.strict) return;
					if (path.node.hasOwnProperty('_visited')) return;
					path.node['_visited'] = true;
					
					if (path.parent.type == 'ThrowStatement') return;
					
					if (path.node.name) path.node.name = this.file.opts.parserOpts.replescape(path.node.name);
					path.replaceWith( t.callExpression( t.identifier('LIT'), [path.node] ) );
				},

				// transform specific functions arguments to arrow functions:
				// freq( a, 'M' ) ... freq( () => a, 'M' )
				CallExpression : function(path) {
					var callee_name = path.node.callee.name;
					
					if (!callee_name) return;
					
					var trigger_codes = ['FREQ', 'STACK', 'CATCH'];
					if (trigger_codes.indexOf(callee_name.toUpperCase()) > -1) {
						if (path.node.hasOwnProperty('_visited')) return;
						path.replaceWith( t.callExpression( path.node.callee, 
							[t.arrowFunctionExpression([], path.node.arguments.shift())].concat(path.node.arguments) ) );
						path.node['_visited'] = true;
					}
				}
			}
		}
	});
Babel.options = { presets: ['env'], ast:false, code:true, plugins: ['overload', 'proposal-throw-expressions'] };