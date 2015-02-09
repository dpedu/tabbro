
_tabbro_ = function() {
    
    // Database version
    this.__VERSION = 1;
    
    // All tabbro data
    this.data = null;
    
    // Tab tree
    this.tree = null;
    
    // Storage engine
    this._storage = chrome.storage.local;
    
    // Action hook - called when we've done something that potentionally could require any of the guis to be updated
    this.hook_repaint == null
    this.notify = function() {
        tabbro.updateCount()
        if(this.hook_repaint!=null) {
            setTimeout(this.hook_repaint, 1)
        }
    }
    
    
    // TREE HELPERS
    this.t_getWindow = function(winid) {
        for(var i in this.tree) {
            if(this.tree[i].id==winid) {
                return this.tree[i]
            }
        }
    }
    
    
    this.t_getWindowFromTab = function(tabid) {
        // Return the window the specified tab id belongs to
        for(var w in this.tree) {
            for(var t in this.tree[w].tabs) {
                if(this.tree[w].tabs[t].id==tabid) {
                    return this.tree[w]
                }
            }
        }
    }
    
    
    this.t_getTab = function(tabid) {
        for(var w in this.tree) {
            for(var t in this.tree[w].tabs) {
                if(this.tree[w].tabs[t].id==tabid) {
                    return this.tree[w].tabs[t]
                }
            }
        }
    }
    
    
    this.t_windowHasTab = function(winid, tabid) {
        // Determine if the specified window by id contains tab specified by tabid
        // TODO
    }
    
    
    this.t_addTabtoWindow = function(winid, tab, index) {
        // Add a tab record to a window specified by winid
        var win = this.t_getWindow(winid)
        win.tabs.splice(index, 0, tab)
    }
    
    
    this.t_removeTab = function(tabid) {
        // Removed tab record
        var thewindow = bro.t_getWindowFromTab(tabid)
        for(var i in thewindow.tabs) {
            if(thewindow.tabs[i].id == tabid) {
                thewindow.tabs.splice(i, 1)
                return
            }
        }
    }
    
    
    this.t_removeWindow = function(winid) {
        // Remove window
        for(var i in this.tree) {
            if(this.tree[i].id == winid) {
                this.tree.splice(i, 1)
                return
            }
        }
    }
    
    
    // UI UTIL FUNCTIONS
    this.ui_delete_tab = function(winindex, tabindex) {
        // Delete tab at tabindex from window at windowindex
        var window = this.tree[winindex]
        var tab = window.tabs[tabindex]
        
        // Close tab if it's active
        if(tab.id!=null) {
            chrome.tabs.remove(tab.id)
        }
    }
    
    
    this.ui_delete_window = function(winindex) {
        // Delete window at windowindex
        var window = this.tree[winindex]
        
        // If the window isn't loaded, delete it
        if(window.id==null) {
            this.t_removeWindow(window.id)
        } else {
            // If the window is loaded, close it and the events fired will take care of cleanup
            chrome.windows.remove(window.id)
        }
    }
    
    
    this.ui_stick_tab = function(winindex, tabindex) {
        // Toggle sticky state for tab at tabindex from window at windowindex
        this.tree[winindex].tabs[tabindex].sticky = !this.tree[winindex].tabs[tabindex].sticky
        // Stick the window if we just stuck a tab
        if(this.tree[winindex].tabs[tabindex].sticky) {
           this.tree[winindex].sticky = true
        }
    }
    
    
    this.ui_stick_window = function(winindex) {
        // Toggle sticky state for window at windowindex
        this.tree[winindex].sticky = !this.tree[winindex].sticky
        // Apply same setting to every tab in the window
        for(var i in this.tree[winindex].tabs) {
            this.tree[winindex].tabs[i].sticky = this.tree[winindex].sticky
        }
    }
    
    
    this.getCount = function() {
        // Return count of loaded tabs
        var count = 0;
        for(var w in this.tree) {
            for(var t in this.tree[w].tabs) {
                if(this.tree[w].tabs[t].id!=null) {
                    count++
                }
            }
        }
        return count;
    }
    
    
    this.updateCount = function() {
        // Update open tab count badge
        chrome.browserAction.setBadgeText({"text":this.getCount()+""})
    }
    
    
    // Entry point - load previous session data or create a database 
    this.load = function() {
        bro = this
        // Load data from sync
        this._storage.get("tabbro", function(_data){
            // If there's no data we get {}
            if(_data.tabbro==undefined) {
                console.log("setup: initializing tabbro")
                bro.tree = []
                bro.data = {
                    version: bro.__VERSION,
                    tree: bro.tree
                }
            } else {
                bro.data = _data.tabbro
                bro.tree = bro.data.tree
            }
            bro.setup()
        })
    }
    
    
    this.setup = function() {
        // Set the notification color
        chrome.browserAction.setBadgeBackgroundColor({"color":"#990000"})
        
        // If any non-sticky windows are in our data from a previous session, remove them
        this.pruneData(); 
        // Add all open windows/tabs to the database tree
        this.loadInitialTree()
        // Add evnt listeners
        this.addListeners()
        //console.log("Tabbro v" + this.__VERSION + " ready!")
    }
    
    
    this.loadInitialTree = function() {
        // Add all open windows/tabs to the database tree
        bro = this
        // Get all windows
        chrome.windows.getAll(function(_windows){
            for(var w in _windows) {
                if(_windows[w].type!="normal") continue;
                bro.tree.push({
                    id: _windows[w].id,
                    tabs:[],
                    sticky: false,
                    name: ""
                })
                
                // Get all tabs in this window
                chrome.tabs.getAllInWindow(_windows[w].id, function(_tabs){
                    console.log(_tabs)
                    for(var i in _tabs) {
                        var w = bro.t_getWindow(_tabs[i].windowId)
                        w.tabs.push({
                            id: _tabs[i].id,
                            title: _tabs[i].title,
                            url: _tabs[i].url,
                            sticky: false,
                            name: ""
                        })
                    }
                    bro.save()
                    // Update open tab count badge
                    bro.updateCount()
                })
            }
        })
    }
    
    
    this.pruneData = function() {
        // If any non-sticky windows are in our data from a previous session, remove them
        var pruneWindows = []
        for(var w in this.tree) {
            // Null all window IDs
            this.tree[w].id = null
            // Should window be pruned?
            if(!this.tree[w].sticky) {
                pruneWindows.push(w)
                continue
            }
            
            // Null all tab IDs
            var pruneTabs = []
            for(var t in this.tree[w].tabs) {
                this.tree[w].tabs[t].id = null
                // Should tab be pruned?
                if( !this.tree[w].tabs[t].sticky ) pruneTabs.push(t)
            }
            // Prune tabs
            pruneTabs = pruneTabs.reverse()
            for(var p in pruneTabs) {              // why the fuck is p a string?
                this.tree[w].tabs.splice(pruneTabs[p], 1)
            }
            
        }
        // Prune windowssave
        pruneWindows = pruneWindows.reverse()
        for(var p in pruneWindows) {      // why the fuck is p a string?
            this.tree.splice(pruneWindows[p], 1)
        }
        console.log("iRCT tree length: " + this.tree.length)
    }
    
    
    this.pruneWindowsTabsForClose = function(win) {
        // Remove non-sticky tabs from a window
        var pruneTabs = []
        for(var t in win.tabs) {
            win.tabs[t].id = null
            // Should tab be pruned?
            if( !win.tabs[t].sticky ) pruneTabs.push(t)
        }
        // Prune tabs
        pruneTabs = pruneTabs.reverse()
        for(var p in pruneTabs) {                 // why the fuck is p a string?
            win.tabs.splice(pruneTabs[p], 1)
        }
    }
    
    
    this.save = function() {
        // Save data to sync
        console.log("save: ")
        this._storage.set({"tabbro":this.data})
    }
    
    this.addListeners = function() {
        bro = this
        
        // Add window listeners
        chrome.windows.onCreated.addListener(function(e) {
            if(e.type!="normal") return
            console.log("windows.onCreated")
            console.log(e)
            bro.tree.push({
                id: e.id,
                tabs:[],
                sticky: false,
                name: ""
            })
        })
        
        
        chrome.windows.onRemoved.addListener(function(windowid) {
            console.log("windows.onRemoved")
            //console.log(windowid)
            var thewindow = bro.t_getWindow(windowid)
            if(thewindow.sticky) {
                // If the window is sticky, we only mark it as closed
                thewindow.id = null
                // and remove non-sticky tabs in it
                bro.pruneWindowsTabsForClose(thewindow)
            } else {
                // Not sticky = delete window and contained tabs
                bro.t_removeWindow(windowid)
            }
            
            bro.notify()
        })
        
        
        chrome.windows.onFocusChanged.addListener(function(x) {
            console.log("windows.onFocusChanged")
            console.log(x)
        })
        
        
        // Add tab listeners
        chrome.tabs.onCreated.addListener(function(e) {
            console.log("tabs.onCreated")
            console.log(e)
            
            bro.t_addTabtoWindow(e.windowId, {
                id: e.id,
                title: e.title,
                url: e.url,
                sticky: false,
                name: ""
            }, e.index)
            
            bro.notify()
        })
        
        
        chrome.tabs.onUpdated.addListener(function(tabid) {
            //console.log("tabs.onUpdated")
            //console.log(tabid)
            // TODO loading indicator when a tab is loading
            // Update tab title
            tab = bro.t_getTab(tabid)
            chrome.tabs.get(tabid, function(_tab) {
                tab.title = _tab.title
            })
            
        })
        
        
        chrome.tabs.onMoved.addListener(function(x) {
            console.log("tabs.onMoved")
            console.log(x)
            // TODO re-order data model when tabs are re-ordered
        })
        
        
        chrome.tabs.onActivated.addListener(function(x) {
            //console.log("tabs.onActivated")
            //console.log(x)
            // TODO indicate that this tab is the active one
        })
        
        
        chrome.tabs.onHighlighted.addListener(function(x) {
            //console.log("tabs.onHighlighted")
            //console.log(x)
            // This seems the same as tabs.onActivated?
        })
        
        
        chrome.tabs.onDetached.addListener(function(x) {
            console.log("tabs.onDetached")
            console.log(x)
            // TODO this is when the user pulls a tab off the window
        })
        
        
        chrome.tabs.onAttached.addListener(function(x) {
            console.log("tabs.onAttached")
            console.log(x)
            // TODO this is when a the user drops a tab onto another window
        })
        
        
        chrome.tabs.onRemoved.addListener(function(tabid) {
            console.log("tabs.onRemoved")
            console.log(tabid)
            
            
            var thewindow = bro.t_getWindowFromTab(tabid)
            var thetab = bro.t_getTab(tabid)
            
            
            if(thetab.sticky) {
                // If the tab is sticky, we only mark it as closed
                thetab.id = null
            } else {
                // Not sticky = delete window and contained tabs
                bro.t_removeTab(tabid)
            }
            
            bro.notify()
        })
        
        
        chrome.tabs.onReplaced.addListener(function(x) {
            //console.log("tabs.onReplaced")
            //console.log(x)
            // TODO handle when a tab is inexplicable replaced with another tab
        })
    }
    
    this.load()
}

window.tabbro = new _tabbro_()