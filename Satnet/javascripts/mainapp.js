import * as THREE from 'three';
import { setup, loop } from '@/Manager'; // Example imports

document.body.onload = () => {
    setup();  // Set up your scene, camera, objects, etc.
    loop();   // Start the animation loop
};
