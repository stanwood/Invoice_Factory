var request = require('request');
var base64 = require('base-64');

var togglKey = process.argv[2];
var debitoorKey = process.argv[3];
var workspaceId = process.argv[4];
var month = process.argv[5];
var projectKey = process.argv[6];
var togglProjects = [];
var debitoorProducts = [];

var regexMonth = /20\d{2}-(0|1)\d/i;
var togglUrl = "https://toggl.com/reports/api/v2/summary";
var debitoorUrl = "https://api.debitoor.com/api";
var getProductsUrl = debitoorUrl + "/products/v1";
var createInvoiceUrl = debitoorUrl + "/sales/draftinvoices/v3"

var main = function () {
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

var getProjects = function() {

	var parameters = {
		"since": month + "-01",
		"until": month + "-31",
		"workspace_id": workspaceId,
		"user_agent": "stanwood",
		"billable": true
	}
	var headers = {
		"Authorization": "Basic " + base64.encode(togglKey + ":api_token"),
		"Content-Type": "application/json"
	};

	request(
		{
			url: togglUrl + parametersToQuery(parameters),
			headers: headers
		},
		function (error, response, body) {
			console.log('error:', error);
			console.log('statusCode:', response && response.statusCode);
			//console.log('body:', body);

			if (response && response.statusCode == 200) {
				togglProjects = JSON.parse(body).data
				getProducts();
			}
		});
}

var getProducts = function(projects) {
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
				debitoorProducts = JSON.parse(body)
				createInvoices();	
			}
		});
}

var createInvoices = function(projects) {

	console.log(projects);
	//TODO: Get invoice companyNumber

	for (var i = 0; i < togglProjects.length; i++) {

		var togglProject = togglProjects[i];
		var indexOf = togglProject.title.project.indexOf(" - ");
		if (indexOf > 0){
			var togglSku = togglProject.title.project.substr(0, indexOf);
			
			for (var j = 0; j < debitoorProducts.length; j++){

				var debitoorProduct = debitoorProducts[j];
				var debitoorSku = debitoorProduct.sku
				if (debitoorSku == togglSku) {
					console.log(togglProject.time);

					console.log(debitoorProduct);
					createInvoice(togglProject, debitoorProduct);
				}
			}
		}
	}

	return;
}

