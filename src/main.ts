// ==UserScript==
// @id             highlight-overclocked-portals
// @name           Highlight overclocked portals
// @author         hisname
// @category       Highlighter
// @version        1.0.2
// @description    Highlight OC portals on Intel map
// @match          *://intel.ingress.com/*
// @match          *://intel-x.ingress.com/*
// @match          *://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==


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

        Object.values(window.portals).forEach((portal: any) => {
            const latLng = portal._latlng;
            if (bounds.contains(latLng)) {
                portalsInViewport.push(portal);
            }
        });
    };

    const styles = {
		common: {
			fillOpacity: 0.85,
			lineCap: "butt",
		},
        hasOwn: { fillColor: "#ef0069" }
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

            const overClockResponse = await response.json();
            const intersectPortal = portalsInViewport.filter((item1) =>
                overClockResponse.some((item2: { id: string; }) => item2.id === item1.options.guid)
            );
              
            intersectPortal.map((portal: {bringToFront(): unknown; setStyle: (arg0: { fillColor: string; fillOpacity: number; }) => void; }) => {
                portal.setStyle(
                    L.extend(
                        {},
                        styles.common,
                        styles.hasOwn,
                        { dashArray: makeDashArray(window.portalMarkerScale(), 70, 30) }
                    )
                );
        
                portal.bringToFront();        
            })
            
        } catch (error) {
            console.error("Error syncing overclocked portals:", error);
        }
    };

    let dashArrayMemo: {
        scale: number;
        [key: string]: string | number;
      } = {
        scale: -1,
      };
      
      function makeDashArray(scale: number, dashes: number, level: number): string {
        const cacheKey = level < 7 ? -dashes : dashes;
        const cacheKeyStr = cacheKey.toString(); 
      
        if (dashArrayMemo.scale === scale) {
          if (cacheKeyStr in dashArrayMemo) {
            return dashArrayMemo[cacheKeyStr].toString();
          }
        } else {
          dashArrayMemo = { scale };
        }
      
        const LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9, 10, 11];
        const circ = LEVEL_TO_RADIUS[level] * 6.3 * scale;
        const unit = circ / dashes / 3;
        const da = (dashArrayMemo[cacheKeyStr] = `${unit * 2}, ${unit}`) as string;
        console.log(da)
        return da;
      }
      
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

// Needs to be var instead of const otherwise mobile IITC will throw an exception
var script = document.createElement("script");
var info: any = {};

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
