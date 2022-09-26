require("dotenv").config();
const axios = require("axios")

var data = ""
var json = ""
var azureOASSpec = {}
const apiNames = []
const erroredAPINames = []
const allSpecs = {}
const apiSpecs = {}
const apiListings = {}

//RapiAPI Rest PAPI Settings
const rOwnerID = process.env.OWNER_ID //Team Number for the Governance Team you will create
const rUrl = process.env.REST_URL
const rHost = process.env.REST_HOST
const rKey = process.env.REST_KEY

//Rapid GraphQL PAPI Settings
const gHost = process.env.GQL_HOST
const gUrl = process.env.GQL_URL
const gRapidIndentityKey = process.env.GQL_RAPID_IDENTITY_KEY
const gRapidKey = process.env.GQL_RAPID_KEY

//Rapid API Listing via form data settings
var FILENAME = ``;
const FormData = require('form-data');

//Azure Settings
// const azureGatewayName = "myazureapigateway"
const azureServiceGatway = process.env.AZURE_SERVICE_GATEWAY
const azureGatewayName = azureServiceGatway.toLowerCase()
const azureServiceGatwayApi = azureServiceGatway+"/apis"
const azureBaseUrl = "https://" + azureGatewayName + ".management.azure-api.net"
const azureResourceGroup = process.env.AZURE_RESOURCE_GROUP
const azureProvider = process.env.AZURE_PROVIDER_NAME
const azureAPIversion = process.env.AZURE_API_VERSION

//Azure Subscription Details
const azureSubscription = process.env.AZURE_SUBSCRIPTION
const azureSharedAccessKey = process.env.AZURE_SHARED_ACCESS_KEY

//Azure Gateway API Endpoints
const azureAPISpecURL = `${azureBaseUrl}/subscriptions/${azureSubscription}/resourceGroups/${azureResourceGroup}/providers/${azureProvider}/service/${azureServiceGatway}/apis/`;
const azureAPIListingURL = `${azureBaseUrl}/subscriptions/${azureSubscription}/resourceGroups/${azureResourceGroup}/providers/Microsoft.ApiManagement/service/${azureServiceGatwayApi}`

//Created to await response from the RapidAPI PAPI
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

//Get API Listing, get count and process API names
//API Names is all that is needed to get the API Spec from the Azure gateway
async function getAPINamesFromAzureGW() {
    var data = {};
    await axios({
        "method": "GET",
        "url": azureAPIListingURL,
        "params": {
            "api-version": azureAPIversion
        },
        "headers": {
            "Authorization": azureSharedAccessKey,
            "Content-Type": "application/json; charset=utf-8"
        }
    }).then(resp => {
        data = resp.data;
        console.log(data);
    }).catch(err => {
        console.error(err)

    });

    var apiCount = data.count;
    console.log("\n\nFound ", apiCount, " listings")

    // console.log("\n\nProcessing API Listing: ")
    processAPIListing(data, apiCount)


}

//Process API names from apiPayload, remove and revision listing if present
//Using the API name will get the latest revision of the spec from the gateway.
function processAPIListing(apiPayload, count) {
    let i = 0;
    const regex = ".*;rev=[0-9]+";

    while (i < (count)) {
        console.log("\nProcessing: ", apiPayload.value[i].name)
        // let exclude = ['event-handler', 'my-store-api-demo', 'test', 'test-2', 'test-3']
        // let exclude = []
        // if (apiPayload.value[i].name.match(regex) || exclude.indexOf(apiPayload.value[i].name) !== -1){
        if (apiPayload.value[i].name.match(regex)) {
            console.log("API Revision Found in body for: ", apiPayload.value[i].name, ". Ignoring for now");
        } else {
            apiNames.push(apiPayload.value[i].name);
        }
        i++;
    }

}

