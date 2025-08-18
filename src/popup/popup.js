import { mockFetchPlaylists } from '../lib/test-utils.js';

if (!window.browser) {
  // Running in standalone mode through popup-dev.html
  window.browser = {
    storage: {
      local: {
        get: async (keys) => JSON.parse(localStorage.getItem(keys)) || {},
        set: async (items) => localStorage.setItem(Object.keys(items)[0], JSON.stringify(Object.values(items)[0]))
      },
      onChanged: { addListener: () => {} }
    },
    runtime: {
      onMessage: { addListener: () => {} }
    }
  };
  
  // Auto-load test data when standalone
  if (!localStorage.getItem('testMode')) {
    localStorage.setItem('testMode', 'true');
  }
}

class PopupViewModel {
  constructor(testMode = false) {
    this.title = ko.observable("My Playlists");
    this.status = ko.observable("");
    this.testMode = ko.observable(testMode);
    this.showLoginButton = ko.observable(true);
    this.loginText = ko.observable("Login with Google");
    this.isLoading = ko.observable(false);
    this.darkMode = ko.observable(false);
    this.playlists = ko.observableArray([]);
    this.selectedPlaylists = ko.observableArray([]);
    
    // Load saved state
    this.loadState();
  }
  
  async loadState() {
    this.isLoading(true);
    try { 
      const token = await this.getToken();
      if (token) {  
        this.status("Logged in ✔");
        await this.refresh(token);
      } else {
        this.showLoginButton(true);
        this.status("Not logged in");
      }
    } catch (err) {
      console.log("Init failed", err);
      this.status("Error: " + err.message);
    }
    finally {
      this.isLoading(false);
    }
  }

  loginBtn = async () => {
    try {  
      let token = this.testMode() ? "_mock" : await browser.runtime.sendMessage({ action: "login" });
      console.log("Got token", token);
      this.showLoginButton(false);
      this.statusText("Logged in ✔");
      this.refresh(token);
    }
    catch (err) {
      console.log("Login failed", err);
      this.statusText("Login failed: " + err.message);
    }
  }
  
  refresh = async (token) => {
    this.isLoading(true);
    try {
      const newPlaylists = await this.fetchPlaylists(token);
      console.log("Got playlists", newPlaylists);
      this.playlists(newPlaylists);
      await browser.storage.local.set({ 
        playlists: newPlaylists 
      });
    } finally {
      this.isLoading(false);
    }
  };

  getToken = async () => {
    const token = this.testMode() ? "mock_" : await browser.runtime.sendMessage({ action: "getToken" });
    console.log("received token", token);
    return token;
  }

  // --- FETCH & RENDER PLAYLISTS ---
  async fetchPlaylists(token) {
    return this.testMode() ? mockFetchPlaylists() : 
      fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50", {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json());
  }

  /*
  async renderPlaylists(_token = null) {
    try {
      const token = _token ?? await this.getToken();
      const data = await this.fetchPlaylists(token);
      
      playlistList.innerHTML = "";
      const selected = (await browser.storage.local.get("selectedPlaylists")).selectedPlaylists || [];

      data.items.forEach(pl => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = pl.id;
        checkbox.checked = selected.includes(pl.id);

        checkbox.addEventListener("change", async () => {
          const { selectedPlaylists } = await browser.storage.local.get("selectedPlaylists");
          let newSelected = selectedPlaylists || [];
          if (checkbox.checked) {
            if (!newSelected.includes(pl.id)) newSelected.push(pl.id);
          } else {
            newSelected = newSelected.filter(id => id !== pl.id);
          }
          await browser.storage.local.set({ selectedPlaylists: newSelected });
        });

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(pl.snippet.title));
        playlistList.appendChild(label);
      });
    } catch (err) {
      console.error("Error:", err);
      statusDiv.textContent = `Error: ${err.message}`;
    }
  }
    */
}

console.log("STARTING POPUP")

const loadKnockout = () => import('../lib/knockout.js');
const loadKnockoutSecure = () => import("../lib/knockout-secure-binding.js");

// ensure knockout is loaded before running script
document.addEventListener('DOMContentLoaded', async () => {
  await loadKnockout();
  await loadKnockoutSecure();
  
  let testMode = localStorage.getItem('testMode') === 'true';

  //bindings - a JavaScript object containing binding definitions
  //options - an object that can contain these properties:
  //  attribute - override the attribute used for bindings (defaults to `data-class`)
  //  virtualAttribute - override the text used for virtual bindings (defaults to `class` and specified as `ko class:`)
  //  bindingRouter - custom function for routing class names to the appropriate binding
  //  fallback - look for normal `data-bind` bindings after failing with this provider on an element (defaults to false)
  ko.bindingProvider.instance = new ko.classBindingProvider(bindings, options);

  const vm = new PopupViewModel(testMode);
  ko.applyBindings(vm);
  browser.storage.onChanged.addListener(changes => {
    if (changes.playlists) {
      vm.playlists(changes.playlists.newValue);
    }
    if (changes.selected) {
      vm.selectedPlaylists(changes.selected.newValue);
    }
  });  
});