// ==UserScript==
// @id             highlight-overclocked-portals
// @name           Highlight overclocked portals
// @author         hisname
// @category       Highlighter
// @version        1.0.0
// @description    Highlight OC portals on Intel map
// @match          *://intel.ingress.com/*
// @match          *://intel-x.ingress.com/*
// @match          *://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==

import { IntelResponse } from "./IntelResponse";


declare var map: any; // IITC map object
declare function addHook(eventName: string, callback: (...args: any[]) => void): void;

function wrapper(plugin_info: any) {
    const isLocalDev = localStorage.getItem("highlight_overclocked_portals_is_dev");
    const url = isLocalDev ? "http://127.0.0.1:3000" : "https://vps-on-intel.vercel.app";

    if (typeof window.plugin !== "function") window.plugin = () => {};

    plugin_info.buildName = "hisname@highlight-overclocked-portals";
    plugin_info.dateTimeVersion = "2024-12-25";
    plugin_info.pluginId = "highlight-overclocked-portals";

    window.plugin.highlightOCPortals = {};

    let portalsInViewport: any[] = [];

    window.plugin.highlightPortals = function (): void {
        const bounds = map.getBounds();
        portalsInViewport = [];

        Object.values(window.portals).forEach((portal: any) => {
            const latLng = portal._latlng;
            if (bounds.contains(latLng)) {
                portalsInViewport.push(portal);
            }
        });
    };

    window.plugin.syncOCPortal = async function (): Promise<void> {
        const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        const screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

        const topLeft = map.containerPointToLatLng([0, 0]);
        const bottomRight = map.containerPointToLatLng([screenWidth, screenHeight]);

        const boundingBox = L.latLngBounds(topLeft, bottomRight);
        const centerCoords = boundingBox.getCenter();

        const requestData = { lat: centerCoords.lat, lng: centerCoords.lng };

        try {
            const response = await fetch(`${url}/api/v1/getPoiInRadius`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData),
            });

            const intelResponse = await response.json() as IntelResponse[];
            
            portalsInViewport.forEach((port) => {
                intelResponse.forEach((counter: { lat: number; lng: number }) => {
                    if (port._latlng.lat === counter.lat && port._latlng.lng === counter.lng) {
                        port.setStyle({ fillColor: "#040500", fillOpacity: 0.75 });
                    }
                });
            });
        } catch (error) {
            console.error("Error syncing overclocked portals:", error);
        }
    };

    function setup(): void {
        addHook("mapDataRefreshStart", window.plugin.syncOCPortal);
        addHook("mapDataRefreshEnd", window.plugin.highlightPortals);

        window.plugin.highlightOCPortals.highlightOC = new L.LayerGroup();
        window.addLayerGroup("Overclocked Enabled", window.plugin.highlightOCPortals.highlightOC, true);
    }

    setup.info = plugin_info;

    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    if (window.iitcLoaded && typeof setup === "function") setup();
}

const script = document.createElement("script");
const info: any = {};

if (typeof GM_info !== "undefined" && GM_info && GM_info.script) {
    info.script = {
        version: GM_info.script.version,
        name: GM_info.script.name,
        description: GM_info.script.description,
    };
}

const textContent = document.createTextNode(`(${wrapper})(${JSON.stringify(info)})`);
script.appendChild(textContent);
(document.body || document.head || document.documentElement).appendChild(script);
