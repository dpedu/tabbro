_tabbro_ = function() {
    
    // Options
    this.options = {
        "autoStickyTabs":true
    }
    
    // Database version
    this.__VERSION = 1;
    
    // All tabbro data
    this.data = null;
    
    // Tab tree
    this.tree = null;
    // Chrome window ID -> our data object
    this.windows_by_id = [];
    // Chrome tab ID -> our data object
    this.tabs_by_id = [];
    
    // Detached tabs
    this.detached_tabs = [];
    
    // Storage engines
    this._storage = chrome.storage.local;
    this._cloudstorage = chrome.storage.local;
    
    // the next created window should be stored in the tree window at this index. null for disabled
    this.nextCreatedWindowIndex = null
    
    // Action hook - called when we've done something that potentionally could require SAVING and/or any of the guis to be updated
    this.hook_repaint == null
    
    this.notify = function() {
        tabbro.updateCount()
        if(this.hook_repaint!=null) {
            setTimeout(this.hook_repaint, 1)
        }
        this.save()
    }
    
    // TREE HELPERS
    this.t_getWindow = function(winid) {
        for(var i in this.tree) {
            if(this.tree[i].id==winid) {
                return this.tree[i]
            }
        }
        //var window = this.windows_by_id[winid]
        //if(this.tree.indexOf(window)===-1) return null
        return window
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
        //if(this.tabs_by_id[tabid]) {
        //    return this.tabs_by_id[tabid]
        //}
        for(var w in this.tree) {
            for(var t in this.tree[w].tabs) {
                if(this.tree[w].tabs[t].id==tabid) {
                    return this.tree[w].tabs[t]
                }
            }
        }
    }
    
    this.t_addTabtoWindow = function(winid, tabinfo, index) {
        // Add a tab record to a window specified by winid
        var win = this.t_getWindow(winid)
        if(win) {
            win.tabs.splice(index, 0, tabinfo)
            if(this.options.autoStickyTabs && win.sticky) {
                tabinfo.sticky = true;
            }
        }
        this.tabs_by_id[tabinfo.id] = tabinfo
        //console.log(this.tabs_by_id[tabinfo.id])
    }
    
    this.t_removeTab = function(tabid) {
        // Removed tab record
        var thewindow = this.t_getWindowFromTab(tabid)
        // If the window is missing, it was probably ignored because we ignore non-"normal" windows
        //if(typeof thewindow == "undefined") return 
        
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
        } else {
            // Check if the window will have 0 tabs - delete the window it if it does, tab is taken with it
            if(this.tree[winindex].tabs.length == 1) {
                this.tree.splice(winindex,1)
            } else {
                // Delete from it's window
                this.tree[winindex].tabs.splice(tabindex, 1)
            }
        }
        this.notify()
    }
    
    this.ui_delete_window = function(winindex) {
        // Delete window at windowindex
        var window = this.tree[winindex]
        
        // If the window isn't loaded, delete it
        if(window.id==null) {
            this.tree.splice(winindex, 1)
        } else {
            // If the window is loaded, close it and the events fired will take care of cleanup
            chrome.windows.remove(window.id)
        }
        this.notify()
    }
    
    this.ui_stick_tab = function(winindex, tabindex) {
        // Toggle sticky state for tab at tabindex from window at windowindex
        this.tree[winindex].tabs[tabindex].sticky = !this.tree[winindex].tabs[tabindex].sticky
        // Stick the window if we just stuck a tab
        if(this.tree[winindex].tabs[tabindex].sticky) {
           this.tree[winindex].sticky = true
        }
        this.notify()
    }
    
    this.ui_stick_window = function(winindex) {
        // Toggle sticky state for window at windowindex
        this.tree[winindex].sticky = !this.tree[winindex].sticky
        // Apply same setting to every tab in the window
        for(var i in this.tree[winindex].tabs) {
            this.tree[winindex].tabs[i].sticky = this.tree[winindex].sticky
        }
        this.notify()
    }
    
    this.ui_open_window = function(winindex) {
        var bro = this
        // Open saved window at index winindex
        
        // Get the window
        var win = this.tree[winindex]
        var opening_sticky = win.sticky
        if(win.id!=null) {
            opening_sticky = false
        }
        if(opening_sticky) {
            this.nextCreatedWindowIndex = winindex
        }
        
        var moreTabsToOpen = win.tabs.slice(1)
        //console.log("More="+moreTabsToOpen.length)
        
        // If the initial tab needed to be sticky, do so, and move it to 0 - handled in tab oncreate listener
        if(win.tabs[0].pinned) {
            this.pinNextCreatedTab = true;
        }
        
        
        // Open new chrome window with only the first tab from this group
        chrome.windows.create({
            focused:true,
            url:win.tabs[0].url,
        }, function(ev) {
            
            var newwindowid = ev.id
            if(opening_sticky) {
                win.id = newwindowid
            }
            
            // Open the rest of the tabs in this group
            if(moreTabsToOpen.length>0) {
            
                // Delete existing tabs after first from record
                if(opening_sticky) {
                    win.tabs.splice(1, 9999)
                }
                // Recreate all tabs in new window
                for(var i in moreTabsToOpen) {
                    chrome.tabs.create({
                        windowId:newwindowid,
                        url:moreTabsToOpen[i].url,
                        pinned:moreTabsToOpen[i].pinned
                    }, function(ev) {
                        // Mark tab as sticky again
                        if(opening_sticky) {
                            bro.tabs_by_id[ev.id].sticky = true
                        }
                    })
                }
            }
            // Mark the 1st tab sticky if needed
            if(opening_sticky) {
                bro.t_getWindow(newwindowid).tabs[0].sticky=true
            }
        })
    }
    
    this.ui_open_tab = function(winindex, tabindex) {
        // Open a single tab
        var tab = this.tree[winindex].tabs[tabindex]
        chrome.windows.create({
            focused:true,
            url:tab.url
        }, function(ev) {
            //debugger
            console.log("ui_open_tab")
            console.log(ev)
        })
    }
    
    this.ui_rename_window = function(winindex, newname) {
        this.tree[winindex].name = newname
        this.notify()
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
        var bro = this
        // Load data from sync
        this._storage.get("tabbro", function(_data){
            // If there's no data we get {}
            if(_data.tabbro==undefined) {
                //console.log("setup: initializing tabbro")
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
        
        this._storage.get("tabbro_options", function(_data){
            if(_data.tabbro_options==undefined) {
                // Use defaults
            } else {
                for(var i in _data.tabbro_options) {
                    bro.options[i] = _data.tabbro_options[i]
                }
            }
        })
    }
    
    this.setup = function() {
        // Set the notification color
        chrome.browserAction.setBadgeBackgroundColor({"color":"#990000"})
        
        // Set up the data tree
        this.initializeTree()
        // Add evnt listeners
        this.addListeners()
        //console.log("Tabbro v" + this.__VERSION + " ready!")
    }
    
    this.initializeTree = function() {
        // If any non-sticky windows are in our data from a previous session, remove them
        this.pruneData(); 
        // Add all open windows/tabs to the database tree
        this.loadInitialTree()
    }
    
    this.loadInitialTree = function() {
        // Add all open windows/tabs to the database tree
        var bro = this
        // Get all windows
        chrome.windows.getAll(function(_windows){
            for(var w in _windows) {
                //if(_windows[w].type!="normal") continue;
                var newWindowInfo = {
                    id: _windows[w].id,
                    tabs:[],
                    sticky: false,
                    name: "Window"
                }
                
                bro.tree.push(newWindowInfo)
                bro.windows_by_id[_windows[w].id] = newWindowInfo
                
                // Get all tabs in this window
                chrome.tabs.getAllInWindow(_windows[w].id, function(_tabs){
                    //console.log(_tabs)
                    for(var i in _tabs) {
                        var w = bro.t_getWindow(_tabs[i].windowId)
                        var newTabInfo = {
                            id: _tabs[i].id,
                            title: _tabs[i].title,
                            url: _tabs[i].url,
                            sticky: false,
                            name: "Tab",
                            icon: (_tabs[i].favIconUrl?_tabs[i].favIconUrl:null),
                            pinned: _tabs[i].pinned
                        }
                        w.tabs.push(newTabInfo)
                        bro.tabs_by_id[_tabs[i].id] = newTabInfo
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
            //console.log("pruneData: pruneTabs:" )
            //console.log(pruneTabs)
            for(var p in pruneTabs) {              // why the fuck is p a string?
                this.tree[w].tabs.splice(pruneTabs[p], 1)
            }
            
        }
        // Prune windows
        pruneWindows = pruneWindows.reverse()
        //console.log("pruneData: pruneWindows:" )
        //console.log(pruneWindows)
        for(var p in pruneWindows) {      // why the fuck is p a string?
            var removed = this.tree.splice(pruneWindows[p], 1)
            //console.log("Pruned: ")
            //console.log(removed)
        }
        //console.log("after pruneData: tree length: " + this.tree.length)
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
        // Save data to chrome
        this._storage.set({"tabbro":this.data})
        // Save options to cloud
        this._cloudstorage.set({"tabbro_options":this.options})
    }
    
    this.addListeners = function() {
        var bro = this
        
        // Add window listeners
        chrome.windows.onCreated.addListener(function(e) {
            //if(e.type!="normal") return
            console.log("windows.onCreated: "+e.id)
            //console.log(e)
            
            if(bro.nextCreatedWindowIndex==null) {
                var newWindowInfo = {
                        id: e.id,
                        tabs:[],
                        sticky: false,
                        name: "New Window"
                    }
                bro.tree.push(newWindowInfo)
                bro.windows_by_id[e.id]=newWindowInfo
            } else {
                // We were just ordered to restore a saved window
                // bypass adding it to the tree and update the window in our tree
                var win = bro.tree[bro.nextCreatedWindowIndex]
                win.id = e.id
                bro.windows_by_id[win.id]=win
                //win.sticky = true
                bro.nextCreatedWindowIndex = null;
            }
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
            bro.windows_by_id[windowid]=undefined
            bro.notify()
        })
        
        chrome.windows.onFocusChanged.addListener(function(x) {
            //console.log("windows.onFocusChanged")
            //console.log(x)
        })
        
        // Add tab listeners
        chrome.tabs.onCreated.addListener(function(e) {
            console.log("tabs.onCreated")
            //console.log(e)
            
            var pinned = e.pinned
            
            if(bro.pinNextCreatedTab) {
                bro.pinNextCreatedTab=false
                chrome.tabs.update(e.id, {pinned:true},function() {
                    //console.log("Success!!!!")
                })
                chrome.tabs.move(e.id, {index:0},function() {
                    //console.log("Success!!!!1")
                })
                pinned=true
            }
            
            
            bro.t_addTabtoWindow(e.windowId, {
                id: e.id,
                title: e.title,
                url: e.url,
                sticky: false,
                name: "",
                pinned: pinned
            }, e.index)
            
            bro.notify()
        })
        
        chrome.tabs.onUpdated.addListener(function(tabid) {
            console.log("tabs.onUpdated "+tabid)
            // TODO loading indicator when a tab is loading
            // TOOO determine if other attributes need to be tracked
            // Update tab title
            tab = bro.t_getTab(tabid)
            
            if(tab) chrome.tabs.get(tabid, function(_tab) {
                //if(_tab == null) debugger
                //if(tab == null) debugger
                tab.title = _tab.title
                tab.url = _tab.url
                tab.pinned = _tab.pinned
                if(_tab.favIconUrl) {
                    tab.icon = _tab.favIconUrl;
                }
            })
            
        })
        
        chrome.tabs.onMoved.addListener(function(tabid) {
            console.log("tabs.onMoved "+tabid)
            
            // Fetch tab
            chrome.tabs.get(tabid, function(_tab) {
                // Fetch window
                var thewindow = bro.t_getWindow(_tab.windowId)
                
                // Find it in the array
                var thetab = bro.t_getTab(tabid);
                var tabindex = thewindow.tabs.indexOf(thetab);
                
                // Splice it out
                thewindow.tabs.splice(tabindex, 1);
                
                // Splice it into the new spot
                thewindow.tabs.splice(_tab.index, 0, thetab);
            })
        })
        
        chrome.tabs.onActivated.addListener(function(x) {
            console.log("tabs.onActivated")
            console.log(x)
            // TODO indicate that this tab is the active one
        })
        
        chrome.tabs.onHighlighted.addListener(function(x) {
            console.log("tabs.onHighlighted")
            console.log(x)
            // This seems the same as tabs.onActivated?
        })
        
        chrome.tabs.onDetached.addListener(function(tabid) {
            console.log("tabs.onDetached "+tabid)
            // Remove tab from it's window
            var tab = bro.t_getTab(tabid)
            bro.t_removeTab(tabid)
            
            // Add tab to bro.detached_tabs
            bro.detached_tabs[tabid] = tab
        })
        
        chrome.tabs.onAttached.addListener(function(tabid) {
            console.log("tabs.onAttached "+tabid)
            // Remove from bro.detached_tabs
            var tab = bro.detached_tabs.splice(tabid, 1)[0]
            
            // Add tab to window
            chrome.tabs.get(tabid, function(_tab) {
                var thewindow = bro.t_getWindow(_tab.windowId)
                thewindow.tabs.splice(_tab.index, 0, tab)
            })
        })
        
        chrome.tabs.onRemoved.addListener(function(tabid) {
            console.log("tabs.onRemoved "+tabid)
            //console.log(tabid)
            
            
            var thewindow = bro.t_getWindowFromTab(tabid)
            var thetab = bro.t_getTab(tabid)
            
            
            if(thetab && thetab.sticky) {
                // If the tab is sticky, we only mark it as closed
                thetab.id = null
            } else {
                // Not sticky = delete window and contained tabs
                bro.t_removeTab(tabid)
            }
            
            bro.notify()
        })
        
        chrome.tabs.onReplaced.addListener(function(x) {
            console.log("tabs.onReplaced")
            //console.log(x)
            // TODO handle when a tab is inexplicable replaced with another tab
        })
    }
    
    this.update_setting = function(settingName, newValue) {
        if(typeof(this.options[settingName]) != "undefined") {
            this.options[settingName] = newValue
        }
        this.save()
    }
    
    this.load()
}

window.tabbro = new _tabbro_()