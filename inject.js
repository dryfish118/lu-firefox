function sendLog(msg) {
    chrome.runtime.sendMessage({ message: "log", param1: msg });
}

sendLog("inject.js injected.");

function parseLoginPage() {
    sendLog("parseLoginPage");
    chrome.runtime.sendMessage({ message: "get", param1: "telephone" }, function(response) {
        var telephone = response;
        sendLog("aquire telephone: " + telephone);
        if (telephone === "") {
            sendLog("login by username");
            $("div[data-role=userName]").trigger("click");
            chrome.runtime.sendMessage({ message: "get", param1: "username" }, function(response) {
                var username = response;
                sendLog("aquire username: " + username);
                $("#userNameLogin").val(username);
                chrome.runtime.sendMessage({ message: "get", param1: "userpass" }, function(response) {
                    var pass = response;
                    sendLog("aquire password ");
                    $("#pwd").val(pass);
                    $("#loginFlagnew").trigger("click");
                });
            });
        } else {
            $("div[data-role=mobile]").trigger("click");
            sendLog("login by telephone");
            $("#userNameLogin").val(telephone);
            chrome.runtime.sendMessage({ message: "get", param1: "userpass" }, function(response) {
                var pass = response;
                sendLog("acquired password.");
                $("#pwd").val(pass);
                $("#loginFlagnew").trigger("click");
            });
        }
    });
}

function parseAccountPage() {
    sendLog("parseAccountPage");
    var yue = $(".account-balance-item  .coin-point-item-number").get(0);
    if (yue === undefined) {
        sendLog("failed to get yu e.");
        chrome.runtime.sendMessage({ message: "account", param1: "No" });
    } else {
        var linghuobao = $(".coin-point-item-lujinbao  .coin-point-item-number").get(0);
        if (linghuobao === undefined) {
            sendLog("failed to get linghuobao.");
            chrome.runtime.sendMessage({ message: "account", param1: "No" });
        } else {
            var amount = parseFloat($(yue).text().replace(",", "")) + parseFloat($(linghuobao).text().replace(",", ""));
            sendLog("amount found " + amount.toFixed(2));
            chrome.runtime.sendMessage({ message: "account", param1: "Yes", param2: amount });
        }
    }
}

var LuProduct = {
    createProduct: function() {
        var product = {};
        product.name = "";
        product.url = "";
        product.rate = 0;
        product.amount = 0;
        return product;
    }
};

