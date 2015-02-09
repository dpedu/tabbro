var background = null;
var tabbro = null;

document.addEventListener('DOMContentLoaded', function() {
    
    chrome.runtime.getBackgroundPage(function(page) {
        background = page;
        tabbro = background.tabbro
        tabbro.hook_repaint = repaint
        setup()
    })
    
    document.getElementById("refresh").onclick = function() {
        document.getElementById("root").innerHTML = ""
        setTimeout(function() {
            chrome.runtime.getBackgroundPage(function(page) {
                background = page;
                tabbro = background.tabbro
                setup()
            })
        }, 1000)
    }
    
});

function element(kind, options) {
    var special = ["_html", "_parent", "_onclick"]
    var element = document.createElement(kind);
    
    if(options) {
        if(options._html) {
            element.innerHTML = options._html
        }
        if(options._parent) {
            options._parent.appendChild(element)
        }
        if(options._onclick) {
            element.onclick = options._onclick
        }
    }
    for(var key in options) {
        if(special.indexOf(key)==-1) element.setAttribute(key, options[key])
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
    var win = document.createElement('li');
    
    var label = element('span', {_html: '<i class="fa fa-square-o"></i> Window '+windowdata.id, _parent:win})
    
    var options = element('div', {class:"options", _parent:label})
    
    var stickunstick = element('a', {
        class:"unstick"+(windowdata.sticky?" stuck":""),
        _onclick: function() {
            console.log("Stuck window #"+winnum)
            tabbro.ui_stick_window(winnum)
            repaint()
        },
        href: "#",
        title: (windowdata.sticky?"Unstick tab":"Stick window"),
        _html:(windowdata.sticky?'<i class="fa fa-minus-circle"></i>':'<i class="fa fa-thumb-tack"></i>'),
        _parent:options
    })
    
    
    var deletewindow = element('a', {
        class:"delete",
        _onclick: function() {
            console.log("Delete window #"+winnum)
            tabbro.ui_delete_window(winnum)
            repaint()
        },
        href: "#",
        title: "Delete tab",
        _html:'<i class="fa fa-times"></i>',
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
    var tab = element('li', {class:"clearfix"})
    tab.innerHTML = tabdata.title + " ("+tabdata.id+")"
    
    var options = element('div', {class:"options", _parent:tab})
    
    var stickunstick = element('a', {
        class:"unstick"+(tabdata.sticky?" stuck":""),
        _onclick: function() {
            console.log("Stuck tab #"+tabnum+" in window #"+winnum)
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
            console.log("Delete tab #"+tabnum+" in window #"+winnum)
            tabbro.ui_delete_tab(winnum, tabnum)
            repaint()
        },
        href: "#",
        title: "Delete tab",
        _html:'<i class="fa fa-times"></i>',
        _parent:options
    })
    
    
    return tab
}
