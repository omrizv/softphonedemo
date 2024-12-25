window.Framework = {
    config: {
        name: "Cloudbriz Softphone",
        clientIds: {
            "euw2.pure.cloud": "4834974c-5c6b-4f49-9567-24c690d5d09c"
        },
        settings: {
            embedWebRTCByDefault: true,
            hideWebRTCPopUpOption: false,
            enableCallLogs: true,
            hideCallLogSubject: false,
            hideCallLogContact: false,
            hideCallLogRelation: false,
            enableTransferContext: true,
            dedicatedLoginWindow: false,
            embeddedInteractionWindow: true,
            enableConfigurableCallerId: false,
            enableServerSideLogging: false,
            enableCallHistory: false,
            defaultOutboundSMSCountryCode: "+1",
            searchTargets: ["people", "queues", "frameworkContacts", "externalContacts"],
            callControls: ["pickup", "transfer", "mute", "disconnect", "hold", "record", "securePause", "dtmf", "scheduleCallback", "flag", "requestAfterCallWork"],
            theme: {
                primary: "#c242f5",
                text: "#DAD5DD",
                notification: {
                    success: {
                        primary: "#CCE5FF",
                        text: "#004085"
                    },
                    error: {
                        primary: "#f8D7DA",
                        text: "#721C24"
                    }
                }
            },
            sso: {
                provider: "",
                orgName: ""
            },
            display: {
                interactionDetails: {
                    call: [
                        "framework.DisplayAddress",
                        "call.Ani",
                        "call.ConversationId"
                    ]
                }
            }
        },
        helpLinks: {
            InteractionList: "https://help.mypurecloud.com/articles/about-interaction-list/",
            CallLog: "https://help.mypurecloud.com/articles/about-call-logs/",
            Settings: "https://help.mypurecloud.com/articles/about-settings/"
        },
        customInteractionAttributes: ["example_URLPop", "example_SearchValue"],
        getUserLanguage: function(callback) {
            callback("en-US");
        }
    },
    initialSetup: function () {
    },
    screenPop: function (searchString, interaction) {
        // Use your CRM vendor's API to perform screen pop.
    },
    processCallLog: function (callLog, interaction, eventName, onSuccess, onFailure)  {
       // Use your CRM vendor's API to provide interaction log information.
       onSuccess({
           id: externalCallLog.id
       });
    },
    openCallLog: function (callLog) {
    },
    contactSearch: function (searchValue, onSuccess, onFailure) {
    }
};

window.PureCloud = window.PureCloud || {};
window.PureCloud.User = window.PureCloud.User || {};

// This is the correct implementation
window.PureCloud.User.getAuthToken(function (token) {
    console.log("TOKEN: ", token);
    // Here you would typically store the token or use it for WebSocket authorization
    // For example:
    // connectWebSocket(token);
});

// Add this new event listener
window.addEventListener('message', function(event) {
    var message = event.data;
    try {
        message = JSON.parse(message);
    } catch (e) {
        // message is not JSON, use as is
    }
    
    if (message.type === 'getAuthToken') {
        window.PureCloud.User.getAuthToken(function(token) {
            window.parent.postMessage(JSON.stringify({
                type: 'authToken',
                token: token
            }), '*');
        });
    }
});