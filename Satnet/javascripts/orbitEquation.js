import { Vector3, MathUtils } from "three";
import { globalConfig } from "@/config";

export default function orbit(origin, perigee, apogee, eccentricity, inclination, period, time, initialPhase) {
    // Convert inclination from degrees to radians

    const newPerigee = perigee * globalConfig.realworldScaleFactor + origin.size;
    const newApogee = apogee * globalConfig.realworldScaleFactor + origin.size;

    // Delcare tolerance for convergence, lower mean higher the accuracy but more computational
    const tolerance = 1e-6;
    const maxinteration = 100;

    // Calculate semi-major axis a
    const a = (newPerigee + newApogee) / 2;

    // Calculate the mean motion n and mean Anomaly
    const n = 2 * Math.PI / period;
    let M = n * time + initialPhase;
    // Solve Kepler's Equation using Newton's method for the eccentric anomaly
    let E = M;
    let delta = 1;
    for (let i = 0; i < maxinteration; i++) {
        delta = (E - eccentricity * Math.sin(E) - M) / (1 - eccentricity * Math.cos(E));
        if (Math.abs(delta) < tolerance) break;  // Convergence check
        E -= delta;
    }

    // Calculate the true anomaly
    const v = 2 * Math.atan(Math.sqrt((1 + eccentricity) / (1 - eccentricity)) * Math.tan(E / 2));

    // Calculate the distance from the focal point
    // const r = a * (1 - eccentricity * eccentricity) / (1 + (Math.cos(E)));
    const r = a * (1 - eccentricity * Math.cos(E));

    // Calculate Cartesian coordinates in the orbital plane
    const X = r * Math.cos(v);
    const Y = r * Math.sin(v) * Math.cos(inclination);
    const Z = r * Math.sin(v) * Math.sin(inclination);

    // Apply scale factor and adjust position relative to the origin
    return new Vector3(X + origin.position.x, Y + origin.position.y, Z+ origin.position.z);
}