(function () {
  // Set our main variables
  let scene,
  renderer,
  camera,
  model, // Our character
  neck, // Reference to the neck bone in the skeleton
  waist, // Reference to the waist bone in the skeleton
  possibleAnims, // Animations found in our file
  mixer, // THREE.js animations mixer
  idle, // Idle, the default state our character returns to
  clock = new THREE.Clock(), // Used for anims, which run to a clock instead of frame rate 
  currentlyAnimating = false, // Used to check whether characters neck is being used in another anim
  raycaster = new THREE.Raycaster(), // Used to detect the click on our character
  loaderAnim = document.getElementById('js-loader');
  currentlyPlayingSound = null;

  const sounds = [
    new Audio('https://alibhtty.github.io/apitape/js/audio/ropa.mp3'), /* op busqueda */
    new Audio('https://alibhtty.github.io/apitape/js/audio/whoosh.mp3'), /* op whoosh */
    new Audio('https://alibhtty.github.io/apitape/js/audio/dance.mp3'), /* op dance */
    new Audio('https://alibhtty.github.io/apitape/js/audio/whoosh.mp3'), /* op salto */
    new Audio('https://alibhtty.web.app/assets/media/audio/kick.mp3'), /* falta susto */
    new Audio('https://alibhtty.github.io/apitape/js/audio/confuso.mp3'), /* falta confuso */
    new Audio('https://alibhtty.github.io/apitape/js/audio/saludo.mp3'), /* saludo baile gol */
    new Audio('https://alibhtty.web.app/assets/media/audio/golf.mp3'), /* op gol */
  ];

  init();

  function init() {

    const MODEL_PATH = 'https://alibhtty.github.io/apitape/js/stacy_lightweight.glb'; /* https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy_lightweight.glb */
    const canvas = document.querySelector('#c');
    const backgroundColor = 0x0a0a0a; /* f1f1f1 */

    // Init the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    scene.fog = new THREE.Fog(backgroundColor, 60, 100);

    // Init the renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Add a camera
    camera = new THREE.PerspectiveCamera(
    40, /* 50 */
    window.innerWidth / window.innerHeight,
    0.1,
    1000);

    camera.position.z = 30;
    camera.position.x = 0;
    camera.position.y = -3;

    let stacy_txt = new THREE.TextureLoader().load('https://alibhtty.github.io/apitape/js/ab.jpg'); /* https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy.jpg */
    stacy_txt.flipY = false;

    const stacy_mtl = new THREE.MeshPhongMaterial({
      map: stacy_txt,
      color: 0xffffff,
      skinning: true });



    var loader = new THREE.GLTFLoader();

    loader.load(
    MODEL_PATH,
    function (gltf) {
      model = gltf.scene;
      let fileAnimations = gltf.animations;

      model.traverse(o => {

        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.material = stacy_mtl;
        }
        // Reference the neck and waist bones
        if (o.isBone && o.name === 'mixamorigNeck') {
          neck = o;
        }
        if (o.isBone && o.name === 'mixamorigSpine') {
          waist = o;
        }
      });

      model.scale.set(7, 7, 7);
      model.position.y = -11;

      scene.add(model);

      loaderAnim.remove();

      mixer = new THREE.AnimationMixer(model);

      let clips = fileAnimations.filter(val => val.name !== 'idle');
      possibleAnims = clips.map(val => {
        let clip = THREE.AnimationClip.findByName(clips, val.name);

        clip.tracks.splice(3, 3);
        clip.tracks.splice(9, 3);

        clip = mixer.clipAction(clip);
        return clip;
      });


      let idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle');

      idleAnim.tracks.splice(3, 3);
      idleAnim.tracks.splice(9, 3);

      idle = mixer.clipAction(idleAnim);
      idle.play();

    },
    undefined, // We don't need this function
    function (error) {
      console.error(error);
    });


    // Add lights
    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.60);
    hemiLight.position.set(0, 50, 0);
    // Add hemisphere light to scene
    scene.add(hemiLight);

    let d = 8.25;
    let dirLight = new THREE.DirectionalLight(0xfaf000, 0.64); // 0.54  #fff000 COLOR LUCES
    dirLight.position.set(-8, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 1500;
    dirLight.shadow.camera.left = d * -1;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = d * -1;
    // Add directional Light to scene
    scene.add(dirLight);


    // Floor
    let floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1);
    let floorMaterial = new THREE.MeshPhongMaterial({
      color: 0x111333, /* eeeeee */
      shininess: 0 });


    let floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -0.5 * Math.PI;
    floor.receiveShadow = true;
    floor.position.y = -11;
    scene.add(floor);

const textureLoader = new THREE.TextureLoader();
textureLoader.load('https://alibhtty.github.io/apitape/js/mixtape.png', function(texture) {
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Vertex Shader
  let vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // Fragment Shader con recorte de bordes redondeados
  let fragmentShader = `
    uniform sampler2D texture;
    varying vec2 vUv;

    // Función para redondear las esquinas
    bool isInsideRoundedRect(vec2 uv, float radius) {
      vec2 dist = abs(uv - vec2(0.5, 0.5)); // Distancia desde el centro
      return (dist.x <= 0.5 - radius && dist.y <= 0.5 - radius) || 
             (length(dist - vec2(0.5 - radius, 0.5 - radius)) <= radius);
    }

    void main() {
      vec4 texColor = texture2D(texture, vUv);

      // Define el radio del borde redondeado (ajustable)
      float borderRadius = 0.1; // Radio de las esquinas (0.0 a 0.5)

      /* // Si está fuera del borde redondeado, no dibuja nada (deja transparente)
      if (!isInsideRoundedRect(vUv, borderRadius)) {
        discard;
      } */

      // El color deseado #ff6600 en formato RGB
      vec3 targetColor = vec3(1.0, 1.0, 1.5);

      // Aplica el color multiplicando por la textura original
      vec4 coloredTexture = vec4(texColor.rgb * targetColor, texColor.a);

      gl_FragColor = coloredTexture;
    }
  `;

  let material = new THREE.ShaderMaterial({
    uniforms: {
      texture: { value: texture }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true // Necesario para manejar áreas transparentes
  });

  let geometry = new THREE.PlaneGeometry(11, 11); // Ajusta según sea necesario
  let plane = new THREE.Mesh(geometry, material);

  plane.position.set(-0.25, -2.5, -20);
  scene.add(plane);
});



  }





  function update() {
    if (mixer) {
      mixer.update(clock.getDelta());
    }
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(update);
  }

  update();

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let canvasPixelWidth = canvas.width / window.devicePixelRatio;
    let canvasPixelHeight = canvas.height / window.devicePixelRatio;
    const needResize = canvasPixelWidth !== width || canvasPixelHeight !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  window.addEventListener('click', e => raycast(e));
  window.addEventListener('touchend', e => raycast(e, true));

  function raycast(e, touch = false) {
    var mouse = {};
    if (touch) {
      mouse.x = 2 * (e.changedTouches[0].clientX / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (e.changedTouches[0].clientY / window.innerHeight);
    } else {
      mouse.x = 2 * (e.clientX / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (e.clientY / window.innerHeight);
    }
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects[0]) {
      var object = intersects[0].object;
      if (object.name === 'stacy') {
        if (!currentlyAnimating) {
          currentlyAnimating = true;
          playOnClick();
        }
      }
    }
  }

  // Reproduce una animación aleatoria con sonido, si está disponible
  function playOnClick() {
    let animIndex = Math.floor(Math.random() * possibleAnims.length);
    let selectedAnim = possibleAnims[animIndex];

    // Limitar el índice de sonido al tamaño del arreglo
    if (animIndex < sounds.length) {
      // Detener el sonido actual si hay uno reproduciéndose
      if (currentlyPlayingSound) {
        currentlyPlayingSound.pause();
        currentlyPlayingSound.currentTime = 0;
      }

      // Reproducir el sonido correspondiente
      currentlyPlayingSound = sounds[animIndex];
      currentlyPlayingSound.play();
    } else {
      console.warn(`No se encontró sonido para la animación con índice ${animIndex}`);
    }

    playModifierAnimation(idle, 0.25, selectedAnim, 0.25);
  }

  function playModifierAnimation(from, fSpeed, to, tSpeed) {
    to.setLoop(THREE.LoopOnce);
    to.reset();
    to.play();
    from.crossFadeTo(to, fSpeed, true);

    setTimeout(function () {
      from.enabled = true;
      to.crossFadeTo(from, tSpeed, true);
      currentlyAnimating = false;

      // Detener el sonido cuando la animación termina
      if (currentlyPlayingSound) {
        currentlyPlayingSound.pause();
        currentlyPlayingSound.currentTime = 0;
        currentlyPlayingSound = null;
      }
    }, to._clip.duration * 1000 - (tSpeed + fSpeed) * 1000);
  }



    // Evento para seguir el movimiento del mouse
document.addEventListener('mousemove', function (e) {
  var mousecoords = getMousePos(e);
  if (neck && waist) {
    moveJoint(mousecoords, neck, 50);
    moveJoint(mousecoords, waist, 30);
  }
});

// Evento para seguir el movimiento del touch (deslizamiento)
document.addEventListener('touchmove', function (e) {
  var touchcoords = getTouchPos(e);
  if (neck && waist) {
    moveJoint(touchcoords, neck, 50);
    moveJoint(touchcoords, waist, 30);
  }
});

// Obtener las coordenadas del mouse
function getMousePos(e) {
  return { x: e.clientX, y: e.clientY };
}

// Obtener las coordenadas del touch
function getTouchPos(e) {
  return { x: e.touches[0].clientX, y: e.touches[0].clientY };
}

// Mover las articulaciones (cuello y cintura) según las coordenadas
function moveJoint(pos, joint, degreeLimit) {
  let degrees = getMouseDegrees(pos.x, pos.y, degreeLimit);
  joint.rotation.y = THREE.Math.degToRad(degrees.x);
  joint.rotation.x = THREE.Math.degToRad(degrees.y);
}

// Calcular los grados de rotación según las coordenadas del mouse/touch
function getMouseDegrees(x, y, degreeLimit) {
  let dx = 0,
    dy = 0,
    xdiff,
    xPercentage,
    ydiff,
    yPercentage;

  let w = { x: window.innerWidth, y: window.innerHeight };

  if (x <= w.x / 2) {
    xdiff = w.x / 2 - x;
    xPercentage = xdiff / (w.x / 2) * 100;
    dx = degreeLimit * xPercentage / 100 * -1;
  }

  if (x >= w.x / 2) {
    xdiff = x - w.x / 2;
    xPercentage = xdiff / (w.x / 2) * 100;
    dx = degreeLimit * xPercentage / 100;
  }

  if (y <= w.y / 2) {
    ydiff = w.y / 2 - y;
    yPercentage = ydiff / (w.y / 2) * 100;
    dy = degreeLimit * 0.5 * yPercentage / 100 * -1;
  }

  if (y >= w.y / 2) {
    ydiff = y - w.y / 2;
    yPercentage = ydiff / (w.y / 2) * 100;
    dy = degreeLimit * yPercentage / 100;
  }

  return { x: dx, y: dy };
}

})();