var createInvoice = function(togglProject, debitoorProduct) {

	var invoice =
	{
	    companyProfile:{
	        taxEnabled: taxEnabled,
	        cashAccounting:false,
		    companyNumber: companyNumber
	    },
	    //Link to invoice, credit note or quote
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    links:[
	        //Link to credit note or invoice
	        //Required
	        {
	            //Id of document
	            //Required
	            linkId:"503714a74400b29809000004",
	            //Type of document
	            //Required
	            type:"value",
	            //Number of credit note or invoice
	            //Optional, can be null
	            number:"INV-0001",
	            //Link creation date
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            createdDate:"2014-08-14T08:16:29.294Z",
	            //Date of link
	            //Optional, can be null
	            date:"2014-08-14T08:16:29.294Z",
	            //Credit note total amount
	            //Optional, can be null
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            amount:0,
	            //Defines invoice/credit note currency
	            //Optional, can be null
	            currency:"EUR",
	            //The unpaid amount on this credit note or invoice, has been changed by the amount
	            //specified here.
	            //Optional, can be null
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            unpaidAmountChange:0
	        }
	        //, ...
	        //Any additional items in this array go here.
	    ],
	    //Id of credit note or invoice, that was created to delete this invoice or credit
	    //note
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    deletedByInvoiceId:"503714a74400b29809000004",
	    //The number of the invoice. Cannot be changed after booking
	    //Required
	    number:"INV-0001",
	    //Type of invoice/creditNote
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    type:"invoice",
	    //Notes for the invoice
	    //Optional, can be null
	    notes:"My note",
	    //Additional invoice notes
	    //Optional, can be null
	    additionalNotes:"Some notes",
	    //Date of invoice
	    //Optional, can be null
	    //Format: date. Must be a date in the format YYYY-MM-DD
	    date:"2016-08-19",
	    //Date invoice is due for payment
	    //Optional, can be null
	    //Format: date. Must be a date in the format YYYY-MM-DD
	    dueDate:"2016-08-19",
	    //Id of actual payment terms for this invoice. Must be valid payment terms id
	    //Required
	    paymentTermsId:1,
	    //Optional
	    payments:[
	        //Payment
	        //Required
	        {
	            //id
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            id:"3844ae52-f299-45e1-927e-c983addb033a",
	            //Matched expense id. Required in case of matching to expense
	            //Optional, can be null
	            expenseId:"503714a74400b29809000004",
	            //Matched invoice id. Required in case of matching to invoice
	            //Optional, can be null
	            invoiceId:"503714a74400b29809000004",
	            //Matched credit note id. Required in case of matching to credit note
	            //Optional, can be null
	            creditNoteId:"503714a74400b29809000004",
	            //Matched income id. Required in case of matching to income
	            //Optional, can be null
	            incomeId:"503714a74400b29809000004",
	            //Matched bank/cash transaction id. Required in case of matching to existing
	            //bank/cash transaction
	            //Optional, can be null
	            paymentTransactionId:"beac69a49bea144d4fb37ba6f5",
	            //Id of account, on which payment is done
	            //Required
	            paymentAccountId:"323c69a49bea144d4fb37ba6f5",
	            //When transferring between accounts, id of account matched to this payment
	            //Optional, can be null
	            matchedPaymentAccountId:"323c69a49bea144d4fb37ba6f5",
	            //When transferring between accounts, id of bank/cash transaction matched to this
	            //payment
	            //Optional, can be null
	            matchedPaymentTransactionId:"beac69a49bea144d4fb37ba6f5",
	            //Account integration type
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            integrationType:"online",
	            //Account money origination
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            paymentType:"bank",
	            //Date and time when payment was created
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: date-time. Must be a date and time in the format YYYY-MM-DDThh:mm:ssZ
	            createdDate:"YYYY-MM-DDThh:mm:ssZ",
	            //Amount of payment
	            //Required
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            amount:-13.34,
	            //Invoice number
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            invoiceNumber:"INV-10001",
	            //Credit note number
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            creditNoteNumber:"CN/1000",
	            //List of Expense/Income category ids
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            categoryIds:[
	                //Expense/Income category id
	                //Optional
	                "office.software"
	                //, ...
	                //Any additional items in this array go here.
	            ],
	            //Date of payment. Required in case of matching with transaction of manual
	            //cash/bank account
	            //Optional, can be null
	            //Format: date. Must be a date in the format YYYY-MM-DD
	            paymentDate:"2016-08-19",
	            //Text of payment
	            //Optional, can be null
	            text:"My horse is amazing",
	            //Defines payment currency
	            //Required
	            currency:"EUR",
	            //Customer name
	            //Optional, can be null
	            customerName:"Victoria",
	            //Supplier name
	            //Optional, can be null
	            supplierName:"ACME Inc.",
	            //Transaction description, may contain customer or supplier name, bank info
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            description:"SupplierName, text of transactions"
	        }
	        //, ...
	        //Any additional items in this array go here.
	    ],
	    //Days for custom payment terms, required for custom payment terms
	    //Optional, can be null
	    customPaymentTermsDays:1,
	    //Id of the customer for this invoice. Must be a valid customer id
	    //Optional, can be null
	    customerId:"503714a74400b29809000004",
	    //Optional, can be null
	    //Format: email
	    customerEmail:"vika@debitoor.com",
	    //Name of customer
	    //Optional, can be null
	    customerName:"value",
	    //Customer number
	    //Optional, can be null
	    customerNumber:1,
	    //Full address of customer on invoice, excluding country
	    //Optional, can be null
	    customerAddress:"My street, 42\n2665 Vallensbaek Strand",
	    //country code for customer
	    //Required, can be null
	    customerCountry:"DK",
	    //Name of country for customer on invoice
	    //Optional, can be null
	    customerCountryName:"Denmark",
	    //VAT/Company number of customer on invoice, if an invoice has both this is the
	    //Company number
	    //Optional, can be null
	    customerCiNumber:"10067855",
	    //The VAT number of customer on invoice
	    //Optional, can be null
	    customerVatNumber:"10067855",
	    //If set to gross, the price on lines will be displayed as the gross price on the
	    //debitoor website, and in PDFs generated. The price saved in lines.unitNetPrice
	    //should always be net
	    //Optional, can be null
	    priceDisplayType:"gross",
	    //Has the invoice been sent by email
	    //Optional, can be null
	    sent:false,
	    //Addition information about sending the invoice
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    sendDetails:[
	        //Information about one sent/view pair
	        //Optional
	        {
	            //id of action
	            //Required
	            id:"53edc82664095335abec1355",
	            //timestamp when invoice was sent
	            //Required
	            time:"2014-08-14T08:16:29.294Z",
	            //recipient email
	            //Required
	            to:"victoria@gmail.com",
	            //times when invoice was viewed
	            //Required
	            viewed:[
	                //timestamp
	                //Optional
	                "2014-08-14T08:16:29.294Z"
	                //, ...
	                //Any additional items in this array go here.
	            ]
	        }
	        //, ...
	        //Any additional items in this array go here.
	    ],
	    //Hash of action's times taken on invoice
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    history:{
	        //Timestamp of when quote was accepted
	        //Optional, can be null
	        booked:"2014-08-28T11:45:16.973Z"
	    },
	    //Defines if invoice is paid or not
	    //Optional, can be null
	    paid:false,
	    //Defines if invoice has been viewed on the portal or not
	    //Optional, can be null
	    viewed:false,
	    //Has the invoice been archived
	    //Optional, can be null
	    archived:false,
	    //Has the invoice been compensated with credit note
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    compensated:false,
	    //Invoice archived date
	    //Optional, can be null
	    archivedDate:"value",
	    //Has the invoice been booked
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    booked:false,
	    //Has the invoice been deleted
	    //Optional, can be null
	    deleted:true,
	    //Original invoice Id for creditNotes. Must be a valid invoice id
	    //Optional, can be null
	    creditedInvoiceId:"503714a74400b29809000004",
	    //Invoiced quote id for invoices
	    //Optional, can be null
	    invoicedQuoteId:"503714a74400b29809000004",
	    //Invoiced delivery note id for invoices
	    //Optional, can be null
	    invoicedDeliveryNoteId:"503714a74400b29809000004",
	    //Array of lines on the document
	    //Required
	    lines:[
	        //Document line
	        //Required
	        {
	            //Description for line
	            //Optional, can be null
	            description:"value",
	            //Quantity
	            //Required
	            quantity:200,
	            //Unit net price for item on line. NOTE: Either the unitNetPrice or unitGrossPrice
	            //must be filled out
	            //Optional, can be null
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            unitNetPrice:200,
	            //Unit gross price for item on line. NOTE: Either the unitNetPrice or
	            //unitGrossPrice must be filled out
	            //Optional, can be null
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            unitGrossPrice:200,
	            //Id of units for line. Must be a valid unit id
	            //Optional, can be null
	            unitId:1,
	            //Name of units for line.
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            unitName:"Hour",
	            //Line discount rate, %
	            //Optional, can be null
	            //Format: rate. Must be a number with a maximum of two decimals after the decimal point. Must be between 0 and 100
	            lineDiscountRate:5,
	            //Id of the product on line. Must be a valid product id
	            //Optional, can be null
	            productId:"503714a74400b29809000004",
	            //Product SKU of selected product
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            productSku:"DYN-01",
	            //Name of product on line
	            //Required
	            productName:"value",
	            //This line uses taxes
	            //Required
	            taxEnabled:true,
	            //Tax rate in percent
	            //Required
	            //Format: rate. Must be a number with a maximum of two decimals after the decimal point. Must be between 0 and 100
	            taxRate:0,
	            //Is this a product or service. Required for intra EU sales and sales where the
	            //seller is from the EU
	            //Optional, can be null
	            productOrService:"product",
	            //Income tax deduction, used in ES, IC, IT, CO and GB
	            //Optional, can be null
	            //Format: rate. Must be a number with a maximum of two decimals after the decimal point. Must be between 0 and 100
	            incomeTaxDeductionRate:21,
	            //The net amount before discount(if any) for this line. This will be re-calculated
	            //when posted to the server
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            netAmountBeforeDiscount:200,
	            //The gross amount before discount(if any) for this line. This will be
	            //re-calculated when posted to the server
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            grossAmountBeforeDiscount:200,
	            //The net amount after discount(if any) for this line. This will be re-calculated
	            //when posted to the server
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            netAmount:200,
	            //The gross amount after discount(if any) for this line. This will be
	            //re-calculated when posted to the server
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            grossAmount:200,
	            //Tax amount for this line. This will be re-calculated when posted to the server
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            taxAmount:0,
	            //Recargo Tax rate in percent (ES only)
	            //Optional, can be null
	            //Format: rate. Must be a number with a maximum of two decimals after the decimal point. Must be between 0 and 100
	            recargoTaxRate:0,
	            //Recargo Tax amount (ES only) for this line. This will be re-calculated when
	            //posted to the server
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            recargoTaxAmount:0,
	            //Part of net amount that is contributed to pension fund (IT only) for this line.
	            //This will be re-calculated when posted to the server
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            pensionFundAmount:0,
	            //Unit net price for item on line in base currency. Will be calculated only for
	            //documents in foreign currency.
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            baseCurrencyUnitNetPrice:200,
	            //Unit gross price for item on line in base currency. Will be calculated only for
	            //documents in foreign currency.
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            baseCurrencyUnitGrossPrice:200,
	            //The net amount after discount (if any) for this line in base currency. Will be
	            //calculated only for documents in foreign currency.
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            baseCurrencyNetAmount:200,
	            //The gross amount after discount (if any) for this line in base currency. Will be
	            //calculated only for documents in foreign currency.
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            baseCurrencyGrossAmount:200,
	            //Tax amount for this line in base currency. Will be calculated only for documents
	            //in foreign currency.
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            baseCurrencyTaxAmount:0,
	            //Recargo Tax amount (ES only) for this line in base currency. Will be calculated
	            //only for documents in foreign currency.
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            baseCurrencyRecargoTaxAmount:0,
	            //Part of net amount that is contributed to pension fund (IT only) for this line
	            //in base currency. Will be calculated only for documents in foreign currency.
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            baseCurrencyPensionFundAmount:0
	        }
	        //, ...
	        //Any additional items in this array go here.
	    ],
	    //Invoice discount rate, %
	    //Optional, can be null
	    //Format: rate. Must be a number with a maximum of two decimals after the decimal point. Must be between 0 and 100
	    discountRate:43,
	    //Total net amount before discount(if any) for invoice.
	    //Optional
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    totalNetAmountBeforeDiscount:0,
	    //Total net of line discount amounts for invoice.
	    //Optional
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    totalNetLineDiscountAmount:0,
	    //Total net discount amount for invoice.
	    //Optional
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    totalNetDiscountAmount:0,
	    //Total net amount for invoice.
	    //Optional
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    totalNetAmount:0,
	    //Total tax amount for invoice. This will be re-calculated when posted to the
	    //server
	    //Optional
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    totalTaxAmount:0,
	    //Total recargo tax amount (ES only) for invoice. This will be re-calculated when
	    //posted to the server
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    totalRecargoTaxAmount:0,
	    //Part of total net amount that is contributed to pension fund (IT only) for this
	    //invoice. This will be re-calculated when posted to the server
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    totalPensionFundAmount:0,
	    //Tax groups
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    taxGroups:[
	        //A tax group
	        //Optional, can be null
	        {
	            //The tax group name
	            //Optional, can be null
	            name:"noTax",
	            //The tax rate for this group
	            //Required
	            //Format: rate. Must be a number with a maximum of two decimals after the decimal point. Must be between 0 and 100
	            taxRate:0,
	            //The net amount for this group
	            //Required
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            netAmount:0,
	            //The tax amount for this group
	            //Required
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            taxAmount:0,
	            //The net amount for this group in base currency. Will be calculated only for
	            //documents in foreign currency.
	            //Optional, can be null
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            baseCurrencyNetAmount:0,
	            //The net deduction amount for this group in base currency. Will be calculated
	            //only for documents in foreign currency.
	            //Optional, can be null
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            baseCurrencyTaxAmount:0
	        }
	        //, ...
	        //Any additional items in this array go here.
	    ],
	    //ES,IC,IT,CO: total Deduction amount for invoice. This will be re-calculated when
	    //posted to the server
	    //Optional, can be null
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    totalNetDeductionAmount:0,
	    //Net deduction groups
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    incomeTaxDeductionGroups:[
	        //A net deduction group
	        //Optional, can be null
	        {
	            //The tax group name
	            //Optional, can be null
	            name:"noTax",
	            //The net deduction rate for this group (negative or zero)
	            //Required
	            //Format: rate-negative. Must be a number with a maximum of two decimals after the decimal point. Must be between -100 and 0
	            taxRate:0,
	            //The net amount for this group
	            //Required
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            netAmount:0,
	            //The net deduction amount for this group
	            //Required
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            taxAmount:0,
	            //The net amount for this group in base currency. Will be calculated only for
	            //documents in foreign currency.
	            //Optional, can be null
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            baseCurrencyNetAmount:0,
	            //The net deduction amount for this group in base currency. Will be calculated
	            //only for documents in foreign currency.
	            //Optional, can be null
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            baseCurrencyTaxAmount:0
	        }
	        //, ...
	        //Any additional items in this array go here.
	    ],
	    //Unpaid amount for invoice. This will be re-calculated when posted to the server
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    unpaidAmount:0,
	    //Total amount for invoice.
	    //Optional
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    totalGrossAmount:0,
	    //Invoice text language
	    //Optional, can be null
	    languageCode:"de-DE",
	    //Defines invoice currency. Will be set to the currency of your account if not
	    //specified. If specified - currencyRate can be posted to calculate reports data.
	    //Optional, can be null
	    currency:"EUR",
	    //Can be specified if custom foreign currency was passed, otherwise currency rate
	    //for invoice date will be used, shows the relation CURRENCY/HOME_CURRENCY eg 1EUR
	    //= 7.44DKK. Important: all the invoices are reported in home currencies only
	    //using currencyRate for conversion.
	    //Optional, can be null
	    //Format: currency-rate. Must be a number with a maximum of six decimals after the decimal point. Must be between 0.000001 and 999999999
	    currencyRate:7.44,
	    //Defines invoice currency. Always resolved to the account currency which is used
	    //for reports and handling payments.
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    baseCurrency:"EUR",
	    //Total net amount for invoice in base currency. Will be calculated only for
	    //invoices in foreign currency.
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    baseCurrencyTotalNetAmount:0,
	    //ES,IC,IT,CO: total Deduction amount for invoice in base currency. Will be
	    //calculated only for invoices in foreign currency.
	    //Optional, can be null
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    baseCurrencyTotalNetDeductionAmount:0,
	    //Total tax amount for invoice in base currency. Will be calculated only for
	    //invoices in foreign currency.
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    baseCurrencyTotalTaxAmount:0,
	    //Total recargo tax amount (ES only) for invoice in base currency. Will be
	    //calculated only for invoices in foreign currency.
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    baseCurrencyTotalRecargoTaxAmount:0,
	    //Part of total net amount that is contributed to pension fund (IT only) for this
	    //invoice in base currency. This will be re-calculated when posted to the server
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    baseCurrencyTotalPensionFundAmount:0,
	    //Total amount for invoice in base currency. Will be calculated only for invoices
	    //in foreign currency.
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    baseCurrencyTotalGrossAmount:0,
	    //Unpaid amount for invoice in base currency. Will be calculated only for invoices
	    //in foreign currency.
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	    baseCurrencyUnpaidAmount:0,
	    //Show invoice as paid on invoice portal to indicate an online payment happened.
	    //Optional, can be null
	    displayAsPaid:false,
	    //Is recargo tax enabled for this invoice (ES only)
	    //Optional, can be null
	    recargoTaxEnabled:true,
	    //Recargo tax groups (ES only)
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    recargoTaxGroups:[
	        //A recargo tax group (ES only)
	        //Optional, can be null
	        {
	            //The tax group name
	            //Optional, can be null
	            name:"noTax",
	            //The tax rate for this group
	            //Required
	            //Format: rate. Must be a number with a maximum of two decimals after the decimal point. Must be between 0 and 100
	            taxRate:0,
	            //The net amount for this group
	            //Required
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            netAmount:0,
	            //The tax amount for this group
	            //Required
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            taxAmount:0,
	            //The net amount for this group in base currency. Will be calculated only for
	            //documents in foreign currency.
	            //Optional, can be null
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            baseCurrencyNetAmount:0,
	            //The net deduction amount for this group in base currency. Will be calculated
	            //only for documents in foreign currency.
	            //Optional, can be null
	            //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
	            baseCurrencyTaxAmount:0
	        }
	        //, ...
	        //Any additional items in this array go here.
	    ],
	    //Applied pension fund calculation type (IT only): "A" - affects Income Tax
	    //Deductions, "B" - doesn't affect Income Tax Deductions
	    //Optional, can be null
	    pensionFundType:"value",
	    //Editable pension fund rate (IT only)
	    //Optional, can be null
	    //Format: rate. Must be a number with a maximum of two decimals after the decimal point. Must be between 0 and 100
	    pensionFundRate:4,
	    //Enables online payments of specified provider on invoice preview.
	    //Optional, can be null
	    onlinePaymentProvider:"paypal",
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    paymentReceipts:[
	        //Optional
	        {
	        }
	        //, ...
	        //Any additional items in this array go here.
	    ],
	    //Invoice title. This is only potentially set for IT (Italian) accounts, to either
	    //"fattura" or "parcella"
	    //Optional, can be null
	    invoiceTitle:"fattura",
	    //Attachments
	    //Optional, can be null
	    attachments:[
	        //Attached file
	        //Optional, can be null
	        {
	            //A file attachment. For expenses these properties will be set if you save the
	            //expense with an fileId
	            //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	            file:{
	                //id of the file attachment
	                //Optional
	                id:"503714a74400b29809000004",
	                //link to the file attachment
	                //Optional
	                url:"/api/v1.0/files/503714a74400b29809000004",
	                //Name of original file
	                //Optional
	                fileName:"myexpense.pdf",
	                //When was file last modified
	                //Optional
	                lastModified:"2013-04-29T08:55:42.000Z",
	                //MIME type of the file attachment
	                //Optional
	                type:"application/pdf",
	                //Size of the file attachment in bytes
	                //Optional
	                sizeBytes:50000,
	                //You can get the thumbnails for a pdf by GET-ting this url
	                //Optional, can be null
	                thumbnailsUrl:"/api/v1.0/files/503714a74400b29809000004/thumbnails"
	            },
	            //Id of the attached file. File id must be a string
	            //Required
	            fileId:"503714a74400b29809000004"
	        }
	        //, ...
	        //Any additional items in this array go here.
	    ],
	    //Recurring invoice document reference
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    recurringId:"765714a74400b29809000001",
	    //Reason why invoice was compensated with credit note
	    //Optional, can be null
	    deleteReason:"Accidentally created",
	    //Timestamp of creation of this document
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    createdDate:"2018-07-04T21:07:45Z",
	    //Timestamp of last modification of this document
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    lastModifiedDate:"2018-07-04T21:07:45Z",
	    //Timestamp of deletion of this document. Deleted documents are only included on
	    //lists, if you specify the querystring ?includeDeleted=true in your GET
	    //Read only. You do not need this on POST, PUT and PATCH. You can leave it in from what you GET, it will simply be ignored.
	    deletedDate:"2018-07-04T21:07:45Z"
	}
}

var parametersToQuery = function(parameters) {
	var query = "?";
	for (var key in parameters) {
		if (parameters.hasOwnProperty(key)) {
			query = query + key + "=" + parameters[key] + "&";
		}
	}
	return query;
}

main();