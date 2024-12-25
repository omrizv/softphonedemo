var settingsHelper = (function () {

    var defaultSettings = {
        url: 'https://apps.mypurecloud.com',
        clickToDial: true,
        enableServerSideLogging: false,
        enableAgentConfiguration: true,
        enableConfigurableCallerID: false,
        searchExternalContacts: false,
        enableDynamicChangeMonitoring: false,
        defaultOutboundSMSCountryCode: '',
        useSSO: false,
        providerName: '',
        orgName: '',
        dedicatedLoginWindow: false,
        enableCallHistory: true
    };

    function removeSlashAtEnd(url) {
        var lastChar = url.slice(-1);
        if (lastChar == '/') {
            url = url.slice(0, -1);
        }
        return url;
    }

    return {
        fixUrl: function (url) {
            url = (url || '').trim();
            if (url) {
                if (url.indexOf('debug:') == 0) {
                    url = url.replace('debug:', '');
                } else {
                    // fix protocol (case insensitive)
                    url = url.replace(/http\:\/\//i, 'https://');
                    if (!url.match(/^https\:\/\//i)) {
                        url = 'https://' + url;
                    }
        
                    var browserExtensionPath = 'embeddableFramework.html';
                    var browserExtensionPathPattern = /embeddableFramework\.html/gi;
        
                    // Check if the URL already contains 'embeddableFramework.html'
                    if (!url.match(browserExtensionPathPattern)) {
                        url = removeSlashAtEnd(url);
                        url += '/crm/' + browserExtensionPath;
                    }
                    
                    // fix casing just in case
                    url = url.replace(browserExtensionPathPattern, browserExtensionPath);
        
                    // Add enableFrameworkClientId parameter
                    url += (url.indexOf('?') > -1 ? '&' : '?') + 'enableFrameworkClientId=true';
                }
            }
        
            return url;
        },

        getSettings: function (callback) {
            var settingNames = Object.keys(defaultSettings);
            chrome.storage.managed.get(settingNames, function (managedItems) {
                managedItems = managedItems || {};
                chrome.storage.sync.get(settingNames, function (syncItems) {
                    syncItems = syncItems || {};

                    var hasManagedSetting = (managedItems && Object.keys(managedItems).length > 0);
                    if (hasManagedSetting && managedItems.enableAgentConfiguration == undefined) {
                        managedItems.enableAgentConfiguration = false;
                    }

                    var items;
                    if (managedItems.enableAgentConfiguration === false) {
                        items = Object.assign({}, defaultSettings, syncItems, managedItems);
                    } else {
                        items = Object.assign({}, defaultSettings, managedItems, syncItems);
                    }
                    callback(items);
                });
            });
        },
        saveSettings: function (settings, callback) {
            chrome.storage.sync.set(settings, callback);
        }
    };

})();