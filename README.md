# Azure Gateway Batch Import
Demo days code for azure gateway discovery.

For addition deatails on this setup, please reach out to James DeLuca for Azure Gaateway configuration and Gabe Ortiz for Code logic.

## Functionality
Batch import all APIs listed in Azure API Gateway into the RapidAPI Enterprise Hub

## Installation
Run the following command
``` npm i ```

## Setup .env File

Add local .env file with the following variables
```
# Team ID for the Governance Team you have created in Rapid ENT tenent
OWNER_ID=
# REST URL of Platform API in ENT tenent
REST_URL=
# REST HOST of Platform API in ENT tenent
REST_HOST=
# REST API KEY for Platform API in ENT tenent
REST_KEY=
# URL of GQL Platform API in ENT tenent
GQL_URL=
# HOST of GQL Platform API in ENT tenent
GQL_HOST=
# Personal API Key used for GQL Platform API in ENT tenent
GQL_RAPID_IDENTITY_KEY=
# Team API Key used for GQL Platform API in ENT tenent
GQL_RAPID_KEY=
# Name of the Azure Gateway to export APIs from
AZURE_SERVICE_GATEWAY=
# Resource group used for Azure Gateway
AZURE_RESOURCE_GROUP=
# Subscription ID for Azure Gateway
AZURE_SUBSCRIPTION_ID=
# Access key for Azure Gateway
AZURE_SHARED_ACCESS_KEY=
```

## Notion Documentaiton Link
https://www.notion.so/rapidapi/Azure-Gateway-API-Discovery-02f33835a547403284dc28a5aa7b6328
