// columns of the querylist table
var columnDefs = [
	{ field: "header", rowDrag: true, editable: true, tooltipField: 'header', width: 180},
	{ field: "queryDisplay", editable: true, tooltipField: 'queryDisplay', cellEditor: 'agLargeTextCellEditor', width: 400 },
	{ field: "state", width: 80, tooltipValueGetter: function (a) {
		return (a.value=='error' ? a.data.value.data : '');	},
		cellRendererSelector: function(params) {
			return {
				component: 'statusCellRenderer',
				params: { values: ['success', 'error', 'progress'] }
			};
		}
	}
];

// function to render status update icons
function StatusCellRenderer() {}
StatusCellRenderer.prototype.init = function(params) {
	this.eGui = document.createElement('span');
	if (params.value !== "" || params.value !== undefined || params.value !== null) {
		if (params.value == 'success') var icon = 'fas fa-check';
		if (params.value == 'error') var icon = 'fas fa-exclamation';
		if (params.value == 'progress') var icon = 'fas fa-spinner fa-pulse';
		$(this.eGui).append( $("<div>", {style: 'padding: 8px; line-height: 25px;', "class": icon}) );
	}
};
StatusCellRenderer.prototype.getGui = function() { return this.eGui; };

//settings for querylist table
var gridOptions = {
	rowDragManaged: true, // allow dragging
	enableMultiRowDragging: true,
	rowSelection: 'multiple', //allow multiple selection
	animateRows: true,
	defaultColDef: { width: 170 },
	columnDefs: columnDefs,
	rowData: [],
	enableBrowserTooltips: true, //enable tooltips
	components: { statusCellRenderer: StatusCellRenderer }, //render status update icons
	onCellEditingStopped: function (event) { //when changing a query update the data
		if (event.colDef.field == 'queryDisplay') {
			addSingle(event.data, event.data.header, event.data.queryDisplay);
		}
	}
};

//settings for data preview table
var gridOptionsPreview = {
	columnDefs: [],
	rowData: [],
};

//translate a user-input query to DataLayer Query format; i.e. adding panel parameters
function getQuery(queryDisplay, StartDate, EndDate, country) {
	if (!StartDate) StartDate = (new Date()).toISOString().split('T')[0];
	if (!EndDate) EndDate = (new Date()).toISOString().split('T')[0];
	
	var query = 'ts2mat('+queryDisplay+',"'+StartDate+'","'+EndDate+'")';
	if (country.length) {
		query = 'stack('+query+', "country", '+JSON.stringify(country)+')';
	}
	return query;
}

//incrementally update queries (add a new, or update old query)
// load the data and update tables
function addSingle(old, header, queryDisplay) {

	DL.env.freq = $('#freq').val();

	var query = getQuery(queryDisplay, $('#StartDate').val(), $('#EndDate').val(), $('#region').val());

	if (old) {
		old.header = header;
		old.queryDisplay = queryDisplay;
		old.query = query;
		gridOptions.api.applyTransaction({update: [old]});
		old.ast = null;
		DL.updateRequests([old.id]);
	} else {
		var q = {header: header, queryDisplay: queryDisplay, query:query, state:'progress'};
		q.gridrow = gridOptions.api.applyTransaction({add: [q]}).add[0];
		DL.addRequests([q]);
	}
}
	
