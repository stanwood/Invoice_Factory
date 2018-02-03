# Invoice Factory

Calls toggl API and creates invoices on debitoor. 

## Requirements

1. Toggl project names with this format: `{project_key} - Project name`
2. Toggl client names with this format: `{client_key}`
3. Debitoor tasks with SKU `{project_key}`
4. Debitoor clients with notes `{project_key}`

## Command

	node app.js {api_key} {month} {project_key}
	
	node app.js fsdf798sdfsd8fs7d9f8s7df 2018-01 LEN
	
Parameter   | Type   | Comment
----------- | ------ | ----------------------------------
api_key     | String | Required
month       | String | Format: `{year}-{month}`, Optional
project_key | String | Optional
