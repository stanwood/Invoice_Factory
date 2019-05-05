var request = require('request');
var dateFormat = require('dateformat');
var fs = require('fs');

var debitoorKey = process.argv[2];
var projectKey = process.argv[3];

var logs = [];
var products = [];
var customers = [];

var logsFilename = "hours.json"
var debitoorUrl = "https://api.debitoor.com/api";
var getProductsUrl = debitoorUrl + "/products/v1";
var getCustomersUrl = debitoorUrl + "/customers/v1";
var createInvoiceUrl = debitoorUrl + "/sales/draftinvoices/v3"

var paymentTermsId = 3; // 30 days https://developers.debitoor.com/api-reference#paymentterms

var main = function () {

	console.log(debitoorKey);

	// VALIDATE INPUTS
	if (!debitoorKey) {
		console.error("Missing debitoor API key");
		return;
	}
	if (debitoorKey.length != 174) {
		console.error("Debitoor API key must be 174 chars. You gave " + debitoorKey.length + " chars.");
		return;
	}

	getLogs();
	getProducts();
}

var getProductsCallback = function () {
	getCustomers();
}
var getCustomersCallback = function() {
	createInvoices();
}

var getLogs = function () {
	logs = JSON.parse(fs.readFileSync(logsFilename, 'utf8'));
}

var getProducts = function () {
	var parameters = {
		"token": debitoorKey
	}
	var url = getProductsUrl + parametersToQuery(parameters);
	console.log(url);
	request(url,
		function (error, response, body) {
			console.log('error:', error);
			console.log('statusCode:', response && response.statusCode);
			//console.log('body:', body);

			if (response && response.statusCode == 200) {
				products = JSON.parse(body)
				getProductsCallback();
			}
		});
}

var getCustomers = function () {
	var parameters = {
		"token": debitoorKey
	}
	var url = getCustomersUrl + parametersToQuery(parameters);
	console.log(url);
	request(url,
		function (error, response, body) {
			console.log('error:', error);
			console.log('statusCode:', response && response.statusCode);
			//console.log('body:', body);

			if (response && response.statusCode == 200) {
				customers = JSON.parse(body)
				getCustomersCallback();
			}
		});
}

var projectSku = function(log) {
	var indexOf = log.project.indexOf(" - ");
	return log.project.substr(0, indexOf);
}
var clientSku = function(log) {
	var indexOf = log.client.indexOf(" - ");
	return log.client.substr(0, indexOf);
}


var createInvoices = function () {

	console.log("Creating invoices from " + logs.length + " logs");
	var projectTitles = [];
	logs.forEach(function(log){
		var projectTitle = projectSku(log);
		if(projectTitles.indexOf(projectTitle) === -1) {
			projectTitles.push(projectTitle);
		}
	});

	console.log("Creating invoices for " + projectTitles.length + " projects");

	for (var i = 0; i < projectTitles.length; i++) {
		var projectTitle = projectTitles[i];
		var product = getProduct(projectTitle);
		var customer = getCustomer(projectTitle);
		console.log(projectTitle)
		console.log(product.name)
		console.log(customer.name)
		console.log(projectKey);
		if (product && customer && (projectKey == null || projectKey == projectTitle)) {
			createInvoice(projectTitle )
		}
	}
}

var getProduct = function (projectTitle ) {

	if (!projectTitle ) {
		console.error("Project " + projectTitle + " has no client in Toggl.");
		return;
	}

	for (var j = 0; j < products.length; j++) {

		var product = products[j];
		var debitoorSku = product.sku
		if (debitoorSku == projectTitle) {
			//console.log(project.title.project);
			return product;
		}
	}
	console.error("Could not find product for " + projectTitle );
}

var getCustomer = function (projectTitle) {

	var log = {};
	logs.forEach(function(localLog){
		if (projectSku(localLog) === projectTitle) {
			log = localLog;
			return;
		}
	});

	for (var j = 0; j < customers.length; j++) {

		var customer = customers[j];
		var debitoorSku = customer.notes
		if (debitoorSku == clientSku(log)) {
			//console.log(project.title.client);
			return customer;
		}
	}
	console.error("Could not find customer for " + project.title.client);
}


var createInvoice = function (projectTitle) {

	console.log("Creating invoice for " + projectTitle);

	var product = getProduct(projectTitle);
	var customer = getCustomer(projectTitle);

	if (product == null) {
		console.error("Project " + projectTitle + " has no project in logs.");
		return;
	}
	if (customer == null) {
		console.error("Project " + projectTitle + " has no customer in logs.");
		return;
	}

	var today = new Date;
	var lastMonth = today.getMonth();
	var	month = today.getFullYear() + "-" + lastMonth
	var todayDateString = dateFormat(today, "yyyy-mm-dd");
	var invoiceNumber = product.sku + month.replace("-", "") + dateFormat(today, "mmdd"); //" " to force string

	var parameters = {
		"token": debitoorKey
	}
	var url = createInvoiceUrl + parametersToQuery(parameters);
	console.log(url);

	var languageCode = customer.countryCode == "GB" ? "en-GL" : "de-DE"; //No idea why "GL"

	var notes = product.description ? product.description : "";
	var monthOfService = customer.countryCode == "GB" ? "\nMonth of service: " : "\nLeistungsmonat: ";
	notes += monthOfService + month;

	var lines = [];
	logs.forEach(function(localLog){
		if (projectSku(localLog) === projectTitle) {
			var line = {
				quantity: Number((localLog.total_hours).toFixed(1)), // In hours
				unitId: 1, // Hours
				taxEnabled: product.taxEnabled,
				taxRate: product.rate,
				unitNetPrice: product.netUnitSalesPrice,
				productName: localLog.task + (localLog.platform.length > 0 ? " " + localLog.platform : "") + (localLog.description.length > 0 ? ": " + localLog.description : "")
			};
			if (customer.countryCode != "DE") { //Non-EU required, in EU not allowed
				line["productOrService"] = "service";
			}
			lines.push(line);

		}
	});
	//console.log(lines);

	var invoice =
	{
		number: invoiceNumber,
		notes: notes,
		date: todayDateString,
		paymentTermsId: paymentTermsId,
		customerId: customer.id,
		lines: lines,
		languageCode: languageCode
	}

	var requestBody = JSON.stringify(invoice);
	//console.log(body);

	request.post({ url: url, body: requestBody },
		function (error, response, body) {

			if (response.statusCode != 200) {
				console.log("request body:", requestBody);
				console.log('error:', error);
				console.log('statusCode:', response && response.statusCode);
				console.error('response body:', body);
			}
		});
}

var parametersToQuery = function (parameters) {
	var query = "?";
	for (var key in parameters) {
		if (parameters.hasOwnProperty(key)) {
			query = query + "&" + key + "=" + parameters[key];
		}
	}
	return query;
}

main();