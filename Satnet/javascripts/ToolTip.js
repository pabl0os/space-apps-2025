import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { uxConfig, layerConfig } from "@/config";

export default class ToolTip {
    constructor() {

        this.p = document.createElement("p");
        this.p.className = "tooltip";
        this.container = new CSS2DObject(this.p);
        this.container.layers.set(layerConfig.toolTipsLayer);

    }


    show(distance, content, object) {
        this.p.className = "tooltip show";
        this.container.position.set(
            object.position.x,
            object.position.y + distance / uxConfig.raycasterOffSetDistanceFactor,
            object.position.z
        );
        this.p.textContent = content;
    }


    hide() {
        this.p.className = "tooltip hide";
    }

}