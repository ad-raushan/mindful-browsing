let activeTab = null;
let warningCounts = {};
let blockedSites = new Set();

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ siteUsage: {}, unfavorableSites: [], warningCounts: {}, blockedSites: [] });
});

chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, tab => {
        if (tab && tab.url) {
            activeTab = new URL(tab.url).hostname;
        }
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        activeTab = new URL(tab.url).hostname;
    }
});

setInterval(() => {
    if (activeTab) {
        chrome.storage.local.get(["siteUsage", "unfavorableSites", "warningCounts", "blockedSites"], data => {
            let siteUsage = data.siteUsage || {};
            let unfavorableSites = new Set(data.unfavorableSites || []);
            let warningCounts = data.warningCounts || {};
            let blockedSites = new Set(data.blockedSites || []);

            if (blockedSites.has(activeTab)) {
                chrome.tabs.update({ url: "about:blank" });
                return;
            }

            siteUsage[activeTab] = (siteUsage[activeTab] || 0) + 1;
            chrome.storage.local.set({ siteUsage });

            // Send update message for real-time UI updates
            chrome.runtime.sendMessage({ type: "REFRESH_UI" });

            if (unfavorableSites.has(activeTab)) {
                let timeSpent = siteUsage[activeTab];

                if (timeSpent % 300 === 0) { // Every 5 minutes
                    warningCounts[activeTab] = (warningCounts[activeTab] || 0) + 1;
                    chrome.storage.local.set({ warningCounts });

                    if (warningCounts[activeTab] >= 3) {
                        blockedSites.add(activeTab);
                        chrome.storage.local.set({ blockedSites: Array.from(blockedSites) });
                        chrome.tabs.update({ url: "about:blank" });
                    } else {
                        chrome.notifications.create({
                            type: "basic",
                            iconUrl: "icons/icon48.png",
                            title: "Time-Wasting Alert!",
                            message: `You've spent ${formatTime(timeSpent)} on ${activeTab}. Warning ${warningCounts[activeTab]}/3.`,
                            buttons: [{ title: "OK" }],
                            requireInteraction: true
                        });
                    }
                }
            }
        });
    }
}, 1000);

function formatTime(seconds) {
    return seconds >= 3600 ? (seconds / 3600).toFixed(1) + " hours"
         : seconds >= 60 ? (seconds / 60).toFixed(1) + " minutes"
         : seconds + " seconds";
}
