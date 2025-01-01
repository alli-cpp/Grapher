import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.136.0/build/three.module.js";
import { createBaseScene } from "./utils/createBaseScene.js";
import { createTextSprite } from "./utils/createTextSprite.js";
import { ParametricGeometry } from "https://cdn.jsdelivr.net/npm/three@0.136.0/examples/jsm/geometries/ParametricGeometry.js";

// n is used to control maxX, minX, maxY, minY values for the loop
// Higher values make the curve larger.
let n = 1;

// increment value for the loop (within plotFunction).
// Higher values make the curve more coarse.
// Smaller values make the curve more fine.
let incr = 0.01;

const {
    camera,
    render,
    scene,
    shouldShowWireframe,
    sidebar,
    shouldShowLabels,
    renderer,
    directionalLight,
    canvas,
    addHelpNote,
} = createBaseScene({
    sceneTitle: "Unit 7: Function Graphing",
    cameraZ: n * 15,
    cameraFov: 90,
    defaultLightColor: "#fff",
    showAxes: true,
    showGrid: false,
    useAmbientLight: true,
    usePointLight: false,
    gridHelperSize: n * 10,
    gridHelperDivisions: n * 10 * 10,
    showWireframe: false,
});

// for easy access to the edges of the scene
const sceneEdges = {
    top: canvas.height / 2,
    bottom: -canvas.height / 2,
    left: -canvas.width / 2,
    right: canvas.width / 2,
};

// this is the signature of the function which will be used to compute the z value
const parseFunction = (fn) => {
    return new Function("x", "y", `return ${fn}`);
};

// Generates a parametric function based on the parsed function.
const generateParametricFunction = (fn) => {
    const parametricFunction = (u, v, target) => {
        const x = (u - 0.5) * 2 * n; // Map u from [0, 1] to [-n, n]
        const y = (v - 0.5) * 2 * n; // Map v from [0, 1] to [-n, n]
        const z = fn(x, y);
        target.set(x, y, z);
    };
    return parametricFunction;
};

// computes the size of the ground plane to stay scaled with the curve
const groundSize = (n) => n * 100;

// computes the number of segments for the curve
const getCurveSegments = (n, incr) =>
    Math.max(10, Math.floor((2 * n) / incr));

// Configure the ground plane.
const groundGeometry = new THREE.PlaneGeometry(
    groundSize(n),
    groundSize(n),
    10,
    10
);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: "#84bbfa",
    side: THREE.DoubleSide,
    wireframe: false,
    opacity: 0.5,
});

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI / 2;
ground.position.y = -n * 5;
scene.add(ground);

// Setup the curve.
const curveGeometry = new THREE.BufferGeometry();
const curveMaterial = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    flatShading: false, // Smooth surface appearance
    wireframe: shouldShowWireframe(),
    vertexColors: true, // Enable vertex colors
});
const curve = new THREE.Mesh(curveGeometry, curveMaterial);
scene.add(curve);

// Plot the function by accepting a string representing the function to plot
const plotFunction = (fnString) => {
    const fn = parseFunction(fnString);

    if (!n || !incr) {
        alert("Please set N and Increment values.");
        return;
    }

    const parametricGeometry = new ParametricGeometry(
        generateParametricFunction(fn),
        getCurveSegments(n, incr),
        getCurveSegments(n, incr)
    );

    const positions = parametricGeometry.getAttribute("position").array;
    const colors = [];

    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        // Normalize coordinates to [0, 1] for RGB mapping
        const r = (x + n) / (2 * n);
        const g = (y + n) / (2 * n);
        const b = (z + n) / (2 * n);

        colors.push(r, g, b);
    }

    parametricGeometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
    );

    curve.geometry.dispose(); // free up memory of the previous geometry
    curve.geometry = parametricGeometry; // assign the edited geometry to the curve

    // ensure that the ground plane is scaled with the curve
    ground.geometry = new THREE.PlaneGeometry(
        groundSize(n),
        groundSize(n),
        10,
        10
    );
};

directionalLight.position.set(sceneEdges.right, sceneEdges.top, 0);
directionalLight.intensity = 2;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

curve.castShadow = true;
curve.receiveShadow = false;

ground.castShadow = false;
ground.receiveShadow = true;

// shadow camera properties
const dlCameraFactor = 2000;
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = dlCameraFactor * 0;
directionalLight.shadow.camera.far = dlCameraFactor;
directionalLight.shadow.camera.left = -dlCameraFactor;
directionalLight.shadow.camera.right = dlCameraFactor;
directionalLight.shadow.camera.top = dlCameraFactor;
directionalLight.shadow.camera.bottom = -dlCameraFactor;