// load the UI features (in tableau interactive mode)
function setupFE() {

	// ui panel-setting

	$( "#freq" ).selectmenu({ change: updateAll });

	datepicker_options = {
		changeMonth: true,
		changeYear: true,
		showButtonPanel: true,
		dateFormat: "yy-mm-dd"
	};
	$( "#StartDate" ).datepicker(datepicker_options).change(updateAll);
	$( "#EndDate" ).datepicker(datepicker_options).change(updateAll);

	var regionjson = [
		{"Aggregates": [{WO:"World"}, {EU:"European Union"}, {EA:"Euro area"}]},
		{"Euro Area": [{BE:"Belgium"}, {DE:"Germany"}, {EE:"Estonia"}, {IE:"Ireland"}, {GR:"Greece"}, {ES:"Spain"}, {FR:"France"}, {IT:"Italy"}, {CY:"Cyprus"}, {LV:"Latvia"}, {LT:"Lithuania"}, {LU:"Luxembourg"}, {MT:"Malta"}, {NL:"Netherlands"}, {AT:"Austria"}, {PT:"Portugal"}, {SI:"Slovenia"}, {SK:"Slovakia"}, {FI:"Finland"}]},
		{"Other EU": [{BG:"Bulgaria"}, {CZ:"Czech Republic"}, {DK:"Denmark"}, {HR:"Croatia"}, {HU:"Hungary"}, {PL:"Poland"}, {RO:"Romania"}, {SE:"Sweden"}]},
		{"Other OECD": [{GB:"United Kingdom"}, {AU:"Australia"}, {CA:"Canada"}, {CL:"Chile"}, {IS:"Iceland"}, {IL:"Israel"}, {JP:"Japan"}, {KR:"Korea"}, {MX:"Mexico"}, {NZ:"New Zealand"}, {NO:"Norway"}, {CH:"Switzerland"}, {TR:"Turkey"}, {US:"United States"}]},
		{"Other": [{AF:"Afghanistan"}, {AL:"Albania"}, {DZ:"Algeria"}, {AD:"Andorra"}, {AO:"Angola"}, {AG:"Antigua and Barbuda"}, {AR:"Argentina"}, {AM:"Armenia"}, {AW:"Aruba"}, {AZ:"Azerbaijan"}, {BS:"Bahamas"}, {BH:"Bahrain"}, {GG:"Bailiwick Of Guernsey"}, {BD:"Bangladesh"}, {BB:"Barbados"}, {BY:"Belarus"}, {BZ:"Belize"}, {BJ:"Benin"}, {BM:"Bermuda"}, {BT:"Bhutan"}, {BO:"Bolivia"}, {BA:"Bosnia and Herzegovina"}, {BW:"Botswana"}, {BR:"Brazil"}, {BN:"Brunei Darussalam"}, {BF:"Burkina Faso"}, {BI:"Burundi"}, {KH:"Cambodia"}, {CM:"Cameroon"}, {CV:"Cape Verde"}, {KY:"Cayman Islands"}, {CF:"Central African Republic"}, {TD:"Chad"}, {CN:"China"}, {CO:"Colombia"}, {KM:"Comoros"}, {CD:"Congo DR"}, {CG:"Congo"}, {CK:"Cook Islands"}, {CR:"Costa Rica"}, {CI:"Cote d'Ivoire"}, {CU:"Cuba"}, {CW:"Curacao"}, {DJ:"Djibouti"}, {DM:"Dominica"}, {DO:"Dominican Republic"}, {EC:"Ecuador"}, {EG:"Egypt"}, {SV:"El Salvador"}, {GQ:"Equatorial Guinea"}, {ER:"Eritrea"}, {ET:"Ethiopia"}, {FJ:"Fiji"}, {GA:"Gabon"}, {GM:"Gambia"}, {GE:"Georgia"}, {GH:"Ghana"}, {GI:"Gibraltar"}, {GD:"Grenada"}, {GT:"Guatemala"}, {GN:"Guinea"}, {GW:"Guinea-Bissau"}, {GY:"Guyana"}, {HT:"Haiti"}, {HN:"Honduras"}, {HK:"Hong Kong"}, {IN:"India"}, {ID:"Indonesia"}, {IR:"Iran"}, {IQ:"Iraq"}, {IM:"Isle of Man"}, {JM:"Jamaica"}, {JE:"Jersey"}, {JO:"Jordan"}, {KZ:"Kazakhstan"}, {KE:"Kenya"}, {KI:"Kiribati"}, {XK:"Kosovo"}, {KW:"Kuwait"}, {KG:"Kyrgyzstan"}, {LA:"Lao"}, {LB:"Lebanon"}, {LS:"Lesotho"}, {LR:"Liberia"}, {LY:"Libyan Arab Jamahiriya"}, {LI:"Liechtenstein"}, {MO:"Macao"}, {MK:"Macedonia"}, {MG:"Madagascar"}, {MW:"Malawi"}, {MY:"Malaysia"}, {MV:"Maldives"}, {ML:"Mali"}, {MR:"Mauritania"}, {MU:"Mauritius"}, {MD:"Moldova"}, {MC:"Monaco"}, {MN:"Mongolia"}, {ME:"Montenegro"}, {MS:"Montserrat"}, {MA:"Morocco"}, {MZ:"Mozambique"}, {MM:"Myanmar"}, {NA:"Namibia"}, {NP:"Nepal"}, {AN:"Netherlands Antilles"}, {NI:"Nicaragua"}, {NE:"Niger"}, {NG:"Nigeria"}, {OM:"Oman"}, {PK:"Pakistan"}, {PA:"Panama"}, {PG:"Papua New Guinea"}, {PY:"Paraguay"}, {PE:"Peru"}, {PH:"Philippines"}, {PR:"Puerto Rico"}, {QA:"Qatar"}, {RU:"Russia"}, {RW:"Rwanda"}, {KN:"Saint Kitts and Nevis"}, {LC:"Saint Lucia"}, {VC:"Saint Vincent and the Grenadines"}, {WS:"Samoa"}, {SM:"San Marino"}, {ST:"Sao Tome and Principe"}, {SA:"Saudi Arabia"}, {SN:"Senegal"}, {RS:"Serbia"}, {SC:"Seychelles"}, {SL:"Sierra Leone"}, {SG:"Singapore"}, {SX:"Sint Maarten"}, {SB:"Solomon Islands"}, {SO:"Somalia"}, {ZA:"South Africa"}, {SS:"South Sudan"}, {LK:"Sri Lanka"}, {SD:"Sudan"}, {SR:"Suriname"}, {SZ:"Swaziland"}, {SY:"Syria"}, {TW:"Taiwan"}, {TJ:"Tajikistan"}, {TZ:"Tanzania"}, {TH:"Thailand"}, {TL:"Timor-Leste"}, {TG:"Togo"}, {TO:"Tonga"}, {TT:"Trinidad and Tobago"}, {TN:"Tunisia"}, {TM:"Turkmenistan"}, {TV:"Tuvalu"}, {UG:"Uganda"}, {UA:"Ukraine"}, {AE:"United Arab Emirates"}, {UY:"Uruguay"}, {UZ:"Uzbekistan"}, {VU:"Vanuatu"}, {VE:"Venezuela"}, {VN:"Viet Nam"}, {YE:"Yemen"}, {ZM:"Zambia"}, {ZW:"Zimbabwe"}]}
	];
	
	$.each(regionjson, function(i, g) {
		var $optgroup = $("<optgroup>", {label: Object.keys(g)[0]}).appendTo('#region');
		$.each(g[Object.keys(g)[0]], function(i, o) {
			$optgroup.append($("<option>", {text: o[Object.keys(o)[0]], value: Object.keys(o)[0]}));
		});
	});

	$('#region').multiselect({enableFiltering:true,enableClickableOptGroups:true,enableCaseInsensitiveFiltering:true,maxHeight:300,}).change(updateAll);
		
	// grids

	var gridDiv = document.querySelector('#queriesgrid');
	new agGrid.Grid(gridDiv, gridOptions);	

	var gridDivPreview = document.querySelector('#previewgrid');
	new agGrid.Grid(gridDivPreview, gridOptionsPreview);	
			
	
	// dialogs

	function dlgaddseries_submit() {
		addSingle(null, $('#dlgaddseries_header').val(), $('#dlgaddseries_query').val());
		dlgaddseries.dialog( "close" );
	}

	dlgaddseries = $( "#dlgaddseries" ).dialog({
		autoOpen: false,
		height: 300,
		width: 350,
		modal: true,
		buttons: {
			"Create series": dlgaddseries_submit,
			Cancel: function() { dlgaddseries.dialog( "close" ); }
		}
	})
	dlgaddseries.find( "form" ).on( "submit", function( event ) { event.preventDefault(); dlgaddseries_submit(); });


	function addBulk() {
		var ks = $('#dlgbulk_txt').val().split("\n");

		gridOptions.api.setRowData([]);

		for (var i=0; i<ks.length; i++) {
			var splt = ks[i].indexOf(",");
			if (splt >= 0) {
				addSingle(null, ks[i].substring(0, splt), ks[i].substring(splt+1, ks[i].length));
			}
		}

		dlgbulk.dialog( "close" );
	}

	dlgpreview = $( "#dlgpreview" ).dialog({
		autoOpen: false,
		height: 540,
		width: 740,
		modal: true,
		buttons: {
		Close: function() { dlgpreview.dialog( "close" ); }
		}
	});

	dlgbulk = $( "#dlgbulk" ).dialog({
		autoOpen: false,
		height: 400,
		width: 550,
		modal: true,
		buttons: {
		"Import": addBulk,
		Cancel: function() { dlgbulk.dialog( "close" ); }
		}
	});
	dlgbulk.find( "form" ).on( "submit", function( event ) { event.preventDefault(); addBulk(); });

	//buttons

	$("#btndelete").button().click(function() {
		gridOptions.api.applyTransaction({ remove: gridOptions.api.getSelectedRows() });
	});
	$("#btnaddseries").button().click(function() {
		$('#dlgaddseries_header').val('');
		$('#dlgaddseries_query').val('');
		dlgaddseries.dialog( "open" );
	});
	$("#btnbulk").button().click(function() {
		var txt = '';	
		gridOptions.api.forEachNode(function(rowNode, index) {
			txt = txt + rowNode.data.header + ',' + rowNode.data.queryDisplay + '\n';
		});
		$('#dlgbulk_txt').val(txt);
		dlgbulk.dialog( "open" );
	});
	
	$("#btnpreview").button().click(function() {
		update_preview();
		dlgpreview.dialog( "open" );
	});
	
	$("#submitButton").button().click(function() {

		var data = {
			freq: $('#freq').val().trim(),
			region: $('#region').val(),
			StartDate: $('#StartDate').val(),
			EndDate: $('#EndDate').val(),
			queries: []
		};
		
		gridOptions.api.forEachNode(function(rowNode, index) {
			if (rowNode.data.state != 'error') {
				data.queries.push({header: rowNode.data.header, queryDisplay: rowNode.data.queryDisplay});
			}
		});

		tableau.connectionData = JSON.stringify(data);
		tableau.connectionName = "EMA Data Layer";
		
		if (isdebug) {
			//myConnector.getSchema(function(a) {alert(JSON.stringify(a));});
			var t = {appendRows: function(a) {alert(JSON.stringify(a));} };
			myConnector.getData(t, function() {});
		} else {
			tableau.submit();
		}

	});
	
	// series management
	
	function update_preview() {

		var columnDefsPreview = [];
		var datapoints = [];

		gridOptions.api.forEachNodeAfterFilterAndSort(function(rowNode, index) {
			columnDefsPreview.push({field: rowNode.data.header});
			
			if (rowNode.data.state=="success") {
				for (var i=0; i<rowNode.data.value.data.length; i++) {
					if (!datapoints[i]) datapoints[i] = {};
					
					var v = rowNode.data.value.data[i][0]
					if (v instanceof Date) v = v.toISOString().split('T')[0];
					datapoints[i][rowNode.data.header] = v;
				}
			}
		});

		gridOptionsPreview.api.setColumnDefs([]);
		gridOptionsPreview.api.setColumnDefs(columnDefsPreview);
		gridOptionsPreview.api.setRowData([]);
		gridOptionsPreview.api.applyTransaction({add: datapoints});

	}

	// update all is needed when changing frequency, dates or countries
	function updateAll() {
		gridOptions.api.forEachNode(function(rowNode, index) {
			addSingle(rowNode.data, rowNode.data.header, rowNode.data.queryDisplay);
		});
	}
	
}