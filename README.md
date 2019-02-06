# Invoice Factory

Calls toggl API and creates invoices on debitoor. 

## Requirements

node.js

	npm install request
	npm install dateformat

1. Debitoor tasks with SKU `{project_key}`
2. Debitoor clients with notes `{project_key}`

## Command

	node app.js {debitoor_key} {project_key}
	
	node app.js fsdf798sdfsd8fs7d9f8s7df 2018-01
	
Parameter   	| Type    | Comment
--------------- | ------- | ----------------------------------
debitoor_key    | String  | Required
project_key    | String  | Optional
