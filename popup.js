var background = null;
var tabbro = null;

document.addEventListener('DOMContentLoaded', function() {
    
    chrome.runtime.getBackgroundPage(function(page) {
        background = page;
        tabbro = background.tabbro
        tabbro.hook_repaint = repaint
        setup()
    })
    
    /*document.getElementById("refresh").onclick = function() {
        document.getElementById("root").innerHTML = ""
        setTimeout(function() {
            chrome.runtime.getBackgroundPage(function(page) {
                background = page;
                tabbro = background.tabbro
                setup()
            })
        }, 1000)
    }*/
    
});

function element(kind, options) {
    var special = ["_html", "_parent"]
    var element = document.createElement(kind);
    
    if(options) {
        if(options._html) {
            element.innerHTML = options._html
        }
        if(options._parent) {
            options._parent.appendChild(element)
        }
    }
    for(var key in options) {
        if(special.indexOf(key)==-1) {
            if(key.substr(0,3)=="_on") { // Keys prefixed with _on are treated as event listeners such as _onclick
                if(typeof options[key] == "string") { // if _onclick is set to "_mouseover", the  same event listener will be re-used
                    element[key.substr(1)] = options[options[key]]
                } else {
                    element[key.substr(1)] = options[key]
                }
            } else element.setAttribute(key, options[key])
        }
    }
    return element
}

function setup() {
    repaint()
}

function repaint() {
    document.getElementById("root").innerHTML = ""
    renderTree(tabbro.tree)
    tabbro.updateCount()
}
function renderTree(data) {
    root = document.getElementById("root")
    
    for(var w in data) {
        root.appendChild(renderWindow(data[w], w))
    }
    
}

function renderWindow(windowdata, winnum) {
    var win = element('li', {class:(windowdata.sticky?"sticky":"")+(windowdata.id==null?" unloaded":" loaded")});
    
    var label = element('span', {class:"name-line", _parent:win})
    var label_icon = element('span', {class:"name-icon", _parent:label, _html:(windowdata.sticky?'<i class="fa fa-thumb-tack"></i> ':'')})
    var label_name = element('span', {class:"name-string", _parent:label, _html:windowdata.name, _ondblclick:function(){
        var namestringspan = this
        var name = namestringspan.innerHTML
        
        namestringspan.innerHTML = ""
        
        var input = element('input', {
            _parent: namestringspan,
            value:name,
            "data-original":name,
            type:"text",
            _onblur:function(ev){
                if(ev && ev.keyCode) {
                    if(ev.keyCode!=13) {
                        return
                    }
                }
                if(this.value.trim().length==0) {
                    this.value = this.getAttribute("data-original")
                    this.focus()
                    this.setSelectionRange(0,9999)
                    this.classList.add("nope")
                    var theinput = this
                    setTimeout(function(){
                        theinput.classList.remove("nope")
                    }, 450)
                    return
                }
                //console.log("Rename window #"+winnum+" to "+this.value)
                tabbro.ui_rename_window(winnum, this.value)
                namestringspan.innerHTML = this.value
            }, _onkeyup:"_onblur"
        })
        
        input.focus()
        input.setSelectionRange(0,9999)
    }})
    
    var options = element('div', {class:"options", _parent:win})
    
    if(windowdata.id!=null) {
        var stickunstick = element('a', {
            class:"unstick"+(windowdata.sticky?" stuck":""),
            _onclick: function() {
                //console.log("Stuck window #"+winnum)
                tabbro.ui_stick_window(winnum)
                repaint()
            },
            href: "#",
            title: (windowdata.sticky?"Unstick tab":"Stick window"),
            _html:(windowdata.sticky?'<i class="fa fa-minus-circle"></i>':'<i class="fa fa-thumb-tack"></i>'),
            _parent:options
        })
    }
    
    var deletewindow = element('a', {
        class:"delete",
        _onclick: function() {
            //console.log("Delete window #"+winnum)
            tabbro.ui_delete_window(winnum)
            repaint()
        },
        href: "#",
        title: "Delete tab",
        _html:'<i class="fa fa-times"></i>',
        _parent:options
    })
    
    var opennew = element('a', {
        class:"open",
        _onclick: function() {
            //console.log("Open window #"+winnum)
            tabbro.ui_open_window(winnum)
            repaint()
        },
        href: "#",
        title: "Duplicate window",
        _html:'<i class="fa fa-external-link-square"></i>',
        _parent:options
    })
    
    
    var list = element("ul", {class:"window"})
    for(var i in windowdata.tabs) {
        list.appendChild(renderTab(windowdata.tabs[i], i, winnum))
    }
    win.appendChild(list)
    
    return win
}

function renderTab(tabdata, tabnum, winnum) {
    //console.log("renderTab("+tabdata+", "+tabnum+", "+winnum+")")
    //console.log(tabdata)
    
    var tab = element('li', {class:"clearfix "+(tabdata.id==null?'unloaded':'loaded')})
    
    if(tabdata.icon && tabdata.icon.substr(0, 9)!="chrome://") {
        tab.style.backgroundImage = "url(\""+tabdata.icon+"\")";
    } else {
        tab.style.backgroundImage = "url(\"chrome.png\")";
    }
    
    var label = element('span', {class:"name-line", _parent:tab})
    var label_icon = element('span', {class:"name-icon", _parent:label, _html:(tabdata.sticky?'<i class="fa fa-thumb-tack"></i> ':'')})
    var label_name = element('span', {class:"name-string", _parent:label, _html:tabdata.title.trim()==""?"(No title)":tabdata.title})
    
    var options = element('div', {class:"options", _parent:tab})
    
    var stickunstick = element('a', {
        class:"unstick"+(tabdata.sticky?" stuck":""),
        _onclick: function() {
            //console.log("Stuck tab #"+tabnum+" in window #"+winnum)
            tabbro.ui_stick_tab(winnum, tabnum)
            repaint()
        },
        href: "#",
        title: (tabdata.sticky?"Unstick tab":"Stick tab"),
        _html:(tabdata.sticky?'<i class="fa fa-minus-circle"></i>':'<i class="fa fa-thumb-tack"></i>'),
        _parent:options
    })
    
    var deletetab = element('a', {
        class:"delete",
        _onclick: function() {
            //console.log("Delete tab #"+tabnum+" in window #"+winnum)
            tabbro.ui_delete_tab(winnum, tabnum)
            repaint()
        },
        href: "#",
        title: "Delete tab",
        _html:'<i class="fa fa-times"></i>',
        _parent:options
    })
    
    
    var opennew = element('a', {
        class:"open",
        _onclick: function() {
            //console.log("Open tab #"+tabnum+" from window #"+winnum)
            tabbro.ui_open_tab(winnum, tabnum)
            repaint()
        },
        href: "#",
        title: "Duplicate tab",
        _html:'<i class="fa fa-external-link"></i>',
        _parent:options
    })
    
    return tab
}
