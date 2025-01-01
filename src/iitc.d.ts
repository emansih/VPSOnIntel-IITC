export {}; // Ensure this file is treated as a module

declare global {
    interface Window {
        plugin: any;
        bootPlugins: Array<() => void>;
        iitcLoaded: boolean;
        portals: Record<string, any>;
        addLayerGroup(name: string, layerGroup: any, defaultDisplay: boolean): void;
        portalMarkerScale(): number;
    }
}
