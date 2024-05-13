const DB_NAME = 'BlockListDB';
const DB_VERSION = 1; // only integers
const BLOCKLIST_STORE = 'blockLists';
const LINK_STORE = 'links';
const DEV_MODE = true;

//initialize db, active lists, and settings
chrome.runtime.onInstalled.addListener(async () => {
  chrome.storage.local.clear()
  chrome.storage.local.set({isBlocking: 'false'});
  chrome.storage.local.set({blocked: []});

  const dbs = await indexedDB.databases()
  dbs.forEach(db => { indexedDB.deleteDatabase(db.name) })

  const dbRequest = indexedDB.open(DB_NAME, DB_VERSION);

  dbRequest.onupgradeneeded = (event) => {
    const db = event.target.result;
    const blockListStore = db.createObjectStore(BLOCKLIST_STORE, { keyPath: 'id', autoIncrement: true });
    const linksStore = db.createObjectStore(LINK_STORE, { keyPath: 'id', autoIncrement: true });
    linksStore.createIndex('urlIndex', 'url', { unique: false });
    linksStore.createIndex('blockListIndex', 'blockListId', { unique: false });
  };

  // initialize a default list
  dbRequest.onsuccess = (event) => {
    //consider adding error handling here

    const db = event.target.result;
    const blockListTransaction = db.transaction([BLOCKLIST_STORE], 'readwrite');
    const blockListStore = blockListTransaction.objectStore(BLOCKLIST_STORE);

    if (DEV_MODE) {
     blockListStore.clear() 
    }

    const defaultBlockLists = [
      { name: 'Social Media' },
      { name: 'Games' },
    ];
    for (blockList of defaultBlockLists) {
      blockListStore.add(blockList);
    }
    
    const linkTransaction = db.transaction([LINK_STORE], 'readwrite');
    const linkStore = linkTransaction.objectStore(LINK_STORE);

    if (DEV_MODE) {
      linkStore.clear();
     }

    const default_links = [
      { blockListId: 1, url: "youtube.com/shorts" }, 
      { blockListId: 1, url: "reddit.com" },
      { blockListId: 2, url: "diep.io" }, 
      { blockListId: 2, url: "starve.io" }
    ];
    for (const newLink of default_links) {
      linkStore.add(newLink);
    }
  };

  dbRequest.onerror = (event) => {
    console.log("IndexedDB failed! Please reload and try again!");
  };
});

// detect open tab
// chrome.tabs.onCreated.addListener((tab) => {

// })

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tabUrl: tabs[0].url });
    });
  }
  return true;
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action == 'openSettingsPage') {
    chrome.tabs.create({
      active: true,
      url: 'page.html'
    }, null);
  };
});

/**
 * Runs URL check and enforces blocking on tab if necessary
 * @param {*} url the URL of the tab to check
 * @param {*} tabId the tabId as returned from Chrome APIs
 * @returns 
 */
const enforceTab = async (url, tabId) => {
  const isBlocking = await chrome.storage.local.get('isBlocking');
  if (isBlocking['isBlocking'] !== 'true') { //not blocking
    return;
  }
  if (url === chrome.runtime.getURL('block.html')) {
    return;
  }
  const websitesToBlock = await chrome.storage.local.get('blocked');
  for (const domain of websitesToBlock['blocked']) {
    if (url.includes(domain)) {
      chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL('block.html')
      });
    }
  }
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action == 'checkCurrentTab') {
    const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
    enforceTab(tabs[0].url, tabs[0].tabId);
  };
})

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
  enforceTab(tabs[0].url, tabs[0].tabId);
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  enforceTab(changeInfo.url, tabId);
});