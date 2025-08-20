import "./popup.css";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { getPlaylists } from "../google";
import { channelThumbnailSmall, getPlaylistsResponse } from "../google-json-responses.txt";
import dayjs from "dayjs";
import { Spinner } from "./components/Spinner";

const Popup = (props?: { extensionMode?: boolean }) => {

    const { extensionMode } = props ?? {};

    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const initialized = useRef<boolean>(false);

    useEffect(() => {
        if(!initialized.current){
            initialized.current = true;
            if(extensionMode){
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

        }        
    }, [])

    const onClickLogin = async () => {
        try{
            if(extensionMode){
                setIsLoading(true);
                const token = await window.browser.runtime.sendMessage({ action: "login" });
                console.log("Got token", token);
                setIsLoggedIn(true);
                setStatus("Logged in ✔");
                await refresh(token);
            }
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
            const playlists = await getPlaylists(token);
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
        const token = await window.browser.runtime.sendMessage({ action: "getToken" });
        return token;
    }

    const playlists = [...getPlaylistsResponse.items, ...getPlaylistsResponse.items];
    const version = "loc.0.2";

    return(
        <>
        <div className={`font-segoue relative flex flex-col p-2 w-[300px] h-[500px] ${extensionMode ? "" : "border border-solid border-black"}`}>
            {
                isLoggedIn
                ?
                <>
                    {/* Header */}
                    <div className="flex h-10">
                        <img className="w-8 h-8 rounded-sm cursor-pointer hover:scale-95 hover:opacity-75" src={channelThumbnailSmall} />
                        <div className="flex flex-col ml-2">
                            <div className="text-xs mt-[-2px]">rookie</div>
                            <div className="text-sm">{getPlaylistsResponse.items.length} playlists</div>
                        </div>
                        <div className="flex flex-col ml-auto text-xs text-right">
                            <div>{version}</div>
                            <div>{status}</div>
                        </div>                
                    </div>
                    {/* Playlists */}
                    <div className="flex flex-col gap-2 mt-4 overflow-auto scrollbar">
                        {
                            playlists.map((playlist, i) => {
                                return(
                                    <div className="h-8 min-w-0" key={"playlist_listitem" + playlist.id + i}>
                                        <label className="flex h-full hover:cursor-pointer">
                                            <div className="flex h-full">
                                                <input type="checkbox"className="sr-only peer" />
                                                <div className="flex items-center m-[5px] justify-center aspect-square h-auto transition-all duration-200 border-2 border-solid border-soft rounded-sm peer-checked:border-0 peer-checked:bg-[#3ea6ff]">
                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            </div>
                                            <img src={playlist.snippet.thumbnails.default.url} />
                                            <div className="flex flex-col min-w-0 px-2">
                                                <div className="overflow-hidden text-xs overflow-ellipsis whitespace-nowrap">{playlist.snippet.title}</div>
                                                <div className="text-xs text-gray-400">{dayjs(playlist.snippet.publishedAt).format("DD/MM/YYYY")}</div>
                                            </div>                                
                                        </label>
                                    </div>
                                )
                            })
                        }
                    </div>
                    {/* Footer */}
                    <div className="flex flex-col flex-1">
                        <div className="flex gap-4 mt-2">
                            <div className="link-button">clear all</div>
                            <div className="link-button">select all</div>
                            <div className="ml-auto link-button">save changes</div>

                        </div>                           
                    </div>
                </>
            :
                <>
                    <div className="absolute top-0 left-0 flex flex-col items-center w-full h-full justify-evenly bg-black/25">
                        <div></div>
                        <div className="flex ">
                            <div className="p-2 px-4 text-white bg-red-600 border rounded button w-[150px] h-[40px] flex items-center justify-center">{false ? <Spinner/> : "Login with Google"}</div>
                        </div>
                        <div className="pt-2 font-bold text-red-700">Error connecting your account</div>
                    </div>
                    <div className="flex h-10">
                        <div className="w-8 h-8 bg-gray-300 rounded-sm" />
                        <div className="flex flex-col gap-1 ml-2">
                            <div className="w-12 h-3 bg-gray-300 rounded" />
                            <div className="w-20 h-3 bg-gray-200 rounded" />
                        </div>
                        <div className="flex flex-col gap-1 ml-auto text-xs">
                            <div className="text-xs text-right text-gray-400 ">{version}</div>
                            <div className="w-8 h-3 bg-gray-200 rounded" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex h-8">
                                <div className="w-8 h-8 bg-gray-300 rounded" />
                                <div className="flex flex-col w-full gap-1 ml-2">
                                    <div className="w-3/4 h-3 bg-gray-300 rounded" />
                                    <div className="w-1/3 h-3 bg-gray-200 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4 mt-auto">
                        <div className="w-16 h-5 bg-gray-300 rounded" />
                        <div className="w-16 h-5 bg-gray-300 rounded" />
                        <div className="w-24 h-5 ml-auto bg-gray-300 rounded" />
                    </div>
                </>
            }
        </div>
        {
            !extensionMode &&
            <div className="p-4">
                <button onClick={onClickLogin} className={`${isLoading ? "animate-spin" : ""}`}>Login with Google</button>
            </div>
        }
        </>
    )
}

console.log("STARTING POPUP")
const extensionMode = window.browser ? true : false;
createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <Popup extensionMode={extensionMode} />
    </React.StrictMode>
)