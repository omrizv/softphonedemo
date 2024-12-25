self.browserHelperService = {
    isChrome: function () {
        return navigator.userAgent.indexOf('Chrome') > -1;
    },

    isFirefox: function () {
        return navigator.userAgent.indexOf('Firefox') > -1;
    }
};