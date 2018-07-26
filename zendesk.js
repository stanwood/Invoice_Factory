var request = require('request');

var oldCategory = "200196403"; //200371228 200196403
var newCategory = "360000056559";//360000049900 360000056239
var language = "en-us";

var url = "https://hannes.kleist@stanwood.de:cu5DnO8a@stanwood.zendesk.com/api/v2/help_center/" + language + "/categories/" + oldCategory + "/sections.json";

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
			sections = JSON.parse(body).sections;

			console.log(sections);

			for (var i = 0; i < sections.length; i++) {

				//Create section
				var oldSection = sections[i];
				var body =
				{"section": {
					"locale": language,
					"name": oldSection.name,
					"description": oldSection.id //Using the description field to pass along the oldSection id for the subsequent call. This is all async.
				}
				};

				url = "https://developer@stanwood.de:A%3FpJEs3g@4millions.zendesk.com/api/v2/help_center/" + language + "/categories/" + newCategory + "/sections.json";
				console.log(url);
				request.post({
						url,
						form: body,
						headers: {'content-type' : 'Content-Type: application/json'},
					},
					function (error, response, body) {
						if (response && response.statusCode == 201) {

							var newSection = JSON.parse(body).section;
							console.log(newSection);

							//Get articles
							var url = "https://hannes.kleist@stanwood.de:cu5DnO8a@stanwood.zendesk.com/api/v2/help_center/" + language + "/sections/" + newSection.description + "/articles.json";
							console.log(url);
							request(
								{
									url: url
								},
								function (error, response, body) {
									console.log('error:', error);
									console.log('statusCode:', response && response.statusCode);
									//console.log('body:', body);

									if (response && response.statusCode == 200) {
										var articles = JSON.parse(body).articles;

										if (articles) {
											for (var i = 0; i < articles.length; i++) {

												//Create article
												var article = articles[i];
												var body =
												{
													"article": {
														"locale": language,
														"name": article.name,
														"title": article.title,
														"body": article.body
													}
												};

												url = "https://developer@stanwood.de:A%3FpJEs3g@4millions.zendesk.com/api/v2/help_center/" + language + "/sections/" + newSection.id + "/articles.json";
												console.log(url);
												request.post({
														url,
														form: body,
														headers: {'content-type': 'Content-Type: application/json'},
													},
													function (error, response, body) {
														if (response && response.statusCode == 201) {

															var article = JSON.parse(body).article;
															console.log(article);

														} else {
															console.log("request body: ", body);
															console.log('error:', error);
															console.log('statusCode:', response && response.statusCode);
															console.error('response body: ', body);
														}
													});
											}
										}
									} else {
										console.log("request body: ", body);
										console.log('error:', error);
										console.log('statusCode:', response && response.statusCode);
										console.error('response body: ', body);
									}
								});

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
	});