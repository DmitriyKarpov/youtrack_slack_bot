exports.settings = {
    "statusMessage": "hello",
    "keepAlive": true,
    "xmpp": {
        jid: 'set your jid',
        host: 'set your jabber host',
        password: "set jabber password",
        reconnect: true
    },


    "slackWebhook": {
        host: 'hooks.slack.com',
        path: "set your hook path",
        method: 'POST'
    },

    defaultChannel: "set your slack channel",
    defaultUserName: "set your slack user name",

    "slackPayloads": [
        {
            channel: 'set your channel',
            username: 'set your user name',
            icon_url: 'http://blog.jetbrains.com/wp-content/uploads/2014/01/YouTrack-logo-200x200-150x150.jpg',
            filter: 'custom filter field'
        }
    ]
};