function parseProductListPage(minRate) {
    sendLog("parseProductListPage");
    var lg = $("#top-login");
    if (lg === undefined || $(lg).hasClass("hidden")) {
        chrome.runtime.sendMessage({ message: "productlist", param1: "login" });
        return;
    }
    var productList = $(".product-list");
    if (productList === undefined || productList.length === 0) {
        chrome.runtime.sendMessage({ message: "productlist", param1: "No" });
    } else {
        sendLog("the valid rate is " + minRate.toFixed(2));
        var products = [];
        productList.each(function() {
            var product = LuProduct.createProduct();
            var status = $(this).find(".product-status").get(0);
            if (status !== undefined) {
                var a = $(status).find("a");
                if ($(a).attr("data-sk") === "invest_list") {
                    var rate = $(this).find(".interest-rate .num-style").get(0);
                    if (rate !== undefined) {
                        //sendLog("the product rate is %s", $(rate).text());
                        product.rate = parseFloat($(rate).text());
                        //sendLog("the product rate is %s", product.rate.toFixed(2));
                        if (parseInt(product.rate * 100) >= parseInt(minRate * 100)) {
                            var name = $(this).find(".product-name").get(0);
                            if (name !== undefined) {
                                a = $(name).find("a");
                                product.name = $(a).text();
                                product.url = $(a).attr("href");
                                if (product.url !== undefined && product.url.length > 0) {
                                    var amount = $(this).find(".product-amount .num-style").get(0);
                                    if (amount !== undefined) {
                                        product.amount = parseFloat($(amount).text().replace(",", ""));

                                        var i = 0;
                                        for (; i < products.length; i++) {
                                            if (product.rate * product.amount > products[i].rate * products[i].amount) {
                                                break;
                                            }
                                        }
                                        if (i === products.length) {
                                            products.push(product);
                                        } else {
                                            products.splice(i, 0, product);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (products.length === 0) {
            chrome.runtime.sendMessage({ message: "productlist", param1: "No" });
        } else {
            var data = { message: "productlist", param1: "Yes", param2: [] };
            for (var ii = 0; ii < products.length; ii++) {
                data.param2.push(products[ii].url);
            }
            chrome.runtime.sendMessage(data);
        }
    }
}

function parseProductPage() {
    sendLog("parseProductPage");
    var done = $("div .done-info");
    if (done !== undefined && $(done).html() !== undefined) {
        sendLog($(done).html());
        sendLog("done");
        chrome.runtime.sendMessage({ message: "product", param1: "No" });
    } else {
        var status = $("div .status-temp-full");
        if (status !== undefined && $(status).html() !== undefined) {
            sendLog("status-temp-full");
            chrome.runtime.sendMessage({ message: "product", param1: "No" });
        } else {
            $("body").bind("DOMNodeInserted", function(e) {
                sendLog("DOMNodeInserted");
                var obj = jQuery(e.target);
                if (obj.hasClass("blockPage")) {
                    $("body").unbind("DOMNodeInserted");
                    sendLog("blockPage");
                    chrome.runtime.sendMessage({ message: "product", param1: "No" });
                }
            });

            sendLog("trigger click");
            var a = $("a[data-sk=lijitouzi]");
            var lijitouzi = a.first();
            $(lijitouzi).html("<span id='lijitouzi'>" + $(lijitouzi).html() + "</span>");
            $("#lijitouzi").trigger("click");
        }
    }
}

function parseTradePage() {
    sendLog("parseTradePage");
    $("body").bind("DOMNodeInserted", function(e) {
        //sendLog("DOMNodeInserted");
        var obj = jQuery(e.target);
        if (obj.hasClass("blockPage")) {
            $("body").unbind("DOMNodeInserted");
            sendLog("blockPage");
            chrome.runtime.sendMessage({ message: "trade", param1: "No" });
        }
    });

    $(".infoNextBtn span").click(function() {
        sendLog(".infoNextBtn span clicked");
    });

    sendLog("click .infoNextBtn span");
    $(".infoNextBtn span").trigger("click");
}

function parseContractPage() {
    sendLog("parseContractPage");

    $("#contractAgree").change(function() {
        sendLog("contractAgree change");
        if ($('#contractAgree').prop('checked')) {
            var confirm = $("#nextBtn").first();
            $(confirm).html("<span id='btnconfirm'>" + $(confirm).html() + "</span>");
            sendLog("trigger nextBtn");
            $("#btnconfirm").trigger("click");
        }
    });

    $("#contractAgree").trigger("click");
}

function parseSecurityPage(pass) {
    sendLog("parseSecurityPage");
    $("body").bind("DOMNodeInserted", function(e) {
        //sendLog("DOMNodeInserted");
        var obj = jQuery(e.target);
        if (obj.hasClass("blockPage")) {
            $("body").unbind("DOMNodeInserted");
            sendLog("blockPage");
            chrome.runtime.sendMessage({ message: "contract", param1: "No" });
        }
    });

    $("#tradeCode").val(pass);
    $("#inputValid").focus();
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    sendLog("Receive message: " + request.message);
    if (request.message === "login") {
        parseLoginPage();
    } else if (request.message === "account") {
        parseAccountPage();
    } else if (request.message === "productlist") {
        parseProductListPage(parseFloat(request.rate));
    } else if (request.message === "product") {
        parseProductPage();
    } else if (request.message === "trade") {
        parseTradePage();
    } else if (request.message === "contract") {
        parseContractPage();
    } else if (request.message === "security") {
        parseSecurityPage(request.pass);
    } else if (request.message === "test") {
        parseContractPage();
    }
});