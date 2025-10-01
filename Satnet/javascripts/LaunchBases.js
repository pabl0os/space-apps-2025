import { Vector3, CylinderGeometry, MeshBasicMaterial, Mesh, Matrix4 } from 'three';
import { globalConfig, layerConfig } from '@/config';

export default class LaunchSite {
    constructor(earth) {
        this.earth = earth;
        this.launchSites = [];
        this.barList = [];
        this.numSites = globalConfig.initLaunchSite;
        this.loadLaunchSiteData().then(this.createLaunchSiteBars.bind(this));
    }


    async loadLaunchSiteData() {
        try {
            const response = await fetch('./data/SpaceBase.tsv');
            const data = await response.text();
            this.launchSites = this.parseTSV(data);
            console.log(`Loaded ${this.launchSites.length} launch sites.`);
        } catch (error) {
            console.error('Failed to load launch site data:', error);
        }
    }

    parseTSV(data) {
        const lines = data.split('\n').filter(line => line.trim());
        const headers = lines.shift().split('\t').map(header => header.trim());
        return lines.map(line => {
            const bits = line.split('\t');
            let site = {};
            headers.forEach((header, index) => {
                site[header] = bits[index].trim();
            });
            return site;
        }).filter(site => site !== null);
    }

    groupLaunchSites() {
        const grouped = {};
        const proximityThreshold = globalConfig.launchSiteProximityThreshold; // degrees
        this.launchSites.forEach(site => {
            const latBin = Math.round(parseFloat(site.Latitude) / proximityThreshold) * proximityThreshold;
            const lonBin = Math.round(parseFloat(site.Longitude) / proximityThreshold) * proximityThreshold;
            const key = `${latBin}_${lonBin}`;

            if (!grouped[key]) {
                grouped[key] = { success: 0, failure: 0, prelaunchFailure: 0, other: 0, totalLat: 0, totalLon: 0 };
            }
            switch (site.Status_Mission) {
                case 'Success':
                    grouped[key].success++;
                    break;
                case 'Failure':
                    grouped[key].failure++;
                    break;
                default:
                    grouped[key].other++;  // Assume all undefined or unexpected statuses as 'other'
                    break;
            }
            grouped[key].totalLat += parseFloat(site.Latitude);
            grouped[key].totalLon += parseFloat(site.Longitude);
        });

        // Calculate average coordinates
        Object.keys(grouped).forEach(key => {
            const bin = grouped[key];
            bin.latitude = bin.totalLat / (bin.success + bin.failure + bin.other);
            bin.longitude = bin.totalLon / (bin.success + bin.failure + bin.other);
        });

        return grouped;
    }

    createLaunchSiteBars() {
        const groupedSites = this.groupLaunchSites();
        const colors = {
            success: globalConfig.successLaunchColor,
            failure: globalConfig.failureLaunchColor,
            prelaunchFailure: globalConfig.preLaunchFailColor,
            other: globalConfig.other
        };
        Object.keys(groupedSites).forEach(key => {
            const bin = groupedSites[key];
            const baseRadius = globalConfig.earthSize;
            let cumulativeHeight = 0;

            ['success', 'failure', 'prelaunchFailure', 'other'].forEach(outcome => {
                const count = bin[outcome];
                if (count > 0) {
                    const height = count * globalConfig.launchSiteBarScalerHeight;
                    const botPosition = this.latLongToVector3(bin.latitude, bin.longitude, baseRadius + cumulativeHeight);
                    const topPosition = this.latLongToVector3(bin.latitude, bin.longitude, baseRadius + cumulativeHeight + height);


                    const geometry = new CylinderGeometry(globalConfig.launchSiteBarRadius, globalConfig.launchSiteBarRadius, height, 8);
                    const material = new MeshBasicMaterial({ color: colors[outcome] });
                    const bar = new Mesh(geometry, material);

                    bar.position.set(
                        (botPosition.x + topPosition.x) / 2,
                        (botPosition.y + topPosition.y) / 2,
                        (botPosition.z + topPosition.z) / 2
                    );


                    bar.lookAt(new Vector3(0, 0, 0));  // Ensure the bar faces outward from the globe's center
                    bar.rotateX(Math.PI / 2);  // Rotate to make it extend from the surface

                    bar.layers.set(layerConfig.launchSitesLayer);

                    cumulativeHeight += height;  // Stack bars on top of each other

                    this.earth.ground.add(bar);
                }
            });
        });
    }


    latLongToVector3(latitude, longitude, radius = 10) {
        var phi = (latitude * Math.PI) / 180;
        var theta = ((longitude - 180) * Math.PI) / 180;

        var x = -(radius * Math.cos(phi) * Math.cos(theta));
        var y = radius * Math.sin(phi);
        var z = radius * Math.cos(phi) * Math.sin(theta);
        let vector = new Vector3(x, y, z);
        vector.applyMatrix4(new Matrix4().makeRotationZ(globalConfig.earthTiltAngle * Math.PI / 180));
        return vector;
    }

}
