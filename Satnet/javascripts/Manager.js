import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

import Earth from "@/Earth";
import Moon from "@/Moon";
import Sun from "@/Sun"
import Satellite from "@/Satellite";
import WorldTime from "@/WorldTime";
import LaunchSite from "@/LaunchBases";
import ToolTip from "@/ToolTip";
import Helper from "@/Helper";

import {
    cameraConfig,
    uxConfig,
    environmentConfig,
    globalConfig,
    layerConfig
} from "@/config";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// WebGL detection function
function isWebGLAvailable() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

function showWebGLError() {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.95);
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 1000;
        max-width: 500px;
    `;
    errorDiv.innerHTML = `
        <h2 style="color: #e74c3c; margin-bottom: 20px;">⚠️ WebGL No Disponible</h2>
        <p style="margin-bottom: 15px;">Tu navegador o tarjeta gráfica no soporta WebGL, que es necesario para esta aplicación 3D.</p>
        <p style="margin-bottom: 15px;"><strong>Posibles soluciones:</strong></p>
        <ul style="text-align: left; margin-bottom: 20px;">
            <li>Actualiza tu navegador a la última versión</li>
            <li>Actualiza los drivers de tu tarjeta gráfica</li>
            <li>Prueba con un navegador diferente (Chrome, Firefox, Edge)</li>
            <li>Habilita la aceleración por hardware en tu navegador</li>
        </ul>
        <p style="font-size: 12px; color: #666;">Tarjeta gráfica detectada: Intel HD Graphics 3000</p>
    `;
    document.body.appendChild(errorDiv);
}

// Create loading manager
const loadManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadManager);

// Link HTML DOM
const progressBar = document.getElementById("progress-bar");
const mainIcon = document.getElementById("reset-camera-btn");
const legends = document.getElementById("legend-container");
const timeBar = document.getElementById("world-time-display");
const launchSitesLegend = document.getElementById("launch-legend");
const satellitesLegend = document.getElementById("satellite-legend");

// Load assets
const earthMapTexture = textureLoader.load("./images/earthmap10k.jpg");
const earthBumpTexture = textureLoader.load("./images/earthbump10k.jpg");
const earthEmissionTexture = textureLoader.load("./images/earthlights10k.jpg");
// const earthEmissionTexture = textureLoader.load("./images/earthlights10k.jpg");
// const earthReflectTextuure = textureLoader.load("./images/earthspec10k.jpg"); // Image not found
const cloudTexture = textureLoader.load("./images/earthcloudmap.jpg");
const cloudTransTexture = textureLoader.load("./images/earthcloudmaptrans.jpg");
// const moonMapTexture = textureLoader.load("./images/moonmap1k.jpg"); // Image not found
// const moonBumpTexture = textureLoader.load("./images/moonbump1k.jpg"); // Image not found
const backgroundTexture = textureLoader.load("./images/background.jpg");
const marsTexture = textureLoader.load("./images/marte.jpg");

// Declare variables
let deltaTime = new THREE.Clock();
let offsetCameraVector = new THREE.Vector3();
let finishLoading;
let cameraAnimating;
let raycastDistance;


const aspect = window.innerWidth / window.innerHeight;
const scene = new THREE.Scene();
const fog = new THREE.Fog(environmentConfig.fogColor);
const camera = new THREE.PerspectiveCamera(
    cameraConfig.cameraFOV, aspect,
    cameraConfig.cameraNearLimitView,
    cameraConfig.cameraFarLimitView
);

// Check WebGL availability before creating renderer
if (!isWebGLAvailable()) {
    showWebGLError();
    throw new Error('WebGL is not available');
}

let renderer;
try {
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('canvas.webgl'),
        antialias: true,
        logarithmicDepthBuffer: true,
    });
} catch (error) {
    showWebGLError();
    throw error;
}
const lableRenderer = new CSS2DRenderer();
const panController = new OrbitControls(camera, renderer.domElement);
const zoomController = new TrackballControls(camera, renderer.domElement);

const sun = new Sun();
const earth = new Earth(
    earthMapTexture,
    earthBumpTexture,
    earthEmissionTexture,
    null, // earthReflectTextuure - image not found
    cloudTexture,
    cloudTransTexture
);
const moon = new Moon(null, null); // moonMapTexture, moonBumpTexture - images not found
const satellites = new Satellite(scene);
const worldTime = new WorldTime(0, 0, 0, 1, 1, 1981, environmentConfig.initTimeScale);
const launchBase = new LaunchSite(earth);
const toolTip = new ToolTip();
const helperTool = new Helper();

const raycaster = new THREE.Raycaster();
const mousePos = new THREE.Vector2();

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    environmentConfig.unrealBloomPassStrength,
    environmentConfig.unrealBloomPassRadius,
    environmentConfig.unrealBloomPassThreshold
);
const bloomComposer = new EffectComposer(renderer);


const gui = new GUI().hide();
const satelliteMenu = gui.addFolder("Satellites");
// const launchSiteMenu = gui.addFolder("Launch Bases");
// const spaceDebrisMenu = gui.addFolder("Space Debris");
const timeSpeedMenu = gui.addFolder("Time Controller");
const timeSetMenu = timeSpeedMenu.addFolder("Set Specific Time");
const layerFilterMenu = gui.addFolder("Layers");

let isEarthTexture = true;

const settings = {
    "Total Satellite": 0,
    "User": "ALL",
    "Time speed": 200.0,
    toggleSun: function () {

        camera.layers.toggle(layerConfig.sunLayer);


    },
    togglePlanets: function () {

        camera.layers.toggle(layerConfig.planetsLayer);

    },
    toggleEarth: function () {

        camera.layers.toggle(layerConfig.earthGroundLayer);
        camera.layers.toggle(layerConfig.earthCloudLayer);

    },
    toggleEarthGroundView: function () {

        camera.layers.toggle(layerConfig.earthCloudLayer);

    },
    toggleDebugHelper: function () {

        camera.layers.toggle(layerConfig.helperLayer);

    },
    toggleSatellites: function () {

        camera.layers.toggle(layerConfig.satellitesLayer);

    },
    toggleLaunchBases: function () {

        camera.layers.toggle(layerConfig.launchSitesLayer);

    },
    toggleIcons: function () {
        camera.layers.toggle(layerConfig.toolTipsLayer);

        // Buscar el material en toda la jerarquía del objeto
        function findMaterial(obj) {
            if (obj.material) return obj.material;
            if (obj.mesh && obj.mesh.material) return obj.mesh.material;
            if (obj.children) {
                for (let child of obj.children) {
                    if (child.material) return child.material;
                }
            }
            return null;
        }

        const material = findMaterial(earth.ground);

        if (material) {
            if (isEarthTexture) {
                material.map = marsTexture;
                console.log("Cambiado a Marte");
            } else {
                material.map = earthMapTexture;
                console.log("Cambiado a Tierra");
            }
            material.needsUpdate = true;
            // isEarthTexture = !isEarthTexture;
        } else {
            console.error("No se pudo encontrar el material");
        }
    },
    toggleUI: function () {

        camera.layers.set(0);
        camera.layers.enable(1);
        camera.layers.enable(2);
        camera.layers.enable(3);

        gui.close();

        mainIcon.classList.remove("show");
        legends.classList.remove("show");
        timeBar.classList.remove("visible");  // visible and show are the same

    }
}


loadManager.onStart = function (url, item, total) {
    finishLoading = false;
}


loadManager.onProgress = function (url, loaded, total) {
    progressBar.value = (loaded / total) * 100;
}


loadManager.onLoad = function () {
    const progressBarContainer = document.querySelector(".progress-bar-container");
    const loadingText = document.getElementById("loading-text");

    if (progressBarContainer && progressBar) {
        progressBar.style.display = "none";
        loadingText.style.display = "none";
        setTimeout(() => {
            progressBarContainer.classList.add("fade-out");
            setTimeout(() => {
                progressBarContainer.style.display = "none";

                mainIcon.style.visibility = "visible";
                mainIcon.classList.add("show");

                legends.style.visibility = "visible";
                legends.classList.add("show");

                timeBar.style.visibility = "visible";
                timeBar.classList.add("visible");       // Visible and show are the same

                gui.show();

                finishLoading = true;

            }, uxConfig.loadingContainerFadingTime);
        }, uxConfig.loadingBarFadingTime);
    }
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    panController.update();
    zoomController.update();

    renderer.setSize(window.innerWidth, window.innerHeight);
    lableRenderer.setSize(window.innerWidth, window.innerHeight);
    bloomComposer.setSize(window.innerWidth, window.innerHeight);
}


function animateCameraPosition() {
    if (!cameraAnimating) return;
    const initialCameraPosition = new THREE.Vector3(
        cameraConfig.camearInitPosition.x,
        cameraConfig.camearInitPosition.y,
        cameraConfig.camearInitPosition.z
    )
    camera.position.lerp(initialCameraPosition, environmentConfig.leftFactor);
    if (camera.position.distanceTo(initialCameraPosition) < 0.2) {
        camera.position.copy(initialCameraPosition);
        cameraAnimating = false;
    }
    requestAnimationFrame(animateCameraPosition);
}


function checkIntersection() {
    raycaster.setFromCamera(mousePos, camera);

    const selectableCelestialObject = [
        { object: sun.core, name: "Sun" },
        { object: earth.ground, name: "Earth" },
        { object: moon, name: "Moon" },
    ];


    let closestObject = null;
    let minDistance = Infinity;


    selectableCelestialObject.forEach(celestial => {
        if (celestial.object) {
            const intersects = raycaster.intersectObject(celestial.object, true);
            if (intersects.length > 0) {

                raycastDistance = intersects[0].distance;

                if (raycastDistance < minDistance) {

                    minDistance = raycastDistance;
                    closestObject = celestial;

                }
            }
        } else {

            console.log(`Error when raycaster with ${celestial}, object must have geometry`);
            console.log(celestial);

        }
    });

    if (closestObject) {

        toolTip.show(raycastDistance, "Sun", closestObject.object);


    } else {

        toolTip.hide();
    }
}


function setupBackground() {
    backgroundTexture.mapping = THREE.EquirectangularReflectionMapping;
    backgroundTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = backgroundTexture;

    if (environmentConfig.fogEnable) {
        scene.fogEnable = true;
        scene.fog = fog;
    }
}


function setupRenderer() {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}


function setupLabelRenderer() {
    lableRenderer.setSize(window.innerWidth, window.innerHeight);
    lableRenderer.domElement.style.position = "absolute";
    lableRenderer.domElement.style.top = "0px";
    lableRenderer.domElement.style.pointerEvents = "none";
    document.body.appendChild(lableRenderer.domElement);
}


function setupBloom() {
    bloomPass.threshold = globalConfig.bloomThreshold;
    bloomPass.strength = globalConfig.bloomStrength;
    bloomPass.radius = globalConfig.bloomRadius;
    bloomComposer.setSize(window.innerWidth, window.innerHeight);
    bloomComposer.renderToScreen = true;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);
}


function setupCameraControll() {
    camera.position.set(
        cameraConfig.camearInitPosition.x,
        cameraConfig.camearInitPosition.y,
        cameraConfig.camearInitPosition.z
    );
    camera.layers.enableAll();
    camera.layers.disable(layerConfig.helperLayer);

    panController.target = earth.position;
    panController.enableDamping = true;
    panController.dampingFactor = environmentConfig.panControllerDampingFactor;
    panController.enableZoom = false;

    zoomController.noPan = true;
    zoomController.noRotate = true;
    zoomController.noZoom = false;
    zoomController.zoomSpeed = environmentConfig.zoomControllerDampingFactor;
}


function createGUI() {

    satelliteMenu.add(settings, "Total Satellite").listen();
    satelliteMenu.add(settings, "User", ["ALL", "CIVIL", "COMMERCIAL", "GOVERNMENT", "MILITARY"])
        .onChange(value => satellites.updateFilter(value));

    timeSpeedMenu.add(settings, "Time speed",
        uxConfig.minTimeScale, uxConfig.maxTimeScale, uxConfig.timeScaleStep)
        .onChange(value => worldTime.setTimeScale(value));

    timeSetMenu.add(worldTime, 'year').name("Year").onFinishChange(value => worldTime.setYear(value));
    timeSetMenu.add(worldTime, 'month').name("Month").onFinishChange(value => worldTime.setMonth(value));
    timeSetMenu.add(worldTime, 'day').name("Day").onFinishChange(value => worldTime.setDay(value));
    timeSetMenu.add(worldTime, 'hours').name("Hours").onFinishChange(value => worldTime.setHours(value));
    timeSetMenu.add(worldTime, 'minutes').name("Minutes").onFinishChange(value => worldTime.setMinutes(value));
    timeSetMenu.add(worldTime, 'seconds').name("Seconds").onFinishChange(value => worldTime.setSeconds(value));


    layerFilterMenu.add(settings, "toggleSun");
    layerFilterMenu.add(settings, "togglePlanets");
    layerFilterMenu.add(settings, "toggleEarth");
    layerFilterMenu.add(settings, "toggleEarthGroundView");
    layerFilterMenu.add(settings, "toggleDebugHelper");
    layerFilterMenu.add(settings, "toggleSatellites");
    layerFilterMenu.add(settings, "toggleLaunchBases");
    layerFilterMenu.add(settings, "toggleIcons");
    layerFilterMenu.add(settings, "toggleUI");


    satelliteMenu.close();
    // launchSiteMenu.close();
    // spaceDebrisMenu.close();
    timeSpeedMenu.open();
    timeSetMenu.close();
    layerFilterMenu.open();
}


function updateGUI() {
    if (!gui._closed) {

        if (camera.layers.isEnabled(layerConfig.satellitesLayer)) {
            satellitesLegend.classList.remove("hidden");
        } else {
            satellitesLegend.classList.add("hidden");
        }

        if (camera.layers.isEnabled(layerConfig.launchSitesLayer)) {
            launchSitesLegend.classList.remove("hidden");
        } else {
            launchSitesLegend.classList.add("hidden");
        }

        mainIcon.style.visibility = "visible";
        mainIcon.classList.add("show");

        legends.style.visibility = "visible";
        legends.classList.add("show");

        timeBar.style.visibility = "visible";
        timeBar.classList.add("visible");

        finishLoading = true;
    }
}


export function setup() {
    // Check if renderer was created successfully
    if (!renderer) {
        console.error('WebGL renderer could not be created');
        return;
    }

    deltaTime.start();

    setupBackground();
    setupCameraControll();
    setupRenderer();
    setupLabelRenderer();
    setupBloom();
    createGUI();

    scene.add(camera);
    scene.add(toolTip.container);
    scene.add(helperTool);

    sun.displayOn(scene);
    earth.displayOn(scene);
    moon.displayOn(scene);

    satellites.updateFilter("all");


    // Resize handler
    window.addEventListener('resize', onWindowResize, false);

    // Event handler
    window.addEventListener('mousemove', function (event) {
        mousePos.x = (event.clientX / this.window.innerWidth) * 2 - 1;
        mousePos.y = -(event.clientY / this.window.innerHeight) * 2 + 1;

        checkIntersection();
    });

    mainIcon.addEventListener("click", function () {
        cameraAnimating = true;
        animateCameraPosition();

        // Icon animation
        mainIcon.classList.remove('show');
        setTimeout(() => mainIcon.classList.add('show'),
            environmentConfig.iconResetCameraAnimationDelay);
    })
}


export function loop() {
    // Check if renderer was created successfully
    if (!renderer) {
        return;
    }

    // Update world Time
    worldTime.update(deltaTime);
    worldTime.display(finishLoading);

    // Update orbit motion
    moon.update(earth, worldTime);
    earth.update(null, worldTime);
    sun.update(earth, worldTime);
    satellites.update(earth, worldTime);

    // Update controller value
    updateGUI();
    settings["Total Satellite"] = satellites.numberOfCurrentSatellites;

    // Update OrbitControls target based on currentTarget
    offsetCameraVector.subVectors(camera.position, earth.position);
    panController.object.position.copy(earth.position).add(offsetCameraVector);
    panController.target.copy(earth.position);
    zoomController.target = panController.target;
    panController.update();
    zoomController.update();

    // Update render
    renderer.render(scene, camera);
    lableRenderer.render(scene, camera);
    bloomComposer.render();

    window.requestAnimationFrame(loop);
}