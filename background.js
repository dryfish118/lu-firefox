//export jwt_issuer="user:13805456:898"
//export jwt_secret="493a67741d9067e31d586bbf58ba94c891975acd3f55a4b02ee08d58701ff9cf"
//sudo web-ext sign --api-key=$jwt_issuer --api-secret=$jwt_secret

var WorkFlow = {
    WorkFlow_Idle: 1, // 空闲状态
    WorkFlow_Start: 2, // 开始投资
    WorkFlow_OpenLoginPage: 3, // 打开登录页面
    WorkFlow_InjectLogin: 4, // 嵌入登录代码
    WorkFlow_AcquireUserInfo: 5, // 获取用户信息
    WorkFlow_OpenAccountPage: 6, // 打开基金页面
    WorkFlow_InjectAccount: 7, // 嵌入基金代码
    WorkFlow_AcquireAccount: 8, // 获取用户可用金额
    WorkFlow_OpenProductListPage: 9, // 取资金内利率最大的产品列表
    WorkFlow_InjectProductList: 10, // 嵌入产品
    WorkFlow_OpenProductPage: 11, // 打开产品页面
    WorkFlow_InjectProduct: 12, // 产品
    WorkFlow_InjectTrade: 13, // 交易
    WorkFlow_InjectContract: 14, // 合同
    WorkFlow_InjectSecurity: 15, // 密码
};

var g_workFlow = WorkFlow.WorkFlow_Idle;

var g_terminate;
var g_tab;
var g_fromMoney;
var g_toMoney;
var g_rate;
var g_nextUrl;
var g_curProduct;
var g_blackProducts;

var url_login = "https://user.lu.com/user/login";
var url_userinfo = "https://user.lu.com/user/service/user/current-user-info-for-homepage";
var url_account = "https://my.lu.com/my/account";
var url_r030 = "https://list.lu.com/list/r030";
var url_list = "https://list.lu.com";
var url_trade = "https://trading.lu.com/trading/i-trade-info";
var url_contract = "https://trading.lu.com/trading/i-contract-info";
var url_security = "https://trading.lu.com/trading/i-security-valid";
var url_error = "https://promo.lu.com/transfer/v1/status_error.html";

function getTelephone() {
    if (localStorage.telephone === undefined) {
        return "";
    } else {
        return localStorage.telephone;
    }
}

function getUserName() {
    if (localStorage.username === undefined) {
        return "";
    } else {
        return localStorage.username;
    }
}

function getUserPass() {
    if (localStorage.userpass === undefined) {
        return "";
    } else {
        return localStorage.userpass;
    }
}

function getTradePass() {
    if (localStorage.tradepass === undefined) {
        return "";
    } else {
        return localStorage.tradepass;
    }
}

function getRefresh() {
    if (localStorage.refresh === undefined || localStorage.refresh === "") {
        return 10;
    } else {
        return parseInt(localStorage.refresh);
    }
}

function getMaxMoney() {
    if (localStorage.maxmoney === undefined || localStorage.maxmoney === "") {
        return 0;
    } else {
        return parseInt(localStorage.maxmoney);
    }
}

function getMinMoney() {
    if (localStorage.minmoney === undefined || localStorage.minmoney === "") {
        return 1000;
    } else {
        return parseInt(localStorage.minmoney);
    }
}

function getMinRate() {
    if (localStorage.minrate === undefined || localStorage.minrate === "") {
        return 6.0;
    } else {
        return parseFloat(localStorage.minrate);
    }
}

chrome.runtime.onMessage.addListener(function(request, _, sendResponse) {
    var message = request.message;
    var param1 = request.param1;
    var param2 = request.param2;
    if (message === "get") {
        if (param1 === "telephone") {
            sendResponse(getTelephone());
        } else if (param1 === "username") {
            sendResponse(getUserName());
        } else if (param1 === "userpass") {
            sendResponse(getUserPass());
        } else if (param1 === "tradepass") {
            sendResponse(getTradePass());
        } else if (param1 === "refresh") {
            sendResponse(getRefresh());
        } else if (param1 === "maxmoney") {
            sendResponse(getMaxMoney());
        } else if (param1 === "minmoney") {
            sendResponse(getMinMoney());
        } else if (param1 === "minrate") {
            sendResponse(getMinRate());
        }
    } else if (message === "set") {
        localStorage[param1] = param2;
    } else if (message === "log") {
        console.log(param1);
    } else if (message === "account") {
        acquireAccount(param1, param2);
    } else if (message === "productlist") {
        acquireProductList(param1, param2);
    } else if (message === "product" || message === "trade" ||
        message === "contract" || message === "security") {
        if (param1 === "No") {
            console.log("the product (%s) is sold, restart.", g_curProduct);
            g_blackProducts.push(g_curProduct);
            g_curProduct = null;
            openProductListPage();
        }
    }
});

function isUrlMatch(url1, url2) {
    if (url1 !== undefined && url2 !== undefined) {
        url1 = url1.toLowerCase();
        url2 = url2.substr(0, url1.length).toLowerCase();
        return (url1 === url2);
    }
    return false;
}

