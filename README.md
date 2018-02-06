# Invoice Factory

Calls toggl API and creates invoices on debitoor. 

## Requirements

node.js

	npm install base-64
	npm install request

1. Toggl project names with this format: `{project_key} - Project name`
2. Toggl client names with this format: `{client_key}`
3. Debitoor tasks with SKU `{project_key}`
4. Debitoor clients with notes `{project_key}`

## Command

	node app.js {toggl_key} {debitoor_key} {month}
	
	node app.js fsdf798sdfsd8fs7d9f8s7df 2018-01
	
Parameter   	| Type   | Comment
------------	| ------ | ----------------------------------
toggle_key  	| String | Required
debitoor_key | String | Required
month        | String | Format: `{year}-{month}`, Optional
