import "./popup.css";
import React, { useEffect, useMemo, useRef, useState, version } from "react";
import { createRoot } from "react-dom/client";
import { login } from "../apis";
import { channelThumbnailSmall, getPlaylistsResponse } from "../google-json-responses.txt";
import dayjs from "dayjs";
import { LoadingButton, Spinner, SpinnerProvider, useSpinner } from "./components/Spinner";
import Skeleton from "./components/Skeleton";
import type { PlaylistItem } from "../types";
import { APP_VERSION, convertImageToBase64, hs } from "../helpers";
import { callGetTokens, clearTokensFromStorage, getData, getSelectedPlaylistsFromStorage, getTokensFromStorage, getUserUid, setSelectedPlaylistsInStorage, type StoredTokens } from "../browser";

const Popup = (props?: { extensionMode?: boolean }) => {

    const { extensionMode } = props ?? {};

    const ERROR_MESSAGE = "Error connecting your account";

    const [isInitializing, setIsInitializing] = useState(false); // when extension first loads and data is fetched
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const [appData, setAppData] = useState<Awaited<ReturnType<typeof onFetchData>>>();
    const { accountName, channelName, playlists, profilePictureBase64, accountId } = appData ?? {};

    const [selectedPlaylists, setSelectedPlaylists] = useState<string[] | undefined | null>();

    const initialized = useRef<boolean>(false);

    const { toggleSpinner, loadingMap } = useSpinner()

    const refreshLoading = useMemo(() => {
        return loadingMap["refresh_button"]
    }, [loadingMap]);

    useEffect(() => {
        if(!initialized.current){
            initialized.current = true;
            
            (async () => {
                try{
                    setIsInitializing(true);
                    await getUserUid(); // will set new uuid if none available
                    const tokens = await callGetTokens();
                    if(tokens?.access_token){                            
                        await onFetchData(tokens.access_token);
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

    useEffect(() => {
        if(selectedPlaylists && accountId){
            // only update selected playlists once data has been fetched and selected playlists initialized from it
            setSelectedPlaylistsInStorage(selectedPlaylists, accountId);    
        }        
    }, [selectedPlaylists, accountId])

    const onClickLogin = async () => {
        try{
            setIsLoggingIn(true);

            let tokens = null;
            if(extensionMode){                
                tokens = await window.browser.runtime.sendMessage({ action: "login" }) as StoredTokens | null;
            } else {
                tokens = await login();
            }

            
            if(tokens?.access_token){
                hs.log("logged in");
                await onFetchData(tokens?.access_token);
                setIsLoggedIn(true);
            } else {
                hs.log("login flow returned no access_token");
            }            
        } catch(err: any){
            hs.error(err);
            setError(ERROR_MESSAGE)
        } finally{
            setIsLoggingIn(false);
        }
    }

    const onFetchData = async (access_token: string, forceRefresh?: boolean) => {
        try{
            const data = await getData(access_token, forceRefresh);
            if(data){
                setAppData(data);
                const _selected = await getSelectedPlaylistsFromStorage(data.accountId);
                setSelectedPlaylists(_selected);
                return data;
            }            
        }
        catch(err){
            hs.error(err);
            setError(ERROR_MESSAGE);
        } 
        finally {
            return null;
        }
    }

    const onTogglePlaylist = (id: string) => {
        setSelectedPlaylists(v => v?.includes(id) ? v.filter(p => p != id) : [...(v ?? []), id]);
    }

    const onClickRefresh = async () => {
        try{
            toggleSpinner("refresh_button");
            const tokens = await callGetTokens(true); // refreshes and stores new tokens
            if(tokens && tokens.access_token){
                await onFetchData(tokens.access_token, true);
            } else {
                setIsLoggedIn(false);
            }
        } 
        catch(err){
            hs.error(err);
        } 
        finally {
            toggleSpinner("refresh_button");
        }
    }

    const onClickLogout = async () => {
        toggleSpinner("logout_button");
        await clearTokensFromStorage();
        setIsLoggedIn(false);
        toggleSpinner("logout_button");
    }

    const onSelectAll = async () => {
        setSelectedPlaylists((playlists ?? []).map(p => p.id));
    }

    const onClearAll = async () => {
        setSelectedPlaylists([]);
    }

    return(
        <>
        <div className={`font-segoue relative flex flex-col w-[300px] h-[500px] ${extensionMode ? "" : "border border-solid border-black"}`}>
        {
            isInitializing
            ?
                <Skeleton version={APP_VERSION} pulse={true}>
                    <div className="absolute top-0 left-0 z-10 flex flex-col items-center justify-center w-full h-full px-2 bg-black/25">
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
                        <div className="flex h-10 px-2 pt-2">
                            <img onClick={onClickLogin} className="w-8 h-8 rounded-sm cursor-pointer hover:scale-95 hover:opacity-75" src={profilePictureBase64 ?? `https://placehold.co/32x32?text=${(channelName ?? "O").charAt(0)}`} />
                            <div className="flex flex-col ml-2">
                                <div className="text-xs mt-[-2px]">{channelName ?? "N/A"}</div>
                                <div className="text-sm">{playlists?.length ?? "0"} playlists</div>
                            </div>
                            <div className="flex flex-col ml-auto text-xs text-right">
                                <div>{APP_VERSION}</div>
                                <div className="flex gap-4">
                                    <LoadingButton id="refresh_button" onClick={onClickRefresh}>
                                        <div className="link-button">refresh</div>
                                    </LoadingButton>
                                    <LoadingButton id="logout_button" onClick={onClickLogout}>
                                        <div className="link-button">logout</div>
                                    </LoadingButton>
                                </div>
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
                                <div className="relative flex flex-col flex-1 min-h-0">
                                    {
                                        (refreshLoading) &&
                                        <div className="absolute flex items-center justify-center w-full h-full bg-black/25">
                                            <Spinner/>
                                        </div>
                                    }
                                    <div className="flex flex-col gap-2 p-2 overflow-auto scrollbar">
                                        {
                                            playlists.map((playlist, i) => {
                                                const selected = selectedPlaylists?.includes(playlist.id) ?? false;
                                                return(
                                                    <div className="flex h-8 min-w-0" key={"playlist_listitem" + playlist.id + i}>
                                                        <label className="flex flex-1 h-full min-w-0 hover:cursor-pointer">
                                                            <div className="flex my-auto h-7">
                                                                <input type="checkbox"className="sr-only peer" value={playlist.id} checked={selected} onChange={(e) => { onTogglePlaylist(e.target.value); }} />
                                                                <div className="flex items-center m-[5px] justify-center aspect-square transition-all duration-200 border-2 border-solid border-soft rounded-sm peer-checked:border-0 peer-checked:bg-[#3ea6ff]">
                                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                </div>
                                                            </div>
                                                            <img src={playlist?.snippet?.thumbnails?.default?.url} />
                                                            <div className="flex flex-col flex-1 min-w-0 px-2">
                                                                <div className="overflow-hidden text-xs overflow-ellipsis whitespace-nowrap">{playlist.snippet.title}</div>
                                                                <div className="text-xs text-gray-400">{dayjs(playlist.snippet.publishedAt).format("DD/MM/YYYY")}</div>
                                                            </div>       
                                                        </label>
                                                        <a className="hover:opacity-60" href={`https://www.youtube.com/playlist?list=${playlist.id}`} target="_blank">
                                                            <i className="mx-1 my-auto ml-2 text-xs text-gray-400 fa fa-external-link h-fit active:scale-95"></i>
                                                        </a>
                                                    </div>
                                                )
                                            })
                                        }
                                    </div>
                                    <div className="flex gap-4 px-2 pt-1 pb-2">
                                        <div className="link-button" onClick={onClearAll}>clear all</div>
                                        <div className="link-button" onClick={onSelectAll}>select all</div>
                                    </div>                           
                                </div>
                        }                        
                    </>
                :
                    <Skeleton version={APP_VERSION}>
                        <div className="absolute top-0 left-0 flex flex-col items-center w-full h-full justify-evenly bg-black/25">
                            <div></div>
                            <div className="flex ">
                                <div onClick={onClickLogin} className="p-2 px-4 text-white bg-[#db4a39] border rounded button w-[180px] h-[30px] flex items-center justify-center">{false ? <Spinner/> : "Sign in with Google"}</div>
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

hs.log("online")
const extensionMode = window.browser ? true : false;
createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <SpinnerProvider>
            <Popup extensionMode={extensionMode} />
        </SpinnerProvider>
    </React.StrictMode>
)