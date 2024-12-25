//if chrome.action is not defined, point it to chrome.browserAction for manifest v2 compatibility
if(!chrome.action) {
    chrome.action = chrome.browserAction;
}

self.toolbarIconService = {
    onToolbarIconClicked: function (callback) {
        chrome.action.onClicked.addListener(callback);
    },
    setToolbarIconToActiveIcon: function () {
        chrome.action.setIcon({path: 'assets/img/logo38.png'});
    },
    setToolbarIconToInactiveIcon: function () {
        chrome.action.setIcon({path: 'assets/img/inactiveLogo38.png'});
    }
};