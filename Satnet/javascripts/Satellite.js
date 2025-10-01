import { BufferGeometry, Points, Float32BufferAttribute, PointsMaterial, MathUtils } from 'three';
import { globalConfig, layerConfig } from '@/config';
import orbit from '@/orbitEquation';

export default class Satellite {
    constructor(scene) {
        this.scene = scene;
        this.satellites = [];
        this.maxSatellites = globalConfig.initNumSatellites;
        this.loadSatelliteData().then(this.createSatelliteObjects.bind(this));
        this.filter = "";
        this.numberOfCurrentSatellites = 0;
    }

    async loadSatelliteData() {
        try {
            const response = await fetch('./data/Satellite_dataset.tsv');
            const data = await response.text();
            this.satellites = this.parseTSV(data, this.maxSatellites);
            console.log(`Loaded ${this.satellites.length} satellites.`);
        } catch (error) {
            console.error('Failed to load satellite data:', error);
        }
    }

    parseTSV(data, maxEntries) {
        const lines = data.split('\n');
        const headers = lines.shift().split('\t');
        const columnsToFilter = ['Period'];

        // Parse the number value from string into number
        function toNumberIfNumeric(value) {
            return isNaN(value) ? value : Number(value);
        }

        return lines.slice(0, maxEntries)
            .map(line => {
                const bits = line.split('\t');

                // Create object with a random initial phase for orbital calculations
                // let obj = { initPhase: 2 * Math.PI * Math.random() };  // Assign random initial phase
                let obj = {
                    initPhase: 2 * Math.PI * Math.random(),
                };  // Assign random initial phase

                // headers.forEach((header, index) => {
                //     obj[header] = toNumberIfNumeric(bits[index].trim());  // Trim spaces and convert to number if applicable
                // });
                headers.forEach((header, index) => {
                    if (header === "Date_of_Launch") {
                        obj[header] = new Date(bits[index].trim());  // Convert launch date string to Date object
                    } else {
                        obj[header] = isNaN(bits[index]) ? bits[index].trim() : Number(bits[index].trim());
                    }
                });
                return obj;

            })
            // .filter(obj => {
            //     return !columnsToFilter.some(col => obj[col] === null || isNaN(obj[col]));
            // });
            .filter(obj => obj.Date_of_Launch instanceof Date);
    }


    createSatelliteObjects() {
        const vertices = [];
        const colors = [];
        const sizes = [];

        this.satellites.forEach((sat, index) => {
            vertices.push(0, 0, 0);  // Placeholder for actual satellite positions
            /***
             * CIV means civil is BLUE
             * COM means commercial is CYAN
             * GOV means goverment is RED
             * MIL means military is YELLOW
             * the rest is white
             */
            const prefix = sat.Users.substring(0, 3).toLowerCase();
            let color;
            switch (prefix) {
                case "civ": color = [33 / 255, 150 / 255, 243 / 255]; break;
                case "com": color = [255 / 255, 152 / 255, 0]; break;
                case "gov": color = [156 / 255, 39 / 255, 176 / 255]; break;
                case "mil": color = [1 / 255, 180 / 255, 8 / 255]; break;
                default: color = [0, 137 / 255, 123 / 255]; break;
            }
            colors.push(...color);
            sizes.push(0.5); // Initial size, assuming all are visible initially

            // Store additional data in satellite object
            sat.vertexIndex = index; // Each satellite corresponds to one vertex
            sat.color = color;

            console.log(sat);
        });


        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));

        const material = new PointsMaterial({
            size: 0.2,
            sizeAttenuation: true,
            vertexColors: true,
        });

        const satelliteGroup = new Points(geometry, material);
        satelliteGroup.layers.set(layerConfig.satellitesLayer);
        this.scene.add(satelliteGroup);

        // Store reference to points mesh in satellite data
        this.satellites.forEach((sat, index) => {
            sat.mesh = satelliteGroup;
        });
    }


    adjustInclination(originalInclination, hostTiltAngle) {
        const originalRad = MathUtils.degToRad(originalInclination + 90);
        return originalRad + hostTiltAngle;
    }


    /***
     * Update the orbit of the satellite but also filter it out by hiding unsused inside the earth
     * Fuck i am so genius.
     */
    update(origin, worldTime) {
        let index = 0;
        let counter = 0;

        const currentWorldDate = new Date(worldTime.getFormattedTime(true));

        const positions = this.satellites.flatMap(sat => {
            index++;

            let adjustedInclination = this.adjustInclination(sat.Inclination, origin.tiltAngleRadian);
            let newPosition;

            if (sat.Date_of_Launch <= currentWorldDate && 
                (this.filter == "all" || sat.Users.substring(0, 3).toLowerCase() == this.filter)){
                newPosition = orbit(
                    origin,
                    sat.Perigee,
                    sat.Apogee,
                    sat.Eccentricity,
                    adjustedInclination,
                    -sat.Period * 60,
                    worldTime.velocity,
                    sat.initPhase,
                    sat.initPosition
                );
                counter++;
            } else {
                newPosition = orbit(origin,0,0,0,0,0,0,0,0);    // Hide it inside the host celestial
            }
            return newPosition.toArray().map(coord => isNaN(coord) ? 0 : coord); // Replace NaN with 0 or some default value
        }).flat();  // Flatten the array of arrays to a single array

        this.numberOfCurrentSatellites = counter;

        const positionAttribute = this.satellites[0]?.mesh?.geometry?.attributes.position;
        if (positionAttribute) {
            positionAttribute.array = new Float32Array(positions);
            positionAttribute.needsUpdate = true;
        }
    }


    updateFilter(userPrefix) {
        this.filter = userPrefix.substring(0, 3).toLowerCase();
    }
}