chrome.webNavigation.onCompleted.addListener(function(details) {
    if (isUrlMatch(g_nextUrl, details.url)) {
        console.log("onCompleted %s", details.url);
        switch (g_workFlow) {
            case WorkFlow.WorkFlow_OpenLoginPage:
                {
                    parseLoginPage();
                    break;
                }
            case WorkFlow.WorkFlow_InjectLogin:
                {
                    startWork();
                    break;
                }
            case WorkFlow.WorkFlow_OpenAccountPage:
                {
                    injectAccountPage();
                    break;
                }
            case WorkFlow.WorkFlow_OpenProductListPage:
                {
                    injectProductListPage();
                    break;
                }
            case WorkFlow.WorkFlow_OpenProductPage:
                {
                    injectProductPage();
                    break;
                }
            case WorkFlow.WorkFlow_InjectProduct:
                {
                    injectTradePage();
                    break;
                }
            case WorkFlow.WorkFlow_InjectTrade:
                {
                    injectContractPage();
                    break;
                }
            case WorkFlow.WorkFlow_InjectContract:
                {
                    injectSecurity();
                    break;
                }
        }
    } else if (g_workFlow === WorkFlow.WorkFlow_InjectLogin && isUrlMatch(url_login, details.url)) {
        console.log("failed to login, try again.");
        doLogin();
    } else if (isUrlMatch(url_error, details.url)) {
        console.log("error, try again.");
        g_curProduct = null;
        openProductListPage();
    }
});

function injectSecurity() {
    if (g_terminate) {
        g_terminate = false;
        return;
    }

    g_workFlow = WorkFlow.WorkFlow_InjectSecurity;
    console.log("WorkFlow_InjectSecurity");

    chrome.tabs.executeScript(g_tab.id, { file: "jquery.min.js" }, function() {
        chrome.tabs.executeScript(g_tab.id, { file: "inject.js" }, function() {
            chrome.tabs.sendMessage(g_tab.id, { message: "security", pass: getTradePass() }, null, function() {
                g_workFlow = WorkFlow.WorkFlow_Idle;
                console.log("WorkFlow_Idle");
            });
        });
    });
}

function injectContractPage() {
    if (g_terminate) {
        g_terminate = false;
        return;
    }

    g_workFlow = WorkFlow.WorkFlow_InjectContract;
    console.log("WorkFlow_InjectContract");

    g_nextUrl = url_security;
    chrome.tabs.executeScript(g_tab.id, { file: "jquery.min.js" }, function() {
        chrome.tabs.executeScript(g_tab.id, { file: "inject.js" }, function() {
            chrome.tabs.sendMessage(g_tab.id, { message: "contract" });
        });
    });
}

function injectTradePage() {
    if (g_terminate) {
        g_terminate = false;
        return;
    }

    g_workFlow = WorkFlow.WorkFlow_InjectTrade;
    console.log("WorkFlow_InjectTrace");

    g_nextUrl = url_contract;
    chrome.tabs.executeScript(g_tab.id, { file: "jquery.min.js" }, function() {
        chrome.tabs.executeScript(g_tab.id, { file: "inject.js" }, function() {
            chrome.tabs.sendMessage(g_tab.id, { message: "trade" });
        });
    });
}

function injectProductPage() {
    if (g_terminate) {
        g_terminate = false;
        return;
    }

    g_workFlow = WorkFlow.WorkFlow_InjectProduct;
    console.log("WorkFlow_InjectProduct");

    g_nextUrl = url_trade;
    chrome.tabs.executeScript(g_tab.id, { file: "jquery.min.js" }, function() {
        chrome.tabs.executeScript(g_tab.id, { file: "inject.js" }, function() {
            chrome.tabs.sendMessage(g_tab.id, { message: "product" });
        });
    });
}

function acquireProductList(result, urls) {
    if (g_terminate) {
        g_terminate = false;
        return;
    }

    if (result === "No") {
        console.log("failed to acquire the productlist, refresh & restart after %d\".", getRefresh() / 1000);
        setTimeout(openProductListPage, getRefresh());
    } else if (result === "login") {
        startWork();
    } else {
        g_workFlow = WorkFlow.WorkFlow_OpenProductPage;
        console.log("WorkFlow_OpenProductPage");

        var i = 0;
        for (; i < urls.length; i++) {
            if (!g_blackProducts.includes(urls[i])) {
                break;
            }
        }

        if (i == urls.length) {
            console.log("all products are sold, refresh & restart after %d\".", getRefresh() / 1000);
            setTimeout(openProductListPage, getRefresh());
        } else {
            g_curProduct = urls[i];
            g_nextUrl = url_list + urls[i];
            chrome.tabs.update(g_tab.id, { url: g_nextUrl });
        }
    }
}

function injectProductListPage() {
    if (g_terminate) {
        g_terminate = false;
        return;
    }

    g_workFlow = WorkFlow.WorkFlow_InjectProductList;
    console.log("WorkFlow_InjectProductList");

    chrome.tabs.executeScript(g_tab.id, { file: "jquery.min.js" }, function() {
        chrome.tabs.executeScript(g_tab.id, { file: "inject.js" }, function() {
            chrome.tabs.sendMessage(g_tab.id, { message: "productlist", rate: g_rate });
        });
    });
}

