var Client = require('node-xmpp-client');
var ltx = require('ltx');
var https = require('https');
var config = require("./config.js").settings;


var client = new Client(config.xmpp);

var httpsOptions = config.slackWebhook;

client.connection.socket.setTimeout(0);
client.connection.socket.setKeepAlive(true, 10000);

var newTemplate = "*NEW: %task_name% by %user_name%.*\n%task_description%";
var updateTemplate = "*UPD: %task_name% by %user_name%:*\n%task_description%";
var commentTemplate = "*COMMENT: %project_name% %task_name% by %user_name%:*\n%task_description%";

//fields on right side of youtrack task edit panel
var fields = [
    "Manager:",
    "Тип задачи:",
    "Этап:",
    "Приоритет:",
    "Направление:",
    "Спринт:",
    "Assignee:",
    "Сложность:",
    "Затронет:",
    "Крайний срок!:",
    "Timer time:",
    "Timer:",
    "Spent time:"
]

var taskTemplate;
setInterval(function () {
    client.send(" ");
}, 5000);

client.connection.socket.on('error', function (error) {
    console.error(error)

})

client.on('offline', function () {
    console.error("client offline");
})

client.on('online', function () {
    console.log('Connected to XMPP');
    client.send(new ltx.Element('presence', {})
            .c('show').t('chat').up()
            .c('status').t(config.statusMessage)
    );
});

client.on('error', function (message) {
    console.log("error: " + message);
    process.exit(1);
});

client.on('stanza', function (stanza) {
    //console.log("new stanza", stanza.is('message'), stanza.attrs);
    if (stanza.is('message') && (stanza.attrs.type !== 'error')) {
        var xmppPayload = ltx.parse(stanza.root().toString());

        var message = "", payload;
        if (xmppPayload.getChild("body") != null) {
            message = xmppPayload.getChild("body").getText();
        }
        console.log(message);
        if (/tags:/ig.test(message) || /removed tag/ig.test(message) || /added tag/ig.test(message)) {
            console.log("return on tag")
            return;
        }


        var messageData;
        var messageDescription;

        if (message != "") {
            messageInfo = message.split(/-{20}/ig).splice(0, 2);
            console.log("messageInfo is", messageInfo);

            messageData = messageInfo[0].split("\n");
            messageDescription = (messageInfo[1] || "").split("\n");
            var description = ""
            var matchesCounter = 0;
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                messageDescription.forEach(function (item) {
                    var itemParts = item.split("->");
                    if (itemParts[0].indexOf(field) != -1) {
                        description += "> _" + field.replace(":", "") + " →_ " + itemParts[1] + "\n";
                        matchesCounter++;
                    }

                })
                if (matchesCounter >= 3) {
                    description += "..."
                    break;
                }
            }

            messageDescription.forEach(function (item) {
                var itemParts = item.split("->");

                if (/description:/ig.test(item)) {
                    description += "> _Текст задачи →_ " + itemParts[1] + "\n";
                }
            })

            var userName
            var projectName = messageData[1].split(" ")[0];

            if (/comment:/ig.test(message)) {
                projectName = messageData[1];
                userName = messageData[0].split(" ")[1];
                var taskName;
                var descriptionComment;
                console.log("only comment", description);
                for (var i = messageDescription.length - 1; i >= 0; i--) {
                    if (!descriptionComment) {
                        var addon = matchesCounter > 0 ? "" : "";
                        var descPrefix = matchesCounter > 0 ? "_Комментарий →_ " : ""
                        if (/comment:/ig.test(messageDescription[i])) {
                            var res = messageDescription[i].split("Comment:");
                            descriptionComment = (res[1] || res[0]).trim()
                            if (descriptionComment.length > 200) {

                                descriptionComment = descriptionComment.substr(0, 200) + "… more"
                            }
                            description += "> " + descPrefix + addon + descriptionComment + addon;
                        }
                    }
                    if (!taskName) {
                        if (/http/ig.test(messageDescription[i])) {
                            var taskName = "<" + messageDescription[i] + "|" + projectName + ">";
                        }
                    }
                }

                taskTemplate = commentTemplate.replace("%task_name%", taskName).replace("%user_name%", userName).replace("%task_description%", description);
                taskTemplate = taskTemplate.replace("%project_name%", "");
                if (matchesCounter > 0) {
                    taskTemplate = taskTemplate.replace("COMMENT:", "UPD+COMMENT:")
                }
            } else if (/changed issue/ig.test(messageData[0])) {
                userName = messageData[0].split(" ")[1];
                var taskName = "<" + messageData[2] + "|" + messageData[1] + ">";
                taskTemplate = updateTemplate.replace("%task_name%", taskName).replace("%user_name%", userName).replace("%task_description%", description);
            } else if (/new issue/ig.test(messageData[0])) {
                userName = messageData[0].split("by")[1].replace(":", "").trim()
                var taskName = "<" + messageData[2] + "|" + messageData[1] + ">";
                taskTemplate = newTemplate.replace("%task_name%", taskName).replace("%user_name%", userName).replace("%task_description%", "");
            }

            var linkMatches = taskTemplate.match(/\[(.)*\]/ig);
            console.log(taskTemplate);
            if (linkMatches != null) {
                for (var i = 0; i < linkMatches.length; i++) {
                    var arr = []
                    var str = linkMatches[i].replace("[", "").replace("]", "").split(' ')
                    arr.push(str.shift());
                    arr.push(str.join(' '))
                    taskTemplate = taskTemplate.replace(linkMatches[i], "<" + arr[0] + "|" + arr[1] + ">");
                }
            }
            console.log("finalTaskTemplate", taskTemplate);

            var req = https.request(httpsOptions, function (res) {
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('Response: ' + chunk);
                });
            });
            req.on('error', function (err) {
                console.log("hook error");
            });

            payload = {
                text: taskTemplate,
                username: config.defaultUserName,
                channel: config.defaultChannel,
                icon_url: 'http://blog.jetbrains.com/wp-content/uploads/2014/01/YouTrack-logo-200x200-150x150.jpg'
            }

            //apply filters;

            for (var i = 0; i < config.slackPayloads.length; i++) {
                if (message.toLocaleLowerCase().indexOf(config.slackPayloads[i].filter.toLocaleLowerCase()) > -1) {
                    payload = config.slackPayloads[i];
                    break;
                }
            }

            if (payload) {
                payload.text = taskTemplate;
                req.write(JSON.stringify(payload));
                req.end();
            }
        }
    }
});
