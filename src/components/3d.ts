import { preview3D } from 'src/element.generated';
import { global } from 'src/global';
import type { Quaternion } from 'src/index.types';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const previewObject = new THREE.Mesh(
  new THREE.BoxGeometry(1.618033988749895 * 10, 10, 1),
  new THREE.MeshStandardMaterial({ color: 0xffff00 }),
);

export function init3DPreview() {
  const previewRenderer = new THREE.WebGLRenderer({
    canvas: preview3D,
    antialias: true,
  });
  previewRenderer.setPixelRatio(window.devicePixelRatio);
  previewRenderer.setSize(preview3D.width / window.devicePixelRatio, preview3D.height / window.devicePixelRatio);
  const previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(0xe8fffb);
  const previewCamera = new THREE.PerspectiveCamera(75, preview3D.width / preview3D.height, 0.1, 1000);
  previewCamera.position.set(12, 12, 12);

  const previewControls = new OrbitControls(previewCamera, preview3D);
  previewControls.update();
  previewScene.add(previewObject);

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20, 1),
    new THREE.MeshStandardMaterial({ color: 0x00ee00, side: THREE.DoubleSide }),
  );
  grass.rotateX(-Math.PI / 2);
  grass.position.y = -5;
  previewScene.add(grass);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  previewScene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 2);
  sunLight.position.x = 10;
  sunLight.position.y = 10;
  sunLight.position.z = 10;
  previewScene.add(sunLight);

  const northBody = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 4, 8),
    new THREE.MeshStandardMaterial({
      color: 0x0000ff,
      wireframe: false,
      side: THREE.DoubleSide,
    }),
  );
  northBody.rotateX(Math.PI / 2);
  northBody.rotateZ(Math.PI / 2);
  northBody.position.x = -12;
  previewScene.add(northBody);

  const northHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0, 2, 2.5, 8),
    new THREE.MeshStandardMaterial({
      color: 0x0000ff,
      wireframe: false,
      side: THREE.DoubleSide,
    }),
  );
  northHead.rotateX(Math.PI / 2);
  northHead.rotateZ(Math.PI / 2);
  northHead.rotateZ(Math.PI / 2);
  northHead.position.x = -15;
  previewScene.add(northHead);

  function animatePreview() {
    previewRenderer.render(previewScene, previewCamera);
  }
  previewRenderer.setAnimationLoop(animatePreview);
}

export function updatePreview3D(displayValue?: Quaternion) {
  const q = displayValue ??
    global.trackData?.waypoints[global.selectedIndex ?? 0].rotation ?? {
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    };
  const yaw = 2 * Math.atan2(q.z, q.w);
  // have to flip yaw to match in game because I don't know...
  previewObject.rotation.set(0, -yaw, 0);
}
