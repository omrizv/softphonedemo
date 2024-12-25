window.onload = function () {
    var settings = {};
    var iframe;

    var browserConnectorMessageHandlers = {
        onConnectionChanged: function (data) {
            if (data) {
                if (data.isConnected === true) {
                    toolbarIconService.setToolbarIconToActiveIcon();
                } else {
                    toolbarIconService.setToolbarIconToInactiveIcon();
                }
            }
        },
        urlScreenPop: function(message) {
            chrome.tabs.create({ url: message.url });
        },
        createPopupWindow: function (data) {
            chrome.windows.create({ 
                url: data.url,
                allowScriptsToClose: true,
                height: 500,
                width: 500,
                type: 'popup'
            });
        },
        authToken: function(data) {
            if (data.token) {
                console.log('Received auth token, making API call...');
                makeApiCall(data.token);
            } else {
                console.error('Received authToken message, but no token was provided.');
                displayError('Failed to get authentication token. Please try again.');
            }
        }
    };

    var contentScriptOrBackgroundScriptMessageHandlers = {
        clickToCall: function(data) {
            if (data.number || data.address) {
                window.focus();
                postMessageToBrowserConnector(data);
            }
        }
    };

    var windowEventHandlers = {
        'unload': function () {
            sendMessageToBackgroundScript({ type: 'unload' });
        }
    };

    var CLIENT_WIDTH = 200;
    var CLIENT_HEIGHT = 450;

    function init() {
        resizeWindowWithFrame(CLIENT_WIDTH, CLIENT_HEIGHT);
        settingsHelper.getSettings(function (data) {
            settings = data;
            addExtensionInfo(settings);
            var url = settingsHelper.fixUrl(settings.url);
            loadIframe(url);
        });
        subscribeToMessagesFromBrowserConnector();
        subscribeToMessagesFromContentScriptOrBackgroundScript();
        subscribeToWindowEvents();
        subscribeToStorageEvents();
        translateContents();

        document.getElementById('customBar').addEventListener('click', toggleExpandedContent);
    }

    function toggleExpandedContent() {
        var expandedContent = document.getElementById('expandedContent');
        expandedContent.classList.toggle('expanded');
        
        if (expandedContent.classList.contains('expanded')) {
            fetchQueueData();
        }
    }

    function fetchQueueData() {
        console.log('Fetching queue data...');
        postMessageToBrowserConnector({ type: "getAuthToken" });
    }

    function makeApiCall(token) {
        console.log('Making API call with token:', token);
        const apiUrl = 'https://api.euw2.pure.cloud/api/v2/analytics/queues/observations/query';
        const requestBody = {
            "filter": {
                "predicates": [
                    {
                        "dimension": "queueId",
                        "operator": "matches",
                        "value": "8f3946ce-84a1-4554-af37-02454aae8ef2",
                        "type": "dimension"
                    },
                    {
                        "type": "dimension",
                        "dimension": "queueId",
                        "operator": "matches",
                        "value": "57a76a68-0e1c-4aa3-a2d9-b5e411eb95eb"
                    }
                ],
                "type": "or"
            },
            "metrics": [
                "oWaiting"
            ]
        };

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('API response:', data);
            displayQueueData(data);
        })
        .catch(error => {
            console.error('Error making API call:', error);
            displayError('Failed to fetch queue data. Please try again.');
        });
    }

    function displayQueueData(data) {
        console.log('Displaying queue data:', data);
        const expandedContent = document.getElementById('expandedContent');
        let testQueueCount = 0;
        let moneyQueueCount = 0;

        data.results.forEach(result => {
            if (result.group.queueId === "57a76a68-0e1c-4aa3-a2d9-b5e411eb95eb" && result.group.mediaType === "voice") {
                testQueueCount = result.data[0].stats.count;
            } else if (result.group.queueId === "8f3946ce-84a1-4554-af37-02454aae8ef2" && result.group.mediaType === "voice") {
                moneyQueueCount = result.data[0].stats.count;
            }
        });

        expandedContent.innerHTML = `
            <p>Test Queue: ${testQueueCount}</p>
            <p>Money Queue: ${moneyQueueCount}</p>
        `;
    }

    function displayError(message) {
        const expandedContent = document.getElementById('expandedContent');
        expandedContent.innerHTML = `<p style="color: red;">${message}</p>`;
    }

    function addExtensionInfo(data) {
        var manifest = chrome.runtime.getManifest();
        data.extensionId = chrome.runtime.id;
        data.extensionName = manifest.name;
        data.extensionVersion = manifest.version;
        data.manifestVersion = manifest.manifest_version;
        data.extensionUniqueName = data.extensionName + '_' + data.extensionVersion + '_' + data.extensionId;
    }

    function loadIframe(url) {
        iframe = document.getElementById("crmClient");
        console.log('Loading iframe: ' + url);
        iframe.src = url;
        iframe.addEventListener("load", function () {
            console.log('Iframe loaded successfully');
            postMessageToBrowserConnector({ type: "initialize", settings: settings });
        });
    }

    function subscribeToMessagesFromBrowserConnector() {
        window.addEventListener("message", function (event) {
            var data = parseEventData(event);
            console.log('Received a message from Browser Connector:', data);
            var handler = browserConnectorMessageHandlers[data.type];
            if (handler) {
                handler(data);
            }
        });
    }

    function parseEventData(event) {
        var data = (event && event.data);
        if (data) {
            try {
                data = JSON.parse(data);
            } catch (e) {
                // Data is not JSON, use as is
            }
        }
        return data;
    }

    function subscribeToWindowEvents() {
        for (var eventName in windowEventHandlers) {
            if (windowEventHandlers.hasOwnProperty(eventName)) {
                window.addEventListener(eventName, windowEventHandlers[eventName]);
            }
        }
    }

    function subscribeToMessagesFromContentScriptOrBackgroundScript() {
        chrome.runtime.onMessage.addListener(function (event) {
            console.log('Received a message from a content script or background page: ' + JSON.stringify(event));
            var handler = contentScriptOrBackgroundScriptMessageHandlers[event.type];
            if (handler) {
                handler(event);
            }
        });
    }

    function subscribeToStorageEvents(){
        chrome.storage.onChanged.addListener(function(changes, namespace) {
            for (var key in changes) {
                if (changes.hasOwnProperty(key)) {
                    var storageChange = changes[key];
                    console.log('Storage key "%s" changed. Old value was "%s", new value is "%s"',
                        key,
                        storageChange.oldValue,
                        storageChange.newValue);
                    if (key === 'url') {
                        window.location.reload();
                    }
                }
            }
        });
    }

    function postMessageToBrowserConnector(message) {
        if (typeof message != 'string') {
            message = JSON.stringify(message);
        }
        console.log('Posting a message to Browser Connector: ' + message);
        iframe.contentWindow.postMessage(message, '*');
    }

    function sendMessageToBackgroundScript(message) {
        console.log('Sending a message to a background script: ' + JSON.stringify(message));
        chrome.runtime.sendMessage(message);
    }

    function translateContents() {
        document.getElementsByTagName('title')[0].textContent = chrome.i18n.getMessage("appTitle");
    }

    function resizeWindowWithFrame(width, height) {
        var diffWidth = window.outerWidth - window.innerWidth;
        var diffHeight = window.outerHeight - window.innerHeight;
        window.resizeTo(width + diffWidth, height + diffHeight);
    }

    init();
};