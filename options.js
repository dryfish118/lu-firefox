var storage = chrome.storage.local;
loadConfig();

function loadConfig() {
    console.log("load config");

    chrome.runtime.sendMessage({ message: "get", param1: "telephone" }, function(response) {
        $("#telephone").val(response);
        chrome.runtime.sendMessage({ message: "get", param1: "username" }, function(response) {
            $("#username").val(response);
            chrome.runtime.sendMessage({ message: "get", param1: "userpass" }, function(response) {
                $("#userpass").val(response);
                chrome.runtime.sendMessage({ message: "get", param1: "tradepass" }, function(response) {
                    $("#tradepass").val(response);
                    chrome.runtime.sendMessage({ message: "get", param1: "refresh" }, function(response) {
                        $("#refresh").val(response);
                        chrome.runtime.sendMessage({ message: "get", param1: "maxmoney" }, function(response) {
                            $("#maxmoney").val(response);
                            chrome.runtime.sendMessage({ message: "get", param1: "minmoney" }, function(response) {
                                $("#minmoney").val(response);
                                chrome.runtime.sendMessage({ message: "get", param1: "minrate" }, function(response) {
                                    $("#minrate").val(response);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

$("#submit").click(function() {
    console.log("save config");

    chrome.runtime.sendMessage({ message: "set", param1: "telephone", param2: $("#telephone").val() }, function() {
        chrome.runtime.sendMessage({ message: "set", param1: "username", param2: $("#username").val() }, function() {
            chrome.runtime.sendMessage({ message: "set", param1: "userpass", param2: $("#userpass").val() }, function() {
                chrome.runtime.sendMessage({ message: "set", param1: "tradepass", param2: $("#tradepass").val() }, function() {
                    chrome.runtime.sendMessage({ message: "set", param1: "refresh", param2: $("#refresh").val() }, function() {
                        chrome.runtime.sendMessage({ message: "set", param1: "maxmoney", param2: $("#maxmoney").val() }, function() {
                            chrome.runtime.sendMessage({ message: "set", param1: "minmoney", param2: $("#minmoney").val() }, function() {
                                chrome.runtime.sendMessage({ message: "set", param1: "minrate", param2: $("#minrate").val() });
                            });
                        });
                    });
                });
            });
        });
    });
});

$("#reset").click(loadConfig);