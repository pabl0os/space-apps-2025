import { Object3D, GridHelper, AmbientLight } from "three";
import { environmentConfig, layerConfig } from "@/config"

export default class Helper extends Object3D {
    constructor() {

        super();

        const gridHelper = new GridHelper(
            environmentConfig.gridHelperWidth,
            environmentConfig.gridHelperDensity
        );
        const ambientLight = new AmbientLight(0xffffff, 1);

        gridHelper.layers.set(layerConfig.helperLayer);
        ambientLight.layers.set(layerConfig.helperLayer);

        this.add(gridHelper);
        this.add(ambientLight);
    }
}