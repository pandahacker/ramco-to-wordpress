
const fetch = require('node-fetch');

function sendSlackMessage(messageBody) {

    const data = { "text": messageBody };

    fetch(process.env.SLACK_WEBHOOK, {
        method: 'post',
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json"
        }
    });

}

function sendDiscordMessage(errorType, errorMessage, classUrl) {

    const data = {
        "content": "<@!118133959044497415>",
        "embeds": [
          {
            "color": 16711680,
            "fields": [
              {
                "name": "Error Type",
                "value": errorType
              },
              {
                "name": "Error Message",
                "value": errorMessage
              }
              // {
              //   "name": "Class URL",
              //   "value": `https://miamicrm.ramcoams.org/main.aspx?etn=cobalt_class&id={${classUrl}}&newWindow=true&pagetype=entityrecord`
              // }
            ]
          }
        ],
        "username": "PandaBot",
        "avatar_url": "https://i.imgur.com/9tREgOA.png"
    };

    fetch(process.env.DISCORD_HOOK, {
        method: 'post',
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json"
        }
    });

}

module.exports = {
    sendDiscordMessage,
    sendSlackMessage
}