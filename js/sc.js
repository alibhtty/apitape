(function () {
    // Variables principales
    let scene,
      renderer,
      camera,
      model,
      neck,
      waist,
      possibleAnims,
      mixer,
      idle,
      clock = new THREE.Clock(),
      currentlyAnimating = false,
      raycaster = new THREE.Raycaster(),
      loaderAnim = document.getElementById('js-loader'),
      currentlyPlayingSound = null;
  
    // Sonidos asociados a las animaciones
    const sounds = [
      new Audio('https://alibhtty.web.app/assets/media/audio/kick.mp3'),
      new Audio('https://alibhtty.web.app/assets/media/audio/rggtn-alibhtty.mp3'),
      new Audio('https://alibhtty.web.app/assets/media/audio/kick.mp3'),
      new Audio('https://alibhtty.web.app/assets/media/audio/rggtn-alibhtty.mp3'),
      new Audio('https://alibhtty.web.app/assets/media/audio/kick.mp3'),
      new Audio('https://alibhtty.web.app/assets/media/audio/rggtn-alibhtty.mp3'),
      new Audio('https://alibhtty.web.app/assets/media/audio/kick.mp3'),
      new Audio('https://alibhtty.web.app/assets/media/audio/kick.mp3'),
    ];
  
    init();
  
    function init() {
      const MODEL_PATH = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy_lightweight.glb';
      const canvas = document.querySelector('#c');
      const backgroundColor = 0x0a0a0a;
  
      // Escena
      scene = new THREE.Scene();
      const backgroundTexture = new THREE.TextureLoader().load('https://alibhtty.github.io/apitape/js/mixtape.png');
      scene.background = backgroundTexture;
      scene.fog = new THREE.Fog(backgroundColor, 60, 100);
  
      // Renderer
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.shadowMap.enabled = true;
      renderer.setPixelRatio(window.devicePixelRatio);
      document.body.appendChild(renderer.domElement);
  
      // Cámara
      camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 30;
      camera.position.x = 0;
      camera.position.y = -3;
  
      let stacy_txt = new THREE.TextureLoader().load('https://alibhtty.github.io/apitape/js/ab.jpg');
      stacy_txt.flipY = false;
  
      const stacy_mtl = new THREE.MeshPhongMaterial({
        map: stacy_txt,
        color: 0xffffff,
        skinning: true
      });
  
      var loader = new THREE.GLTFLoader();
      loader.load(MODEL_PATH, function (gltf) {
        model = gltf.scene;
        let fileAnimations = gltf.animations;
  
        model.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.material = stacy_mtl;
          }
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
      });
  
      // Luces
      let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.60);
      hemiLight.position.set(0, 50, 0);
      scene.add(hemiLight);
  
      let dirLight = new THREE.DirectionalLight(0xfaf000, 0.64);
      dirLight.position.set(-8, 12, 8);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
      dirLight.shadow.camera.near = 0.1;
      dirLight.shadow.camera.far = 1500;
      scene.add(dirLight);
  
      // Suelo
      let floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1);
      let floorMaterial = new THREE.MeshPhongMaterial({ color: 0x111222, shininess: 0 });
      let floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -0.5 * Math.PI;
      floor.receiveShadow = true;
      floor.position.y = -11;
      scene.add(floor);
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
  
    document.addEventListener('mousemove', function (e) {
      var mousecoords = getMousePos(e);
      if (neck && waist) {
        moveJoint(mousecoords, neck, 50);
        moveJoint(mousecoords, waist, 30);
      }
    });
  
    function getMousePos(e) {
      return { x: e.clientX, y: e.clientY };
    }
  
    function moveJoint(mouse, joint, degreeLimit) {
      let degrees = getMouseDegrees(mouse.x, mouse.y, degreeLimit);
      joint.rotation.y = THREE.Math.degToRad(degrees.x);
      joint.rotation.x = THREE.Math.degToRad(degrees.y);
    }
  
    function getMouseDegrees(x, y, degreeLimit) {
      let dx = 0,
        dy = 0,
        xdiff,
        xPercentage,
        ydiff,
        yPercentage;
  
      let w = { x: window.innerWidth, y: window.innerHeight };
  
      // Left (Rotates neck left between 0 and -degreeLimit)
      if (x <= w.x / 2) {
        xdiff = w.x / 2 - x;
        xPercentage = (xdiff / (w.x / 2)) * 100;
        dx = ((degreeLimit * xPercentage) / 100) * -1;
      }
  
      // Right (Rotates neck right between 0 and degreeLimit)
      if (x >= w.x / 2) {
        xdiff = x - w.x / 2;
        xPercentage = (xdiff / (w.x / 2)) * 100;
        dx = (degreeLimit * xPercentage) / 100;
      }
  
      // Up (Rotates neck up between 0 and -degreeLimit)
      if (y <= w.y / 2) {
        ydiff = w.y / 2 - y;
        yPercentage = (ydiff / (w.y / 2)) * 100;
        dy = ((degreeLimit * 0.5 * yPercentage) / 100) * -1;
      }
  
      // Down (Rotates neck down between 0 and degreeLimit)
      if (y >= w.y / 2) {
        ydiff = y - w.y / 2;
        yPercentage = (ydiff / (w.y / 2)) * 100;
        dy = (degreeLimit * yPercentage) / 100;
      }
      return { x: dx, y: dy };
    }
  })();
  