// Default functions to choose from
const defaultFunctions = [
    {
        name: "Hyperbolic Paraboloid",
        fn: `x ** 2 - y ** 2`, // Saddle-shaped hyperbolic paraboloid
    },
    {
        name: "Parabola",
        fn: `x ** 2 + y ** 2`, // A paraboloid (bowl shape)
    },
    {
        name: "Deep Parabola",
        fn: `3 * x ** 2 + 3 * y ** 2`, // A scaled paraboloid
    },
    {
        name: "Cone",
        fn: `Math.sqrt(x ** 2 + y ** 2)`, // A cone with the vertex at (0, 0, 0)
    },
];

// This variable tracks if the function has changed
let functionChanged = true;
let fnString = defaultFunctions[0].fn;

// Scene options UI elements
const sceneOptionsDiv = document.createElement("div");
sceneOptionsDiv.classList.add("mb-4");

sceneOptionsDiv.innerHTML = `
   <hr class="border border-b-[#000] mb-2" />
    <h2 class="text-xl font-bold text-center mb-2">Scene Options</h2>
    <div class="flex flex-col space-y-2 text-lg">
        <div>
            <label for="selectFunction" class="font-bold">Select Function: </label>
                ${defaultFunctions
                    .map(
                        (f) =>
                            `<label class="flex flex-col py-1">
                                 <div>
                                    <input type="radio" name="selectFunction" 
                                         class="selectFunction"
                                         value="${f.fn}" 
                                         ${f.fn === fnString ? "checked" : ""} 
                                    />
                                    <span>${f.name}</span> 
                                 </div>
                                 <div class="ml-5">
                                    <code class="block bg-gray-200 text-blue-600 font-mono text-sm p-2 rounded">
                                       z = ${f.fn}
                                    </code>
                                 </div>
                            </label>`
                    )
                    .join("")}
        </div>
        <div class="flex flex-col space-y-2 text-lg">
            <label for="function" class="font-bold">Custom Function:</label>
            <div class="text-sm">Please follow Javascript notation (and not Math), similar to the options above.</div>
            <div class="flex gap-1 items-center">
                <div>z = </div>
                <input type="text" id="customFunction" class="p-2 border border-gray-400 rounded" />
            </div>
            <button id="plotFunction" class="p-2 bg-blue-500 text-white rounded">Plot</button>
        </div>
        <div class="flex items-center space-x-2">
            <span class="font-bold">N:</span>
            <input type="range" id="nInput" min="${0.1}" max="${3}" step="0.1" value="${n}" />
        </div>
        <div class="flex items-center space-x-2">
            <span class="font-bold">Incr:</span>
            <input type="range" id="incrInput" min="${0.01}" max="${1}" step="0.01" value="${incr}" />
        </div>
        <div class="flex flex items-center space-x-2">
           <label for="groundColor" class="font-bold">Ground Color:</label>
            <input type="color" id="groundColor" value="#84bbfa" />
        </div>
        <div class="flex items-center space-x-2">
            <label for="groundY" class="font-bold">Ground Y:</label>
            <input type="range" id="groundY" min="-30" max="0" step="0.1" value="0" />
        </div>
    </div>
`;

sidebar.appendChild(sceneOptionsDiv);

// Select function input event listeners
const functionRadios = document.querySelectorAll(".selectFunction");
const customFunctionInput = document.querySelector("#customFunction");
const plotFunctionButton = document.querySelector("#plotFunction");
const nInput = document.querySelector("#nInput");
const incrInput = document.querySelector("#incrInput");
const groundColorInput = document.querySelector("#groundColor");
const groundYInput = document.querySelector("#groundY");

customFunctionInput.value = fnString;
incrInput.value = incr.toString();
nInput.value = n.toString();
groundColorInput.value = "#" + groundMaterial.color.getHexString().toString();
groundYInput.value = ground.position.y.toString();

functionRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
        const target = e.target;
        const newFnString = target.value;
        fnString = newFnString;
        functionChanged = true;
        customFunctionInput.value = newFnString;
    });
});

plotFunctionButton.addEventListener("click", () => {
    fnString = customFunctionInput.value;
    functionChanged = true;
    functionRadios.forEach((r) => {
        const v = r.getAttribute("value");
        r.checked = v === fnString;
    });
});

nInput.addEventListener("input", (e) => {
    setTimeout(() => {
        n = parseFloat(e.target.value);
        functionChanged = true;
    },

