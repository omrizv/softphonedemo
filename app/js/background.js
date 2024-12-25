(function () {
    var popUpWindowId;

    var popUpMessageHandlers = {
        'unload': function () {
            toolbarIconService.setToolbarIconToInactiveIcon();
            cleanupPopUpWindowId();
        }
    };

    function init() {
        chrome.storage.local.get(["popUpWindowId"], function (result) {
            popUpWindowId = result.popUpWindowId;
        });

        toolbarIconService.onToolbarIconClicked(function () {
            popUpExists(function (exists) {
                if (!exists) {
                    createPopUp();
                } else {
                    focusPopUp();
                }
            });
        });

        chrome.windows.onRemoved.addListener(function (windowId) {
            if (popUpWindowId == windowId) {
                toolbarIconService.setToolbarIconToInactiveIcon();
                cleanupPopUpWindowId();
            }
        });

        subscribeToMessagesFromPopup();

        createRightClickToMakeCallContextMenu();
    }


    function popUpExists(callback) {
        if (popUpWindowId) {
            chrome.windows.get(popUpWindowId, { windowTypes: ['popup'] }, function (win) {
                if (win) {
                    callback(true);
                } else {
                    callback(false);
                }
            });
        } else {
            callback(false);
        }
    }

    function createPopUp() {
        const winWidth = 200;
        const winHeight = 473;
        chrome.windows.create({
            url: 'popup.html',
            type: 'popup',
            width: winWidth,
            height: winHeight
        }, function (win) {
            console.log('Popup created: ' + JSON.stringify(win));
            popUpWindowId = win.id;
            chrome.storage.local.set({ popUpWindowId: popUpWindowId });
        });
    }

    function focusPopUp() {
        if (popUpWindowId) {
            chrome.windows.update(popUpWindowId, {
                focused: true
            });
        }
    }

    function cleanupPopUpWindowId() {
        chrome.storage.local.remove('popUpWindowId');
        popUpWindowId = undefined;
    }

    function subscribeToMessagesFromPopup() {
        chrome.runtime.onMessage.addListener(function (event) {
            var handler = popUpMessageHandlers[event.type];
            if (handler) {
                handler(event);
            }
        });
    }

    function createRightClickToMakeCallContextMenu() {

        var MAKE_CALL_CONTEXT_MENU_ID = 'clickToCall';

        chrome.runtime.onInstalled.addListener(() => {
            chrome.contextMenus.create({
                "title": chrome.i18n.getMessage("contextMenuMakeCall"),
                "id": MAKE_CALL_CONTEXT_MENU_ID,
                "contexts": ["selection"]
            });
        });

        chrome.contextMenus.onClicked.addListener(function (event) {
            console.log('Context menu is clicked: ' + JSON.stringify(event));
            if (event.menuItemId == MAKE_CALL_CONTEXT_MENU_ID) {
                sendMessageToPopup({
                    number: event.selectionText,
                    type: 'clickToCall'
                });
            }
        });

    }

    function sendMessageToPopup(message) {
        chrome.runtime.sendMessage(message);
    }

    init();

})();
