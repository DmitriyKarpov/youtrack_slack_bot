# youtrack_slack_bot

1. Before start you should edit config.js

 "xmpp": {
        jid: 'set your jid',
        host: 'set your jabber host',
        password: "set jabber password",
        reconnect: true
  },

 "slackWebhook": {
        host: 'hooks.slack.com',
        path: "set your hook path", you well need to create Incoming Webhook for Slack
        method: 'POST'
  },

  defaultChannel: "set your slack channel" - default channel for incoming messages
  defualtUserName: "set your slack user name" - default user for sending messages. You will need dedicated account for this

  "slackPayloads": [
          {
              channel: 'set your channel',
              username: 'set your user name',
              icon_url: 'http://blog.jetbrains.com/wp-content/uploads/2014/01/YouTrack-logo-200x200-150x150.jpg',
              filter: 'custom filter field'
          }
      ] - you can specify filters to send messages with specific text to a specific Slack channel

2. Application applies some formatting for messages. It appends "NEW:" tag to new tasks; "UPD:" tag to modified tasks; "UPD+COMMENT:" tag to modified tasks with comment, "COMMENT:" tag to tasks with only comments.
It also show updated fields and values like "Manager -> Olga".

3. To start the app run following command: node server.js &