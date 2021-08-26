var rp = require('request-promise');
const fetch = require('node-fetch');
var moment = require('moment');
var moment = require('moment-timezone');
require('dotenv').config();
var fs = require('fs');
var _ = require('lodash');
const prompt = require('prompt-sync')();

cron.schedule('45 * * * *', () => {
    pushClasses();
});

//pushClasses();

async function pushClasses() {

    const classGuid = prompt('Meeting GUID: ');

    console.log(classGuid);

    var pullClasses = new Promise(function (resolve, reject) {
        var options = {
            method: 'POST',
            uri: process.env.API_URL,
            formData: {
                Key: process.env.API_KEY,
                Operation: 'GetEntity',
                Entity: 'cobalt_meeting',
                Guid: classGuid,
                Attributes: 'cobalt_begindate,cobalt_enddate,cobalt_meetingid,cobalt_location,cobalt_name,cobalt_description,cobalt_cobalt_tag_cobalt_meeting/cobalt_name,cobalt_fullday,cobalt_publishtoportal,statuscode,cobalt_meeting_cobalt_meetingregistrationfees/cobalt_productid,cobalt_outsideprovider,cobalt_meeting_cobalt_meetingregistrationfees/statuscode, cobalt_meeting_cobalt_meetingregistrationfees/cobalt_publishtoportal, cobalt_meeting_cobalt_meetingregistrationfees/cobalt_begindate, cobalt_meeting_cobalt_meetingregistrationfees/cobalt_enddate, createdon, modifiedon'
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

            var modifiedData;

            sendSlackMessage(`[${moment().format('MM-DD-YYYY h:mm:ss a')}] Found ${data.length} classes. Prepping data for WordPress submit  \n`);
            console.log(`[${moment().format('MM-DD-YYYY h:mm:ss a')}] Found ${data.length} classes. Prepping data for WordPress submit  \n`);
            fs.appendFile('newClasses.log', `[${moment().format('MM-DD-YYYY h:mm:ss a')}] Found ${data.length} classes. Prepping data for WordPress submit  \n`, (err) => {
                if (err) throw err;
            });

            if(data.length > 0){
                modifiedData = data.map(function(data){
                    console.log(`[${moment().format('MM-DD-YYYY h:mm:ss a')}] Formatting ${data.cobalt_name}  \n`);

                    var start = moment.tz(data.cobalt_BeginDate.Display, 'Etc/GMT');
                    var end = moment.tz(data.cobalt_EndDate.Display, 'Etc/GMT');

                    data.cobalt_BeginDate.Display = start.tz('America/New_York').format('YYYY-MM-DD HH:mm:SS');
                    data.cobalt_EndDate.Display = end.tz('America/New_York').format('YYYY-MM-DD HH:mm:SS');

                    var orderId = data.cobalt_Meeting_Cobalt_MeetingRegistrationFees.map(function (data) {

                        var orderObject = {
                            "id": data.cobalt_productid.Value,
                            "status": data.statuscode.Value,
                            "cobalt_BeginDate": data.cobalt_BeginDate.Value,
                            "cobalt_EndDate": data.cobalt_EndDate.Value,
                            "cobalt_PublishtoPortal": data.cobalt_PublishtoPortal
                        }

                        return orderObject;

                    });

                    //console.log(orderId);

                    orderId = _.filter(orderId, (o) => o.status === 1);

                    orderId = _.filter(orderId, (o) => o.cobalt_PublishtoPortal === 'true');

                    orderId = _.filter(orderId, (o) => o.cobalt_BeginDate < moment().unix());

                    //console.log(orderId);

                    var prices = fs.readFileSync('./pricelist.json', { encoding: 'utf8', flag: 'r' });

                    orderId = _.filter(orderId, (o) => o.id !== '8d6bb524-f1d8-41ad-8c21-ae89d35d4dc3');

                    orderId = _.filter(orderId, (o) => o.id !== 'c3102913-ffd4-49d6-9bf6-5f0575b0b635');

                    orderId = _.filter(orderId, (o) => o.id !== 'd4af83d1-8a47-e611-84a6-00155d24b70c');

                    prices = JSON.parse(prices);

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

                        // console.log(data.cobalt_meetingId);
                        // console.log(cost);

                        data.cobalt_price = cost[0].Price;

                    } else {
                        data.cobalt_price = '0.0000';
                    }

                    // console.log(data.cobalt_price);

                    // console.log(`-------`);

                    data.cobalt_price = data.cobalt_price.slice(0, -2);

                    const tags = data.cobalt_cobalt_tag_cobalt_meeting.map(function (data) {

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


                    data.cobalt_Description = `${data.cobalt_Description}<br><input style="background-color: #4CAF50;border: none;color: white;padding: 15px 32px;text-align: center;text-decoration: none;display: inline-block;font-size: 16px;" type="button" value="Register Now" onclick="window.location.href='https://miamiportal.ramcoams.net/Authentication/DefaultSingleSignon.aspx?ReturnUrl=%2FMeetings%2FRegistration%2FMeetingDetails.aspx%3Fmid%3D${data.cobalt_meetingId}'" />`

                    data.cobalt_name = data.cobalt_name;

                    data.cobalt_cobalt_tag_cobalt_meeting = tags;

                    //console.debug(`[${moment().format('MM-DD-YYYY h:mm:ss a')}] ${JSON.stringify(data)} \n`);

                    //sendSlackMessage(`[${moment().format('MM-DD-YYYY h:mm:ss a')}] Formatted ${modifiedData.length} classes. Checking if classes exist in WordPress  \n`);
                    return data;
                })
            }else{
                modifiedData = [];
            }

            resolve(modifiedData);

        })
            .catch(function (err) {
                reject(`Error: ${err}`);
            });
    });


    var data = await pullClasses;

    console.log(data);

    console.log(`[${moment().format('MM-DD-YYYY h:mm:ss a')}] Formatted ${data.length} classes. Checking if classes exist in WordPress  \n`);
    fs.appendFile('newClasses.log', `[${moment().format('MM-DD-YYYY h:mm:ss a')}] Formatted ${data.length} classes. Checking if classes exist in WordPress  \n`, (err) => {
        if (err) throw err;
    });

    var existingClasses = [];
    var featuredClasses = [];
    var newClasses = [];

    for (i = 0; i < data.length; i++) {
        var checkIfExists = new Promise(function (resolve, reject) {

            setTimeout(function () {
                fetch(`${process.env.WORDPRESS_URL}/by-slug/${data.cobalt_meetingId}`)
                    .then(res => res.json())
                    .then(function (json) {
                        resolve(json);
                    });
            }, 1000)

        });

        var response = await checkIfExists;

        console.log(response);

        if (Number.isInteger(response.id)) {

            const responseTags = response.tags.map(function (data) {

                return data.name;

            });

            var allTags = data.cobalt_cobalt_tag_cobalt_meeting.concat(responseTags);

            console.log(response.url);

            //console.log(data[0].cobalt_cobalt_tag_cobalt_class);
            //console.log(responseTags);
            //console.log(allTags);

            var filteredTags = allTags.filter((a, b) => allTags.indexOf(a) === b);

            if (response.image.url === undefined) {

                data.cobalt_cobalt_tag_cobalt_meeting = filteredTags;
                console.log(`No class image!`);
                existingClasses.push(data);

            } else {

                data.cobalt_cobalt_tag_cobalt_meeting = filteredTags;
                data.featuredImage = response.image.url;
                console.log(response.image.url);
                featuredClasses.push(data);

            }

        } else {
            newClasses.push(data);
        }
    };


    //console.log(existingClasses.length);
    //console.log(newClasses.length);

    fs.appendFile('newClasses.log', `[${moment().format('MM-DD-YYYY h:mm:ss a')}] ${newClasses.length} new classes and ${existingClasses.length} existing classes found  \n`, (err) => {
        if (err) throw err;
    });

    console.log(`[${moment().format('MM-DD-YYYY h:mm:ss a')}] ${newClasses.length} new classes, ${existingClasses.length} existing classes, and ${featuredClasses.length} featured classes found  \n`);

    //sendSlackMessage(`[${moment().format('MM-DD-YYYY h:mm:ss a')}] ${newClasses.length} new classes and ${existingClasses.length} existing classes found  \n`);

    if (existingClasses.length > 0) {
        modifyExistingClass(existingClasses);
    } else if (featuredClasses.length > 0) {
        modifyFeaturedClass(featuredClasses);
    }


    function modifyExistingClass(data) {
        var ramcoClass = {
            "title": data[0].cobalt_name,
            "status": "publish",
            "hide_from_listings": data[0].publish,
            "description": data[0].cobalt_Description,
            "all_day": data[0].all_day,
            "start_date": data[0].cobalt_BeginDate.Display,
            "end_date": data[0].cobalt_EndDate.Display,
            "slug": data[0].cobalt_meetingId,
            "categories": data[0].cobalt_cobalt_tag_cobalt_meeting,
            "show_map_link": true,
            "show_map": true,
            "cost": data[0].cobalt_price,
            "tags": data[0].cobalt_cobalt_tag_cobalt_meeting
            // "venue": {
            //     "id": data[i].cobalt_Location
            // }
        };

        fetch(`${process.env.WORDPRESS_URL}/by-slug/${data[0].cobalt_meetingId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Basic ' + Buffer.from(process.env.WORDPRESS_CREDS).toString('base64')
            },
            body: JSON.stringify(ramcoClass)
        }).then(res => res.json()) // expecting a json response
            .then(body => console.log(body));
        console.log(`Class processed: ${data[0].cobalt_meetingId}`);
    }

    function modifyFeaturedClass(data) {
        var ramcoClass = {
            "title": data[0].cobalt_name,
            "status": "publish",
            "hide_from_listings": data[0].publish,
            "description": data[0].cobalt_Description,
            "image": data[0].featuredImage,
            "all_day": data[0].all_day,
            "start_date": data[0].cobalt_BeginDate.Display,
            "end_date": data[0].cobalt_EndDate.Display,
            "slug": data[0].cobalt_meetingId,
            "categories": data[0].cobalt_cobalt_tag_cobalt_meeting,
            "show_map_link": true,
            "show_map": true,
            "cost": data[0].cobalt_price,
            "tags": data[0].cobalt_cobalt_tag_cobalt_meeting
            // "venue": {
            //     "id": data[i].cobalt_Location
            // }            
        };

        fetch(`${process.env.WORDPRESS_URL}/by-slug/${data[0].cobalt_meetingId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Basic ' + Buffer.from(process.env.WORDPRESS_CREDS).toString('base64')
            },
            body: JSON.stringify(ramcoClass)
        }).then(res => res.json()) // expecting a json response
            .then(body => {

                if ("data" in body) {

                    //sendSlackMessage(`[${moment().format('MM-DD-YYYY h:mm:ss a')}] ${data[i].cobalt_name} failed because of "${body.message}" \n`);

                    fs.appendFile('results.json', `[${moment().format('MM-DD-YYYY h:mm:ss a')}] ${data[0].cobalt_name} failed because of "${body.message}" \n`, (err) => {
                        if (err) throw err;
                    })

                } else {

                    //sendSlackMessage(`[${moment().format('MM-DD-YYYY h:mm:ss a')}] ${data[i].cobalt_name} submitted successfully \n`);

                    fs.appendFile('results.json', `[${moment().format('MM-DD-YYYY h:mm:ss a')}] ${data[0].cobalt_name} submitted successfully \n ${body} \n`, (err) => {
                        if (err) throw err;
                    })

                }
            });
    }

}