var request = require('request');

var newCategory = "360000049900";//360000049900 360000056239
var language = "de";

var url = "https://developer@stanwood.de:A%3FpJEs3g@4millions.zendesk.com/api/v2/help_center/" + language + "/categories/" + newCategory + "/sections.json";

//Get all sections
request(
	{
		url: url
	},
	function (error, response, body) {
		console.log('error:', error);
		console.log('statusCode:', response && response.statusCode);
		//console.log('body:', body);

		if (response && response.statusCode == 200) {

			var sections = JSON.parse(body).sections;

			if (sections) {
				for (var i = 0; i < sections.length; i++) {

					var section = sections[i];

					url = "https://developer@stanwood.de:A%3FpJEs3g@4millions.zendesk.com/api/v2/help_center/" + language + "/sections/" + section.id + ".json";
					console.log(url);
					request.delete({
							url
						},
						function (error, response, body) {
							if (response && response.statusCode == 204) {

								console.log("Deleted");

							} else {
								console.log("request body: ", body);
								console.log('error:', error);
								console.log('statusCode:', response && response.statusCode);
								console.error('response body: ', body);
							}
						});
				}

			} else {
				console.log("request body: ", body);
				console.log('error:', error);
				console.log('statusCode:', response && response.statusCode);
				console.error('response body: ', body);
			}
		}
	});
