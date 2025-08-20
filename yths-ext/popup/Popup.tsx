import "./popup.css";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { getChannel, getPlaylists, getUserInfo } from "../google";
import { channelThumbnailSmall, getPlaylistsResponse } from "../google-json-responses.txt";
import dayjs from "dayjs";
import { Spinner } from "./components/Spinner";
import Skeleton from "./components/Skeleton";
import type { PlaylistItem } from "../types";
import { convertImageToBase64 } from "../helpers";

const Popup = (props?: { extensionMode?: boolean }) => {

    const { extensionMode } = props ?? {};

    const ERROR_MESSAGE = "Error connecting your account";

    const [isInitializing, setIsInitializing] = useState(false); // when extension first loads and data is fetched
    const [isFetchingData, setIsFetchingData] = useState(false); // when extension fetches data from google or local storage
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const [profilePicture, setProfilePicture] = useState();
    const [playlists, setPlaylists] = useState<PlaylistItem[] | undefined>(false ? undefined : [...getPlaylistsResponse.items, ...getPlaylistsResponse.items]);
    const [selectedPlaylists, setSelectedPlaylists] = useState<string[] | undefined | null>();

    const initialized = useRef<boolean>(false);

    useEffect(() => {
        if(!initialized.current){
            initialized.current = true;
            
            (async () => {
                try{
                    if(extensionMode){
                        setIsInitializing(true);

                        let userUid = await browser.storage.local.get("userUid");
                        if(!userUid){
                            //userUid = crypto.
                        }
                        const token = await getToken();
                        if(token){                            
                            await getData(token);
                            setIsLoggedIn(true);
                        } 
                    } else {
                        setIsLoggedIn(true);
                    }
                } catch(err: any){
                    console.log("Init failed", err);
                } finally{
                    setIsInitializing(false);
                }
            })()

        }        
    }, [])

    const onClickLogin = async () => {
        try{
            if(extensionMode){
                setIsInitializing(true);
                const token = await window.browser.runtime.sendMessage({ action: "login" });
                console.log("Got token", token);                
                await getData(token);
                setIsLoggedIn(true);
            }
        } catch(err: any){
            console.log("Login failed", err);
            setError(ERROR_MESSAGE)
        } finally{
            setIsInitializing(false);
        }
    }

    const getData = async (token: string) => {
        try{
            setIsFetchingData(true);

            const playlistsResponse = await getPlaylists(token);
            const PLAYLISTS = playlistsResponse.items;
            console.log("Got playlists", PLAYLISTS);            

            const channelResponse = await getChannel(token);
            if(channelResponse.items.length == 0){
                throw new Error("Unable to get channel info, invalid account");
            }
            const channel = channelResponse.items[0]?.snippet;
            const CHANNEL_NAME = channel?.title;
            console.log("Got channel name", CHANNEL_NAME);

            const profilePictureUrl = channel?.thumbnails?.default?.url;
            const PROFILE_PICTURE_BASE64 = profilePictureUrl ? await convertImageToBase64(profilePictureUrl) : null;
            console.log("Got profile picture (base64)", PROFILE_PICTURE_BASE64);

            const user = await getUserInfo(token);
            if(user.names.length == 0){
                throw new Error("Unable to fetch channel name, invalid account");
            }
            const ACCOUNT_NAME = user.names[0]?.displayName;
            console.log("Got account name", ACCOUNT_NAME);        
            
            if(extensionMode){
                // store data in browser.storage
                await browser.storage.sync.set({
                    PLAYLISTS,
                    CHANNEL_NAME,
                    ACCOUNT_NAME,
                    PROFILE_PICTURE_BASE64
                });
            } else {
                // store data in localstorage
                window.localStorage.setItem("PLAYLISTS", JSON.stringify(PLAYLISTS));
                window.localStorage.setItem("CHANNEL_NAME", CHANNEL_NAME ?? "N/A");
                window.localStorage.setItem("ACCOUNT_NAME", ACCOUNT_NAME ?? "N/A");
                if(PROFILE_PICTURE_BASE64)
                    window.localStorage.setItem("PROFILE_PICTURE_BASE64", PROFILE_PICTURE_BASE64);
            }   
        }
        catch(err){
            console.log(err);
            setError(ERROR_MESSAGE);
        } 
        finally {
            setIsFetchingData(false);
        }
    }

    const getToken = async () => {
        const token = await window.browser.runtime.sendMessage({ action: "getToken" });
        return token;
    }

    const onTogglePlaylist = (id: string) => {
        setSelectedPlaylists(v => v?.includes(id) ? v.filter(p => p != id) : [...(v ?? []), id]);
    }

    const version = "loc.0.2";

    return(
        <>
        <div className={`font-segoue relative flex flex-col p-2 w-[300px] h-[500px] ${extensionMode ? "" : "border border-solid border-black"}`}>
        {
            isInitializing
            ?
                <Skeleton version={version} pulse={true}>
                    <div className="absolute top-0 left-0 z-10 flex flex-col items-center justify-center w-full h-full bg-black/25">
                        <Spinner/>
                    </div>
                </Skeleton>
            :
            <>
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
                            </div>                
                        </div>
                        {/* Playlists */}
                        {
                            !playlists || playlists.length == 0
                            ?
                                <div>
                                    Could not find any playlists associated with your account, view them on <a target="_blank" href="https://www.youtube.com/feed/playlists">YouTube</a>
                                </div>
                            :
                                <div className="flex flex-col flex-1 min-h-0">
                                    <div className="flex flex-col gap-2 mt-4 overflow-auto scrollbar">
                                        {
                                            playlists.map((playlist, i) => {
                                                const selected = selectedPlaylists?.includes(playlist.id) ?? false;
                                                return(
                                                    <div className="h-8 min-w-0" key={"playlist_listitem" + playlist.id + i}>
                                                        <label className="flex h-full hover:cursor-pointer">
                                                            <div className="flex my-auto h-7">
                                                                <input type="checkbox"className="sr-only peer" value={playlist.id} checked={selected} onChange={(e) => { onTogglePlaylist(e.target.value); }} />
                                                                <div className="flex items-center m-[5px] justify-center aspect-square transition-all duration-200 border-2 border-solid border-soft rounded-sm peer-checked:border-0 peer-checked:bg-[#3ea6ff]">
                                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                </div>
                                                            </div>
                                                            <img src={playlist?.snippet?.thumbnails?.default?.url} />
                                                            <div className="flex flex-col min-w-0 px-2">
                                                                <div className="overflow-hidden text-xs overflow-ellipsis whitespace-nowrap">{playlist.snippet.title}</div>
                                                                <div className="text-xs text-gray-400">{dayjs(playlist.snippet.publishedAt).format("DD/MM/YYYY")}</div>
                                                            </div>       
                                                            <i className="fa fa-external-link"/>
                                                        </label>
                                                    </div>
                                                )
                                            })
                                        }
                                    </div>
                                    <div className="flex gap-4 mt-2">
                                        <div className="link-button">clear all</div>
                                        <div className="link-button">select all</div>
                                        <div className="ml-auto link-button">save changes</div>
                                    </div>                           
                                </div>
                        }                        
                    </>
                :
                    <Skeleton version={version}>
                        <div className="absolute top-0 left-0 flex flex-col items-center w-full h-full justify-evenly bg-black/25">
                            <div></div>
                            <div className="flex ">
                                <div className="p-2 px-4 text-white bg-[#db4a39] border rounded button w-[180px] h-[30px] flex items-center justify-center">{false ? <Spinner/> : "Sign in with Google"}</div>
                            </div>
                            <div className="pt-2 font-bold text-red-700">{error}</div>
                        </div>
                    </Skeleton>
            }
        </>
        }
        </div>
        {
            !extensionMode &&
            <div className="p-4">
                <button onClick={onClickLogin} className={``}>Login with Google</button>
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