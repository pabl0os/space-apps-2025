import { SphereGeometry, MeshStandardMaterial, Matrix4 } from 'three';
import { globalConfig, layerConfig } from '@/config';
import CelestialObject from '@/CelestialObject';


export default class Moon extends CelestialObject {
    constructor(moonMapTexture, moonBumpTexture) {
        const geometry = new SphereGeometry(globalConfig.moonSize, 20, 20);
        const material = new MeshStandardMaterial({
            map: moonMapTexture,
            bumpMap: moonBumpTexture,
        });

        const tiltAngleRadian = -globalConfig.moonTiltAngle * Math.PI / 180;

        geometry.applyMatrix4(new Matrix4().makeRotationZ(-tiltAngleRadian));

        super(geometry, material, "Moon", layerConfig.planetsLayer, 
            globalConfig.moonRotationSpeed, globalConfig.moonTiltAngle, 
            globalConfig.moonSize, true, true);
        this.size = globalConfig.moonSize;
        this.tiltAngleRadian = tiltAngleRadian;
    }


    update(origin, worldTime) {

        // Update rotation
        this.setRotation(this.axis, worldTime.timeScale);

        // Update orbit
        this.orbit(origin,
            globalConfig.moonPerigee * globalConfig.realworldScaleFactor,
            globalConfig.moonApogee * globalConfig.realworldScaleFactor,
            globalConfig.moonEccentricity,
            globalConfig.moonInclination,
            globalConfig.moonPeriod,
            worldTime.velocity
        );
    }
}