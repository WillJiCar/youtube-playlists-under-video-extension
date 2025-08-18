import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const Popup = (props?: { testMode?: boolean }) => {

    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [testMode, setTestMode] = useState(props?.testMode ?? false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const initialized = useRef<boolean>(false);

    useEffect(() => {
        if(!initialized.current){
            console.log("Started youtube-playlists-under-video (testMode)", testMode);
            initialized.current = true;
            (async () => {
                try{
                    setIsLoading(true);
                    const token = await getToken();
                    if(token){
                        setIsLoggedIn(true);
                        setStatus("Logged in ✔");
                        await refresh(token);
                    } else {
                        setStatus("Not logged in");
                    }
                } catch(err: any){
                    console.log("Init failed", err);
                    setStatus("Init Error: " + err.message);
                } finally{
                    setIsLoading(false);
                }
            })()

        }        
    }, [])

    const onClickLogin = async () => {
        try{
            setIsLoading(true);
            const token = testMode ? "_mock" : await window.browser.runtime.sendMessage({ action: "login" });
            console.log("Got token", token);
            setIsLoggedIn(true);
            setStatus("Logged in ✔");
            await refresh(token);
        } catch(err: any){
            console.log("Login failed", err);
            setStatus("Login failed: " + err.message);
        } finally{
            setIsLoading(false);
        }
    }

    const refresh = async (token: string) => {
        setIsLoading(true);
        try{
            const playlists = await fetchPlaylists(token);
            console.log("Got playlists", playlists);
        }
        catch(err){
            console.log(err);
        }
        finally{
            setIsLoading(false);
        }
    }

    const getToken = async () => {
        const token = testMode ? "mock_" : await window.browser.runtime.sendMessage({ action: "getToken" });
        console.log("received token", token);
        return token;
    }

    const fetchPlaylists = async (token: string) => {
        return testMode ? [] : 
            fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50", {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => res.json());
    }

    return(
        <div>
            {
                !isLoggedIn &&
                <button onClick={onClickLogin} className={`${isLoading ? "animate-spin" : ""}`}>Login with Google</button>
            }
            <div>{status}</div>
        </div>
    )
}

console.log("STARTING POPUP")
let testMode = localStorage.getItem('testMode') === 'true';
createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <Popup testMode={testMode} />
    </React.StrictMode>
)