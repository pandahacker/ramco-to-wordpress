var rp = require('request-promise');
const fetch = require('node-fetch');
var schedule = require('node-schedule');
const prompt = require('prompt-sync')();
require('dotenv').config();
var fs = require('fs');

async function pullPricing() {

    var pullProduct = new Promise(function (resolve, reject){
        
        const productGuid = prompt('Product GUID: ');

        var options = {
            method: 'POST',
            uri: process.env.API_URL,
            formData: {
                Key: process.env.API_KEY,
                Operation: 'GetEntity',
                Entity: 'product',
                Guid: `${productGuid}`,
                Attributes: 'name, productid, price, producttypecode'
            }
    
        }
        rp(options).then(function (body) {
    
            var data = JSON.parse(body);
    
            data = data.Data
    
            // const modifiedData = data.map(function (data) {
    
            //     console.log(data);
    
            //     return data;
            // });
            
            resolve(data);
        }).catch(function (err) {
            reject(`Error: ${err}`);
        });

    });

    var data = await pullProduct;

    console.log(data.Price);

}

pullPricing();