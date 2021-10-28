var rp = require('request-promise');
const fetch = require('node-fetch');
var moment = require('moment');
var moment = require('moment-timezone');
var cron = require('node-cron');
require('custom-env').env();
var fs = require('fs');
var _ = require('lodash');

pushClasses();

async function pushClasses() {

    console.log(`[${moment().format('h:mm:ss a')}] RAMCO to WordPress Sync started.  \n`);
    fs.appendFile('logs/newClasses.log', `[${moment().format('h:mm:ss a')}]RAMCO to WordPress Sync started.\n`, (err) => {
        if (err) throw err;
    });

    dateStart = moment().subtract(1, 'hour').format("YYYY-MM-DD" + `T` + "HH" + `:00:00`);

    //console.log(dateStart);

    var pullClasses = new Promise(function (resolve, reject) {
        var options = {
            method: 'POST',
            uri: process.env.API_URL,
            formData: {
                Key: process.env.API_KEY,
                Operation: 'GetEntities',
                Entity: 'cobalt_class',
                Filter: `cobalt_classbegindate<ge>${dateStart} AND statuscode<eq>1`,
                Attributes: 'cobalt_classbegindate,cobalt_classenddate,cobalt_classid,cobalt_locationid,cobalt_name,cobalt_description,cobalt_locationid,cobalt_cobalt_tag_cobalt_class/cobalt_name,cobalt_fullday,cobalt_publishtoportal,statuscode,cobalt_cobalt_classinstructor_cobalt_class/cobalt_name,cobalt_cobalt_class_cobalt_classregistrationfee/cobalt_productid,cobalt_cobalt_class_cobalt_classregistrationfee/statuscode'
            }

        }
        rp(options).then(function (body) {

            //console.log(body); 

            var data = JSON.parse(body);

            //console.log(data.ResponseCode); 

            if (data.ResponseCode === 404) {
                data = [];
            } else {
                data = data.Data
            }

            //console.log(data.length);

            var modifiedData;

            if (data.length > 0) {

                modifiedData = data.map(function (data) {

                    var start = moment.tz(data.cobalt_ClassBeginDate.Display, 'Etc/GMT');
                    var end = moment.tz(data.cobalt_ClassEndDate.Display, 'Etc/GMT');

                    data.cobalt_ClassBeginDate.Display = start.tz('America/New_York').format('YYYY-MM-DD HH:mm:SS');
                    data.cobalt_ClassEndDate.Display = end.tz('America/New_York').format('YYYY-MM-DD HH:mm:SS');

                    var orderId = data.cobalt_cobalt_class_cobalt_classregistrationfee.map(function (data) {

                        var orderObject = {
                            "id": data.cobalt_productid.Value,
                            "status": data.statuscode.Value
                        }

                        return orderObject;

                    });

                    //console.log(data);

                    var prices = fs.readFileSync('./pricelist.json', { encoding: 'utf8', flag: 'r' });

                    prices = JSON.parse(prices);

                    orderId = _.filter(orderId, (o) => o.id !== '8d6bb524-f1d8-41ad-8c21-ae89d35d4dc3');

                    orderId = _.filter(orderId, (o) => o.id !== 'c3102913-ffd4-49d6-9bf6-5f0575b0b635');

                    orderId = _.filter(orderId, (o) => o.status === 1);

                    // console.log(orderId);
                    // console.log(orderId.length);

                    if (orderId.length > 0) {

                        var cost = prices.filter(function (price) {

                            //console.log(orderId[0]);

                            if (price.ProductId === orderId[0].id) {
                                //console.log(price.Price);
                                return price;
                            }

                        });

                        // console.log(data.cobalt_classId);
                        // console.log(cost);

                        data.cobalt_price = cost[0].Price;

                    } else {
                        data.cobalt_price = '0.0000';
                    }

                    // console.log(data.cobalt_price);

                    // console.log(`-------`);

                    data.cobalt_price = data.cobalt_price.slice(0, -2);

                    const tags = data.cobalt_cobalt_tag_cobalt_class.map(function (data) {

                        var tags = {
                            name: data.cobalt_name
                        }

                        return data.cobalt_name;
                    });

                    data.statuscode = data.statuscode.Display;

                    if (data.statuscode === 'Inactive' || data.cobalt_PublishtoPortal === 'false') {

                        data.publish = true;
                    } else if (data.statuscode === 'Active' && data.cobalt_PublishtoPortal === 'true') {

                        data.publish = false;

                    } else {

                        data.publish = true;

                    }

                    if (data.cobalt_fullday === 'true') {

                        data.all_day = true;

                    } else {

                        data.all_day = false;

                    }


                    switch (data.cobalt_LocationId.Display) {
                        case "MIAMI HQ":
                            data.cobalt_name = `<span style="color:#798e2d;">${data.cobalt_name}</span>`;
                            data.locationId = 4694;
                            break;

                        case "West Broward - Sawgrass Office":
                            data.cobalt_name = `<span style="color:#0082c9;">${data.cobalt_name}</span>`;
                            data.locationId = 4698;
                            break;

                        case "Coral Gables Office":
                            data.cobalt_name = `<span style="color:#633e81;">${data.cobalt_name}</span>`;
                            data.locationId = 4696;
                            break;

                        case "JTHS - MIAMI Training Room (Jupiter)":
                            data.cobalt_name = `<span style="color:#005962;">${data.cobalt_name}</span>`;
                            data.locationId = 4718;
                            break;

                        case "Northwestern Dade":
                            data.cobalt_name = `<span style="color:#9e182f;">${data.cobalt_name}</span>`;
                            data.locationId = 4735;
                            break;

                        case "Northwestern Dade Office":
                            data.cobalt_name = `<span style="color:#9e182f;">${data.cobalt_name}</span>`;
                            data.locationId = 4735;
                            break;

                        case "NE Broward Office-Ft. Lauderdale":
                            data.cobalt_name = `<span style="color:#f26722;">${data.cobalt_name}</span>`;
                            data.locationId = 4702;
                            break;

                        case "Aventura Office":
                            data.cobalt_name = `<span style="color:#000000;">${data.cobalt_name}</span>`;
                            data.locationId = 22099;
                            break;

                        default:
                            data.cobalt_name = data.cobalt_name;
                    }

                    //console.log(data.cobalt_LocationId.Display);
                    //console.log(data.cobalt_LocationId.Value);

                    if (data.cobalt_cobalt_classinstructor_cobalt_class.length > 0) {

                        //console.log(data.cobalt_cobalt_classinstructor_cobalt_class);

                        const classInstructor = data.cobalt_cobalt_classinstructor_cobalt_class.map(function (data) {

                            return data.cobalt_name;

                        });

                        //console.log(classInstructor[0]);

                        data.cobalt_Description = `<p style="font-weight:bold;color: black;">Instructor: ${classInstructor[0]}</p><br><br>${data.cobalt_Description}<br><input style="background-color: #4CAF50;border: none;color: white;padding: 15px 32px;text-align: center;text-decoration: none;display: inline-block;font-size: 16px;" type="button" value="Register Now" onclick="window.location.href='https://miamiportal.ramcoams.net/Authentication/DefaultSingleSignon.aspx?ReturnUrl=%2FEducation%2FRegistration%2FDetails.aspx%3Fcid%3D${data.cobalt_classId}'" />`

                        //console.log(data.cobalt_Description);

                    } else {

                        data.cobalt_Description = `${data.cobalt_Description}<br><input style="background-color: #4CAF50;border: none;color: white;padding: 15px 32px;text-align: center;text-decoration: none;display: inline-block;font-size: 16px;" type="button" value="Register Now" onclick="window.location.href='https://miamiportal.ramcoams.net/Authentication/DefaultSingleSignon.aspx?ReturnUrl=%2FEducation%2FRegistration%2FDetails.aspx%3Fcid%3D${data.cobalt_classId}'" />`

                        //console.log(data.cobalt_Description);

                    }

                    data.cobalt_name = data.cobalt_name;

                    data.cobalt_cobalt_tag_cobalt_class = tags;

                    console.debug(data);

                    return data;
                });


            } else {

                modifiedData = [];

            }

            resolve(modifiedData);

        })
            .catch(function (err) {
                reject(`Error: ${err}`);
            });
    });

}