//Get the spec from the gateway and return it for listing creation
async function getApiSpecFromGateway(apiName) {
    //This call does not support promises, running this in a different manner
    let azurePlatformApi = axios.create({
        baseURL: azureBaseUrl,
        headers: {
        },
    });

    //Get API Spec from gateway
    try {
        let response = await azurePlatformApi.get(
            `${azureAPISpecURL}${apiName}`,
            {
                params: {
                    format: "openapi+json",
                    export: "true",
                    'api-version': azureAPIversion
                },
                headers: {
                    Authorization: azureSharedAccessKey
                },
            }
        );

        //Get OAS file from response data
        json = JSON.stringify(response.data.properties.value);
        return json;

    } catch (e) {
        json = JSON.stringify(e.response.data);
        // console.log("error: ",json); 
        console.log(`Failed to get spec ${apiName}:\n${JSON.stringify(e.response.data)}`);

        return json;
    }
}

// Validate Spec requirements
//      - Descrition is set
//          - Set description if blank
//      - Set category
//      - Set thumbnail for demo puposes
// Attempt to create a listing on the hub
// In case of a 422 error, create API project with Azure API name
async function createHubListing(OAS, aName) {
    console.log("Spec for: ", aName, " received")

    let formData = new FormData();
    formData.append('ownerId', rOwnerID);
    console.log("Prepping OAS to create Hub Listing")

    //prep OAS payload with x-category
    let file = JSON.parse(OAS);

    // console.log(">>>", file.error'])

    if (file.error) {
        console.log(`Skipping this API:${aName}, error getting SPEC from gateway`)
    } else {
        //Check and validate if description if blank
        if (file.info['description'] == '') file.info['description'] = '***Description not defined at the Gateway:  API Listing review is required.';

        //Set default values for mandatory fields:  Category and Description
        if (!file.info['x-category']) file.info['x-category'] = 'Gateway Discovered';
        file.info['x-thumbnail'] = 'https://static.wikia.nocookie.net/pixar/images/d/de/Wall%E2%80%A2e_clipped_rev_1.png';
        // file.info['x-badges'] = '[{"name": "Review","value": "Pending"}]'

        file = JSON.stringify(file);

        //Set File Name by API
        FILENAME = aName + '.json';

        //Create the API Via PAPI
        formData.append('file', file, FILENAME);

        axios.post(rUrl, formData, {
            headers: {
                ...formData.getHeaders(),
                'x-rapidapi-host': rHost,
                'x-rapidapi-key': rKey
            }
        }).then(function (response) {
            console.log(response.data);
        }).catch(function (error) {
            console.error("Error: ", error.response.data.status);
            if (error.response.data.status == 422) {
                console.log("Unable to process: ", aName, ". Creating empty project.")
                apiPlaceholderProjectGQL(aName)
            }

        });
    }
}

// Create Empty Project
// Set description and api name
async function apiPlaceholderProjectGQL(aName) {

    const options = {
        method: 'POST',
        url: gUrl,
        headers: {
            'content-type': 'application/json',
            'x-rapidapi-identity-key': gRapidIndentityKey,
            'X-RapidAPI-Key': gRapidKey,
            'X-RapidAPI-Host': gHost
        },
        data: { "query": `mutation createApi($apiCreateInput: ApiCreateInput!) {\n  createApi(api: $apiCreateInput) {\n    id\n  }\n}`, "variables": { "apiCreateInput": { "name": `${aName}`, "title": `${aName}`, "category": "Other", "description": "***API was detected on Azure Gateway, unable to process spec file to list on your API Hub", "version": { "name": "1.0" } } } }
        // data: body
    };

    axios.request(options).then(function (response) {
        console.log(response.data);
    }).catch(function (error) {
        console.error(error);
    });

}

// Call get spec and create listing functions for all API listed on gatway
async function processMultipleAPIs(apiNames) {
    let i = 0;

    for (; apiNames[i];) {
        //Getting Spec
        azureOASSpec = await getApiSpecFromGateway(apiNames[i]);

        // Create Hub Listing
        await createHubListing(azureOASSpec, apiNames[i]);
        await sleep(5000);
        i++;
    }


    return apiSpecs;
}


async function walle() {
    try {

        //Get API Listing From Gateway and extract names
        await getAPINamesFromAzureGW();
        console.log("\n\n>>>Getting Specs for: ", apiNames);

        //Get Specs from gateway, prep and create listing
        processMultipleAPIs(apiNames);

    } catch (err) {
        console.log(err)
    }
}

walle()