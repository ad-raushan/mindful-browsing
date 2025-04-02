function updateUI() {
    chrome.storage.local.get(["siteUsage", "blockedSites"], data => {
        let usage = data.siteUsage || {};
        let blockedSites = new Set(data.blockedSites || []);
        let sortedSites = Object.entries(usage).sort((a, b) => b[1] - a[1]);
        let usageList = document.getElementById("usage-list");
        usageList.innerHTML = "";

        sortedSites.forEach(([site, time]) => {
            let listItem = document.createElement("li");
            listItem.classList.add("site-item");

            let siteText = document.createElement("span");
            siteText.textContent = `${site}: ${formatTime(time)}`;
            siteText.classList.add("site-name");

            let buttonContainer = document.createElement("div");
            buttonContainer.classList.add("button-container");

            if (!blockedSites.has(site)) {
                let addToUnfavorableBtn = document.createElement("button");
                addToUnfavorableBtn.classList.add("category-btn", "unfavorable-btn");
                addToUnfavorableBtn.innerHTML = "🚫 Unfavorable";
                addToUnfavorableBtn.onclick = () => addToCategory(site, "unfavorableSites");

                let addToProductiveBtn = document.createElement("button");
                addToProductiveBtn.classList.add("category-btn", "productive-btn");
                addToProductiveBtn.innerHTML = "✅ Productive";
                addToProductiveBtn.onclick = () => addToCategory(site, "productiveSites");

                buttonContainer.appendChild(addToUnfavorableBtn);
                buttonContainer.appendChild(addToProductiveBtn);
            }

            listItem.appendChild(siteText);
            listItem.appendChild(buttonContainer);
            usageList.appendChild(listItem);
        });
    });
}

function addToCategory(site, category) {
    chrome.storage.local.get(category, data => {
        let list = data[category] || [];
        if (!list.includes(site)) {
            list.push(site);
            chrome.storage.local.set({ [category]: list }, loadCategories);
        }
    });
}

function loadCategories() {
    ["unfavorableSites", "productiveSites", "blockedSites"].forEach(category => {
        chrome.storage.local.get(category, data => {
            let list = data[category] || [];
            let listElement = document.getElementById(category.replace("Sites", "-list"));
            listElement.innerHTML = "";

            list.forEach(site => {
                let li = document.createElement("li");
                li.textContent = site;

                let removeBtn = document.createElement("button");
                removeBtn.textContent = "❌ Remove";
                removeBtn.onclick = () => removeFromCategory(site, category);

                li.appendChild(removeBtn);
                listElement.appendChild(li);
            });
        });
    });
}

function removeFromCategory(site, category) {
    chrome.storage.local.get(category, data => {
        let list = data[category] || [];
        list = list.filter(item => item !== site);
        chrome.storage.local.set({ [category]: list }, loadCategories);
    });
}

function formatTime(seconds) {
    return seconds >= 3600 ? (seconds / 3600).toFixed(1) + " hours"
         : seconds >= 60 ? (seconds / 60).toFixed(1) + " minutes"
         : seconds + " seconds";
}

// Ensure functions are defined before execution
document.addEventListener("DOMContentLoaded", function () {
    updateUI();
    loadCategories();

    document.getElementById("add-unfavorable").addEventListener("click", () => {
        modifyCategory("unfavorableSites");
    });

    document.getElementById("add-productive").addEventListener("click", () => {
        modifyCategory("productiveSites");
    });

    document.getElementById("reset-data").addEventListener("click", () => {
        chrome.storage.local.set({ siteUsage: {}, unfavorableSites: [], productiveSites: [], blockedSites: [] }, () => {
            updateUI();
            loadCategories();
        });
    });

    // Listen for real-time updates from background.js
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "REFRESH_UI") {
            updateUI();
        }
    });
});
