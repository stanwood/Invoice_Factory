var request = require('request');
var base64 = require('base-64');

var togglKey = process.argv[2];
var debitoorKey = process.argv[3];
var workspaceId = process.argv[4];
var month = process.argv[5];
var projectKey = process.argv[6];
var projects = [];
var products = [];
var customers = [];

var regexMonth = /20\d{2}-(0|1)\d/i;
var togglSummaryUrl = "https://toggl.com/reports/api/v2/summary";
var togglDetailsUrl = "https://toggl.com/reports/api/v2/details.pdf";
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
		var today = new Date();
		var lastMonth = today.getMonth();
		if (lastMonth < 10) {
			lastMonth = "0" + lastMonth;
		}
		month = today.getFullYear() + "-" + lastMonth
	}
	if (!month.match(regexMonth)) {
		console.error("Month must be in the format: 2018-11");
		return;
	}
	console.log(month);

	getProjects();
}

var getProjects = function () {

	var parameters = {
		"since": month + "-01",
		"until": month + "-31",
		"workspace_id": workspaceId,
		"user_agent": "stanwood",
		"billable": true
	}
	request(
		{
			url: togglSummaryUrl + parametersToQuery(parameters),
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
				//TODO: Remove this. This is just to stop the processing after the first invoice
				return;
			}
		}
	}

	return;
}

var getProduct = function (project) {

	var indexOf = project.title.project.indexOf(" - ");
	var togglSku = project.title.project.substr(0, indexOf);
	console.log("Time: " + project.time);

	for (var j = 0; j < products.length; j++) {

		var product = products[j];
		var debitoorSku = product.sku
		if (debitoorSku == togglSku) {
			console.log(product);
			return product;
		}
	}
	console.error("Could not find product " + togglSku);
}

var getCustomer = function (project) {

	var indexOf = project.title.project.indexOf(" - ");
	var togglSku = project.title.client.substr(0, indexOf);
	console.log("Time: " + project.time);

	for (var j = 0; j < customers.length; j++) {

		var customer = customers[j];
		var debitoorSku = customer.notes
		if (debitoorSku == togglSku) {
			console.log(customer);
			return customer;
		}
	}
	console.error("Could not find customer " + togglSku);
}

var getAttachment = function (project) {

	var parameters = {
		"since": month + "-01",
		"until": month + "-31",
		"workspace_id": workspaceId,
		"user_agent": "stanwood",
		"billable": true,
		"project_ids": project.id
	}
	var url = togglDetailsUrl + parametersToQuery(parameters);
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
				uploadAttachment(body, project);
			}
		});
}

var uploadAttachment = function (body, project) {

	var parameters = {
		"token": debitoorKey
	}
	var url = uploadFilesUrl + parametersToQuery(parameters);
	console.log(url);
	var formData = {
		custom_file: {
			value: body,
			options: {
				filename: 'worklog.pdf',
				contentType: 'application/pdf'
			}
		}
	};
	request.post({
		url,
		formData: formData
	},
		function (error, response, body) {
			console.log('error:', error);
			console.log('statusCode:', response && response.statusCode);
			console.log('body:', body);

			if (response && response.statusCode == 200) {
				var fileId = JSON.parse(body).id;
				createInvoice(project, fileId)
			}
		});
}

var createInvoice = function (project, fileId) {

	var today = new Date;
	var invoiceNumber = "CIN20170206"
	var notes = project.notes;

	var product = getProduct(project);
	var customer = getCustomer(project);

	var parameters = {
		"token": debitoorKey
	}
	var url = createInvoiceUrl + parametersToQuery(parameters);
	console.log(url);

	//TODO: Check JLR
	var languageCode = customer.countryCode == "GB" ? "de-DE" : "en-GB";
	var invoice =
		{
			companyProfile: {
				taxEnabled: taxEnabled,
				cashAccounting: false,
				companyNumber: companyNumber
			},
			number: invoiceNumber,
			type: "invoice",
			notes: notes,
			date: today,
			paymentTermsId: paymentTermsId,
			customerId: customer.id,
			lines: [
				{
					quantity: project.time / 3600,
					productId: product.id,
				}
			],
			languageCode: languageCode,
			attachments: [{ fileId: fileId }
			]
		}

	request.post({
		url: url,
		formData: invoice
	},
		function (err, httpResponse, body) {
			console.log('error:', error);
			console.log('statusCode:', response && response.statusCode);
			console.log('body:', body);

		});
}

var parametersToQuery = function (parameters) {
	var query = "?";
	for (var key in parameters) {
		if (parameters.hasOwnProperty(key)) {
			query = query + key + "=" + parameters[key] + "&";
		}
	}
	return query;
}

main();