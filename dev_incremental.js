var rp = require('request-promise');
const fetch = require('node-fetch');
var moment = require('moment');
var moment = require('moment-timezone');
var schedule = require('node-schedule');
require('dotenv').config();
var fs = require('fs');

// var j = schedule.scheduleJob('30 * * * *', function () {
//     pushClasses();
// });

pushClasses();

async function pushClasses(){

    //dateStart = moment().subtract(1, 'hour').format("YYYY-MM-DD"+`T`+"HH"+`:00:00`);

    dateStart = moment().format("YYYY-MM-DD" + `T` + `00:00:00`);

    console.log(dateStart);

    var pullClasses = new Promise(function (resolve, reject) {
        var options = {
            method: 'POST',
            uri: process.env.API_URL,
            formData: {
                Key: process.env.API_KEY,
                Operation: 'GetEntities',
                Entity: 'cobalt_class',
                Filter: `modifiedon<ge>${dateStart}`,
                Attributes: 'cobalt_classbegindate,cobalt_classenddate,cobalt_classid,cobalt_locationid,cobalt_name,cobalt_description,cobalt_locationid,cobalt_cobalt_tag_cobalt_class/cobalt_name,cobalt_fullday,cobalt_publishtoportal,statuscode,cobalt_cobalt_classinstructor_cobalt_class/cobalt_name,cobalt_cobalt_class_cobalt_classregistrationfee/cobalt_productid'
            }

        }
        rp(options).then(function (body) {

            //console.log(body); 

            var data = JSON.parse(body);

            data = data.Data

            const modifiedData = data.map(function (data) {

                var start = moment.tz(data.cobalt_ClassBeginDate.Display, 'Etc/GMT');
                var end = moment.tz(data.cobalt_ClassEndDate.Display, 'Etc/GMT');

                data.cobalt_ClassBeginDate.Display = start.tz('America/New_York').format('YYYY-MM-DD HH:mm:SS');
                data.cobalt_ClassEndDate.Display = end.tz('America/New_York').format('YYYY-MM-DD HH:mm:SS');

                const orderId = data.cobalt_cobalt_class_cobalt_classregistrationfee.map(function (data) {

                    return data.cobalt_productid.Value;

                });

                var prices = fs.readFileSync('./pricelist.json', { encoding: 'utf8', flag: 'r' });

                prices = JSON.parse(prices);

                var cost = prices.filter(function (price) {

                    //console.log(orderId[0]);

                    if (price.ProductId === orderId[0]) {
                        //console.log(price.Price);
                        return price;
                    }

                });

                if (cost.length > 0) {
                    data.cobalt_price = cost[0].Price;
                } else {
                    data.cobalt_price = '0.0000';
                }

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

                fs.appendFile('apiData.json', `[${moment().format('h:mm:ss a')}] ${JSON.stringify(data)} \n`, (err) => {
                    if (err) throw err;
                })

                return data;
            });

            //console.log(modifiedData);

            resolve(modifiedData);

        })
            .catch(function (err) {
                reject(`Error: ${err}`);
            });
    });

    var data = await pullClasses;

    //console.log(data.length);
    var featuredClasses = [];
    var existingClasses = [];
    var newClasses = [];

    
    for (i = 0; i < data.length; i++) {

        var checkIfExists = new Promise(function (resolve, reject) {

            setTimeout(function () {
                fetch(`${process.env.WORDPRESS_URL}/by-slug/${data[i].cobalt_classId}`)
                    .then(res => res.json())
                    .then(function(json){
                        console.log(`checking class ${i + 1} of ${data.length}`);
                        resolve(json);
                    });
            }, 1000)

        });

        var response = await checkIfExists;

        //console.log(response);

        if (Number.isInteger(response.id)) {

            const responseTags = response.tags.map(function (data) {

                return data.name;

            });
            
            var allTags = data[i].cobalt_cobalt_tag_cobalt_class.concat(responseTags);

            console.log(response.url);

            //console.log(data[i].cobalt_cobalt_tag_cobalt_class);
            //console.log(responseTags);
            //console.log(allTags);

            var filteredTags = allTags.filter((a, b) => allTags.indexOf(a) === b);

            if (response.image.url === undefined){

                data[i].cobalt_cobalt_tag_cobalt_class = filteredTags;
                console.log(`No class image!`);
                existingClasses.push(data[i]);

            }else {

                data[i].cobalt_cobalt_tag_cobalt_class = filteredTags;
                data[i].featuredImage = response.image.url;
                console.log(response.image.url);
                featuredClasses.push(data[i]);

            }

        } else {
            newClasses.push(data[i]);
        }

    };

    console.log(`Found ${existingClasses.length} existing classes and discarding ${newClasses.length} new classes.`);

    
    // console.log(newClasses);
    modifyExistingClass(existingClasses);
    modifyFeaturedClass(featuredClasses);

    function modifyExistingClass(data) {
        for (var i = 0; i < data.length; i++) {
            // for each iteration console.log a word
            // and make a pause after it
            (function (i) {
                setTimeout(function () {
                    var ramcoClass = {
                        "title": data[i].cobalt_name,
                        "status": "publish",
                        "hide_from_listings": data[i].publish,
                        "description": data[i].cobalt_Description,
                        "all_day": data[i].all_day,
                        "start_date": data[i].cobalt_ClassBeginDate.Display,
                        "end_date": data[i].cobalt_ClassEndDate.Display,
                        "slug": data[i].cobalt_classId,
                        "categories": data[i].cobalt_cobalt_tag_cobalt_class,
                        "show_map_link": true,
                        "show_map": true,
                        "cost": data[i].cobalt_price,
                        "tags": data[i].cobalt_cobalt_tag_cobalt_class,
                        "venue": {
                            "id": data[i].locationId
                        }
                    };

                    fetch(`${process.env.WORDPRESS_URL}/by-slug/${data[i].cobalt_classId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: 'Basic ' + Buffer.from(process.env.WORDPRESS_CREDS).toString('base64')
                        },
                        body: JSON.stringify(ramcoClass)
                    }).then(res => res.json()) // expecting a json response
                        .then(body => console.log());
                    console.log(`Class ${i + 1} out of ${data.length} existing processed: ${data[i].cobalt_name}`);

                }, 3000 * i);
            })(i);
        };
    }

    function modifyFeaturedClass(data) {
        for (var i = 0; i < data.length; i++) {
            // for each iteration console.log a word
            // and make a pause after it
            (function (i) {
                setTimeout(function () {
                    var ramcoClass = {
                        "title": data[i].cobalt_name,
                        "status": "publish",
                        "hide_from_listings": data[i].publish,
                        "description": data[i].cobalt_Description,
                        "image": data[i].featuredImage,
                        "all_day": data[i].all_day,
                        "start_date": data[i].cobalt_ClassBeginDate.Display,
                        "end_date": data[i].cobalt_ClassEndDate.Display,
                        "slug": data[i].cobalt_classId,
                        "categories": data[i].cobalt_cobalt_tag_cobalt_class,
                        "show_map_link": true,
                        "show_map": true,
                        "cost": data[i].cobalt_price,
                        "tags": data[i].cobalt_cobalt_tag_cobalt_class,
                        "venue": {
                            "id": data[i].locationId
                        }
                    };

                    fetch(`${process.env.WORDPRESS_URL}/by-slug/${data[i].cobalt_classId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: 'Basic ' + Buffer.from(process.env.WORDPRESS_CREDS).toString('base64')
                        },
                        body: JSON.stringify(ramcoClass)
                    }).then(res => res.json()) // expecting a json response
                        .then(body => console.log());
                    console.log(`Class ${i + 1} out of ${data.length} existing featured processed: ${data[i].cobalt_name}`);

                }, 3000 * i);
            })(i);
        };
    }
}
