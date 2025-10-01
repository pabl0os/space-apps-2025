import { SphereGeometry, MeshStandardMaterial, MeshLambertMaterial, Matrix4 } from 'three';
import { globalConfig, layerConfig } from '@/config';
import CelestialObject from '@/CelestialObject';


export default class Earth {
    constructor(earthMapTexture, earthBumpTexture, earthEmissionTexture, earthReflectTextuure, cloudTexture, cloudTransTexture) {

        this.size = globalConfig.earthSize;

        const groundGeometry = new SphereGeometry(this.size, 28, 28);
        const cloudGeometry = new SphereGeometry(this.size + 0.07, 28, 28);

        this.tiltAngleRadian = -globalConfig.earthTiltAngle * Math.PI / 180;

        groundGeometry.applyMatrix4(new Matrix4().makeRotationZ(-this.tiltAngleRadian));

        const earthMaterial = new MeshStandardMaterial({
            emissive: globalConfig.earthLightEmissiveColor,
            map: earthMapTexture,
            bumpMap: earthBumpTexture,
            emissiveMap: earthEmissionTexture,
            roughnessMap: earthReflectTextuure,
        });
        const cloudMaterial = new MeshLambertMaterial({
            transparent: true,
            map: cloudTexture,
            alphaMap: cloudTransTexture,
            opacity: 1.0,
            alphaTest: globalConfig.earthCloudDensity
        });

        this.ground = new CelestialObject(
            groundGeometry, earthMaterial, "Earth", layerConfig.earthGroundLayer,
            globalConfig.earthRotationSpeed, this.tiltAngleRadian, this.size,
            false, false
        );
        this.cloud = new CelestialObject(
            cloudGeometry, cloudMaterial, "Earth", layerConfig.earthCloudLayer,
            globalConfig.cloudAnimationSpeed, this.tiltAngleRadian, this.size + 0.07,
            false, false
        );

        this.position = this.ground.position;
        this.axis = this.ground.axis;
    }


    setPosition(x, y, z) {
        this.ground.setPosition(x, y, z);
        this.cloud.setPosition(x, y, z);
    }


    getPosition() {
        return this.ground.getPosition();
    }


    displayOn(scene) {
        scene.add(this.ground);
        scene.add(this.cloud);
    }


    update(origin, worldTime) {

        // Update rotation
        this.ground.setRotation(this.axis, worldTime.timeScale);
        this.cloud.setRotation(this.axis, worldTime.timeScale);

        // Update orbit
        this.ground.orbit(origin,
            globalConfig.earthPerigee * globalConfig.realworldScaleFactor,
            globalConfig.earthApogee * globalConfig.realworldScaleFactor,
            globalConfig.earthEccentricity,
            globalConfig.earthInclination,
            globalConfig.earthPeriod,
            worldTime.velocity
        );
        this.cloud.position.set(this.ground.position.x, this.ground.position.y, this.ground.position.z);
        this.position = this.ground.position;
    }
}
