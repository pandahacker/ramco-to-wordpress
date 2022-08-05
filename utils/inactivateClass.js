var rp = require('request-promise');
var _ = require('lodash');
const prompt = require('prompt-sync')();
const fetch = require('node-fetch');
var moment = require('moment');
var moment = require('moment-timezone');
require('custom-env').env();
var fs = require('fs');


const classGuid = prompt('Class GUID: ');

modifyExistingClass(classGuid);

function modifyExistingClass(slug) {

    fetch(`${process.env.WORDPRESS_URL}/by-slug/${slug}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic ' + Buffer.from(process.env.WORDPRESS_CREDS).toString('base64')
        }
    }).then(res => res.json()) // expecting a json response
        .then(body => console.log(body));
    console.log(`Class deleted: ${slug}`);
}