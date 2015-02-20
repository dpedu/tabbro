var tabbro = null;

document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.getBackgroundPage(function(page) {
        tabbro = page.tabbro
        setup()
    })
});

function setup() {
    // Data dump
    document.getElementById("dumpout").value = JSON.stringify(tabbro.tree)
    
    // Set initial option state
    for(var i in tabbro.options) {
        var input = document.getElementById(i);
        var value = tabbro.options[i]
        if(typeof value == "boolean") {
            input.checked = value
        }
        input.onchange = function() {
            var settingName = this.getAttribute("id")
            var newValue = null
            if(this.getAttribute("type")=="checkbox") {
                newValue =  this.checked
                if(newValue) {
                    this.parentElement.parentElement.childNodes[3].childNodes[1].style.display=""
                    this.parentElement.parentElement.childNodes[3].childNodes[3].style.display="none"
                } else {
                    this.parentElement.parentElement.childNodes[3].childNodes[1].style.display="none"
                    this.parentElement.parentElement.childNodes[3].childNodes[3].style.display=""
                }
            }
            tabbro.update_setting(settingName, newValue)
        }
        input.onchange()
    }
    
    // Select-all listener for data dump field
    var dumpout = document.getElementById("dumpout")
    dumpout.onclick = function() {
        this.setSelectionRange(0,9999999)
    }
    dumpout.onkeyup = dumpout.onchange = function() {
        this.value = JSON.stringify(tabbro.tree)
    }
    
    var dumpin = document.getElementById("dumpin")
    dumpin.onchange=function() {
        var data = JSON.parse(this.value)
        var windows = 0;
        var tabs = 0;
        for(var w in data) {
            data[w].sticky = true
            data[w].id = null
            windows++
            for(var t in data[w].tabs) {
                data[w].tabs[t].sticky = true
                data[w].tabs[t].id = null
                tabs++
            }
        }
        if(confirm("Replace all tabbro data?\n\nWindows: "+windows+"\nTabs: "+tabs)) {
            tabbro.data.tree.splice(0, tabbro.data.tree.length)
            for(var w in data) {
                tabbro.data.tree.push(data[w])
            }
            tabbro.save()
            tabbro.loadInitialTree()
            alert("Done!")
            this.value="Paste JSON here"
        }
    }
}

