var request = require('request');
var base64 = require('base-64');
var dateFormat = require('dateformat');


var togglKey = process.argv[2];
var debitoorKey = process.argv[3];
var workspaceId = process.argv[4];
var month = process.argv[5];
var projectKey = process.argv[6];
var projects = [];
var products = [];
var customers = [];

var regexMonth = /20\d{2}-(0|1)?\d/i;
var togglSummaryUrl = "https://toggl.com/reports/api/v2/summary";
var togglDetailsUrl = "http://stanwood-invoice-factory.appspot.com/toggl/reports/api/v2/details.pdf"
//var togglDetailsUrl = "https://toggl.com/reports/api/v2/details.pdf";
var debitoorUrl = "https://api.debitoor.com/api";
var getProductsUrl = debitoorUrl + "/products/v1";
var getCustomersUrl = debitoorUrl + "/customers/v1";
var createInvoiceUrl = debitoorUrl + "/sales/draftinvoices/v3"
var uploadFilesUrl = debitoorUrl + "/files/v1";
var togglHeaders = {
	"Authorization": "Basic " + base64.encode(togglKey + ":api_token"),
	"Content-Type": "application/json"
};

var paymentTermsId = 4; // 30 days https://developers.debitoor.com/api-reference#paymentterms

var msecsInSecs = 1000;
var minutesInHour = 60;
var secondsInMinute = 60;
var today = new Date();

var main = function () {

	// VALIDATE INPUTS
	if (!togglKey) {
		console.error("Missing Toggl API key");
		return;
	}
	if (togglKey.length != 32) {
		console.error("Toggl API key must be 32 chars. You gave " + togglKey.length + " chars.");
		return;
	}
	if (!debitoorKey) {
		console.error("Missing debitoor API key");
		return;
	}
	if (debitoorKey.length != 174) {
		console.error("Debitoor API key must be 174 chars. You gave " + debitoorKey.length + " chars.");
		return;
	}
	if (!workspaceId) {
		console.error("Missing workspace ID");
		return;
	}
	if (workspaceId.length != 7) {
		console.error("API key must be 32 chars");
		return;
	}
	if (!month) {
		var lastMonth = today.getMonth();
		month = today.getFullYear() + "-" + lastMonth
	} else {
		today = new Date(month.substr(0,4), month.substr(6,2), 1)
	}
	if (!month.match(regexMonth)) {
		console.error("Month must be in the format: 2018-11");
		return;
	}
	console.log(month);

	getProjects();
}

var endOfMonth = function() {
	var endOfMonth = new Date(today.getFullYear(), today.getMonth(), 0);
	return endOfMonth.getFullYear() + "-" + (endOfMonth.getMonth() + 1) + "-" + endOfMonth.getDate();
}

var getProjects = function () {

	var parameters = {
		"since": month + "-01",
		"until": endOfMonth(),
		"workspace_id": workspaceId,
		"user_agent": "stanwood",
		"billable": true
	}
	var url = togglSummaryUrl + parametersToQuery(parameters);
	console.log(url);
	request(
		{
			url: url,
			headers: togglHeaders
		},
		function (error, response, body) {
			console.log('error:', error);
			console.log('statusCode:', response && response.statusCode);
			//console.log('body:', body);

			if (response && response.statusCode == 200) {
				projects = JSON.parse(body).data
				getProducts();
			}
		});
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
				getCustomers();
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
				createInvoices();
			}
		});
}

var createInvoices = function () {

	for (var i = 0; i < projects.length; i++) {

		var project = projects[i];
		var indexOf = project.title.project.indexOf(" - ");
		if (indexOf > 0) {
			var product = getProduct(project);
			var customer = getCustomer(project);
			if (product && customer) {
				getAttachment(project);
			}
		}
	}
}

var getProduct = function (project) {

	var indexOf = project.title.project.indexOf(" - ");
	var togglSku = project.title.project.substr(0, indexOf);

	for (var j = 0; j < products.length; j++) {

		var product = products[j];
		var debitoorSku = product.sku
		if (debitoorSku == togglSku) {
			//console.log(product);
			return product;
		}
	}
	console.error("Could not find product for " + project.title.project);
}

var getCustomer = function (project) {

	var indexOf = project.title.client.indexOf(" - ");
	var togglSku = project.title.client.substr(0, indexOf);

	for (var j = 0; j < customers.length; j++) {

		var customer = customers[j];
		var debitoorSku = customer.notes
		if (debitoorSku == togglSku) {
			//console.log(customer);
			return customer;
		}
	}
	console.error("Could not find customer for " + project.title.client);
}

var getAttachment = function (project) {

	var parameters = {
		"since": month + "-01",
		"until": endOfMonth(),
		"workspace_id": workspaceId,
		"user_agent": "stanwood",
		"billable": true,
		"project_ids": project.id
	}
	var url = togglDetailsUrl + parametersToQuery(parameters);
	console.log(url);
	//console.log(headers);
	request(
		{
			url: url,
			headers: togglHeaders,
			encoding: 'binary'
		},
		function (error, response, body) {

			if (response && response.statusCode == 200) {
				uploadAttachment(body, project);
			} else {
				console.log('error:', error);
				console.log('statusCode:', response && response.statusCode);
				console.log('body:', body);
			}
		});
}

var uploadAttachment = function (body, project) {

	var parameters = {
		"token": debitoorKey,
		"fileName": 'worklog.pdf',
	};
	var url = uploadFilesUrl + parametersToQuery(parameters);
	console.log(url);

	var base64data = new Buffer(body, 'binary');

	var formData = {
		file: base64data
	};

	request.post({
			url,
			formData: formData,
		},
		function (error, response, body) {
			if (response && response.statusCode == 200) {
				console.log(body);
				var fileId = JSON.parse(body).id;
				createInvoice(project, fileId)
			} else {
				console.log("request body: ", requestBody);
				console.log('error:', error);
				console.log('statusCode:', response && response.statusCode);
				console.error('response body: ', body);
			}
		});
}

var createInvoice = function (project, fileId) {

	var product = getProduct(project);
	var customer = getCustomer(project);

	var today = new Date;
	var todayDateString = dateFormat(today, "yyyy-mm-dd");
	var invoiceNumber = product.sku + month.replace("-", "") + dateFormat(today, "mmdd"); //" " to force string

	var parameters = {
		"token": debitoorKey
	}
	var url = createInvoiceUrl + parametersToQuery(parameters);
	console.log(url);

	//TODO: Check JLR
	var languageCode = customer.countryCode == "GB" ? "en-GL" : "de-DE"; //No idea why "GL"

	var invoice =
	{
		number: invoiceNumber,
		notes: product.description ? product.description : "",
		date: todayDateString,
		paymentTermsId: paymentTermsId,
		customerId: customer.id,
		lines: [
			{
				quantity: Math.round(project.time / (msecsInSecs * minutesInHour * secondsInMinute)),
				productId: product.id,
				taxEnabled: product.taxEnabled,
				taxRate: product.rate,
				unitNetPrice: product.netUnitSalesPrice
			}
		],
		languageCode: languageCode,
		attachments: [{ fileId: fileId }
		]
	}

	if (customer.countryCode != "DE") {
		invoice.lines[0]["productOrService"] = "service";
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