
console.log("hello!")
const accessToken = localStorage.getItem('YTHS_ACCESS_TOKEN');
if(browser){
    if(accessToken){
        console.log("sending token to extension OAUTH_RESULT")
        browser.runtime.sendMessage({
            type: "OAUTH_RESULT",
            token: accessToken
        }).then(response => {
            console.log("Background responded:", response);
        }).catch(err => console.error("Message failed:", err));
    } else {
        console.log("no")
    }
} else {
    console.log("browser not available")
}