function openProductListPage() {
    if (g_terminate) {
        g_terminate = false;
        return;
    }

    g_workFlow = WorkFlow.WorkFlow_OpenProductListPage;
    console.log("WorkFlow_OpenProductListPage (%s%% %d %d)", g_rate.toFixed(2), g_fromMoney, g_toMoney);

    g_nextUrl = url_r030;
    var strData = "?currentPage=1&minMoney=" + g_fromMoney + "&maxMoney=" + g_toMoney;
    chrome.tabs.update(g_tab.id, { url: g_nextUrl + strData });
}

function acquireAccount(result, money) {
    if (g_terminate) {
        g_terminate = false;
        return;
    }

    g_workFlow = WorkFlow.WorkFlow_AcquireAccount;
    console.log("WorkFlow_AcquireAcount");

    if (result === "No") {
        console.log("failed to acquire the available amount");
        g_workFlow = WorkFlow.WorkFlow_Idle;
        console.log("WorkFlow_Idle");
    } else {
        console.log("available money:\t%s", money.toFixed(2));

        var toMoney = getMaxMoney();
        if (toMoney !== 0 && toMoney < parseInt(money)) {
            console.log("use the max money:\t%d", toMoney);
            money = toMoney;
        }
        g_toMoney = parseInt(money);

        g_fromMoney = getMinMoney();
        if (g_fromMoney !== 0) {
            if (g_fromMoney > g_toMoney) {
                console.log("poor man, go to bed and have a good dream.");
                g_workFlow = WorkFlow.WorkFlow_Idle;
                console.log("WorkFlow_Idle");
                return;
            }
        }

        g_rate = getMinRate();
        console.log("the current max rate:\t%s", g_rate.toFixed(2));

        openProductListPage();
    }
}

function injectAccountPage() {
    if (g_terminate) {
        g_terminate = false;
        return;
    }

    g_workFlow = WorkFlow.WorkFlow_InjectAccount;
    console.log("WorkFlow_InjectAccount");

    chrome.tabs.executeScript(g_tab.id, { file: "jquery.min.js" }, function() {
        chrome.tabs.executeScript(g_tab.id, { file: "inject.js" }, function() {
            chrome.tabs.sendMessage(g_tab.id, { message: "account" });
        });
    });
}

function parseLoginPage() {
    if (g_terminate) {
        g_terminate = false;
        return;
    }

    g_workFlow = WorkFlow.WorkFlow_InjectLogin;
    console.log("WorkFlow_InjectLogin");

    g_nextUrl = url_account;
    chrome.tabs.executeScript(g_tab.id, { file: "jquery.min.js" }, function() {
        chrome.tabs.executeScript(g_tab.id, { file: "inject.js" }, function() {
            chrome.tabs.sendMessage(g_tab.id, { message: "login" });
        });
    });
}

function doLogin() {
    if (g_terminate) {
        g_terminate = false;
        return;
    }

    g_workFlow = WorkFlow.WorkFlow_OpenLoginPage;
    console.log("WorkFlow_OpenLoginPage");

    g_nextUrl = url_login;
    chrome.tabs.update(g_tab.id, { url: g_nextUrl });
}

function startWork() {
    if (g_terminate) {
        g_terminate = false;
        return;
    }

    g_workFlow = WorkFlow.WorkFlow_Start;
    console.log("WorkFlow_Start");

    g_blackProducts = [];

    $.ajax({
        url: url_userinfo,
        dataType: "text",
        success: function(rawData) {
            data = $.parseJSON(rawData.substring(5, rawData.length - 1));
            if (data.uid === undefined) {
                doLogin();
            } else {
                g_workFlow = WorkFlow.WorkFlow_AcquireUserInfo;
                console.log("WorkFlow_AcquireUserInfo");

                console.log("user id:\t%s", data.uid);
                console.log("user name:\t%s", data.userName);
                console.log("mobile:\t%s", data.mobileNo);

                g_workFlow = WorkFlow.WorkFlow_OpenAccountPage;
                console.log("WorkFlow_OpenAccountPage");
                g_nextUrl = url_account;
                chrome.tabs.update(g_tab.id, { url: g_nextUrl });
            }
        },
        error: function() {
            console.log("failed to acquire the user information.");
            g_workFlow = WorkFlow.WorkFlow_Idle;
            console.log("WorkFlow_Idle");
        }
    });
}

chrome.browserAction.onClicked.addListener(function() {
    if (g_workFlow !== WorkFlow.WorkFlow_Idle && !g_terminate) {
        g_terminate = true;
        console.log("terminated!");

        g_workFlow = WorkFlow.WorkFlow_Idle;
        console.log("WorkFlow_Idle");
    } else {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs === undefined) {
                console.log("please run in chrome browser.");
                return;
            }
            g_tab = tabs[0];
            console.log("current tab is %d.", g_tab.id);
        });

        g_workFlow = WorkFlow.WorkFlow_Idle;
        console.log("WorkFlow_Idle");

        g_terminate = false;
        startWork();
    }
});