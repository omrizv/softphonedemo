/**
 * The content script gets run on page load (in sand-box environment), parses DOM elements in the page and
 * register handlers that intercept clicks on tel links to perform click-to-dial in pc4chrome.
 */
(function () {

    var FIREFOX_EXTENSION_ID = 'purecloudForFirefox@mypurecloud.com';

    var pendingClickToDial = false;

    var dataKeys = {
        DATA_KEY_NUMBER_TO_DIAL: "inin_numbertodial",
        DATA_KEY_EMAIL_ADDRESS_TO_USE: "inin_emailtoaddress"
    };

    const observedElements = new WeakSet();

    const observerConfig = { 
        attributeFilter:['href'], 
        childList: true, 
        subtree: true
    }

    const selectorDefinitions = {
        IFRAME: 'iframe:not([src]), iframe[src][srcdoc]',
        TEL: 'a[href^="tel:"]',
        EMAIL: 'a[href^="mailto:"]'
    }

    function init() {
        startParsingPage();
    }

    function startParsingPage() {
        
        var populateData = function(items) {
            var isClickToDialEnabled = items.clickToDial;
            var isDynamicChangeMonitoringEnabled = items.enableDynamicChangeMonitoring;
            if (isClickToDialEnabled) {
                convertLinks(document);
                convertLinksInIframes(document);
                if (isDynamicChangeMonitoringEnabled) {
                    attachObserver(document,handleObserver)
                    callFunctionsToIframes(document, true, handleObserver);
                }
            }
        };
        settingsHelper.getSettings(function (settings) {
            populateData(settings);
        });
    }

    function attachObserver(element, callback) {
        if (!observedElements.has(element)) {
            const observer = new MutationObserver(() => {
                callback(element);
            })
            observer.observe(element, observerConfig);
            observedElements.add(element);
        }
    }

    function handleObserver(element) {
        convertLinks(element);
        convertLinksInIframes(element);
        callFunctionsToIframes(element,false,(iframeDocument)=>{
            attachObserver(iframeDocument,handleObserver);
        });
    }

    function callFunctionsToIframes(element, recursive = false, ...functions) {
        element.querySelectorAll(selectorDefinitions.IFRAME).forEach(iframe => {
            try {
                const contentWindow = iframe.contentWindow;
                if (contentWindow && contentWindow.origin === window.origin) {
                    const iframeDocument = iframe.contentDocument || contentWindow.document;
                    functions.forEach(func => func(iframeDocument));
                    if (recursive) {
                        callFunctionsToIframes(iframeDocument, true, ...functions)
                    }
                }
            } catch (error) {
                // Handle the error if needed
            }
        });
    }

    function convertLinks(element = document) {
        convertTelLinks(element);
        convertMailtoLinks(element);
    }

    function convertLinksInIframes(element) {
        callFunctionsToIframes(element, true, convertLinks)
    }

    function convertTelLinks(element) {
        element.querySelectorAll(selectorDefinitions.TEL).forEach((anchorEl) => {
            const href = anchorEl.getAttribute('href') || '';
                const number = href.substring(4);
                // Check if it already has the attribute set
                if (anchorEl.getAttribute(`data-${dataKeys.DATA_KEY_NUMBER_TO_DIAL}`) === number) {
                    return;
                }
                anchorEl.setAttribute('title', `Dial ${number}`);
                anchorEl.setAttribute(`data-${dataKeys.DATA_KEY_NUMBER_TO_DIAL}`, number);
                anchorEl.addEventListener('click', onClickToDial);
        });
    }

    function convertMailtoLinks(element) {
        element.querySelectorAll(selectorDefinitions.EMAIL).forEach((anchorEl) => {
            const href = anchorEl.getAttribute('href') || '';
                const email = href.substring(7);
                // Check if it already has the attribute set
                if (anchorEl.getAttribute(`data-${dataKeys.DATA_KEY_EMAIL_ADDRESS_TO_USE}`) === email) {
                    return;
                }
                anchorEl.setAttribute('title', `Email ${email}`);
                anchorEl.setAttribute(`data-${dataKeys.DATA_KEY_EMAIL_ADDRESS_TO_USE}`, email);
                anchorEl.addEventListener('click', onClickToDial);
        });
    }

    function onClickToDial(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        var elem = e.currentTarget;
        var number = elem.dataset[dataKeys.DATA_KEY_NUMBER_TO_DIAL];
        var email = elem.dataset[dataKeys.DATA_KEY_EMAIL_ADDRESS_TO_USE];
        if (number || email) {
            try {
                if (!pendingClickToDial) {
                    pendingClickToDial = true;

                    var data = {type: 'clickToCall'};
                    if(number) {
                        data.number = number;
                    } else if(email) {
                        data.address = email;
                    }

                    sendMessageToPopup(data);
                    setTimeout(function () { pendingClickToDial = false; }, 1000);
                }
                
            } catch(err) {
                console.error(err);
            }
        }
    }

    function sendMessageToPopup(message) {
        console.log('Sending a message to popup window: ' + JSON.stringify(message));
        if (browserHelperService.isFirefox()) {
            chrome.runtime.sendMessage(FIREFOX_EXTENSION_ID, message);
        } else {
            chrome.runtime.sendMessage(message);
        }
    }

    init();

})();
